import { describe, expect, it } from "bun:test";

import { Card } from "@/mtg-parser/card";

describe("Card", () => {
  describe("basic card creation", () => {
    it("should create card with quantity string and name", () => {
      const card = new Card("Barkchannel Pathway // Tidechannel Pathway", "1");

      expect(card.toString()).toBeDefined();
    });

    it("should create card with quantity number, name, and extension", () => {
      const card = new Card("Gitaxian Probe", 1, "NPH");

      expect(card.toString()).toBeDefined();
    });

    it("should create card with quantity, name, extension, and number", () => {
      const card = new Card("Gilded Drake", 1, "USG", "76");

      expect(card.toString()).toBeDefined();
    });

    it("should create card with quantity string, name, and tags including undefined values", () => {
      const card = new Card("Brainstorm", "1", undefined, undefined, ["Instant", undefined, "Card Advantage", 42]);

      expect(card.toString()).toBeDefined();
    });
  });

  describe("strict equality", () => {
    const testCases: [Card, Card][] = [
      [new Card("Sol Ring"), new Card("Sol Ring")],
      [new Card("Sol Ring", 1), new Card("Sol Ring", 1)],
      [new Card("Sol Ring", 1, "mps"), new Card("Sol Ring", 1, "mps")],
      [new Card("Sol Ring", 1, undefined, "24"), new Card("Sol Ring", 1, undefined, "24")],
      [new Card("Sol Ring", 1, undefined, undefined, ["Ramp"]), new Card("Sol Ring", 1, undefined, undefined, ["Ramp"])],
      [new Card("Sol Ring", 1, undefined, undefined, ["Artifact", "Ramp"]), new Card("Sol Ring", 1, undefined, undefined, ["Artifact", "Ramp"])],
    ];

    for (const [index, [left, right]] of testCases.entries()) {
      it(`should be strictly equal case ${index + 1}`, () => {
        expect(left.equals(right)).toBe(true);
        expect(left.lessThanOrEqual(right)).toBe(true);
        expect(left.greaterThanOrEqual(right)).toBe(true);
      });
    }
  });

  describe("normalized equality", () => {
    const testCases: [Card, Card][] = [
      [new Card("Sol Ring"), new Card("Sol Ring", 1)],
      [new Card("Sol Ring", 1), new Card("Sol Ring", "1")],
      [new Card("Sol Ring", 1, undefined, 24), new Card("Sol Ring", 1, undefined, "24")],
      [new Card("Sol Ring", 1, undefined, undefined, ["RAMP"]), new Card("Sol Ring", 1, undefined, undefined, ["ramp"])],
      [new Card("Sol Ring", 1, undefined, undefined, ["Artifact", "Ramp"]), new Card("Sol Ring", 1, undefined, undefined, ["Ramp", "Artifact"])],
      [new Card("Sol Ring", 1, undefined, undefined, ["ARTIFACT", "Ramp"]), new Card("Sol Ring", 1, undefined, undefined, ["RAMP", "Artifact"])],
    ];

    for (const [index, [left, right]] of testCases.entries()) {
      it(`should be equal after normalization case ${index + 1}`, () => {
        expect(left.equals(right)).toBe(true);
        expect(left.lessThanOrEqual(right)).toBe(true);
        expect(left.greaterThanOrEqual(right)).toBe(true);
      });
    }
  });

  describe("inequality", () => {
    const testCases: [Card, Card][] = [
      [new Card("sol ring"), new Card("SOL RING")],
      [new Card("Sol Ring", 1), new Card("Sol Ring", 2)],
      [new Card("Sol Ring", 1, "lea"), new Card("Sol Ring", 1, "mps")],
      [new Card("Sol Ring", 1, "MPS"), new Card("Sol Ring", 1, "mps")],
      [new Card("Sol Ring", 1, undefined, "24a"), new Card("Sol Ring", 1, undefined, "24A")],
      [new Card("Sol Ring", 1, undefined, "1"), new Card("Sol Ring", 1, undefined, "2")],
      [new Card("Sol Ring", 1, undefined, undefined, ["Ramp"]), new Card("Sol Ring", 1, undefined, undefined, ["Artifact"])],
      [new Card("Sol Ring", 1, undefined, undefined, ["Ramp"]), new Card("Sol Ring", 1, undefined, undefined, ["Artifact", "Ramp"])],
    ];

    for (const [index, [left, right]] of testCases.entries()) {
      it(`should not be equal case ${index + 1}`, () => {
        expect(left.notEquals(right)).toBe(true);
      });
    }
  });

  describe("strictly less than", () => {
    const testCases: [Card, Card][] = [
      [new Card("Brainstorm"), new Card("Sol Ring")],
      [new Card("Sol Ring", 1), new Card("Sol Ring", 2)],
      [new Card("Sol Ring", 1, "C17"), new Card("Sol Ring", 1, "C18")],
      [new Card("Sol Ring", 1, undefined, "10"), new Card("Sol Ring", 1, undefined, "20")],
      [new Card("Sol Ring", 1, "MPS"), new Card("Sol Ring", 1, "mps")],
      [new Card("Sol Ring", 1, undefined, "24A"), new Card("Sol Ring", 1, undefined, "24a")],
    ];

    for (const [index, [left, right]] of testCases.entries()) {
      it(`should be strictly less than case ${index + 1}`, () => {
        expect(left.lessThan(right)).toBe(true);
        expect(left.lessThanOrEqual(right)).toBe(true);
        expect(left.notEquals(right)).toBe(true);
        expect(left.greaterThan(right)).toBe(false);
        expect(left.greaterThanOrEqual(right)).toBe(false);
      });
    }
  });

  describe("strictly greater than", () => {
    const testCases: [Card, Card][] = [
      [new Card("Sol Ring"), new Card("Brainstorm")],
      [new Card("Sol Ring", 2), new Card("Sol Ring", 1)],
      [new Card("Sol Ring", 1, "C18"), new Card("Sol Ring", 1, "C17")],
      [new Card("Sol Ring", 1, undefined, "20"), new Card("Sol Ring", 1, undefined, "10")],
    ];

    for (const [index, [left, right]] of testCases.entries()) {
      it(`should be strictly greater than case ${index + 1}`, () => {
        expect(left.greaterThan(right)).toBe(true);
        expect(left.greaterThanOrEqual(right)).toBe(true);
        expect(left.notEquals(right)).toBe(true);
        expect(left.lessThan(right)).toBe(false);
        expect(left.lessThanOrEqual(right)).toBe(false);
      });
    }
  });
});
