import type { ItemPreferences, ProductOffer } from '../domain/index.js';

export interface RejectedOffer {
  offer: ProductOffer;
  reasons: string[];
}

export interface HardFilterResult {
  passed: ProductOffer[];
  rejected: RejectedOffer[];
}

export function applyHardFilters(
  preferences: ItemPreferences,
  candidates: ProductOffer[],
): HardFilterResult {
  const passed: ProductOffer[] = [];
  const rejected: RejectedOffer[] = [];

  for (const offer of candidates) {
    const reasons = hardFilterReasons(preferences, offer);
    if (reasons.length === 0) {
      passed.push(offer);
    } else {
      rejected.push({ offer, reasons });
    }
  }

  return { passed, rejected };
}

function hardFilterReasons(
  preferences: ItemPreferences,
  offer: ProductOffer,
): string[] {
  const reasons: string[] = [];

  if (!offer.available) {
    reasons.push('out of stock');
  }

  if (offer.brand && preferences.excludedBrands?.includes(offer.brand)) {
    reasons.push(`brand "${offer.brand}" is excluded`);
  }

  // Dietary tags are treated as a requirement, not a nicety (see
  // docs/decision-engine-architecture.md §4) — if the catalog doesn't say a
  // product carries a required tag, it fails closed rather than being
  // assumed to qualify.
  if (preferences.dietary?.length) {
    const missing = preferences.dietary.filter(
      (tag) => !offer.dietaryTags?.includes(tag),
    );
    if (missing.length > 0) {
      reasons.push(`missing required dietary tag(s): ${missing.join(', ')}`);
    }
  }

  if (
    preferences.maxPrice !== undefined &&
    offer.price > preferences.maxPrice
  ) {
    reasons.push(
      `price ${offer.price} exceeds maximum of ${preferences.maxPrice}`,
    );
  }

  // Unlike dietary tags, a missing unitPrice isn't treated as a violation —
  // there's no safety concern in skipping a ceiling we simply can't verify.
  if (
    preferences.maxUnitPrice !== undefined &&
    offer.unitPrice !== undefined &&
    offer.unitPrice > preferences.maxUnitPrice
  ) {
    reasons.push(
      `unit price ${offer.unitPrice} exceeds maximum of ${preferences.maxUnitPrice}`,
    );
  }

  // preferredBrands is normally a soft scoring input (see scoring, next
  // step) — it only becomes a hard filter when the user has explicitly
  // opted out of substitution for this item.
  if (
    preferences.substitutionAllowed === false &&
    preferences.preferredBrands?.length &&
    (!offer.brand || !preferences.preferredBrands.includes(offer.brand))
  ) {
    reasons.push(
      'brand is not in the preferred list and substitution is not allowed',
    );
  }

  return reasons;
}
