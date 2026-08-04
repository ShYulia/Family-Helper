import { describe, expect, it } from 'vitest';
import { resolveWeights, scoreCandidates } from './scoring.js';
import type {
  DecisionWeights,
  ItemPreferences,
  ProductOffer,
} from '../domain/index.js';

function offer(overrides: Partial<ProductOffer> = {}): ProductOffer {
  return {
    siteProductId: 'abc123',
    name: 'Oat milk',
    packageSize: { amount: 1, unit: 'l' },
    price: 1.29,
    currency: 'EUR',
    available: true,
    fetchedAt: '2026-08-04T09:00:00Z',
    ...overrides,
  };
}

const zeroWeights: DecisionWeights = {
  price: 0,
  unitPrice: 0,
  promotion: 0,
  brandMatch: 0,
  packageSizeFit: 0,
  dietaryMatch: 0,
};

describe('resolveWeights', () => {
  it('falls back to defaults when no overrides are given', () => {
    expect(resolveWeights(undefined, zeroWeights)).toEqual(zeroWeights);
  });

  it('overrides only the fields provided', () => {
    const defaults: DecisionWeights = {
      ...zeroWeights,
      price: 1,
      brandMatch: 2,
    };
    expect(resolveWeights({ brandMatch: 5 }, defaults)).toEqual({
      ...defaults,
      brandMatch: 5,
    });
  });
});

describe('scoreCandidates — price', () => {
  it('scores the cheapest candidate 1 and the most expensive 0', () => {
    const weights: DecisionWeights = { ...zeroWeights, price: 1 };
    const candidates = [
      offer({ price: 0 }),
      offer({ price: 6 }),
      offer({ price: 10 }),
    ];
    const scored = scoreCandidates(candidates, {}, weights);
    expect(scored[0]?.score).toBeCloseTo(1, 5);
    expect(scored[1]?.score).toBeCloseTo(0.4, 5);
    expect(scored[2]?.score).toBeCloseTo(0, 5);
  });

  it('scores every candidate 1 when all prices are equal', () => {
    const weights: DecisionWeights = { ...zeroWeights, price: 1 };
    const candidates = [offer({ price: 5 }), offer({ price: 5 })];
    const scored = scoreCandidates(candidates, {}, weights);
    expect(scored.every((s) => s.score === 1)).toBe(true);
  });
});

describe('scoreCandidates — unitPrice', () => {
  it('omits the unitPrice factor for a candidate that has none', () => {
    const withUnitPrice = offer({ unitPrice: 2 });
    const withoutUnitPrice = offer({ unitPrice: undefined });
    const scored = scoreCandidates(
      [withUnitPrice, withoutUnitPrice],
      {},
      { ...zeroWeights, unitPrice: 1 },
    );
    expect(scored[0]?.factorScores.some((f) => f.factor === 'unitPrice')).toBe(
      true,
    );
    expect(scored[1]?.factorScores.some((f) => f.factor === 'unitPrice')).toBe(
      false,
    );
  });

  it('normalizes across only the candidates that have a unitPrice', () => {
    const candidates = [
      offer({ unitPrice: 2 }),
      offer({ unitPrice: undefined }),
      offer({ unitPrice: 4 }),
    ];
    const scored = scoreCandidates(
      candidates,
      {},
      { ...zeroWeights, unitPrice: 1 },
    );
    expect(scored[0]?.score).toBeCloseTo(1, 5);
    expect(scored[2]?.score).toBeCloseTo(0, 5);
  });
});

describe('scoreCandidates — promotion', () => {
  it('boosts the promotion weight when preferOnPromotion is set', () => {
    const withPromotion = offer({
      price: 6,
      promotion: { kind: 'percent-off', description: '20% off' },
    });
    const filler = [offer({ price: 0 }), offer({ price: 10 })];
    const weights: DecisionWeights = { ...zeroWeights, price: 1, promotion: 1 };

    const withoutBoost = scoreCandidates(
      [withPromotion, ...filler],
      {},
      weights,
    )[0];
    const withBoost = scoreCandidates(
      [withPromotion, ...filler],
      { preferOnPromotion: true },
      weights,
    )[0];

    expect(withoutBoost?.score).toBeCloseTo(0.7, 5);
    expect(withBoost?.score).toBeCloseTo(0.76, 5);
  });
});

