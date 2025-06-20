import scryfall from "scryfall-client";

// Set user agent for Scryfall API
scryfall.setUserAgent("model-the-context-protocol/0.1.0");

// Cache configuration
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 1000;

// Scryfall card interface for the properties we use
export interface ScryfallCard {
  id?: string;
  name?: string;
  mana_cost?: string;
  cmc?: number;
  type_line?: string;
  set?: string;
  collector_number?: string;
  scryfall_uri?: string;
  image_uris?: {
    small?: string;
    normal?: string;
    large?: string;
  };
  card_faces?: Array<{
    name?: string;
    mana_cost?: string;
    type_line?: string;
  }>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any; // Allow other properties
}

// Search result interface
export interface ScryfallSearchResult {
  data?: ScryfallCard[];
  total_cards?: number;
  has_more?: boolean;
  length?: number;
  [Symbol.iterator]?: () => Iterator<ScryfallCard>;
  [key: number]: ScryfallCard;
}

// Cache entry interface
interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
}

// In-memory cache
const cache = new Map<string, CacheEntry>();

// Helper function to generate cache keys
function generateCacheKey(type: string, ...parameters: (string | number | boolean | object)[]): string {
  const parameterString = parameters.map(p =>
    typeof p === "object" ? JSON.stringify(p) : String(p),
  ).join("|");
  return `${type}:${parameterString}`;
}

// Helper function to check if cache entry is valid
function isCacheValid(entry: CacheEntry): boolean {
  return Date.now() - entry.timestamp < CACHE_TTL_MS;
}

// Helper function to manage cache size
function evictOldestEntries(): void {
  if (cache.size <= MAX_CACHE_SIZE) return;

  const entries = [...cache.entries()];
  entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

  const toRemove = entries.slice(0, entries.length - MAX_CACHE_SIZE);
  for (const [key] of toRemove) {
    cache.delete(key);
  }
}

// Helper function to get from cache or execute function
async function getCachedOrFetch<T>(
  cacheKey: string,
  fetchFunction: () => Promise<T>,
): Promise<T> {
  // Check cache first
  const cached = cache.get(cacheKey);
  if (cached && isCacheValid(cached)) {
    return cached.data as T;
  }

  // Fetch new data
  try {
    const data = await fetchFunction();

    // Store in cache
    cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
    });

    // Manage cache size
    evictOldestEntries();

    return data;
  }
  catch (error) {
    // If we have stale cache data, return it as fallback
    if (cached) {
      console.warn(`Scryfall API error, using stale cache for ${cacheKey}:`, error);
      return cached.data as T;
    }
    throw error;
  }
}

// Unified function to get card by name
export async function getScryfallCardByName(
  name: string,
  options: { kind?: "exact" | "fuzzy"; set?: string } = {},
): Promise<ScryfallCard> {
  const { kind = "fuzzy", set } = options;
  const searchOptions: Record<string, string> = { kind };
  if (set) searchOptions.set = set;

  const cacheKey = generateCacheKey("cardByName", name, searchOptions);

  return getCachedOrFetch(cacheKey, async () => {
    return await scryfall.getCardNamed(name, searchOptions);
  }) as Promise<ScryfallCard>;
}

// Unified function to get card by ID
export async function getScryfallCardById(
  identifier: string,
  kind?: "scryfall" | "multiverse" | "arena" | "mtgo" | "tcg",
): Promise<ScryfallCard> {
  const cacheKey = generateCacheKey("cardById", identifier, kind || "scryfall");

  return getCachedOrFetch(cacheKey, async () => {
    return await (kind ? scryfall.getCard(identifier, kind) : scryfall.getCard(identifier));
  }) as Promise<ScryfallCard>;
}

// Unified function to search cards
export async function searchScryfallCards(
  query: string,
  options: {
    set?: string;
    include_extras?: boolean;
    include_multilingual?: boolean;
    unique?: "cards" | "art" | "prints";
    page?: number;
  } = {},
): Promise<ScryfallSearchResult> {
  const cacheKey = generateCacheKey("search", query, options);

  return getCachedOrFetch(cacheKey, async () => {
    return await scryfall.search(query, options);
  }) as Promise<ScryfallSearchResult>;
}

// Unified function to get random card
export async function getScryfallRandomCard(searchQuery?: string): Promise<ScryfallCard> {
  // Don't cache random cards since they should be different each time
  // But we can cache for a very short time to avoid rapid repeated calls
  const shortCacheKey = generateCacheKey("random", searchQuery || "");
  const cached = cache.get(shortCacheKey);

  // Only use cache if it's less than 10 seconds old for random cards
  if (cached && (Date.now() - cached.timestamp < 10 * 1000)) {
    return cached.data as ScryfallCard;
  }

  const data = await scryfall.random(searchQuery);

  cache.set(shortCacheKey, {
    data,
    timestamp: Date.now(),
  });

  return data as ScryfallCard;
}

// Helper function to get card data with fallback to search
export async function getScryfallCardWithFallback(
  name: string,
  options: {
    set?: string;
    fuzzy?: boolean;
    include_extras?: boolean;
    include_multilingual?: boolean;
  } = {},
): Promise<ScryfallCard> {
  const { set, fuzzy = true, ...searchOptions } = options;

  try {
    // Try exact name match first if not fuzzy
    if (!fuzzy) {
      return await getScryfallCardByName(name, { kind: "exact", set });
    }

    // Try fuzzy name match
    return await getScryfallCardByName(name, { kind: "fuzzy", set });
  }
  catch {
    // Fall back to general search
    const searchQuery = set ? `"${name}" set:${set}` : `"${name}"`;
    const searchResult = await searchScryfallCards(searchQuery, searchOptions);

    if (searchResult && searchResult.data && searchResult.data.length > 0) {
      return searchResult.data[0]!;
    }

    throw new Error(`No results found for card: ${name}`);
  }
}

// Function to clear cache (useful for testing or memory management)
export function clearScryfallCache(): void {
  cache.clear();
}

// Function to get cache stats
export function getScryfallCacheStats(): {
  size: number;
  maxSize: number;
  ttlMs: number;
  entries: Array<{ key: string; age: number }>;
} {
  const now = Date.now();
  return {
    size: cache.size,
    maxSize: MAX_CACHE_SIZE,
    ttlMs: CACHE_TTL_MS,
    entries: [...cache.entries()].map(([key, entry]) => ({
      key,
      age: now - entry.timestamp,
    })),
  };
}
