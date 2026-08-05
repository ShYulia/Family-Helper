import type {
  DecisionWeights,
  ItemPreferences,
  ProductOffer,
} from '../domain/index.js';
import type { RejectedOffer } from './hard-filters.js';
import type { FactorScore, ScoredOffer } from './scoring.js';

const MAX_REASONS = 4;
// Guards against floating-point noise (e.g. 1e-17) counting as "contributed".
const MIN_CONTRIBUTION = 1e-9;

export function explainDecision(
  scored: ScoredOffer,
  candidates: ProductOffer[],
  preferences: ItemPreferences,
): string[] {
  const contributing = scored.factorScores
    .map((factor) => ({
      factor,
      contribution: factor.weight * factor.normalizedScore,
    }))
    .filter(({ contribution }) => contribution > MIN_CONTRIBUTION)
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, MAX_REASONS);

  if (contributing.length === 0) {
    return [
      'no candidate stood out on price, brand, or your other preferences — this one was selected among equally-matched options',
    ];
  }

  return contributing.map(({ factor }) =>
    describeFactor(factor, scored.offer, candidates, preferences),
  );
}

export function summarizeNoMatchReasons(rejected: RejectedOffer[]): string {
  if (rejected.length === 0) {
    return 'no candidates were found for this item';
  }

  const categoryCounts = new Map<string, number>();
  for (const { reasons } of rejected) {
    for (const reason of reasons) {
      const category = categorizeRejectionReason(reason);
      categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
    }
  }

  const topCategory = [...categoryCounts.entries()].sort(
    (a, b) => b[1] - a[1],
  )[0]?.[0];
  const candidateWord = rejected.length === 1 ? 'candidate' : 'candidates';
  return topCategory
    ? `${rejected.length} ${candidateWord} found; all excluded — ${topCategory}`
    : `${rejected.length} ${candidateWord} found; all excluded`;
}

function describeFactor(
  factor: FactorScore,
  offer: ProductOffer,
  candidates: ProductOffer[],
  preferences: ItemPreferences,
): string {
  const key: keyof DecisionWeights = factor.factor;
  switch (key) {
    case 'price':
      return describePrice(offer, candidates);
    case 'unitPrice':
      return describeUnitPrice(offer, candidates);
    case 'promotion':
      return describePromotion(offer);
    case 'brandMatch':
      return describeBrandMatch(offer);
    case 'packageSizeFit':
      return describePackageSizeFit(offer, preferences);
    case 'dietaryMatch':
      return describeDietaryMatch(offer, preferences);
    case 'fatPercentageMatch':
      return describeFatPercentageMatch(offer);
    case 'containerTypeMatch':
      return describeContainerTypeMatch(offer);
    case 'sizeGradeMatch':
      return describeSizeGradeMatch(offer);
  }
}

function describePrice(
  offer: ProductOffer,
  candidates: ProductOffer[],
): string {
  const others = candidates
    .filter((candidate) => candidate.siteProductId !== offer.siteProductId)
    .map((candidate) => candidate.price);
  const pct = percentCheaperThanAverage(offer.price, others);
  return pct !== undefined && pct > 0
    ? `${pct}% cheaper than the average of the other options`
    : 'one of the cheaper options available';
}

function describeUnitPrice(
  offer: ProductOffer,
  candidates: ProductOffer[],
): string {
  if (offer.unitPrice === undefined) {
    return 'better value per unit than the alternatives';
  }
  const others = candidates
    .filter((candidate) => candidate.siteProductId !== offer.siteProductId)
    .map((candidate) => candidate.unitPrice)
    .filter((unitPrice): unitPrice is number => unitPrice !== undefined);
  const pct = percentCheaperThanAverage(offer.unitPrice, others);
  return pct !== undefined && pct > 0
    ? `${pct}% cheaper per unit than the average of the other options`
    : 'better value per unit than the alternatives';
}

function describePromotion(offer: ProductOffer): string {
  return offer.promotion?.description
    ? `currently on promotion: ${offer.promotion.description}`
    : 'currently on promotion';
}

function describeBrandMatch(offer: ProductOffer): string {
  return offer.brand
    ? `matches your preferred brand (${offer.brand})`
    : 'matches your preferred brand';
}

function describePackageSizeFit(
  offer: ProductOffer,
  preferences: ItemPreferences,
): string {
  const preferred = preferences.preferredPackageSize;
  if (!preferred) {
    return 'close to your preferred package size';
  }
  return `close to your preferred size of ${preferred.amount} ${preferred.unit} (this is ${offer.packageSize.amount} ${offer.packageSize.unit})`;
}

function describeDietaryMatch(
  offer: ProductOffer,
  preferences: ItemPreferences,
): string {
  const matchedTags = offer.dietaryTags?.filter((tag) =>
    preferences.dietary?.includes(tag),
  );
  return matchedTags?.length
    ? `matches your dietary preferences (${matchedTags.join(', ')})`
    : 'matches your dietary preferences';
}

function describeFatPercentageMatch(offer: ProductOffer): string {
  return offer.fatPercentage !== undefined
    ? `matches your preferred fat percentage (${offer.fatPercentage}%)`
    : 'matches your preferred fat percentage';
}

function describeContainerTypeMatch(offer: ProductOffer): string {
  return offer.containerType
    ? `matches your preferred packaging (${offer.containerType})`
    : 'matches your preferred packaging';
}

function describeSizeGradeMatch(offer: ProductOffer): string {
  return offer.sizeGrade
    ? `matches your preferred size grade (${offer.sizeGrade})`
    : 'matches your preferred size grade';
}

function percentCheaperThanAverage(
  value: number,
  others: number[],
): number | undefined {
  if (others.length === 0) {
    return undefined;
  }
  const average = others.reduce((sum, other) => sum + other, 0) / others.length;
  if (average <= 0) {
    return undefined;
  }
  return Math.round(((average - value) / average) * 100);
}

function categorizeRejectionReason(reason: string): string {
  if (reason === 'out of stock') {
    return 'none are in stock';
  }
  if (reason.startsWith('brand') && reason.includes('excluded')) {
    return 'all matches are excluded brands';
  }
  if (reason.startsWith('missing required dietary')) {
    return 'none meet the required dietary tags';
  }
  if (reason.startsWith('missing required keyword')) {
    return 'none match the required name keywords';
  }
  if (reason.includes('unit price') && reason.includes('exceeds maximum')) {
    return 'all exceed your per-unit price limit';
  }
  if (reason.includes('exceeds maximum')) {
    return 'all exceed your price limit';
  }
  if (reason.includes('preferred list')) {
    return 'none match your preferred brands';
  }
  return reason;
}
