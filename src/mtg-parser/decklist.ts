import { Card } from "./card";
import { parseLine, type ParsedLine } from "./grammar";

export function canHandle(source: unknown): source is string {
  if (typeof source !== "string") {
    return false;
  }

  try {
    const firstCard = parsedeckInternal(source).next();
    return !firstCard.done;
  }
  catch {
    return false;
  }
}

export function parseDeck(source: string): Card[] | undefined {
  if (!canHandle(source)) {
    return undefined;
  }

  try {
    const cards = [...parsedeckInternal(source)];
    return cards.length > 0 ? cards : undefined;
  }
  catch {
    return undefined;
  }
}

function* parsedeckInternal(deck: string): Generator<Card> {
  const lines = deck
    .split("\n")
    .map(line => line.trim())
    .filter(line => line.length > 0);

  const parsedLines = lines
    .map(line => parseLine(line))
    .filter((line): line is ParsedLine => line !== undefined);

  const collapsedLines = collapseComments(parsedLines);

  for (const line of collapsedLines) {
    yield toCard(line);
  }
}

function* collapseComments(lines: ParsedLine[]): Generator<ParsedLine> {
  let lastComment: string | undefined = undefined;

  for (const line of lines) {
    if (line.comment) {
      lastComment = line.comment;
    }
    else {
      if (lastComment) {
        const tags = line.tags || [];
        tags.push(lastComment);
        line.tags = tags;
      }
      yield line;
    }
  }
}

function toCard(line: ParsedLine): Card {
  return new Card(
    line.card_name || "",
    line.quantity || 1,
    line.extension,
    line.collector_number,
    line.tags,
  );
}

export function formatDeck(cards: Card[]): string {
  return cards.map(card => formatCard(card)).join("\n");
}

function formatCard(card: Card): string {
  let line = `${card.quantity} ${card.name}`;

  // Add extension and collector number if both are present (MTGA format)
  if (card.extension && card.number) {
    line += ` (${card.extension.toUpperCase()}) ${card.number}`;
  }

  // Add tags
  if (card.tags && card.tags.size > 0) {
    const tagStrings = [...card.tags].map((tag) => {
      // Capitalize first letter of each word in tag
      const formatted = tag.split(" ").map(word =>
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
      ).join(" ");
      return `#${formatted}`;
    });
    line += ` ${tagStrings.join(" ")}`;
  }

  return line;
}
