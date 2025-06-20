import { z } from "zod";
import { decks } from "./mtg-deck";
import { getScryfallCardWithFallback, type ScryfallCard } from "./scryfall-service";

// Helper function to calculate combinations (n choose k)
function combination(n: number, k: number): number {
  if (k > n || k < 0) return 0;
  if (k === 0 || k === n) return 1;

  let result = 1;
  for (let index = 0; index < k; index++) {
    result = result * (n - index) / (index + 1);
  }
  return result;
}

// Helper function to calculate hypergeometric probability
function hypergeometric(populationSize: number, successes: number, sampleSize: number, observed: number): number {
  if (observed > sampleSize || observed > successes) return 0;
  if (sampleSize > populationSize) return 0;

  const numerator = combination(successes, observed) * combination(populationSize - successes, sampleSize - observed);
  const denominator = combination(populationSize, sampleSize);

  return denominator === 0 ? 0 : numerator / denominator;
}

// Helper function to calculate probability of at least X successes
function hypergeometricAtLeast(populationSize: number, successes: number, sampleSize: number, atLeast: number): number {
  let probability = 0;
  const maxPossible = Math.min(sampleSize, successes);

  for (let index = atLeast; index <= maxPossible; index++) {
    probability += hypergeometric(populationSize, successes, sampleSize, index);
  }

  return probability;
}

// Helper function to get Scryfall data for a card
async function getScryfallCardData(cardName: string): Promise<ScryfallCard | undefined> {
  try {
    const card = await getScryfallCardWithFallback(cardName, { fuzzy: true });
    return card as ScryfallCard;
  }
  catch (error) {
    console.warn(`Could not fetch Scryfall data for ${cardName}:`, error);
    return undefined;
  }
}

// Helper function to parse mana cost
function parseManaSymbols(manaCost: string): { total: number; colors: string[]; colorless: number } {
  if (!manaCost) return { total: 0, colors: [], colorless: 0 };

  const symbols = manaCost.match(/\{[^}]+\}/g) || [];
  let total = 0;
  let colorless = 0;
  const colors: string[] = [];

  for (const symbol of symbols) {
    const inner = symbol.slice(1, -1);

    // Handle numeric symbols
    if (/^\d+$/.test(inner)) {
      const value = Number.parseInt(inner, 10);
      total += value;
      colorless += value;
    }
    // Handle X
    else if (inner === "X") {
      // X counts as 0 for curve analysis
      continue;
    }
    // Handle basic colors
    else if (["W", "U", "B", "R", "G"].includes(inner)) {
      total += 1;
      colors.push(inner);
    }
    // Handle hybrid and other symbols
    else {
      total += 1;
      // Extract color components from hybrid symbols
      const colorMatches = inner.match(/[WUBRG]/g);
      if (colorMatches) {
        colors.push(...colorMatches);
      }
    }
  }

  return { total, colors: [...new Set(colors)], colorless };
}

export const calculateHypergeometric = {
  name: "calculate_hypergeometric",
  description: "Calculate probability using hypergeometric distribution for MTG deck consistency analysis",
  parameters: z.object({
    deck_size: z.number().default(100).describe("Total number of cards in deck"),
    successes_in_deck: z.number().describe("Number of target cards in deck"),
    cards_drawn: z.number().describe("Number of cards drawn"),
    want_at_least: z.number().default(1).describe("Minimum number of target cards wanted"),
    want_exactly: z.number().optional().describe("Exact number of target cards wanted (overrides want_at_least)"),
  }),
  execute: async (arguments_: {
    deck_size: number;
    successes_in_deck: number;
    cards_drawn: number;
    want_at_least: number;
    want_exactly?: number;
  }) => {
    const { deck_size, successes_in_deck, cards_drawn, want_at_least, want_exactly } = arguments_;

    const probability = want_exactly === undefined
      ? hypergeometricAtLeast(deck_size, successes_in_deck, cards_drawn, want_at_least)
      : hypergeometric(deck_size, successes_in_deck, cards_drawn, want_exactly);

    return JSON.stringify({
      success: true,
      probability_percentage: Math.round(probability * 10_000) / 100,
      probability_decimal: probability,
      parameters: {
        deck_size,
        successes_in_deck,
        cards_drawn,
        want_at_least: want_exactly ?? want_at_least,
        calculation_type: want_exactly === undefined ? "at_least" : "exactly",
      },
    });
  },
};

