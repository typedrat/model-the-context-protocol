import type { Progress } from "fastmcp";
import { z } from "zod";
import { decks } from "./mtg-deck";
import {
  clearScryfallCache,
  getScryfallCacheStats,
  getScryfallCardById,
  getScryfallCardByName,
  getScryfallRandomCard,
  searchScryfallCards,
  type ScryfallCard,
} from "./scryfall-service";

// Utility function to filter card data to essential fields only (reduce LLM context)
function filterCardData(card: ScryfallCard) {
  return {
    name: card.name,
    mana_cost: card.mana_cost,
    cmc: card.cmc,
    type_line: card.type_line,
    oracle_text: card.oracle_text,
    power: card.power,
    toughness: card.toughness,
    loyalty: card.loyalty,
    set: card.set,
    set_name: card.set_name,
    rarity: card.rarity,
    prices: card.prices,
    scryfall_uri: card.scryfall_uri,
  };
}

export const queryScryfallCards = {
  name: "query_scryfall_cards",
  description: `Direct Scryfall query using their comprehensive search syntax.

COLORS & COLOR IDENTITY:
• c:/color: - Color (w,u,b,r,g,c=colorless,m=multicolor)
• id:/identity: - Color identity
• Guilds: azorius, dimir, rakdos, gruul, selesnya, orzhov, izzet, golgari, boros, simic
• Shards: bant, esper, grixis, jund, naya
• Wedges: abzan, jeskai, sultai, mardu, temur
• Four-color: chaos, aggression, altruism, growth, artifice
• Comparisons: c>=uw, id<=esper

CARD TYPES:
• t:/type: - Any supertype, type, or subtype
• Examples: t:creature, t:legendary, t:goblin, t:instant

CARD TEXT:
• o:/oracle: - Oracle text search
• fo:/fulloracle: - Full oracle text (includes reminder text)
• keyword:/kw: - Keyword abilities
• Use "quotes" for phrases, ~ for card name placeholder

MANA COSTS & VALUES:
• m:/mana: - Mana cost symbols ({G}, {2/G}, etc.)
• mv:/manavalue: - Mana value (mv=3, mv>=4, mv:even, mv:odd)
• is:hybrid - Hybrid mana symbols
• is:phyrexian - Phyrexian mana symbols
• devotion: - Devotion level
• produces: - Mana production

POWER/TOUGHNESS/LOYALTY:
• pow:/power: - Power (pow>=8, pow>tou)
• tou:/toughness: - Toughness
• pt:/powtou: - Combined power/toughness
• loy:/loyalty: - Planeswalker loyalty

CARD MECHANICS:
• is:split, is:flip, is:transform, is:meld, is:leveler, is:dfc, is:mdfc
• is:spell, is:permanent, is:historic, is:party, is:modal
• is:vanilla, is:frenchvanilla, is:bear

RARITY:
• r:/rarity: - common, uncommon, rare, mythic, special, bonus
• new:rarity - First time at this rarity
• in:rare - Ever printed at rare

SETS & BLOCKS:
• s:/e:/set:/edition: - Set code (e:war, s:dom)
• cn:/number: - Collector number
• b:/block: - Block code
• in: - Ever appeared in set
• st: - Set types (core, expansion, masters, commander, etc.)

FORMAT LEGALITY:
• f:/format: - Legal formats (standard, modern, legacy, vintage, commander, etc.)
• banned: - Banned in format
• restricted: - Restricted in format
• is:commander, is:brawler, is:companion, is:duelcommander, is:reserved

PRICES:
• usd:, eur:, tix: - Price ranges (usd>=10.00)
• cheapest:usd, cheapest:eur, cheapest:tix

VISUAL & META:
• a:/artist: - Artist name
• ft:/flavor: - Flavor text
• wm:/watermark: - Watermark
• border: - black, white, silver, borderless
• frame: - 1993, 1997, 2003, 2015, future, legendary, etc.
• is:full, is:foil, is:nonfoil, is:etched, is:glossy, is:hires
• game: - paper, mtgo, arena
• is:promo, is:spotlight, is:digital

SPECIAL SEARCHES:
• year:/date: - Release year/date (year>=2020, date>=2015-08-18)
• art:/atag:/arttag: - Art content tags
• function:/otag:/oracletag: - Function tags
• is:reprint, not:reprint, is:unique, prints>=5, sets>=10
• lang:/language: - Language (japanese, any, etc.)

LAND SHORTCUTS:
• is:dual, is:fetchland, is:shockland, is:checkland, is:fastland
• is:painland, is:filterland, is:bounceland, is:tangoland

OPERATORS:
• Negation: -fire (exclude "fire")
• OR logic: t:fish or t:bird
• Parentheses: t:legendary (t:goblin or t:elf)
• Exact names: !lightning bolt
• Regex: name:/pattern/, o:/^{T}:/
• Comparisons: >, <, >=, <=, !=, =

DISPLAY OPTIONS:
• unique:cards/prints/art
• order:name/cmc/power/rarity/set/usd/etc.
• direction:asc/desc

Examples:
• "Lightning Bolt" - Simple name search
• c:blue t:creature cmc:3 - Blue 3-mana creatures
• f:modern r>=rare - Modern legal rares/mythics
• o:"enters tapped" t:land - Lands that enter tapped
• pow>tou c:red t:creature - Red creatures with power > toughness`,
  parameters: z.object({
    query: z.string().describe("Scryfall search query using their syntax"),
    page: z.number().optional().describe("Page number for paginated results (default: 1)"),
    include_extras: z.boolean().optional().describe("Include extra cards like tokens"),
    include_multilingual: z.boolean().optional().describe("Include non-English cards"),
    unique: z.enum(["cards", "art", "prints"]).optional().describe("How to handle duplicates"),
  }),
  execute: async (arguments_: {
    query: string;
    page?: number;
    include_extras?: boolean;
    include_multilingual?: boolean;
    unique?: "cards" | "art" | "prints";
  }) => {
    const { query, page, include_extras, include_multilingual, unique } = arguments_;

    try {
      const result = await searchScryfallCards(query, {
        page,
        include_extras,
        include_multilingual,
        unique,
      });

      // Handle different response formats from Scryfall API
      let cards: ScryfallCard[] = [];
      let totalCards = 0;
      let hasMore = false;

      if (Array.isArray(result)) {
        // Direct array of cards
        cards = result;
        totalCards = result.length;
        hasMore = false;
      }
      else if (result && typeof result === "object") {
        // Object with data property (paginated results)
        cards = result.data || [];
        // eslint-disable-next-line unicorn/explicit-length-check
        totalCards = result.total_cards || result.total_cards || cards.length;
        hasMore = result.has_more || false;
      }

      return JSON.stringify({
        success: true,
        query_used: query,
        cards: cards.map(card => filterCardData(card)),
        total_cards: totalCards,
        has_more: hasMore,
      });
    }
    catch (error) {
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
        query_used: query,
      });
    }
  },
};

