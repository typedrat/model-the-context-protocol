import { Card } from "./card";
import { buildPattern, matchPattern } from "./utilities";

const PATTERN = buildPattern("moxfield.com", String.raw`/decks/(?<deck_id>[a-zA-Z0-9-_]+)/?`);

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
  const match = source.match(PATTERN);
  if (!match?.groups?.deck_id) {
    throw new Error("Could not extract deck ID from URL");
  }

  const deckId = match.groups.deck_id;
  const url = `https://api.moxfield.com/v2/decks/all/${deckId}`;

  // Make a HEAD request first (following Python implementation)
  await fetch(source, { method: "HEAD" });

  const response = await fetch(url);
  return await response.json();
}

function _parseDeck(deck: unknown): Card[] {
  const cards: Card[] = [];

  const deckData = deck as {
    commanders?: Record<string, unknown>;
    companions?: Record<string, unknown>;
    mainboard?: Record<string, unknown>;
  };

  // Parse commanders
  for (const [key, value] of Object.entries(deckData.commanders || {})) {
    const cardInfo = _extractInformation(value);
    const card = new Card(key, cardInfo.quantity, cardInfo.extension, cardInfo.number, ["commander"]);
    cards.push(card);
  }

  // Parse companions
  for (const [key, value] of Object.entries(deckData.companions || {})) {
    const cardInfo = _extractInformation(value);
    const card = new Card(key, cardInfo.quantity, cardInfo.extension, cardInfo.number, ["companion"]);
    cards.push(card);
  }

  // Parse mainboard
  for (const [key, value] of Object.entries(deckData.mainboard || {})) {
    const cardInfo = _extractInformation(value);
    const card = new Card(key, cardInfo.quantity, cardInfo.extension, cardInfo.number);
    cards.push(card);
  }

  return cards;
}

function _extractInformation(card: unknown): { quantity: number; extension?: string; number?: string } {
  const cardData = card as {
    quantity?: number;
    card?: {
      set?: string;
      cn?: string;
    };
  };

  return {
    quantity: cardData.quantity || 1,
    extension: cardData.card?.set,
    number: cardData.card?.cn,
  };
}
