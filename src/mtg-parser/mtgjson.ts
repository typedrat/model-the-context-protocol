import { Card } from "./card";
import { buildPattern, matchPattern } from "./utilities";

const PATTERN = buildPattern("mtgjson.com", String.raw`/api/v5/decks/(?<deck_id>.+\.json)`);

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
  return await response.json();
}

function _parseDeck(deck: unknown): Card[] {
  const cards: Card[] = [];

  const deckData = deck as {
    data?: {
      commander?: Array<{
        name: string;
        count: number;
        setCode: string;
      }>;
      mainBoard?: Array<{
        name: string;
        count: number;
        setCode: string;
      }>;
    };
  };

  // Parse commander cards
  const commanders = deckData?.data?.commander || [];
  for (const card of commanders) {
    const cardObject = new Card(
      card.name,
      card.count,
      card.setCode,
      undefined,
      ["commander"],
    );
    cards.push(cardObject);
  }

  // Parse main board cards
  const mainBoard = deckData?.data?.mainBoard || [];
  for (const card of mainBoard) {
    const cardObject = new Card(
      card.name,
      card.count,
      card.setCode,
    );
    cards.push(cardObject);
  }

  return cards;
}
