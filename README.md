# Magic: The Gathering MCP Server

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server that provides comprehensive Magic: The Gathering deck management and analysis tools for AI assistants.

## What is this?

This MCP server gives AI assistants the ability to:
- **Manage MTG decks**: Create, edit, and organize Magic decks in memory
- **Parse deck lists**: Import decks from popular sites like Moxfield, EDHRec, and text formats
- **Search cards**: Query the Scryfall database for card information
- **Analyze decks**: Calculate mana curves, consistency metrics, and draw probabilities
- **Simulate gameplay**: Test opening hands and draw scenarios

## Quick Start

### Installation

**Option 1: Direct from GitHub (easiest):**
```bash
# No installation needed! Run directly with bunx
bunx github:username/model-the-context-protocol
```

**Option 2: Clone and run locally:**
```bash
# Clone the repository
git clone <repository-url>
cd model-the-context-protocol

# Install dependencies
bun install
```

### Running the Server

**For Claude Desktop (recommended):**
```bash
# If using bunx from GitHub:
bunx github:username/model-the-context-protocol

# If cloned locally:
bun run src/index.ts
```

**For HTTP clients:**
```bash
# If using bunx from GitHub:
bunx github:username/model-the-context-protocol http --port 8080

# If cloned locally:
bun run src/index.ts http --port 8080
```

### Configuration

Add this to your Claude Desktop config file:

**If using bunx from GitHub:**
```json
{
  "mcpServers": {
    "mtg-deck-manager": {
      "command": "bunx",
      "args": ["github:username/model-the-context-protocol"],
      "env": {}
    }
  }
}
```

**If cloned locally:**
```json
{
  "mcpServers": {
    "mtg-deck-manager": {
      "command": "bun",
      "args": ["run", "/path/to/model-the-context-protocol/src/index.ts"],
      "env": {}
    }
  }
}
```

## Core Features

### Deck Management
- Create and manage multiple decks simultaneously
- Add/remove cards with automatic quantity handling
- Import decks from URLs (Moxfield, EDHRec, etc.) or text
- Save/load decks to/from JSON files
- Format decks for sharing

### Card Search & Data
- Search Magic cards using Scryfall's powerful query syntax
- Get detailed card information including prices, legality, and metadata
- Fetch random cards with optional filtering
- Automatic card name resolution and fuzzy matching

### Deck Analysis
- **Mana Curve Analysis**: Visualize converted mana cost distribution
- **Consistency Metrics**: Calculate probability of drawing key cards
- **Color Analysis**: Examine mana base requirements and color identity
- **Draw Simulation**: Test opening hands and mulligan scenarios
- **Hypergeometric Calculations**: Precise probability calculations for deck optimization

## Example Usage

Once connected to an AI assistant, you can:

```
"Create a new deck called 'Burn' and add 4 Lightning Bolts"
"Import this Moxfield deck: https://www.moxfield.com/decks/xyz123"
"What's the mana curve of my Burn deck?"
"What are the odds of drawing a land in my opening hand?"
"Show me 3 sample opening hands from this deck"
"Find all red creatures with power 3 or greater"
```

## Supported Deck Sources

- **Moxfield**: Full deck import with sideboard support
- **EDHRec**: Commander deck recommendations and lists
- **Text formats**: Standard MTG deck list formats
- **Manual entry**: Add cards one by one with quantities

## Requirements

- **Bun**: JavaScript runtime (v1.2.16+)
- **Internet connection**: For Scryfall API and deck imports
- **MCP-compatible client**: Claude Desktop, or custom MCP client

## Technical Details

- **Protocol**: Model Context Protocol (MCP) for AI assistant integration
- **Runtime**: Bun with TypeScript
- **APIs**: Scryfall for card data, web scraping for deck imports
- **Storage**: In-memory deck management with file export/import
- **Analysis**: Statistical calculations for deck optimization

## License

MIT License - see LICENSE file for details.

## Contributing

This is a specialized tool for MTG deck management via AI assistants. PRs welcome for bug fixes and feature enhancements.