import { canHandle, parseDeck } from "@/mtg-parser/tcgplayer";
import { clearMocks } from "bun-bagel";
import { afterEach, describe, expect, it } from "bun:test";

import { assertDeckIsValid, setupMocks } from "./test-utilities";

const DECK_INFO = {
  url: "https://www.tcgplayer.com/content/magic-the-gathering/deck/Malcolm-and-Vial-Smasher/496887",
  mocked_responses: [
    {
      pattern: /^(https?:\/\/)?([a-zA-Z0-9-]+\.)*tcgplayer\.com/,
      response: "mock_tcgplayer.json",
    },
  ],
};

const DECK_INFO_INFINITE = {
  url: "https://infinite.tcgplayer.com/magic-the-gathering/deck/Cat-Base/465171",
  mocked_responses: [
    {
      pattern: /^(https?:\/\/)?([a-zA-Z0-9-]+\.)*tcgplayer\.com/,
      response: "mock_tcgplayer_infinite.json",
    },
  ],
};

describe("tcgplayer", () => {
  afterEach(() => {
    clearMocks();
  });

  describe("canHandle", () => {
    it("should succeed for regular tcgplayer", () => {
      const result = canHandle(DECK_INFO.url);
      expect(result).toBe(true);
    });

    it("should succeed for infinite.tcgplayer", () => {
      const result = canHandle(DECK_INFO_INFINITE.url);
      expect(result).toBe(true);
    });
  });

  describe("parseDeck", () => {
    it("should parse deck with mock (regular)", async () => {
      setupMocks(DECK_INFO.mocked_responses);

      const result = await parseDeck(DECK_INFO.url);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      if (result) {
        assertDeckIsValid(result);
      }
    });

    it("should parse deck with mock (infinite)", async () => {
      setupMocks(DECK_INFO_INFINITE.mocked_responses);

      const result = await parseDeck(DECK_INFO_INFINITE.url);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      if (result) {
        assertDeckIsValid(result);
      }
    });

    it.skip("should parse deck without mock (regular)", async () => {
      const result = await parseDeck(DECK_INFO.url);

      expect(result).toBeDefined();
      if (result) {
        assertDeckIsValid(result);
      }
    });

    it.skip("should parse deck without mock (infinite)", async () => {
      const result = await parseDeck(DECK_INFO_INFINITE.url);

      expect(result).toBeDefined();
      if (result) {
        assertDeckIsValid(result);
      }
    });
  });
});
