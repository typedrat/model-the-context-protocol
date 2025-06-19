import { FastMCP } from "fastmcp";

import packageJson from "../package.json";

const versionMatch = packageJson.version.match(/^(\d+)\.(\d+)\.(\d+)/);
const version = versionMatch
  ? (`${versionMatch[1]}.${versionMatch[2]}.${versionMatch[3]}` as `${number}.${number}.${number}`)
  : ("0.0.0" as `${number}.${number}.${number}`);

export const server = new FastMCP({
  name: packageJson.name,
  version,
});

// Import and register MTG deck tools
import {
  createDeck,
  listDecks,
  getDeck,
  addCards,
  removeCards,
  clearDeck,
  deleteDeck,
  validateMtgSource,
  parseMtgDeck,
  parseMtgDeckToSlot,
  formatMtgDeck,
  saveMtgDeck,
  loadMtgDeck,
} from "./tools/mtg-deck";

// Import Scryfall search tools
import {
  searchScryfallCard,
  getDeckScryfallData,
  getScryfallCard,
  getRandomScryfallCard,
  convertCardToScryfallSearch,
} from "./tools/scryfall-search";

// Register all MTG deck tools
server.addTool(createDeck);
server.addTool(listDecks);
server.addTool(getDeck);
server.addTool(addCards);
server.addTool(removeCards);
server.addTool(clearDeck);
server.addTool(deleteDeck);
server.addTool(validateMtgSource);
server.addTool(parseMtgDeck);
server.addTool(parseMtgDeckToSlot);
server.addTool(formatMtgDeck);
server.addTool(saveMtgDeck);
server.addTool(loadMtgDeck);

// Register Scryfall search tools
server.addTool(searchScryfallCard);
server.addTool(getDeckScryfallData);
server.addTool(getScryfallCard);
server.addTool(getRandomScryfallCard);
server.addTool(convertCardToScryfallSearch);
