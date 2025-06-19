import { Card } from "./card";
import { buildPattern, matchPattern } from "./utilities";

const PATTERN = buildPattern("deckstats.net", String.raw`/decks/(?<user_id>\d+)/(?<deck_id>\d+-.*)/?`);

export function canHandle(source: string): boolean {
  return matchPattern(source, PATTERN);
}

export async function parseDeck(source: string): Promise<Card[] | undefined> {
  if (!canHandle(source)) {
    return undefined;
  }

  try {
    const deck = await _downloadDeck(source);
    return _parseDeck(deck);
  }
  catch {
    return undefined;
  }
}

async function _downloadDeck(source: string): Promise<unknown> {
  const response = await fetch(source);
  const html = await response.text();

  const startToken = "init_deck_data(";
  const endToken = ");";

  const lines = html.split("\n");
  const targetLine = lines.find(line => line.includes(startToken));

  if (!targetLine) {
    throw new Error("Could not find init_deck_data in HTML");
  }

  let result = targetLine.slice(Math.max(0, targetLine.indexOf(startToken) + startToken.length));
  result = result.slice(0, Math.max(0, result.indexOf(endToken)));

  // Find the JSON object by counting braces
  let opened = 0;
  let endIndex = 0;

  for (const [index, char] of [...result].entries()) {
    if (char === "{") {
      opened++;
    }
    if (char === "}") {
      opened--;
    }
    if (opened <= 0) {
      endIndex = index;
      break;
    }
  }

  result = result.slice(0, Math.max(0, endIndex + 1));
  return JSON.parse(result);
}

function _parseDeck(deck: unknown): Card[] {
  const cards: Card[] = [];

  const deckData = deck as {
    sections?: Array<{
      cards?: Array<{
        name: string;
        amount: number;
        isCommander?: boolean;
        isCompanion?: boolean;
      }>;
    }>;
  };

  const sections = deckData.sections || [];
  for (const section of sections) {
    const sectionCards = section.cards || [];
    for (const card of sectionCards) {
      const tags = _getTags(card);
      const cardObject = new Card(
        card.name,
        card.amount,
        undefined,
        undefined,
        tags,
      );
      cards.push(cardObject);
    }
  }

  return cards;
}

function _getTags(card: { isCommander?: boolean; isCompanion?: boolean }): string[] {
  const tags: string[] = [];

  if (card.isCommander === true) {
    tags.push("commander");
  }

  if (card.isCompanion === true) {
    tags.push("companion");
  }

  return tags;
}
