# model-the-context-protocol

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.2.16. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.

## MTG Deck Management Tools

This MCP server includes comprehensive tools for managing Magic: The Gathering decks:

### Basic Deck Operations

#### create_deck

Create a new empty MTG deck with the given name.

**Parameters:**
- `name` (string) - Name for the new deck

**Example:**
```json
{
  "name": "My Standard Deck"
}
```

#### list_decks

List all current deck names and their card counts.

**Parameters:** None

**Returns:** Array of deck information including name, unique card count, and total card count.

#### get_deck

Get the contents of a specific deck.

**Parameters:**
- `name` (string) - Name of the deck to retrieve

**Example:**
```json
{
  "name": "My Standard Deck"
}
```

#### delete_deck

Delete a deck entirely.

**Parameters:**
- `name` (string) - Name of the deck to delete

### Card Management

#### add_cards

Add cards to a deck. If the card already exists, quantities will be merged.

**Parameters:**
- `deck_name` (string) - Name of the deck to add cards to
- `card_name` (string) - Name of the card to add
- `quantity` (number, optional) - Number of copies to add (default: 1)

**Example:**
```json
{
  "deck_name": "My Standard Deck",
  "card_name": "Lightning Bolt",
  "quantity": 4
}
```

#### remove_cards

Remove cards from a deck. If quantity is not specified, removes all copies.

**Parameters:**
- `deck_name` (string) - Name of the deck to remove cards from
- `card_name` (string) - Name of the card to remove
- `quantity` (number, optional) - Number of copies to remove. If not specified, removes all copies

#### clear_deck

Remove all cards from a deck, leaving it empty.

**Parameters:**
- `name` (string) - Name of the deck to clear

### Deck Parsing and Validation

#### validate_mtg_source

Check if a source (URL or text content) can be parsed as an MTG deck.

**Parameters:**
- `source` (string) - URL or text content to validate

**Example:**
```json
{
  "source": "https://www.moxfield.com/decks/abc123"
}
```

#### parse_mtg_deck

Parse an MTG deck from a URL or text content, returning the cards without storing them.

**Parameters:**
- `source` (string) - URL or text content to parse

**Returns:** Parsed cards array with metadata about the parsing process.

#### parse_mtg_deck_to_slot

Parse an MTG deck from a URL or text content directly into a named deck slot.

**Parameters:**
- `source` (string) - URL or text content to parse
- `deck_name` (string) - Name for the deck slot to store the parsed cards
- `merge` (boolean, optional) - If true, merge with existing deck. If false, replace existing deck (default: false)

**Example:**
```json
{
  "source": "https://www.moxfield.com/decks/abc123",
  "deck_name": "Imported Deck",
  "merge": false
}
```

### Deck Formatting and File Operations

#### format_mtg_deck

Get the readable text format of a deck.

**Parameters:**
- `deck_name` (string) - Name of the deck to format

**Returns:** Formatted deck text suitable for sharing or viewing.

#### save_mtg_deck

Save a deck to local files in both JSON and readable text formats.

**Parameters:**
- `deck_name` (string) - Name of the deck to save
- `filepath` (string) - Path where to save the deck (without extension)

**Example:**
```json
{
  "deck_name": "My Standard Deck",
  "filepath": "./decks/standard_deck"
}
```

**Creates:** Two files - `{filepath}.json` and `{filepath}.txt`

#### load_mtg_deck

Load a deck from a JSON file into a deck slot.

**Parameters:**
- `filepath` (string) - Path to the JSON file to load
- `deck_name` (string, optional) - Name for the deck slot. If not provided, uses the saved deck name

**Example:**
```json
{
  "filepath": "./decks/standard_deck.json",
  "deck_name": "Loaded Standard Deck"
}
```

## Scryfall Tools

This MCP server includes tools for searching Magic: The Gathering cards using the Scryfall API:

### search_scryfall_card

Search for Magic cards by name or using a Card object from the MTG parser.

**Parameters:**

- `query` (string | Card object) - Either a card name string or a Card JSON object with name and optional set/number info
- `exact` (boolean, optional) - Whether to search for exact name match (default: false for fuzzy search)
- `set` (string, optional) - Set code to filter results (e.g., 'dom', 'war')
- `include_extras` (boolean, optional) - Include extra cards like tokens and art cards
- `include_multilingual` (boolean, optional) - Include non-English cards
- `unique` (enum, optional) - How to handle duplicate cards ("cards", "art", "prints")

**Example:**

```json
{
  "query": "Lightning Bolt",
  "exact": false,
  "set": "lea"
}
```

### get_scryfall_card

Get a specific Magic card by ID or exact name.

**Parameters:**

- `identifier` (string) - Card identifier (Scryfall ID, name, etc.)
- `kind` (enum, optional) - Type of identifier: "scryfall", "multiverse", "arena", "mtgo", "tcg", "fuzzyName", "name", "exactName"
- `set` (string, optional) - Set code to specify which printing

**Example:**

```json
{
  "identifier": "Black Lotus",
  "kind": "fuzzyName"
}
```

### get_random_scryfall_card

Get a random Magic card, optionally matching search criteria.

**Parameters:**

- `search` (string, optional) - Optional search query to filter random results (e.g., 'c:blue t:creature')

**Example:**

```json
{
  "search": "t:creature c:red"
}
```

### convert_card_to_scryfall_search

Convert a Card object from the MTG parser to a Scryfall search query string.

**Parameters:**

- `card` (Card object) - Card object with name and optional set/number information

**Example:**

```json
{
  "card": {
    "name": "Teferi, Time Raveler",
    "extension": "war",
    "number": "221"
  }
}
```

All tools return JSON responses with a `success` field indicating whether the operation was successful, along with relevant data or error messages.
