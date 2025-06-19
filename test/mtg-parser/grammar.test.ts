import { describe, expect, it } from "bun:test";

import { parseLine } from "@/mtg-parser/grammar";

describe("grammar", () => {
  describe("parseLine", () => {
    it("should parse simple MTGO line", () => {
      const result = parseLine("1 Lightning Bolt");

      expect(result).toBeDefined();
      expect(result!.quantity).toBe(1);
      expect(result!.card_name).toBe("Lightning Bolt");
      expect(result!.extension).toBeUndefined();
      expect(result!.collector_number).toBeUndefined();
      expect(result!.tags).toBeUndefined();
    });

    it("should parse MTGA line with extension and collector number", () => {
      const result = parseLine("1 Lightning Bolt (M10) 146");

      expect(result).toBeDefined();
      expect(result!.quantity).toBe(1);
      expect(result!.card_name).toBe("Lightning Bolt");
      expect(result!.extension).toBe("M10");
      expect(result!.collector_number).toBe("146");
      expect(result!.tags).toBeUndefined();
    });

    it("should parse line with tags", () => {
      const result = parseLine("3 Brainstorm #Card Advantage #Draw");

      expect(result).toBeDefined();
      expect(result!.quantity).toBe(3);
      expect(result!.card_name).toBe("Brainstorm");
      expect(result!.extension).toBeUndefined();
      expect(result!.collector_number).toBeUndefined();
      expect(result!.tags).toEqual(["Card Advantage", "Draw"]);
    });

    it("should parse MTGA line with tags", () => {
      const result = parseLine("1 Jeweled Lotus (CMR) 319 #Ramp #Artifact");

      expect(result).toBeDefined();
      expect(result!.quantity).toBe(1);
      expect(result!.card_name).toBe("Jeweled Lotus");
      expect(result!.extension).toBe("CMR");
      expect(result!.collector_number).toBe("319");
      expect(result!.tags).toEqual(["Ramp", "Artifact"]);
    });

    it("should parse comment line with //", () => {
      const result = parseLine("// Card Advantage");

      expect(result).toBeDefined();
      expect(result!.comment).toBe("Card Advantage");
      expect(result!.quantity).toBeUndefined();
      expect(result!.card_name).toBeUndefined();
    });

    it("should parse comment line with //!", () => {
      const result = parseLine("//! Commander");

      expect(result).toBeDefined();
      expect(result!.comment).toBe("Commander");
      expect(result!.quantity).toBeUndefined();
      expect(result!.card_name).toBeUndefined();
    });

    it("should parse comment line with #", () => {
      const result = parseLine("# Burn Spells");

      expect(result).toBeDefined();
      expect(result!.comment).toBe("Burn Spells");
      expect(result!.quantity).toBeUndefined();
      expect(result!.card_name).toBeUndefined();
    });

    it("should parse card with apostrophe", () => {
      const result = parseLine("1 Atraxa, Praetors' Voice");

      expect(result).toBeDefined();
      expect(result!.quantity).toBe(1);
      expect(result!.card_name).toBe("Atraxa, Praetors' Voice");
    });

    it("should parse card with special characters", () => {
      const result = parseLine("1 Lim-Dûl's Vault");

      expect(result).toBeDefined();
      expect(result!.quantity).toBe(1);
      expect(result!.card_name).toBe("Lim-Dûl's Vault");
    });

    it("should parse card with double-faced names", () => {
      const result = parseLine("1 Barkchannel Pathway // Tidechannel Pathway");

      expect(result).toBeDefined();
      expect(result!.quantity).toBe(1);
      expect(result!.card_name).toBe("Barkchannel Pathway // Tidechannel Pathway");
    });

    it("should parse high quantity cards", () => {
      const result = parseLine("46 Mountain (4ED) 373");

      expect(result).toBeDefined();
      expect(result!.quantity).toBe(46);
      expect(result!.card_name).toBe("Mountain");
      expect(result!.extension).toBe("4ED");
      expect(result!.collector_number).toBe("373");
    });

    it("should return undefined for invalid lines", () => {
      expect(parseLine("")).toBeUndefined();
      expect(parseLine("invalid line")).toBeUndefined();
      expect(parseLine("not a card")).toBeUndefined();
    });

    it("should handle whitespace correctly", () => {
      const result = parseLine("  1   Lightning Bolt   (M10)   146   #Instant  ");

      expect(result).toBeDefined();
      expect(result!.quantity).toBe(1);
      expect(result!.card_name).toBe("Lightning Bolt");
      expect(result!.extension).toBe("M10");
      expect(result!.collector_number).toBe("146");
      expect(result!.tags).toEqual(["Instant"]);
    });
  });
});
