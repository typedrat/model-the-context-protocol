import scryfall from "scryfall-client";
import { z } from "zod";
import { decks } from "./mtg-deck";

// Set user agent as required by Scryfall API
scryfall.setUserAgent("model-the-context-protocol/0.1.0");

// Schema for Card JSON input
const CardJsonSchema = z.object({
  name: z.string(),
  quantity: z.number().optional(),
  extension: z.string().optional(),
  number: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

// Schema for search input - either a string name or Card JSON
const SearchInputSchema = z.union([
  z.string(),
  CardJsonSchema,
]);

export const searchScryfallCard = {
  name: "search_scryfall_card",
  description: "Search for Magic: The Gathering cards on Scryfall by name or Card object",
  parameters: z.object({
    query: SearchInputSchema.describe("Either a card name string to search for, or a Card JSON object with name and optional set/number info"),
    exact: z.boolean().optional().describe("Whether to search for exact name match (default: false for fuzzy search)"),
    set: z.string().optional().describe("Set code to filter results (e.g., 'dom', 'war')"),
    include_extras: z.boolean().optional().describe("Include extra cards like tokens and art cards"),
    include_multilingual: z.boolean().optional().describe("Include non-English cards"),
    unique: z.enum(["cards", "art", "prints"]).optional().describe("How to handle duplicate cards"),
  }),
  execute: async (arguments_: {
    query: string | { name: string; quantity?: number; extension?: string; number?: string; tags?: string[] };
    exact?: boolean;
    set?: string;
    include_extras?: boolean;
    include_multilingual?: boolean;
    unique?: "cards" | "art" | "prints";
  }) => {
    const { query, exact = false, set, include_extras, include_multilingual, unique } = arguments_;

    try {
      let searchName: string;
      const searchOptions: Record<string, string | boolean | number> = {};

      // Parse the query input
      if (typeof query === "string") {
        searchName = query;
      }
      else {
        // It's a Card JSON object
        searchName = query.name;

        // If the Card has extension info, use it as set filter
        if (query.extension && !set) {
          searchOptions.set = query.extension;
        }
      }

      // Add search options
      if (set) searchOptions.set = set;
      if (include_extras !== undefined) searchOptions.include_extras = include_extras;
      if (include_multilingual !== undefined) searchOptions.include_multilingual = include_multilingual;
      if (unique) searchOptions.unique = unique;

      let result;

      if (exact) {
        // Use exact name search
        result = await scryfall.getCardNamed(searchName, searchOptions);
        return JSON.stringify({
          success: true,
          cards: [result],
          total_cards: 1,
          search_type: "exact_name",
        });
      }
      else {
        // Use fuzzy search first, fall back to general search if no results
        try {
          result = await scryfall.getCardNamed(searchName, {
            ...searchOptions,
            kind: "fuzzy",
          });
          return JSON.stringify({
            success: true,
            cards: [result],
            total_cards: 1,
            search_type: "fuzzy_name",
          });
        }
        catch {
          // If fuzzy search fails, try a general search
          result = await scryfall.search(searchName, searchOptions);
          return JSON.stringify({
            success: true,
            cards: [...result],
            total_cards: result.total_cards,
            has_more: result.has_more,
            search_type: "general_search",
          });
        }
      }
    }
    catch (error) {
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
        cards: [],
        total_cards: 0,
      });
    }
  },
};

export const getDeckScryfallData = {
  name: "get_deck_scryfall_data",
  description: "Get Scryfall card data for every card in a specified deck",
  parameters: z.object({
    deck_name: z.string().describe("Name of the deck to get Scryfall data for"),
    include_quantity: z.boolean().optional().describe("Include quantity information from the deck (default: true)"),
    unique_only: z.boolean().optional().describe("Only return unique cards, ignoring quantities (default: false)"),
  }),
  execute: async (arguments_: {
    deck_name: string;
    include_quantity?: boolean;
    unique_only?: boolean;
  }, { reportProgress }) => {
    const { deck_name, include_quantity = true, unique_only = false } = arguments_;

    try {
      // Get deck from storage
      const deck = decks.get(deck_name);
      if (!deck) {
        return JSON.stringify({
          success: false,
          error: `Deck "${deck_name}" does not exist`,
          deck_name,
          cards: [],
        });
      }

      if (deck.length === 0) {
        return JSON.stringify({
          success: true,
          deck_name,
          cards: [],
          total_cards_in_deck: 0,
          message: "Deck is empty",
        });
      }

      const results = [];
      const errors = [];
      let processedCount = 0;

      // Report initial progress
      await reportProgress({
        progress: 0,
        total: deck.length,
      });

      // Process each card in the deck
      for (const card of deck) {
        try {
          // Build search options - prefer set info if available
          const searchOptions: Record<string, string | boolean | number> = {};
          if (card.extension) {
            searchOptions.set = card.extension;
          }

          let scryfallCard;

          // Try fuzzy name search first, with set info if available
          try {
            scryfallCard = await scryfall.getCardNamed(card.name, searchOptions);
          }
          catch {
            // If that fails, try a general search
            const searchResult = await scryfall.search(card.name, searchOptions);
            if (searchResult.length > 0) {
              scryfallCard = searchResult[0]; // Take the first result
            }
            else {
              throw new Error("No results found");
            }
          }

          // Add the result with deck context - only include essential data
          const cardResult = {
            deck_card: include_quantity ? { name: card.name, quantity: card.quantity } : { name: card.name },
            scryfall_data: {
              name: scryfallCard.name,
              mana_cost: scryfallCard.mana_cost,
              cmc: scryfallCard.cmc,
              type_line: scryfallCard.type_line,
              oracle_text: scryfallCard.oracle_text,
              set: scryfallCard.set,
              set_name: scryfallCard.set_name,
              rarity: scryfallCard.rarity,
              prices: scryfallCard.prices,
              scryfall_uri: scryfallCard.scryfall_uri,
            },
          };

          // If unique_only is true, check if we already have this card
          if (unique_only) {
            const existingIndex = results.findIndex(r =>
              r.scryfall_data.name === scryfallCard.name
              && r.scryfall_data.set === scryfallCard.set,
            );
            if (existingIndex === -1) {
              results.push(cardResult);
            }
          }
          else {
            results.push(cardResult);
          }

          // Add a small delay to respect Scryfall's rate limits
          await new Promise(resolve => setTimeout(resolve, 75));

          // Report progress after processing each card
          processedCount++;
          await reportProgress({
            progress: processedCount,
            total: deck.length,
          });
        }
        catch (error) {
          errors.push({
            card_name: card.name,
            card_set: card.extension,
            error: error instanceof Error ? error.message : String(error),
          });

          // Still report progress even if there was an error
          processedCount++;
          await reportProgress({
            progress: processedCount,
            total: deck.length,
          });
        }
      }

      return JSON.stringify({
        success: true,
        deck_name,
        cards: results,
        summary: {
          cards_found: results.length,
          total_cards_in_deck: deck.reduce((sum, card) => sum + card.quantity, 0),
          unique_cards_in_deck: deck.length,
          errors_count: errors.length,
        },
        errors: errors.length > 0 ? errors : undefined,
      });
    }
    catch (error) {
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
        deck_name,
        cards: [],
      });
    }
  },
};

