import type {
  DecisionWeights,
  DietaryTag,
  ItemPreferences,
  ProductOffer,
  Quantity,
  Unit,
} from '../domain/index.js';
import { convertAmount } from './units.js';

// A promotion matters more to a household that explicitly asked to be
// nudged toward deals — see docs/decision-engine-architecture.md §5.
const PROMOTION_PREFERRED_BOOST = 1.5;

export interface FactorScore {
  factor: keyof DecisionWeights;
  normalizedScore: number;
  weight: number;
}

export interface ScoredOffer {
  offer: ProductOffer;
  score: number;
  factorScores: FactorScore[];
}

export function resolveWeights(
  overrides: Partial<DecisionWeights> | undefined,
  defaults: DecisionWeights,
): DecisionWeights {
  return { ...defaults, ...overrides };
}

export function scoreCandidates(
  candidates: ProductOffer[],
  preferences: ItemPreferences,
  weights: DecisionWeights,
): ScoredOffer[] {
  const prices = candidates.map((candidate) => candidate.price);
  const unitPrices = candidates
    .map((candidate) => candidate.unitPrice)
    .filter((unitPrice): unitPrice is number => unitPrice !== undefined);

  return candidates.map((offer) => {
    // Only factors with something to compare against contribute to a given
    // offer's score — a preference the household never stated shouldn't
    // silently penalize (or reward) a candidate.
    const factorScores: FactorScore[] = [
      {
        factor: 'price',
        normalizedScore: normalizeInverse(offer.price, prices),
        weight: weights.price,
      },
    ];

    if (offer.unitPrice !== undefined && unitPrices.length > 0) {
      factorScores.push({
        factor: 'unitPrice',
        normalizedScore: normalizeInverse(offer.unitPrice, unitPrices),
        weight: weights.unitPrice,
      });
    }

    const promotionBoost = preferences.preferOnPromotion
      ? PROMOTION_PREFERRED_BOOST
      : 1;
    factorScores.push({
      factor: 'promotion',
      normalizedScore: offer.promotion ? 1 : 0,
      weight: weights.promotion * promotionBoost,
    });

    if (preferences.preferredBrands?.length) {
      factorScores.push({
        factor: 'brandMatch',
        normalizedScore:
          offer.brand && preferences.preferredBrands.includes(offer.brand)
            ? 1
            : 0,
        weight: weights.brandMatch,
      });
    }

    if (preferences.preferredPackageSize) {
      factorScores.push({
        factor: 'packageSizeFit',
        normalizedScore: packageSizeFitScore(
          offer.packageSize,
          preferences.preferredPackageSize,
        ),
        weight: weights.packageSizeFit,
      });
    }

    if (preferences.dietary?.length) {
      factorScores.push({
        factor: 'dietaryMatch',
        normalizedScore: dietaryMatchScore(
          offer.dietaryTags,
          preferences.dietary,
        ),
        weight: weights.dietaryMatch,
      });
    }

    if (preferences.preferredFatPercentage !== undefined) {
      factorScores.push({
        factor: 'fatPercentageMatch',
        normalizedScore:
          offer.fatPercentage === preferences.preferredFatPercentage ? 1 : 0,
        weight: weights.fatPercentageMatch,
      });
    }

    if (preferences.preferredContainerType) {
      factorScores.push({
        factor: 'containerTypeMatch',
        normalizedScore:
          offer.containerType === preferences.preferredContainerType ? 1 : 0,
        weight: weights.containerTypeMatch,
      });
    }

    if (preferences.preferredSizeGrade) {
      factorScores.push({
        factor: 'sizeGradeMatch',
        normalizedScore:
          offer.sizeGrade === preferences.preferredSizeGrade ? 1 : 0,
        weight: weights.sizeGradeMatch,
      });
    }

    return {
      offer,
      score: weightedAverage(factorScores),
      factorScores,
    };
  });
}

function normalizeInverse(value: number, allValues: number[]): number {
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  if (max === min) {
    return 1;
  }
  return (max - value) / (max - min);
}

function weightedAverage(factorScores: FactorScore[]): number {
  const totalWeight = factorScores.reduce(
    (sum, factor) => sum + factor.weight,
    0,
  );
  if (totalWeight === 0) {
    return 0;
  }
  const weightedSum = factorScores.reduce(
    (sum, factor) => sum + factor.weight * factor.normalizedScore,
    0,
  );
  return weightedSum / totalWeight;
}

function packageSizeFitScore(
  actual: Quantity,
  preferred: { amount: number; unit: Unit; tolerance?: number },
): number {
  let actualInPreferredUnit: number;
  try {
    actualInPreferredUnit = convertAmount(actual, preferred.unit);
  } catch {
    // Different dimensions (e.g. preferred "1 l", offer sold by "unit")
    // can't be compared at all, so it can't be a size match.
    return 0;
  }

  // With no explicit tolerance, deviating by the full preferred amount
  // (e.g. 2 l when 1 l was preferred) is treated as a complete mismatch.
  const tolerance = preferred.tolerance ?? preferred.amount;
  if (tolerance === 0) {
    return actualInPreferredUnit === preferred.amount ? 1 : 0;
  }

  const deviation = Math.abs(actualInPreferredUnit - preferred.amount);
  return Math.max(0, 1 - deviation / tolerance);
}

function dietaryMatchScore(
  offerTags: DietaryTag[] | undefined,
  preferredTags: DietaryTag[],
): number {
  if (preferredTags.length === 0) {
    return 1;
  }
  const present = preferredTags.filter((tag) => offerTags?.includes(tag));
  return present.length / preferredTags.length;
}
