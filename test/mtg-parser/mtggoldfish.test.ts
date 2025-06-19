import { canHandle, parseDeck } from "@/mtg-parser/mtggoldfish";
import { clearMocks } from "bun-bagel";
import { afterEach, describe, expect, it } from "bun:test";

import { assertDeckIsValid, setupMocks } from "./test-utilities";

const DECK_INFO = {
  url: "https://www.mtggoldfish.com/deck/3935836",
  mocked_responses: [
    {
      pattern: /^(https?:\/\/)?(www\.)?mtggoldfish\.com\/deck\/(?!component)/,
      response: "mock_mtggoldfish_3-amigos",
    },
    {
      pattern: /^(https?:\/\/)?(www\.)?mtggoldfish\.com\/deck\/component/,
      response: "mock_mtggoldfish_3-amigos_content",
    },
  ],
};

describe("mtggoldfish", () => {
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