export const analyzeConsistency = {
  name: "analyze_consistency",
  description: "Analyze probability of seeing key card groups across multiple game scenarios",
  parameters: z.object({
    deck_name: z.string().describe("Name of the deck to analyze"),
    card_groups: z.record(z.array(z.string())).describe("Groups of cards to analyze (group_name -> [card_names])"),
    scenarios: z.array(z.string()).default(["opening_hand", "turn_3", "turn_5", "turn_7"]).describe("Scenarios to analyze"),
    want_at_least: z.record(z.number()).optional().describe("Minimum cards wanted per group (group_name -> count)"),
  }),
  execute: async (arguments_: {
    deck_name: string;
    card_groups: Record<string, string[]>;
    scenarios: string[];
    want_at_least?: Record<string, number>;
  }) => {
    const { deck_name, card_groups, scenarios, want_at_least = {} } = arguments_;

    const deck = decks.get(deck_name);
    if (!deck) {
      throw new Error(`Deck "${deck_name}" not found`);
    }

    let deckSize = 0;
    for (const card of deck) {
      deckSize += card.quantity;
    }

    const scenarioCardCounts: Record<string, number> = {
      opening_hand: 7,
      turn_1: 8,
      turn_2: 9,
      turn_3: 10,
      turn_4: 11,
      turn_5: 12,
      turn_6: 13,
      turn_7: 14,
    };

    const results: Record<string, Record<string, number>> = {};

    for (const scenario of scenarios) {
      const cardsDrawn = scenarioCardCounts[scenario] || Number.parseInt(scenario.replaceAll(/\D/g, ""), 10) || 7;
      results[scenario] = {};

      for (const [groupName, cardNames] of Object.entries(card_groups)) {
        let successesInDeck = 0;
        for (const cardName of cardNames) {
          const card = deck.find(c => c.name.toLowerCase() === cardName.toLowerCase());
          successesInDeck += card?.quantity || 0;
        }

        const wantAtLeast = want_at_least[groupName] || 1;
        const probability = hypergeometricAtLeast(deckSize, successesInDeck, cardsDrawn, wantAtLeast);

        results[scenario][groupName] = Math.round(probability * 10_000) / 100;
      }
    }

    return JSON.stringify({
      success: true,
      deck_name,
      deck_size: deckSize,
      probability_matrix: results,
      card_groups,
      scenarios,
      want_at_least,
    });
  },
};

export const analyzeDeckCurve = {
  name: "analyze_deck_curve",
  description: "Analyze mana curve distribution and color requirements of a deck",
  parameters: z.object({
    deck_name: z.string().describe("Name of the deck to analyze"),
    include_lands: z.boolean().default(false).describe("Whether to include lands in the analysis"),
  }),
  execute: async (arguments_: { deck_name: string; include_lands: boolean }) => {
    const { deck_name, include_lands } = arguments_;

    const deck = decks.get(deck_name);
    if (!deck) {
      throw new Error(`Deck "${deck_name}" not found`);
    }

    const cmcDistribution: Record<string, number> = {};
    const colorBreakdown: Record<string, number> = { W: 0, U: 0, B: 0, R: 0, G: 0, Colorless: 0 };
    const cardTypeDistribution: Record<string, number> = {};
    let totalCmc = 0;
    let totalCards = 0;

    for (const card of deck) {
      try {
        const scryfallData = await getScryfallCardData(card.name);
        if (!scryfallData) continue;

        const isLand = scryfallData.type_line?.toLowerCase().includes("land");
        if (isLand && !include_lands) continue;

        const cmc = scryfallData.cmc || 0;
        const cmcKey = cmc > 7 ? "7+" : cmc.toString();

        cmcDistribution[cmcKey] = (cmcDistribution[cmcKey] || 0) + card.quantity;
        totalCmc += cmc * card.quantity;
        totalCards += card.quantity;

        // Analyze colors
        if (scryfallData.mana_cost) {
          const manaInfo = parseManaSymbols(scryfallData.mana_cost);
          for (const color of manaInfo.colors) {
            colorBreakdown[color] = (colorBreakdown[color] || 0) + card.quantity;
          }
          if (manaInfo.colors.length === 0) {
            colorBreakdown.Colorless = (colorBreakdown.Colorless || 0) + card.quantity;
          }
        }
        else {
          colorBreakdown.Colorless = (colorBreakdown.Colorless || 0) + card.quantity;
        }

        // Analyze card types
        const primaryType = scryfallData.type_line?.split(" ")[0] || "Unknown";
        cardTypeDistribution[primaryType] = (cardTypeDistribution[primaryType] || 0) + card.quantity;
      }
      catch (error) {
        console.warn(`Error analyzing card ${card.name}:`, error);
      }
    }

    const averageCmc = totalCards > 0 ? totalCmc / totalCards : 0;

    return JSON.stringify({
      success: true,
      deck_name,
      total_cards: totalCards,
      cmc_distribution: cmcDistribution,
      color_breakdown: colorBreakdown,
      card_type_distribution: cardTypeDistribution,
      average_cmc: Math.round(averageCmc * 100) / 100,
      include_lands,
    });
  },
};