describe('scoreCandidates — brandMatch', () => {
  it('omits brandMatch when no preferredBrands are set', () => {
    const scored = scoreCandidates(
      [offer({ brand: 'Brand A' })],
      {},
      zeroWeights,
    );
    expect(scored[0]?.factorScores.some((f) => f.factor === 'brandMatch')).toBe(
      false,
    );
  });

  it('scores 1 for a preferred brand and 0 otherwise', () => {
    const preferences: ItemPreferences = { preferredBrands: ['Brand A'] };
    const scored = scoreCandidates(
      [offer({ brand: 'Brand A' }), offer({ brand: 'Brand B' })],
      preferences,
      zeroWeights,
    );
    const factorFor = (i: number) =>
      scored[i]?.factorScores.find((f) => f.factor === 'brandMatch')
        ?.normalizedScore;
    expect(factorFor(0)).toBe(1);
    expect(factorFor(1)).toBe(0);
  });
});

describe('scoreCandidates — packageSizeFit', () => {
  const factorScoreFor = (
    candidate: ProductOffer,
    preferences: ItemPreferences,
  ) =>
    scoreCandidates(
      [candidate],
      preferences,
      zeroWeights,
    )[0]?.factorScores.find((f) => f.factor === 'packageSizeFit')
      ?.normalizedScore;

  it('scores 1 for an exact match', () => {
    const preferences: ItemPreferences = {
      preferredPackageSize: { amount: 1, unit: 'l' },
    };
    expect(
      factorScoreFor(
        offer({ packageSize: { amount: 1, unit: 'l' } }),
        preferences,
      ),
    ).toBe(1);
  });

  it('decays to 0 at the default tolerance (the preferred amount itself)', () => {
    const preferences: ItemPreferences = {
      preferredPackageSize: { amount: 1, unit: 'l' },
    };
    expect(
      factorScoreFor(
        offer({ packageSize: { amount: 2, unit: 'l' } }),
        preferences,
      ),
    ).toBe(0);
  });

  it('scores 0.5 halfway to the default tolerance', () => {
    const preferences: ItemPreferences = {
      preferredPackageSize: { amount: 1, unit: 'l' },
    };
    expect(
      factorScoreFor(
        offer({ packageSize: { amount: 1.5, unit: 'l' } }),
        preferences,
      ),
    ).toBeCloseTo(0.5, 5);
  });

  it('respects a custom tolerance', () => {
    const preferences: ItemPreferences = {
      preferredPackageSize: { amount: 1, unit: 'l', tolerance: 0.2 },
    };
    expect(
      factorScoreFor(
        offer({ packageSize: { amount: 1.1, unit: 'l' } }),
        preferences,
      ),
    ).toBeCloseTo(0.5, 5);
  });

  it('scores 0 when the units are dimensionally incompatible', () => {
    const preferences: ItemPreferences = {
      preferredPackageSize: { amount: 1, unit: 'l' },
    };
    expect(
      factorScoreFor(
        offer({ packageSize: { amount: 1, unit: 'unit' } }),
        preferences,
      ),
    ).toBe(0);
  });
});

describe('scoreCandidates — dietaryMatch', () => {
  it('omits dietaryMatch when no dietary preference is set', () => {
    const scored = scoreCandidates([offer()], {}, zeroWeights);
    expect(
      scored[0]?.factorScores.some((f) => f.factor === 'dietaryMatch'),
    ).toBe(false);
  });

  it('scores the fraction of preferred tags the offer has', () => {
    const preferences: ItemPreferences = { dietary: ['organic', 'vegan'] };
    const scored = scoreCandidates(
      [offer({ dietaryTags: ['organic'] })],
      preferences,
      zeroWeights,
    );
    expect(
      scored[0]?.factorScores.find((f) => f.factor === 'dietaryMatch')
        ?.normalizedScore,
    ).toBeCloseTo(0.5, 5);
  });
});
