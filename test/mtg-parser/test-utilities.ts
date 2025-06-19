import type { Card } from "@/mtg-parser/card";
import { mock } from "bun-bagel";
import { readFileSync } from "node:fs";
import path from "node:path";

const NB_CARDS = 100;
const MIN_COMMANDERS = 1;
const MAX_COMMANDERS = 3;

export interface MockedResponse {
  pattern: string | RegExp;
  response: string;
}

/**
 * Set up HTTP mocks using bun-bagel for the given mocked responses
 */
export function setupMocks(mockedResponses: MockedResponse[], basedir = "test/mtg-parser/mocks"): void {
  for (const mockedResponse of mockedResponses) {
    if (!mockedResponse.response) {
      continue;
    }

    const filePath = path.join(basedir, mockedResponse.response);
    const body = readFileSync(filePath, "utf8");

    // Convert pattern to string format that bun-bagel expects
    const pattern = typeof mockedResponse.pattern === "string"
      ? mockedResponse.pattern
      : mockedResponse.pattern.source;

    // Check if this is a JSON response based on file name or content
    const isJsonResponse = mockedResponse.response.includes("_json")
      || mockedResponse.response.endsWith(".json")
      || body.trim().startsWith("{") || body.trim().startsWith("[");

    if (isJsonResponse) {
      try {
        const jsonData = JSON.parse(body);
        mock(pattern, { data: jsonData });
      }
      catch {
        // If JSON parsing fails, fall back to string
        mock(pattern, { data: body });
      }
    }
    else {
      mock(pattern, { data: body });
    }
  }
}

/**
 * Assert that a deck is valid according to EDH rules
 */
export function assertDeckIsValid(cards: Card[]): void {
  // Expand all cards to individual instances for counting
  const allCards: Card[] = [];
  for (const card of cards) {
    for (let index = 0; index < card.quantity; index++) {
      allCards.push(card);
    }
  }

  // Count cards excluding companions
  const regularCards = allCards.filter(card => !card.tags.has("companion"));
  const nbCards = regularCards.length;

  if (nbCards !== NB_CARDS) {
    throw new Error(`There should be exactly ${NB_CARDS} cards in an EDH deck (parsed ${nbCards})`);
  }

  // Count command zone cards (commanders and companions)
  const commandZoneCards = allCards.filter(card =>
    card.tags.has("commander") || card.tags.has("companion"),
  );
  const nbCommandZone = commandZoneCards.length;

  if (nbCommandZone < MIN_COMMANDERS) {
    throw new Error(`Wrong number of cards in the command zone (${nbCommandZone})`);
  }

  if (nbCommandZone > MAX_COMMANDERS) {
    throw new Error(`Wrong number of cards in the command zone (${nbCommandZone})`);
  }
}

/**
 * Pretty print a deck for debugging
 */
export function printDeck(deck: Card[]): void {
  console.table(deck.map(card => ({
    Quantity: card.quantity,
    Name: card.name,
    Extension: card.extension,
    Number: card.number,
    Tags: [...card.tags].join(", "),
  })));

  console.log("Unique Cards  -", deck.length);
  console.log("Total # Cards -", deck.reduce((sum, card) => sum + card.quantity, 0));
}

/**
 * Compare two objects for deep equality (useful for testing)
 */
export function assertObjectsAreEqual<T>(result: T, expected: T): void {
  const resultJson = JSON.stringify(result, undefined, 0);
  const expectedJson = JSON.stringify(expected, undefined, 0);

  if (resultJson !== expectedJson) {
    throw new Error(`Objects are not equal:\nExpected: ${expectedJson}\nReceived: ${resultJson}`);
  }
}
