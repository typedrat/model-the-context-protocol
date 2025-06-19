import * as cheerio from "cheerio";
import { Card } from "./card";
import { buildPattern, matchPattern } from "./utilities";

const PATTERN = buildPattern("aetherhub.com", "/Deck/(?<deck_id>.+)/?");

export function canHandle(source: string): boolean {
  return matchPattern(source, PATTERN);
}

export async function parseDeck(source: string): Promise<Card[] | undefined> {
  if (!canHandle(source)) {
    return undefined;
  }

  try {
    const deck = await _downloadDeck(source);
    return _parseDeck(deck);
  }
  catch {
    return undefined;
  }
}

async function _downloadDeck(source: string): Promise<unknown> {
  // Get the HTML page
  const response = await fetch(source);
  const html = await response.text();

  // Parse HTML and find element with numeric data-deckid
  const $ = cheerio.load(html);
  const elements = $("[data-deckid]");

  let deckId: string | undefined;
  elements.each((_, element) => {
    const id = $(element).attr("data-deckid");
    if (id) {
      // Strip quotes (including escaped quotes) from the ID value
      const cleanId = id.replaceAll(/^\\?["']|\\?["']$/g, "");
      if (/^\d+$/.test(cleanId)) {
        deckId = cleanId;
        return false; // Break out of loop
      }
    }

    return true;
  });

  if (!deckId) {
    throw new Error("Could not find numeric deck ID in HTML");
  }

  // Fetch the JSON deck data
  const url = new URL("https://aetherhub.com/Deck/FetchMtgaDeckJson");
  url.searchParams.set("deckId", deckId);
  url.searchParams.set("langId", "0");
  url.searchParams.set("simple", "false");

  const jsonResponse = await fetch(url.toString());
  return await jsonResponse.json();
}

function _parseDeck(deck: unknown): Card[] {
  const cards: Card[] = [];
  let lastCategory: string | undefined = undefined;

  const deckData = deck as {
    convertedDeck?: Array<{
      quantity?: number;
      name?: string;
      set?: string;
      number?: string;
    }>; };

  for (const entry of deckData.convertedDeck || []) {
    const quantity = entry.quantity;
    const name = entry.name;
    const extension = entry.set;
    const number = entry.number;

    if (!quantity) {
      // This is a category header
      lastCategory = name;
    }
    else if (name && quantity) {
      // This is an actual card
      const tags = lastCategory ? [lastCategory.toLowerCase()] : [];
      const card = new Card(name, quantity, extension, number, tags);
      cards.push(card);
    }
  }

  return cards;
}
