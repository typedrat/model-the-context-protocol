function formatName(cardName: string): string {
  return encodeURIComponent(
    cardName
      .split(/\s+/)
      .map(word => word.trim())
      .filter(word => word.length > 0)
      .join(" "),
  );
}

function formatExtension(extension: string): string {
  return extension.trim().toLowerCase();
}

function formatNumber(number: string): string {
  return encodeURIComponent(number.trim());
}

export function getScryfallUrl(name?: string, extension?: string, number?: string): string {
  let scryfallUrl = "https://api.scryfall.com/cards";

  if (extension && number) {
    scryfallUrl += `/${formatExtension(extension)}`;
    scryfallUrl += `/${formatNumber(number)}`;
  }
  else if (name && extension) {
    scryfallUrl += "/named";
    scryfallUrl += `?set=${formatExtension(extension)}`;
    scryfallUrl += `&exact=${formatName(name)}`;
  }
  else if (name) {
    scryfallUrl += "/named";
    scryfallUrl += `?exact=${formatName(name)}`;
  }

  return scryfallUrl;
}

export function buildPattern(domain: string, path: string = ""): string {
  const scheme = "^(?:https?://)?";
  const subdomain = String.raw`(?:[a-zA-Z0-9-]+\.)*`;
  const escapedDomain = domain.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`).replace(/\/$/, "");
  const pathSeparator = path.startsWith("/") ? "" : "/";

  return scheme + subdomain + escapedDomain + pathSeparator + path;
}

export function matchPattern(url: string, pattern: string): boolean {
  if (typeof url !== "string" || typeof pattern !== "string") {
    return false;
  }

  const regex = new RegExp(pattern);
  return regex.test(url);
}
