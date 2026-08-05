import type {
  ContainerType,
  DietaryTag,
  Quantity,
  SizeGrade,
  Unit,
} from '../domain/index.js';
import type { SiteSelectors } from './site-selectors.js';

export function buildSearchUrl(config: SiteSelectors, query: string): string {
  return (
    config.baseUrl +
    config.searchPath.replace('{query}', encodeURIComponent(query))
  );
}

export function buildProductUrl(config: SiteSelectors, code: string): string {
  return (
    config.baseUrl +
    config.productPath.replace('{code}', encodeURIComponent(code))
  );
}

// Converts a displayed "price per N base units" (e.g. "0.74 per 100ml")
// into our per-1000-base-units (per kg/l) convention.
export function parseUnitPriceText(
  text: string,
  basisAmount: number,
): number | undefined {
  const match = text.match(/(\d+(?:\.\d+)?)/);
  if (!match) {
    return undefined;
  }
  const displayed = Number(match[1]);
  if (!Number.isFinite(displayed)) {
    return undefined;
  }
  return displayed * (1000 / basisAmount);
}

const UNIT_WORD_PATTERNS: Array<{ pattern: RegExp; unit: Unit }> = [
  { pattern: /^מ["׳'״]?ל/, unit: 'ml' },
  { pattern: /^ליטר/, unit: 'l' },
  { pattern: /^ק["׳'״]?ג/, unit: 'kg' },
  { pattern: /^גר(ם|["׳'״])/, unit: 'g' },
  { pattern: /^יח/, unit: 'unit' },
];

export function parsePackageSizeText(text: string): Quantity | undefined {
  const match = text.trim().match(/^(\d+(?:\.\d+)?)\s*(.+)$/);
  if (!match) {
    return undefined;
  }
  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) {
    return undefined;
  }
  const unitWord = match[2].trim();
  const found = UNIT_WORD_PATTERNS.find(({ pattern }) =>
    pattern.test(unitWord),
  );
  return found ? { amount, unit: found.unit } : undefined;
}

// The site renders package size and brand together as "{size} | {brand}".
export function parseSizeAndBrand(text: string): {
  size?: Quantity;
  brand?: string;
} {
  const [sizePart, brandPart] = text.split('|').map((part) => part.trim());
  return {
    size: sizePart ? parsePackageSizeText(sizePart) : undefined,
    brand: brandPart || undefined,
  };
}

// The site doesn't expose fat percentage as a separate field — it's part
// of the product name (e.g. "חלב מפוסטר 1% בקרטון"). Returns undefined
// rather than guessing when no percentage is present.
export function parseFatPercentage(name: string): number | undefined {
  const match = name.match(/(\d+(?:\.\d+)?)\s*%/);
  if (!match) {
    return undefined;
  }
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : undefined;
}

const CONTAINER_TYPE_PATTERNS: Array<{ pattern: RegExp; type: ContainerType }> = [
  { pattern: /קרטון/, type: 'carton' },
  { pattern: /שקית/, type: 'bag' },
  { pattern: /בקבוק/, type: 'bottle' },
  { pattern: /בכד/, type: 'jar' },
];

// Also parsed from the product name, same reasoning as parseFatPercentage.
// Returns undefined (not 'other') when no known keyword is found — 'other'
// is reserved for a container type we've positively identified but that
// doesn't fit these categories, not "we don't know".
export function parseContainerType(name: string): ContainerType | undefined {
  return CONTAINER_TYPE_PATTERNS.find(({ pattern }) => pattern.test(name))
    ?.type;
}

// Size grading (M/L/S/XL) appears as a standalone Latin-letter token in the
// product name (e.g. "ביצי משק טריות M") — distinct from package *count*,
// which parsePackageSizeText/preferredPackageSize already cover.
export function parseSizeGrade(name: string): SizeGrade | undefined {
  const match = name.match(/\b(XL|S|M|L)\b/);
  return match ? (match[1] as SizeGrade) : undefined;
}

const DIETARY_TAG_PATTERNS: Array<{ pattern: RegExp; tag: DietaryTag }> = [
  { pattern: /אורגני/, tag: 'organic' },
  { pattern: /חופש/, tag: 'free-range' },
  // Matches both the spelled-out "ללא סוכר"/"ללא תוספת סוכר" and the
  // common abbreviated forms "לל\"ס"/"ללת\"ס" (quote character varies:
  // straight ", Hebrew geresh ׳, or gershayim ״ — same set already used
  // by UNIT_WORD_PATTERNS above).
  { pattern: /ללא\s*(?:תוספת\s*)?סוכר|לל(?:ת)?["׳'״]?ס/, tag: 'sugar-free' },
];

// Deliberately narrow: only detects the two tags this project currently
// has a reliable textual signal for in a product name (organic,
// free-range). The other DietaryTag values (gluten-free, vegan, kosher,
// ...) aren't parsed here — a false negative fails a hard dietary filter
// closed (see hard-filters.ts), which is the safe direction, but claiming
// a tag needs a real signal per tag, not a guessed keyword.
export function parseDietaryTags(name: string): DietaryTag[] | undefined {
  const tags = DIETARY_TAG_PATTERNS.filter(({ pattern }) =>
    pattern.test(name),
  ).map(({ tag }) => tag);
  return tags.length > 0 ? tags : undefined;
}
