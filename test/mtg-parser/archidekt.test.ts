import { clearMocks } from "bun-bagel";
import { afterEach, describe, expect, it } from "bun:test";

import { canHandle, parseDeck } from "@/mtg-parser/archidekt";
import { assertDeckIsValid, setupMocks } from "./test-utilities";

const DECK_INFO = {
  url: "https://www.archidekt.com/decks/1365846/",
  mocked_responses: [
    {
      pattern: /^(https?:\/\/)?(www\.)?archidekt\.com\//,
      response: "mock_archidekt_1365846_small",
    },
  ],
};

describe("archidekt", () => {
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
