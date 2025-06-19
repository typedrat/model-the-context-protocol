/* eslint-disable unicorn/prefer-top-level-await */
import * as P from "parsimmon";

export interface ParsedLine {
  quantity?: number;
  card_name?: string;
  extension?: string;
  collector_number?: string;
  tags?: string[];
  comment?: string;
}

// Helper to create a word parser that includes unicode characters
const unicodeWord = P.regexp(/[\w\u00C0-\u017F\u0100-\u024F\u1E00-\u1EFF,/'"_-]+/);

const QUANTITY = P.regexp(/\d+x?/)
  .map(string_ => Number.parseInt(string_.replace(/x$/, ""), 10))
  .desc("quantity");

const COLLECTOR_NUMBER = P.regexp(/[a-zA-Z0-9]+/)
  .desc("collector number");

const EXTENSION = P.regexp(/[a-zA-Z0-9]+/)
  .desc("extension");

const CARD_NAME = unicodeWord
  .sepBy1(P.whitespace)
  .map(parts => parts.join(" "))
  .desc("card name");

const TAG = P.seq(
  P.string("#"),
  P.string("!").fallback(""),
  unicodeWord.sepBy1(P.whitespace).map(parts => parts.join(" ")),
).map(([_hash, _exclamation, tagName]) => tagName)
  .desc("tag");

const MTGA_EXTENSION = P.seq(
  P.string("("),
  EXTENSION,
  P.string(")"),
).map(([_open, extension, _close]) => extension);

const MTGA_LINE = P.seq(
  QUANTITY,
  P.optWhitespace.then(CARD_NAME),
  P.optWhitespace.then(MTGA_EXTENSION),
  P.optWhitespace.then(COLLECTOR_NUMBER),
  P.optWhitespace.then(TAG).many(),
).map(([quantity, card_name, extension, collector_number, tags]) => ({
  quantity,
  card_name,
  extension,
  collector_number,
  tags: tags.length > 0 ? tags : undefined,
}));

const MTGO_LINE = P.seq(
  QUANTITY,
  P.optWhitespace.then(CARD_NAME),
  P.optWhitespace.then(TAG).many(),
).map(([quantity, card_name, tags]) => ({
  quantity,
  card_name,
  tags: tags.length > 0 ? tags : undefined,
}));

const COMMENT_LINE = P.seq(
  P.alt(P.string("//!"), P.string("//"), P.string("#")),
  P.optWhitespace,
  unicodeWord.sepBy1(P.whitespace).map(parts => parts.join(" ")),
).map(([_prefix, _space, comment]) => ({ comment }));

const LINE = P.alt(
  COMMENT_LINE,
  MTGA_LINE,
  MTGO_LINE,
);

export function parseLine(line: string): ParsedLine | undefined {
  try {
    const result = LINE.parse(line.trim());
    if (result.status) {
      return result.value;
    }
    return undefined;
  }
  catch {
    return undefined;
  }
}
