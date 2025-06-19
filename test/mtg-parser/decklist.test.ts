import { describe, expect, it } from "bun:test";

import { Card } from "@/mtg-parser/card";
import { formatDeck, parseDeck } from "@/mtg-parser/decklist";

describe("decklist", () => {
  it("should parse mixed decklist", () => {
    const decklist = `
        1 Atraxa, Praetors' Voice
        1 Imperial Seal
        1 Jeweled Lotus (CMR) 319
        1 Lim-Dûl's Vault
        1 Llanowar Elves (M12) 182
        3 Brainstorm #Card Advantage #Draw
    `;

    const expectedCards = [
      new Card("Atraxa, Praetors' Voice", 1),
      new Card("Imperial Seal", 1),
      new Card("Jeweled Lotus", 1, "CMR", "319"),
      new Card("Lim-Dûl's Vault", 1),
      new Card("Llanowar Elves", 1, "M12", "182"),
      new Card("Brainstorm", 3, undefined, undefined, ["card advantage", "draw"]),
    ];

    const cards = parseDeck(decklist);

    expect(cards).toBeDefined();
    expect(cards).toHaveLength(expectedCards.length);

    for (const [index, expectedCard] of expectedCards.entries()) {
      expect(cards?.[index]?.equals(expectedCard)).toBe(true);
    }
  });

  describe("decklist sections", () => {
    const testCases: [string, Card[]][] = [
      [
        `//!Commander
        1 Atraxa, Praetors' Voice`,
        [
          new Card("Atraxa, Praetors' Voice", 1, undefined, undefined, ["commander"]),
        ],
      ],
      [
        `// Card Advantage
        3 Brainstorm #Draw #Card Advantage`,
        [
          new Card("Brainstorm", 3, undefined, undefined, ["card advantage", "draw"]),
        ],
      ],
      [
        `// Tutors
        1 Imperial Seal
        // Ramp
        1 Cultivate`,
        [
          new Card("Imperial Seal", 1, undefined, undefined, ["tutors"]),
          new Card("Cultivate", 1, undefined, undefined, ["ramp"]),
        ],
      ],
    ];

    for (const [index, [deckString, expected]] of testCases.entries()) {
      it(`should parse decklist sections case ${index + 1}`, () => {
        const result = parseDeck(deckString);

        expect(result).toBeDefined();
        expect(result).toHaveLength(expected.length);

        for (const [index_, element] of expected.entries()) {
          expect(result?.[index_]?.equals(element)).toBe(true);
        }
      });
    }
  });

  describe("parse decklist failures", () => {
    const failureCases = [
      "https://www.archidekt.com/decks/1300410/",
      "https://deckstats.net/decks/30198/1297260-feather-the-redeemed",
      "https://www.moxfield.com/decks/7CBqQtCVKES6e49vKXfIBQ",
      "https://tappedout.net/mtg-decks/food-chain-sliver/",
      "https://www.mtggoldfish.com/deck/3862693",
    ];

    for (const [index, decklist] of failureCases.entries()) {
      it(`should fail to parse URL case ${index + 1}`, () => {
        const result = parseDeck(decklist);

        expect(result === undefined || result.length === 0).toBe(true);
      });
    }
  });

  describe("formatDeck", () => {
    it("should format basic cards correctly", () => {
      const cards = [
        new Card("Lightning Bolt", 4),
        new Card("Counterspell", 2),
      ];

      const result = formatDeck(cards);
      const expected = "4 Lightning Bolt\n2 Counterspell";

      expect(result).toBe(expected);
    });

    it("should format cards with extension and collector number", () => {
      const cards = [
        new Card("Jeweled Lotus", 1, "CMR", "319"),
        new Card("Llanowar Elves", 1, "M12", "182"),
      ];

      const result = formatDeck(cards);
      const expected = "1 Jeweled Lotus (CMR) 319\n1 Llanowar Elves (M12) 182";

      expect(result).toBe(expected);
    });

    it("should format cards with tags", () => {
      const cards = [
        new Card("Brainstorm", 3, undefined, undefined, ["card advantage", "draw"]),
        new Card("Lightning Bolt", 4, undefined, undefined, ["removal"]),
      ];

      const result = formatDeck(cards);
      const expected = "3 Brainstorm #Card Advantage #Draw\n4 Lightning Bolt #Removal";

      expect(result).toBe(expected);
    });

    it("should format cards with extension, collector number, and tags", () => {
      const cards = [
        new Card("Jeweled Lotus", 1, "CMR", "319", ["ramp", "artifact"]),
      ];

      const result = formatDeck(cards);
      const expected = "1 Jeweled Lotus (CMR) 319 #Ramp #Artifact";

      expect(result).toBe(expected);
    });

    it("should handle round-trip parsing", () => {
      const originalCards = [
        new Card("Atraxa, Praetors' Voice", 1),
        new Card("Imperial Seal", 1),
        new Card("Jeweled Lotus", 1, "CMR", "319"),
        new Card("Brainstorm", 3, undefined, undefined, ["card advantage", "draw"]),
      ];

      const formatted = formatDeck(originalCards);
      const parsedCards = parseDeck(formatted);

      expect(parsedCards).toBeDefined();
      expect(parsedCards).toHaveLength(originalCards.length);

      for (const [index, originalCard] of originalCards.entries()) {
        expect(parsedCards?.[index]?.equals(originalCard)).toBe(true);
      }
    });

    it("should handle empty deck", () => {
      const cards: Card[] = [];
      const result = formatDeck(cards);
      expect(result).toBe("");
    });

    it("should format single card", () => {
      const cards = [new Card("Sol Ring", 1, "C21", "10", ["artifact", "ramp"])];
      const result = formatDeck(cards);
      const expected = "1 Sol Ring (C21) 10 #Artifact #Ramp";
      expect(result).toBe(expected);
    });
  });
});
