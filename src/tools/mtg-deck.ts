import { readFile, writeFile } from "node:fs/promises";
import { z } from "zod";
import { Card, canHandle, formatDeck, parseDeck } from "../mtg-parser";

// In-memory deck storage
export const decks = new Map<string, Card[]>();

// Helper function to fetch URL content
async function fetchUrlContent(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.text();
  }
  catch (error) {
    throw new Error(`Failed to fetch URL: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Helper function to determine if string is a URL
function isUrl(source: string): boolean {
  try {
    new URL(source);
    return true;
  }
  catch {
    return false;
  }
}

// Helper function to find card in deck by name
function findCardIndex(cards: Card[], cardName: string): number {
  return cards.findIndex(card =>
    card.name.toLowerCase() === cardName.toLowerCase(),
  );
}

// Helper function to add/merge cards in a deck
function addCardsToArray(cards: Card[], newCards: Card[]): Card[] {
  const result = [...cards];

  for (const newCard of newCards) {
    const existingIndex = findCardIndex(result, newCard.name);
    if (existingIndex >= 0) {
      // Merge quantities if card already exists
      const existing = result[existingIndex]!;
      result[existingIndex] = new Card(
        existing.name,
        existing.quantity + newCard.quantity,
        existing.extension || newCard.extension,
        existing.number || newCard.number,
        [...existing.tags, ...newCard.tags],
      );
    }
    else {
      result.push(newCard);
    }
  }

  return result;
}

export const createDeck = {
  name: "create_deck",
  description: "Create a new empty MTG deck with the given name",
  parameters: z.object({
    name: z.string().describe("Name for the new deck"),
  }),
  execute: async (arguments_: { name: string }) => {
    if (decks.has(arguments_.name)) {
      throw new Error(`Deck "${arguments_.name}" already exists`);
    }

    decks.set(arguments_.name, []);
    return JSON.stringify({ success: true, message: `Created empty deck "${arguments_.name}"` });
  },
};

export const listDecks = {
  name: "list_decks",
  description: "List all current deck names and their card counts",
  parameters: z.object({}),
  execute: async () => {
    const deckList = [...decks.entries()].map(([name, cards]) => ({
      name,
      cardCount: cards.length,
      totalCards: cards.reduce((sum, card) => sum + card.quantity, 0),
    }));

    return JSON.stringify({ decks: deckList });
  },
};

export const getDeck = {
  name: "get_deck",
  description: "Get the contents of a specific deck",
  parameters: z.object({
    name: z.string().describe("Name of the deck to retrieve"),
  }),
  execute: async (arguments_: { name: string }) => {
    const deck = decks.get(arguments_.name);
    if (!deck) {
      throw new Error(`Deck "${arguments_.name}" does not exist`);
    }

    return JSON.stringify({
      name: arguments_.name,
      cards: deck,
      cardCount: deck.length,
      totalCards: deck.reduce((sum, card) => sum + card.quantity, 0),
    });
  },
};

export const addCards = {
  name: "add_cards",
  description: "Add cards to a deck. If the card already exists, quantities will be merged.",
  parameters: z.object({
    deck_name: z.string().describe("Name of the deck to add cards to"),
    card_name: z.string().describe("Name of the card to add"),
    quantity: z.number().default(1).describe("Number of copies to add"),
  }),
  execute: async (arguments_: { deck_name: string; card_name: string; quantity: number }) => {
    const deck = decks.get(arguments_.deck_name);
    if (!deck) {
      throw new Error(`Deck "${arguments_.deck_name}" does not exist`);
    }

    const existingIndex = findCardIndex(deck, arguments_.card_name);
    if (existingIndex >= 0) {
      const existing = deck[existingIndex]!;
      deck[existingIndex] = new Card(
        existing.name,
        existing.quantity + arguments_.quantity,
        existing.extension,
        existing.number,
        [...existing.tags],
      );
    }
    else {
      deck.push(new Card(arguments_.card_name, arguments_.quantity));
    }

    return JSON.stringify({
      success: true,
      message: `Added ${arguments_.quantity} ${arguments_.card_name} to deck "${arguments_.deck_name}"`,
      totalCards: deck.reduce((sum, card) => sum + card.quantity, 0),
    });
  },
};

export const removeCards = {
  name: "remove_cards",
  description: "Remove cards from a deck. If quantity is not specified, removes all copies.",
  parameters: z.object({
    deck_name: z.string().describe("Name of the deck to remove cards from"),
    card_name: z.string().describe("Name of the card to remove"),
    quantity: z.number().optional().describe("Number of copies to remove. If not specified, removes all copies."),
  }),
  execute: async (arguments_: { deck_name: string; card_name: string; quantity?: number }) => {
    const deck = decks.get(arguments_.deck_name);
    if (!deck) {
      throw new Error(`Deck "${arguments_.deck_name}" does not exist`);
    }

    const existingIndex = findCardIndex(deck, arguments_.card_name);
    if (existingIndex < 0) {
      throw new Error(`Card "${arguments_.card_name}" not found in deck "${arguments_.deck_name}"`);
    }

    const existing = deck[existingIndex]!;
    const removeCount = arguments_.quantity ?? existing.quantity;

    if (removeCount >= existing.quantity) {
      deck.splice(existingIndex, 1);
      return JSON.stringify({
        success: true,
        message: `Removed all ${existing.quantity} copies of ${arguments_.card_name} from deck "${arguments_.deck_name}"`,
        totalCards: deck.reduce((sum, card) => sum + card.quantity, 0),
      });
    }
    else {
      deck[existingIndex] = new Card(
        existing.name,
        existing.quantity - removeCount,
        existing.extension,
        existing.number,
        [...existing.tags],
      );
      return JSON.stringify({
        success: true,
        message: `Removed ${removeCount} ${arguments_.card_name} from deck "${arguments_.deck_name}"`,
        totalCards: deck.reduce((sum, card) => sum + card.quantity, 0),
      });
    }
  },
};

export const clearDeck = {
  name: "clear_deck",
  description: "Remove all cards from a deck, leaving it empty",
  parameters: z.object({
    name: z.string().describe("Name of the deck to clear"),
  }),
  execute: async (arguments_: { name: string }) => {
    if (!decks.has(arguments_.name)) {
      throw new Error(`Deck "${arguments_.name}" does not exist`);
    }

    decks.set(arguments_.name, []);
    return JSON.stringify({ success: true, message: `Cleared deck "${arguments_.name}"` });
  },
};

export const deleteDeck = {
  name: "delete_deck",
  description: "Delete a deck entirely",
  parameters: z.object({
    name: z.string().describe("Name of the deck to delete"),
  }),
  execute: async (arguments_: { name: string }) => {
    if (!decks.has(arguments_.name)) {
      throw new Error(`Deck "${arguments_.name}" does not exist`);
    }

    decks.delete(arguments_.name);
    return JSON.stringify({ success: true, message: `Deleted deck "${arguments_.name}"` });
  },
};

export const validateMtgSource = {
  name: "validate_mtg_source",
  description: "Check if a source (URL or text content) can be parsed as an MTG deck",
  parameters: z.object({
    source: z.string().describe("URL or text content to validate"),
  }),
  execute: async (arguments_: { source: string }) => {
    try {
      let content = arguments_.source;

      if (isUrl(arguments_.source)) {
        content = await fetchUrlContent(arguments_.source);
      }

      const isValid = canHandle(content);
      return JSON.stringify({
        valid: isValid,
        source_type: isUrl(arguments_.source) ? "url" : "text",
        message: isValid ? "Source can be parsed" : "Source cannot be parsed",
      });
    }
    catch (error) {
      return JSON.stringify({
        valid: false,
        source_type: isUrl(arguments_.source) ? "url" : "text",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },
};

export const parseMtgDeck = {
  name: "parse_mtg_deck",
  description: "Parse an MTG deck from a URL or text content, returning the cards without storing them",
  parameters: z.object({
    source: z.string().describe("URL or text content to parse"),
  }),
  execute: async (arguments_: { source: string }) => {
    try {
      let content = arguments_.source;

      if (isUrl(arguments_.source)) {
        content = await fetchUrlContent(arguments_.source);
      }

      const cards = await parseDeck(content);
      if (!cards) {
        throw new Error("Failed to parse deck - source may be invalid or unsupported");
      }

      return JSON.stringify({
        success: true,
        cards,
        cardCount: cards.length,
        totalCards: cards.reduce((sum, card) => sum + card.quantity, 0),
        source_type: isUrl(arguments_.source) ? "url" : "text",
      });
    }
    catch (error) {
      throw new Error(`Parse failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
};

export const parseMtgDeckToSlot = {
  name: "parse_mtg_deck_to_slot",
  description: "Parse an MTG deck from a URL or text content directly into a named deck slot",
  parameters: z.object({
    source: z.string().describe("URL or text content to parse"),
    deck_name: z.string().describe("Name for the deck slot to store the parsed cards"),
    merge: z.boolean().default(false).describe("If true, merge with existing deck. If false, replace existing deck."),
  }),
  execute: async (arguments_: { source: string; deck_name: string; merge: boolean }) => {
    try {
      let content = arguments_.source;

      if (isUrl(arguments_.source)) {
        content = await fetchUrlContent(arguments_.source);
      }

      const cards = await parseDeck(content);
      if (!cards) {
        throw new Error("Failed to parse deck - source may be invalid or unsupported");
      }

      if (arguments_.merge && decks.has(arguments_.deck_name)) {
        const existingDeck = decks.get(arguments_.deck_name)!;
        const mergedDeck = addCardsToArray(existingDeck, cards);
        decks.set(arguments_.deck_name, mergedDeck);
      }
      else {
        decks.set(arguments_.deck_name, cards);
      }

      const finalDeck = decks.get(arguments_.deck_name)!;
      return JSON.stringify({
        success: true,
        message: `Parsed deck into slot "${arguments_.deck_name}"${arguments_.merge ? " (merged)" : ""}`,
        cardCount: finalDeck.length,
        totalCards: finalDeck.reduce((sum, card) => sum + card.quantity, 0),
        source_type: isUrl(arguments_.source) ? "url" : "text",
      });
    }
    catch (error) {
      throw new Error(`Parse failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
};

export const formatMtgDeck = {
  name: "format_mtg_deck",
  description: "Get the readable text format of a deck",
  parameters: z.object({
    deck_name: z.string().describe("Name of the deck to format"),
  }),
  execute: async (arguments_: { deck_name: string }) => {
    const deck = decks.get(arguments_.deck_name);
    if (!deck) {
      throw new Error(`Deck "${arguments_.deck_name}" does not exist`);
    }

    const formatted = formatDeck(deck);
    return JSON.stringify({
      deck_name: arguments_.deck_name,
      formatted_text: formatted,
      cardCount: deck.length,
      totalCards: deck.reduce((sum, card) => sum + card.quantity, 0),
    });
  },
};

export const saveMtgDeck = {
  name: "save_mtg_deck",
  description: "Save a deck to a local file in both JSON and readable text formats",
  parameters: z.object({
    deck_name: z.string().describe("Name of the deck to save"),
    filepath: z.string().describe("Path where to save the deck (without extension)"),
  }),
  execute: async (arguments_: { deck_name: string; filepath: string }) => {
    const deck = decks.get(arguments_.deck_name);
    if (!deck) {
      throw new Error(`Deck "${arguments_.deck_name}" does not exist`);
    }

    try {
      // Save as JSON
      const jsonPath = `${arguments_.filepath}.json`;
      const deckData = {
        name: arguments_.deck_name,
        cards: deck,
        saved_at: new Date().toISOString(),
      };
      await writeFile(jsonPath, JSON.stringify(deckData, undefined, 2));

      // Save as readable text
      const textPath = `${arguments_.filepath}.txt`;
      const formatted = formatDeck(deck);
      await writeFile(textPath, formatted);

      return JSON.stringify({
        success: true,
        message: `Saved deck "${arguments_.deck_name}" to ${jsonPath} and ${textPath}`,
        files: [jsonPath, textPath],
      });
    }
    catch (error) {
      throw new Error(`Save failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
};

export const loadMtgDeck = {
  name: "load_mtg_deck",
  description: "Load a deck from a JSON file into a deck slot",
  parameters: z.object({
    filepath: z.string().describe("Path to the JSON file to load"),
    deck_name: z.string().optional().describe("Name for the deck slot. If not provided, uses the saved deck name."),
  }),
  execute: async (arguments_: { filepath: string; deck_name?: string }) => {
    try {
      const jsonContent = await readFile(arguments_.filepath, "utf8");
      const deckData = JSON.parse(jsonContent) as {
        name?: string;
        cards: Array<{
          name: string;
          quantity: number;
          extension?: string;
          number?: string;
          tags?: string[];
        }>;
        saved_at?: string;
      };

      // Reconstruct Card objects from JSON
      const cards = deckData.cards.map(cardData =>
        new Card(
          cardData.name,
          cardData.quantity,
          cardData.extension,
          cardData.number,
          cardData.tags,
        ),
      );

      const finalDeckName = arguments_.deck_name || deckData.name || "loaded_deck";
      decks.set(finalDeckName, cards);

      return JSON.stringify({
        success: true,
        message: `Loaded deck into slot "${finalDeckName}"`,
        original_name: deckData.name,
        cardCount: cards.length,
        totalCards: cards.reduce((sum, card) => sum + card.quantity, 0),
        saved_at: deckData.saved_at,
      });
    }
    catch (error) {
      throw new Error(`Load failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
};
