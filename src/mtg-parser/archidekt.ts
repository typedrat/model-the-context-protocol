import { Card } from "./card";
import { buildPattern, matchPattern } from "./utilities";

const PATTERN = buildPattern("archidekt.com", String.raw`/decks/(?<deck_id>\d+)/?`);

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
  const url = `https://archidekt.com/api/decks/${deckId}/`;

  const response = await fetch(url);
  return await response.json();
}

function _parseDeck(deck: unknown): Card[] {
  const cards: Card[] = [];

  const deckData = deck as {
    categories?: Array<{ includedInDeck?: boolean; name?: string }>;
    cards?: Array<{
      categories?: string[];
      card: {
        oracleCard: { name: string };
        edition: { editioncode: string };
        collectorNumber?: string;
      };
      quantity: number;
    }>;
  };

  // Get categories that are included in deck
  const categories = deckData.categories || [];
  const includedCategories = categories
    .filter(c => c.includedInDeck === true)
    .map(c => c.name)
    .filter((name): name is string => name !== undefined);
  const includedCategorySet = new Set(includedCategories);

  // Parse cards
  for (const cardEntry of deckData.cards || []) {
    const cardCategories = cardEntry.categories || [];

    // Include card if it has no categories OR if there's an intersection with included categories
    const shouldInclude = cardCategories.length === 0
      || cardCategories.some(cat => includedCategorySet.has(cat));

    if (shouldInclude) {
      const card = new Card(
        cardEntry.card.oracleCard.name,
        cardEntry.quantity,
        cardEntry.card.edition.editioncode,
        cardEntry.card.collectorNumber,
        cardCategories,
      );
      cards.push(card);
    }
  }

  return cards;
}
