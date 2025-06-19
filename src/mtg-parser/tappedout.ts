import * as cheerio from "cheerio";
import { Card } from "./card";
import { buildPattern, matchPattern } from "./utilities";

const PATTERN = buildPattern("tappedout.net", String.raw`/mtg-decks/(?<deck_id>.+)/?`);

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
  const url = new URL(source);
  url.searchParams.set("cat", "custom");

  const response = await fetch(url.toString());
  return await response.text();
}

function _parseDeck(deck: string): Card[] {
  const cards: Card[] = [];
  const $ = cheerio.load(deck);
  const boardContainer = $(".board-container");

  // Extract quantities
  const quantities: Record<string, number> = {};
  boardContainer.find("a.qty.board[data-name][data-qty]").each((_, element) => {
    const $element = $(element);
    const name = $element.attr("data-name");
    const qty = $element.attr("data-qty");

    if (name && qty) {
      quantities[name] = Number.parseInt(qty);
    }
  });

  // Extract tags by walking through the DOM structure
  const tags: Record<string, Set<string | undefined>> = {};

  // Find all h3 elements and their following card elements
  boardContainer.find("h3").each((_, h3Element) => {
    const $h3 = $(h3Element);
    let currentTag: string | undefined = _formatTag($h3.text());

    if (currentTag === "commander" || currentTag === "commanders") {
      currentTag = "commander";
    }
    else if (currentTag === "companion" || currentTag === "companions") {
      currentTag = "companion";
    }
    else {
      currentTag = undefined;
    }

    // Find all card-hover elements that come after this h3 until the next h3
    let nextElement = $h3.next();
    while (nextElement.length > 0 && !nextElement.is("h3")) {
      if (nextElement.is("a.card-hover[data-name][data-url]")) {
        const name = nextElement.attr("data-name");
        if (name) {
          if (!tags[name]) {
            tags[name] = new Set();
          }
          tags[name].add(currentTag);
        }
      }

      // Also check children for card-hover elements
      nextElement.find("a.card-hover[data-name][data-url]").each((_, cardElement) => {
        const name = $(cardElement).attr("data-name");
        if (name) {
          if (!tags[name]) {
            tags[name] = new Set();
          }
          tags[name].add(currentTag);
        }
      });

      nextElement = nextElement.next();
    }
  });

  // Combine quantities and tags to create cards
  const allCardNames = new Set([...Object.keys(quantities), ...Object.keys(tags)]);

  for (const cardName of [...allCardNames].sort()) {
    const quantity = quantities[cardName] || 1;
    const cardTags = tags[cardName] ? [...tags[cardName]].filter(t => t !== undefined) as string[] : [];

    const card = new Card(cardName, quantity, undefined, undefined, cardTags);
    cards.push(card);
  }

  return cards;
}

function _formatTag(tag: string): string {
  // Remove quantity parentheses like "(10)" at the end
  const match = tag.match(/^(.*?)(?:\s+\(\d+\))?$/);
  if (match && match[1] !== undefined) {
    tag = match[1];
  }

  // Remove non-word characters except spaces
  tag = tag.replaceAll(/[^\w\s]/g, "");

  // Convert to lowercase and split into words
  const words = tag.toLowerCase().split(/\s+/)
    .map(word => word.trim())
    .filter(word => word.length > 0);

  // Join with underscores
  return words.join("_");
}
