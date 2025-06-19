import { canHandle, parseDeck } from "@/mtg-parser/mtgjson";
import { clearMocks } from "bun-bagel";
import { afterEach, describe, expect, it } from "bun:test";

import { assertDeckIsValid, setupMocks } from "./test-utilities";

const DECK_INFO = {
  url: "https://mtgjson.com/api/v5/decks/BreedLethality_CM2.json",
  mocked_responses: [
    {
      pattern: /^(https?:\/\/)?(www\.)?mtgjson\.com/,
      response: "mock_mtgjson_breedlethality_cmd2.json",
    },
  ],
};

describe("mtgjson", () => {
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