export const getScryfallCard = {
  name: "get_scryfall_card",
  description: "Get a specific card by exact name or ID",
  parameters: z.object({
    identifier: z.string().describe("Card name or ID"),
    type: z.enum(["name", "scryfall_id", "multiverse_id", "arena_id", "mtgo_id", "tcg_id"]).default("name").describe("Type of identifier"),
    set: z.string().optional().describe("Set code if searching by name"),
    exact: z.boolean().default(false).describe("Use exact name matching (default: fuzzy)"),
  }),
  execute: async (arguments_: {
    identifier: string;
    type: "name" | "scryfall_id" | "multiverse_id" | "arena_id" | "mtgo_id" | "tcg_id";
    set?: string;
    exact: boolean;
  }) => {
    const { identifier, type, set, exact } = arguments_;

    try {
      let result: ScryfallCard;

      if (type === "name") {
        result = await getScryfallCardByName(identifier, {
          kind: exact ? "exact" : "fuzzy",
          set,
        });
      }
      else {
        const idType = type === "scryfall_id" ? "scryfall" : type.replace("_id", "") as "multiverse" | "arena" | "mtgo" | "tcg";
        result = await getScryfallCardById(identifier, idType);
      }

      return JSON.stringify({
        success: true,
        card: filterCardData(result),
        search_type: type,
        identifier_used: identifier,
      });
    }
    catch (error) {
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
        search_type: type,
        identifier_used: identifier,
      });
    }
  },
};

