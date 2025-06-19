import * as aetherhub from "./aetherhub";
import * as archidekt from "./archidekt";
import { Card } from "./card";
import * as decklist from "./decklist";
import * as deckstats from "./deckstats";
import * as moxfield from "./moxfield";
import * as mtggoldfish from "./mtggoldfish";
import * as mtgjson from "./mtgjson";
import * as scryfall from "./scryfall";
import * as tappedout from "./tappedout";
import * as tcgplayer from "./tcgplayer";

export interface Parser {
  canHandle(source: string): boolean;
  parseDeck(source: string): Card[] | undefined | Promise<Card[] | undefined>;
}

const PARSERS: Parser[] = [
  aetherhub,
  archidekt,
  deckstats,
  moxfield,
  mtggoldfish,
  mtgjson,
  scryfall,
  tappedout,
  tcgplayer,
  decklist,
];

export function canHandle(source: string): boolean {
  return PARSERS.some(parser => parser.canHandle(source));
}

export async function parseDeck(source: string): Promise<Card[] | undefined> {
  for (const parser of PARSERS) {
    if (parser.canHandle(source)) {
      const result = parser.parseDeck(source);
      const deck = result instanceof Promise ? await result : result;
      if (deck) {
        return deck;
      }
    }
  }
  return undefined;
}

// Legacy synchronous version for backward compatibility with text-based parsing
export function parseDeckSync(source: string): Card[] | undefined {
  // Only try decklist parser for sync parsing
  if (decklist.canHandle(source)) {
    const result = decklist.parseDeck(source);
    // Ensure it's not a promise
    if (!(result instanceof Promise)) {
      return result;
    }
  }
  return undefined;
}

// Export formatDeck function for converting Card arrays back to decklist format
export { formatDeck } from "./decklist";
