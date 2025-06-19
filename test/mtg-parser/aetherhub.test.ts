import { clearMocks } from "bun-bagel";
import { afterEach, describe, expect, it } from "bun:test";

import { canHandle, parseDeck } from "@/mtg-parser/aetherhub";
import { assertDeckIsValid, setupMocks } from "./test-utilities";

const DECK_INFO = {
  url: "https://aetherhub.com/Deck/mtg-parser-3-amigos",
  mocked_responses: [
    {
      pattern: "https://aetherhub.com/Deck/mtg-parser-3-amigos",
      response: "mock_aetherhub_3-amigos",
    },
    {
      pattern: "https://aetherhub.com/Deck/FetchMtgaDeckJson*",
      response: "mock_aetherhub_3-amigos_json",
    },
  ],
};

describe("aetherhub", () => {
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