export const calculateDeckStats = {
  name: "calculate_deck_stats",
  description: "Calculate comprehensive statistical metrics from card data",
  parameters: z.object({
    deck_name: z.string().describe("Name of the deck to analyze"),
  }),
  execute: async (arguments_: { deck_name: string }) => {
    const { deck_name } = arguments_;

    const deck = decks.get(deck_name);
    if (!deck) {
      throw new Error(`Deck "${deck_name}" not found`);
    }

    const cardCounts: Record<string, number> = {};
    const averageCmcByType: Record<string, { total: number; count: number; average: number }> = {};
    const cardTypeDistribution: Record<string, number> = {};
    const colorPipDistribution: Record<string, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };
    const subtypeBreakdown: Record<string, number> = {};
    let multicolorCount = 0;
    let monoColorCount = 0;
    let colorlessCount = 0;
    let freeSpellsCount = 0;

    for (const card of deck) {
      cardCounts[card.name] = card.quantity;

      try {
        const scryfallData = await getScryfallCardData(card.name);
        if (!scryfallData) continue;

        const cmc = scryfallData.cmc || 0;
        const typeLine = scryfallData.type_line || "";
        const primaryType = typeLine.split(" ")[0] || "Unknown";

        // Track free spells (0 CMC non-lands)
        if (cmc === 0 && !typeLine.toLowerCase().includes("land")) {
          freeSpellsCount += card.quantity;
        }

        // Average CMC by type
        if (!averageCmcByType[primaryType]) {
          averageCmcByType[primaryType] = { total: 0, count: 0, average: 0 };
        }
        averageCmcByType[primaryType].total += cmc * card.quantity;
        averageCmcByType[primaryType].count += card.quantity;

        // Card type distribution
        cardTypeDistribution[primaryType] = (cardTypeDistribution[primaryType] || 0) + card.quantity;

        // Subtype breakdown
        if (typeLine.includes("—")) {
          const subtypeSection = typeLine.split("—")[1]?.trim() || "";
          // Handle double-faced cards by taking only the first face's subtypes
          const cleanSubtypeSection = subtypeSection.split("//")[0]?.trim() || "";
          const subtypes = cleanSubtypeSection.split(" ")
            .map(s => s.trim())
            .filter(s => s.length > 0 && s !== "//" && !s.includes("—"))
            .filter(s => !["Legendary", "Basic", "Snow", "World"].includes(s)); // Filter out supertypes

          for (const subtype of subtypes) {
            subtypeBreakdown[subtype] = (subtypeBreakdown[subtype] || 0) + card.quantity;
          }
        }

        // Color analysis
        if (scryfallData.mana_cost) {
          const manaInfo = parseManaSymbols(scryfallData.mana_cost);

          // Count color pips
          for (const color of manaInfo.colors) {
            colorPipDistribution[color] = (colorPipDistribution[color] || 0) + card.quantity;
          }

          // Count multicolor vs mono vs colorless
          if (manaInfo.colors.length > 1) {
            multicolorCount += card.quantity;
          }
          else if (manaInfo.colors.length === 1) {
            monoColorCount += card.quantity;
          }
          else {
            colorlessCount += card.quantity;
          }
        }
        else {
          // No mana cost means colorless (like most lands)
          colorlessCount += card.quantity;
        }
      }
      catch (error) {
        console.warn(`Error analyzing card ${card.name}:`, error);
      }
    }

    // Calculate averages
    for (const type of Object.keys(averageCmcByType)) {
      const data = averageCmcByType[type]!;
      data.average = data.count > 0 ? Math.round((data.total / data.count) * 100) / 100 : 0;
    }

    let totalCardCount = 0;
    for (const count of Object.values(cardCounts)) {
      totalCardCount += count;
    }

    return JSON.stringify({
      success: true,
      deck_name,
      card_counts: cardCounts,
      average_cmc_by_type: Object.fromEntries(
        Object.entries(averageCmcByType).map(([type, data]) => [type, data.average]),
      ),
      card_type_distribution: cardTypeDistribution,
      color_pip_distribution: colorPipDistribution,
      multicolor_vs_mono: {
        multicolor: multicolorCount,
        monocolor: monoColorCount,
        colorless: colorlessCount,
      },
      free_spells_count: freeSpellsCount,
      type_breakdown: cardTypeDistribution,
      subtype_breakdown: subtypeBreakdown,
      total_cards: totalCardCount,
      unique_cards: Object.keys(cardCounts).length,
    });
  },
};
