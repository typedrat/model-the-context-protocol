import { canHandle, parseDeck } from "@/mtg-parser/scryfall";
import { clearMocks } from "bun-bagel";
import { afterEach, describe, expect, it } from "bun:test";

import { assertDeckIsValid, setupMocks } from "./test-utilities";

const DECK_INFO = {
  url: "https://scryfall.com/@gorila/decks/e7aceb4c-29d5-49f5-9a49-c24f64da264b",
  mocked_responses: [
    {
      pattern: /^(https?:\/\/)?(www\.)?scryfall\.com/,
      response: "mock_scryfall_e7aceb4c-29d5-49f5-9a49-c24f64da264b",
    },
  ],
};

describe("scryfall", () => {
  afterEach(() => {
    clearMocks();
  });

  describe("canHandle", () => {
    it("should succeed", () => {
      const result = canHandle(DECK_INFO.url);
      expect(result).toBe(true);
    });
  });

  describe("parseDeck", () => {
    it("should parse deck with mock", async () => {
      setupMocks(DECK_INFO.mocked_responses);

      const result = await parseDeck(DECK_INFO.url);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      if (result) {
        assertDeckIsValid(result);
      }
    });

    it.skip("should parse deck without mock", async () => {
      const result = await parseDeck(DECK_INFO.url);

      expect(result).toBeDefined();
      if (result) {
        assertDeckIsValid(result);
      }
    });
  });
});
