import { formatDeck, parseDeck } from "@/mtg-parser/parser";
import { describe, expect, it } from "bun:test";

import { Card } from "@/mtg-parser/card";

describe("parser", () => {
  describe("parseDeck", () => {
    it("should parse decklist text", async () => {
      const decklist = `
        1 Atraxa, Praetors' Voice
        1 Imperial Seal
        1 Jeweled Lotus (CMR) 319
        1 Lim-Dûl's Vault
        1 Llanowar Elves (M12) 182
        3 Brainstorm #Card Advantage #Draw
      `;

      const result = await parseDeck(decklist);

      expect(result).toBeDefined();
      expect(result).not.toBeUndefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result!.length).toBeGreaterThan(0);
      expect(result!.every(card => card !== undefined && card !== undefined)).toBe(true);
    });

    it.each([
      [42],
      [undefined],
      [""],
    ])("should fail for invalid input: %p", async (source) => {
      const result = await parseDeck(source?.toString() ?? "");
      expect(result).toBeUndefined();
    });
  });

  describe("formatDeck", () => {
    it("should format and round-trip parse correctly", async () => {
      const originalCards = [
        new Card("Lightning Bolt", 4),
        new Card("Jeweled Lotus", 1, "CMR", "319"),
        new Card("Brainstorm", 3, undefined, undefined, ["card advantage", "draw"]),
      ];

      const formatted = formatDeck(originalCards);
      const parsedCards = await parseDeck(formatted);

      expect(parsedCards).toBeDefined();
      expect(parsedCards).toHaveLength(originalCards.length);

      for (const [index, originalCard] of originalCards.entries()) {
        expect(parsedCards?.[index]?.equals(originalCard)).toBe(true);
      }
    });
  });
});
