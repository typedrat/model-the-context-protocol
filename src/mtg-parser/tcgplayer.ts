import { Card } from "./card";
import { buildPattern, matchPattern } from "./utilities";

const PATTERN = buildPattern("tcgplayer.com", String.raw`/(content/)?magic-the-gathering/deck/(?<deck_name>.+)/(?<deck_id>\d+)/?`);

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
  const url = `https://infinite-api.tcgplayer.com/deck/magic/${deckId}/?subDecks=true&cards=true`;

  const response = await fetch(url);
  return await response.json();
}

function _parseDeck(deck: unknown): Card[] {
  const cards: Card[] = [];

  const deckData = deck as {
    result?: {
      deck?: {
        subDecks?: {
          commandzone?: Array<{ cardID?: number; quantity: number }>;
          sideboard?: Array<{ cardID?: number; quantity: number }>;
          maindeck?: Array<{ cardID?: number; quantity: number }>;
        };
      };
      cards?: Record<string, { name?: string; set?: string }>;
    };
  };

  const subdecks = deckData?.result?.deck?.subDecks || {};
  const allCards = deckData?.result?.cards || {};

  // Parse commander zone
  const commandzone = subdecks.commandzone || [];
  for (const card of commandzone) {
    const cardIdString = card.cardID?.toString();
    if (cardIdString) {
      const cardDetail = allCards[cardIdString] || {};
      if (cardDetail.name) {
        const cardObject = new Card(
          cardDetail.name,
          card.quantity,
          cardDetail.set,
          undefined,
          ["commander"],
        );
        cards.push(cardObject);
      }
    }
  }

  // Parse sideboard (companions)
  const sideboard = subdecks.sideboard || [];
  for (const card of sideboard) {
    const cardIdString = card.cardID?.toString();
    if (cardIdString) {
      const cardDetail = allCards[cardIdString] || {};
      if (cardDetail.name) {
        const cardObject = new Card(
          cardDetail.name,
          card.quantity,
          cardDetail.set,
          undefined,
          ["companion"],
        );
        cards.push(cardObject);
      }
    }
  }

  // Parse main deck
  const maindeck = subdecks.maindeck || [];
  for (const card of maindeck) {
    const cardIdString = card.cardID?.toString();
    if (cardIdString) {
      const cardDetail = allCards[cardIdString] || {};
      if (cardDetail.name) {
        const cardObject = new Card(
          cardDetail.name,
          card.quantity,
          cardDetail.set,
        );
        cards.push(cardObject);
      }
    }
  }

  return cards;
}
