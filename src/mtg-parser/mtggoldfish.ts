import * as cheerio from "cheerio";
import { Card } from "./card";
import { buildPattern, matchPattern } from "./utilities";

const PATTERN = buildPattern("mtggoldfish.com", String.raw`/deck/(?<deck_id>\d+)/?`);

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

async function _downloadDeck(source: string): Promise<string> {
  // First, get the main page to extract CSRF token
  const response = await fetch(source, {
    headers: { Accept: "text/html" },
  });
  const html = await response.text();

  const $ = cheerio.load(html);
  const csrfToken = $("meta[name=\"csrf-token\"]").attr("content");

  // Extract deck ID from URL
  const match = source.match(PATTERN);
  if (!match?.groups?.deck_id) {
    throw new Error("Could not extract deck ID from URL");
  }

  const deckId = match.groups.deck_id;
  const url = `https://www.mtggoldfish.com/deck/component?id=${deckId}`;

  // Make the component request with CSRF token
  const headers: Record<string, string> = {
    "X-Requested-With": "XMLHttpRequest",
  };

  if (csrfToken) {
    headers["X-CSRF-Token"] = csrfToken;
  }

  const componentResponse = await fetch(url, { headers });
  return await componentResponse.text();
}

function _parseDeck(deck: string): Card[] {
  const cards: Card[] = [];

  // Clean up the response text similar to Python implementation
  let cleanDeck = deck.split("\n")[0] || "";
  cleanDeck = cleanDeck
    .replaceAll(String.raw`\'`, "'")
    .replaceAll(String.raw`\"`, "\"")
    .replaceAll(String.raw`\/`, "/")
    .replaceAll(String.raw`\n`, "");

  // Unescape HTML entities
  cleanDeck = cleanDeck
    .replaceAll("&quot;", "\"")
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");

  const $ = cheerio.load(cleanDeck);
  const table = $(".deck-view-deck-table");
  const rows = table.find("tr");

  let currentTag: string | undefined = undefined;

  rows.each((_, row) => {
    const $row = $(row);
    const classes = $row.attr("class") || "";

    if (classes.includes("deck-category-header")) {
      const category = $row.text().toLowerCase();
      currentTag = ["commander", "companion"].find(tag => category.includes(tag));
    }
    else {
      const link = $row.find("a").first();
      const quantityCell = $row.find("td").first();

      if (link.length > 0 && quantityCell.length > 0) {
        const name = link.text().trim();
        const quantity = Number.parseInt(quantityCell.text().trim());
        const dataCardId = link.attr("data-card-id");

        let extension: string | undefined;
        if (dataCardId) {
          const match = dataCardId.match(/\[(.*?)\]/);
          if (match && match[1]) {
            extension = match[1].toLowerCase();
          }
        }

        const tags = currentTag ? [currentTag] : [];
        const card = new Card(name, quantity, extension, undefined, tags);
        cards.push(card);
      }
    }
  });

  return cards;
}