export const getScryfallCard = {
  name: "get_scryfall_card",
  description: "Get a specific Magic: The Gathering card from Scryfall by ID or exact name",
  parameters: z.object({
    identifier: z.string().describe("Card identifier (Scryfall ID, name, etc.)"),
    kind: z.enum([
      "scryfall", "multiverse", "arena", "mtgo", "tcg",
      "fuzzyName", "name", "exactName",
    ]).optional().describe("Type of identifier (default: scryfall for IDs, fuzzyName for text)"),
    set: z.string().optional().describe("Set code to specify which printing"),
  }),
  execute: async (arguments_: {
    identifier: string;
    kind?: "scryfall" | "multiverse" | "arena" | "mtgo" | "tcg" | "fuzzyName" | "name" | "exactName";
    set?: string;
  }) => {
    const { identifier, kind, set } = arguments_;

    try {
      let result;
      const options: Record<string, string | boolean | number> = {};

      if (set) options.set = set;

      // Auto-detect kind if not specified
      let detectedKind = kind;
      if (!detectedKind) {
        // If it looks like a UUID, assume scryfall ID
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier)) {
          detectedKind = "scryfall";
        }
        else if (/^\d+$/.test(identifier)) {
          // If it's all digits, assume multiverse ID
          detectedKind = "multiverse";
        }
        else {
          // Otherwise assume it's a card name
          detectedKind = "name";
        }
      }

      if (detectedKind === "name" || detectedKind === "fuzzyName") {
        result = await scryfall.getCardNamed(identifier, options);
      }
      else if (detectedKind === "exactName") {
        result = await scryfall.getCardNamed(identifier, { ...options, kind: "exact" });
      }
      else {
        result = await scryfall.getCard(identifier, detectedKind);
      }

      return JSON.stringify({
        success: true,
        card: result,
        identifier_used: identifier,
        kind_used: detectedKind,
      });
    }
    catch (error) {
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
        card: undefined,
        identifier_used: identifier,
        kind_used: kind,
      });
    }
  },
};

export const getRandomScryfallCard = {
  name: "get_random_scryfall_card",
  description: "Get a random Magic: The Gathering card from Scryfall, optionally matching search criteria",
  parameters: z.object({
    search: z.string().optional().describe("Optional search query to filter random results (e.g., 'c:blue t:creature')"),
  }),
  execute: async (arguments_: { search?: string }) => {
    const { search } = arguments_;

    try {
      const result = await scryfall.random(search);

      return JSON.stringify({
        success: true,
        card: result,
        search_used: search,
      });
    }
    catch (error) {
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
        card: undefined,
        search_used: search,
      });
    }
  },
};

export const convertCardToScryfallSearch = {
  name: "convert_card_to_scryfall_search",
  description: "Convert a Card object from the MTG parser to a Scryfall search query",
  parameters: z.object({
    card: CardJsonSchema.describe("Card object with name and optional set/number information"),
  }),
  execute: async (arguments_: {
    card: { name: string; quantity?: number; extension?: string; number?: string; tags?: string[] };
  }) => {
    const { card } = arguments_;

    try {
      let searchQuery = `!"${card.name}"`;

      // Add set filter if available
      if (card.extension) {
        searchQuery += ` set:${card.extension}`;
      }

      // Add collector number filter if available
      if (card.number) {
        searchQuery += ` number:${card.number}`;
      }

      return JSON.stringify({
        success: true,
        search_query: searchQuery,
        original_card: card,
        explanation: "Generated Scryfall search query from Card object. Use this with search_scryfall_card tool.",
      });
    }
    catch (error) {
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
        search_query: "",
        original_card: card,
      });
    }
  },
};