export const getRandomScryfallCard = {
  name: "get_random_scryfall_card",
  description: "Get a random Magic card, optionally matching search criteria",
  parameters: z.object({
    search: z.string().optional().describe("Optional search query to filter random results (e.g., 'c:blue t:creature')"),
  }),
  execute: async (arguments_: { search?: string }) => {
    const { search } = arguments_;

    try {
      const result = await getScryfallRandomCard(search);

      return JSON.stringify({
        success: true,
        card: filterCardData(result),
        search_used: search,
      });
    }
    catch (error) {
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
        search_used: search,
      });
    }
  },
};

export const clearScryfallCacheData = {
  name: "clear_scryfall_cache",
  description: "Clear the Scryfall API cache to free memory or force fresh data",
  parameters: z.object({}),
  execute: async () => {
    try {
      clearScryfallCache();
      return JSON.stringify({
        success: true,
        message: "Scryfall cache cleared successfully",
      });
    }
    catch (error) {
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },
};

export const getScryfallCacheInfo = {
  name: "get_scryfall_cache_stats",
  description: "Get statistics about the Scryfall API cache usage",
  parameters: z.object({}),
  execute: async () => {
    try {
      const stats = getScryfallCacheStats();
      return JSON.stringify({
        success: true,
        cache_stats: {
          current_size: stats.size,
          max_size: stats.maxSize,
          cache_ttl_minutes: Math.round(stats.ttlMs / (1000 * 60)),
          entries_by_age: stats.entries.map(entry => ({
            key: entry.key,
            age_seconds: Math.round(entry.age / 1000),
          })),
        },
      });
    }
    catch (error) {
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },
};

export const getDeckScryfallData = {
  name: "get_deck_scryfall_data",
  description: "Get Scryfall card data for every card in a specified deck",
  parameters: z.object({
    deck_name: z.string().describe("Name of the deck to get Scryfall data for"),
    include_quantity: z.boolean().default(true).describe("Include quantity information from the deck"),
    unique_only: z.boolean().default(false).describe("Only return unique cards, ignoring quantities"),
  }),
  execute: async (arguments_: {
    deck_name: string;
    include_quantity: boolean;
    unique_only: boolean;
  }, { reportProgress }: { reportProgress?: (progress: Progress) => Promise<void> } = {}) => {
    const { deck_name, include_quantity, unique_only } = arguments_;

    const deck = decks.get(deck_name);
    if (!deck) {
      return JSON.stringify({
        success: false,
        error: `Deck "${deck_name}" not found`,
      });
    }

    const results: Array<{
      deck_card: {
        name: string;
        quantity?: number;
        extension?: string;
        number?: string;
        tags?: string[];
      };
      scryfall_data?: ScryfallCard;
      error?: string;
    }> = [];

    const uniqueCards = unique_only ? [...new Set(deck.map(card => card.name))] : deck.map(card => card.name);
    const cardsToProcess = unique_only ? uniqueCards.map(name => deck.find(card => card.name === name)!) : deck;

    let processed = 0;
    const total = cardsToProcess.length;

    for (const card of cardsToProcess) {
      if (reportProgress) {
        await reportProgress({ progress: processed, total });
      }

      const deckCardData = {
        name: card.name,
        ...(include_quantity && { quantity: card.quantity }),
        ...(card.extension && { extension: card.extension }),
        ...(card.number && { number: card.number }),
        ...(card.tags.size > 0 && { tags: [...card.tags] }),
      };

      try {
        const scryfallCard = await getScryfallCardByName(card.name, {
          kind: "fuzzy",
          set: card.extension,
        });

        results.push({
          deck_card: deckCardData,
          scryfall_data: filterCardData(scryfallCard),
        });
      }
      catch (error) {
        results.push({
          deck_card: deckCardData,
          error: error instanceof Error ? error.message : String(error),
        });
      }

      processed++;
    }

    if (reportProgress) {
      await reportProgress({ progress: total, total });
    }

    const successCount = results.filter(r => r.scryfall_data).length;
    const errorCount = results.filter(r => r.error).length;

    return JSON.stringify({
      success: true,
      deck_name,
      total_cards: total,
      successful_lookups: successCount,
      failed_lookups: errorCount,
      results,
    });
  },
};
