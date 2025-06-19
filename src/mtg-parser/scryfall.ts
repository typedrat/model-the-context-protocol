import { Card } from "./card";
import { buildPattern, matchPattern } from "./utilities";

const PATTERN = buildPattern("scryfall.com", String.raw`/(?<user_id>@.+)/decks/(?<deck_id>\w{8}-\w{4}-\w{4}-\w{4}-\w{12})/?`);

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
  const match = source.match(PATTERN);
  if (!match?.groups?.deck_id) {
    throw new Error("Could not extract deck ID from URL");
  }

  const deckId = match.groups.deck_id;
  const url = `https://api.scryfall.com/decks/${deckId}/export/csv`;

  const response = await fetch(url);
  return await response.text();
}

function _parseDeck(deck: string): Card[] {
  const cards: Card[] = [];
  const lines = deck.trim().split("\n");

  if (lines.length === 0) {
    return cards;
  }

  // Parse CSV header
  const header = lines[0]?.split(",").map(col => col.replaceAll("\"", "")) || [];

  // Parse CSV rows
  for (let index = 1; index < lines.length; index++) {
    const line = lines[index];
    if (!line) continue;
    const row = _parseCsvLine(line);
    if (row.length !== header.length) {
      continue; // Skip malformed rows
    }

    const cardData: Record<string, string> = {};
    for (const [index_, element] of header.entries()) {
      cardData[element] = row[index_] || "";
    }

    const name = cardData["name"];
    const count = Number.parseInt(cardData["count"] || "1");
    const setCode = cardData["set_code"];
    const collectorNumber = cardData["collector_number"];
    const section = cardData["section"];

    if (name && !Number.isNaN(count)) {
      const tags = _getTags(section);
      const card = new Card(name, count, setCode || undefined, collectorNumber, tags);
      cards.push(card);
    }
  }

  return cards;
}

function _parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index++) {
    const char = line[index];

    if (char === "\"") {
      if (inQuotes && line[index + 1] === "\"") {
        // Escaped quote
        current += "\"";
        index++; // Skip next quote
      }
      else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    }
    else if (char === "," && !inQuotes) {
      // End of field
      result.push(current);
      current = "";
    }
    else {
      current += char;
    }
  }

  // Add the last field
  result.push(current);

  return result;
}

function _getTags(sectionName?: string): string[] {
  const tags: string[] = [];

  if (sectionName) {
    const section = sectionName.toLowerCase();
    if (section === "commanders") {
      tags.push("commander");
    }
    else if (section === "outside") {
      tags.push("companion");
    }
  }

  return tags;
}
