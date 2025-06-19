import { clearMocks } from "bun-bagel";
import { afterEach, describe, expect, it } from "bun:test";

import { canHandle, parseDeck } from "@/mtg-parser/moxfield";
import { getScryfallUrl } from "@/mtg-parser/utilities";
import { assertDeckIsValid, setupMocks } from "./test-utilities";

const DECK_INFO = {
  url: "https://www.moxfield.com/decks/Agzx8zsi5UezWBUX5hMJPQ",
  mocked_responses: [
    {
      pattern: /^(https?:\/\/)?.*?moxfield\.com/,
      response: "mock_moxfield_Agzx8zsi5UezWBUX5hMJPQ",
    },
  ],
};

describe("moxfield", () => {
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

    it.skip("should parse deck corner cases without mock", async () => {
      const testUrls = [
        "https://www.moxfield.com/decks/KJGxdJIxAkqDnowdAjimdg",
      ];

      for (const source of testUrls) {
        const result = await parseDeck(source);

        expect(result).toBeDefined();
        if (result) {
          assertDeckIsValid(result);
          for (const card of result) {
            const url = getScryfallUrl(card.name, card.extension, card.number);
            expect(url).toBeDefined();
          }
        }
      }
    });
  });
});
