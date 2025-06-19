function formatExtension(extension: string | number | undefined | undefined): string | undefined {
  if (!extension) {
    return undefined;
  }
  return String(extension).trim();
}

function formatNumber(number: string | number | undefined | undefined): string | undefined {
  if (!number) {
    return undefined;
  }
  return String(number).trim();
}

function formatTags(tags: (string | number | undefined | undefined)[] | undefined | undefined): Set<string> {
  if (!tags) {
    return new Set();
  }

  return new Set(
    tags
      .filter(Boolean)
      .map(String)
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0)
      .map(tag => tag.toLowerCase()),
  );
}

export class Card {
  public readonly name: string;
  public readonly quantity: number;
  public readonly extension: string | undefined;
  public readonly number: string | undefined;
  public readonly tags: Set<string>;

  constructor(
    name: string,
    quantity: string | number = 1,
    extension?: string | number | undefined,
    number?: string | number | undefined,
    tags?: (string | number | undefined | undefined)[] | undefined,
  ) {
    this.name = name;
    this.quantity = Number(quantity);
    this.extension = formatExtension(extension);
    this.number = formatNumber(number);
    this.tags = formatTags(tags);
  }

  toString(): string {
    return this.getParts().join(" ");
  }

  private getParts(): string[] {
    const parts: string[] = [];

    if (this.quantity) {
      parts.push(String(this.quantity));
    }

    if (this.name) {
      parts.push(this.name);
    }

    if (this.extension) {
      parts.push(`(${this.extension})`);
    }

    if (this.number) {
      parts.push(this.number);
    }

    if (this.tags.size > 0) {
      const sortedTags = [...this.tags].sort();
      parts.push(`[${sortedTags.join(", ")}]`);
    }

    return parts;
  }

  private toTuple(): [string, number, string | undefined, string | undefined, Set<string>] {
    return [
      this.name,
      this.quantity,
      this.extension,
      this.number,
      this.tags,
    ];
  }

  equals(other: Card): boolean {
    const [name1, quantity1, extension1, number1, tags1] = this.toTuple();
    const [name2, quantity2, extension2, number2, tags2] = other.toTuple();

    return (
      name1 === name2
      && quantity1 === quantity2
      && extension1 === extension2
      && number1 === number2
      && this.setsEqual(tags1, tags2)
    );
  }

  lessThan(other: Card): boolean {
    const [name1, quantity1, extension1, number1, tags1] = this.toTuple();
    const [name2, quantity2, extension2, number2, tags2] = other.toTuple();

    // Compare name first
    if (name1 !== name2) {
      return name1 < name2;
    }

    // Then quantity
    if (quantity1 !== quantity2) {
      return quantity1 < quantity2;
    }

    // Then extension (undefined comes before defined)
    if (extension1 !== extension2) {
      if (extension1 === undefined) return true;
      if (extension2 === undefined) return false;
      return extension1 < extension2;
    }

    // Then number (undefined comes before defined)
    if (number1 !== number2) {
      if (number1 === undefined) return true;
      if (number2 === undefined) return false;
      return number1 < number2;
    }

    // Finally tags (convert to sorted arrays for comparison)
    const sortedTags1 = [...tags1].sort();
    const sortedTags2 = [...tags2].sort();

    for (let index = 0; index < Math.max(sortedTags1.length, sortedTags2.length); index++) {
      const tag1 = sortedTags1[index];
      const tag2 = sortedTags2[index];

      if (tag1 === undefined) return true; // shorter array comes first
      if (tag2 === undefined) return false;
      if (tag1 !== tag2) return tag1 < tag2;
    }

    return false; // equal
  }

  lessThanOrEqual(other: Card): boolean {
    return this.equals(other) || this.lessThan(other);
  }

  greaterThan(other: Card): boolean {
    return !this.lessThanOrEqual(other);
  }

  greaterThanOrEqual(other: Card): boolean {
    return !this.lessThan(other);
  }

  notEquals(other: Card): boolean {
    return !this.equals(other);
  }

  private setsEqual(set1: Set<string>, set2: Set<string>): boolean {
    if (set1.size !== set2.size) {
      return false;
    }
    for (const item of set1) {
      if (!set2.has(item)) {
        return false;
      }
    }
    return true;
  }
}
