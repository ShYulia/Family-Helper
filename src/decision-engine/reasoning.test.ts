import { describe, expect, it } from 'vitest';
import { explainDecision, summarizeNoMatchReasons } from './reasoning.js';
import { scoreCandidates } from './scoring.js';
import type { ItemPreferences, ProductOffer } from '../domain/index.js';
import type { RejectedOffer } from './hard-filters.js';
import type { ScoredOffer } from './scoring.js';

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

describe('explainDecision — selection and ordering', () => {
  it('returns at most 4 reasons, ordered by contribution, dropping zero-contribution factors', () => {
    const scored: ScoredOffer = {
      offer: offer(),
      score: 0.8,
      factorScores: [
        { factor: 'price', weight: 1, normalizedScore: 0.9 }, // contribution 0.9
        { factor: 'promotion', weight: 1, normalizedScore: 1 }, // contribution 1
        { factor: 'brandMatch', weight: 1, normalizedScore: 0 }, // contribution 0 — dropped
        { factor: 'packageSizeFit', weight: 2, normalizedScore: 0.5 }, // contribution 1
        { factor: 'dietaryMatch', weight: 1, normalizedScore: 0.2 }, // contribution 0.2
        { factor: 'unitPrice', weight: 1, normalizedScore: 0.1 }, // contribution 0.1 — dropped by cap
      ],
    };

    const reasons = explainDecision(scored, [scored.offer], {});

    expect(reasons).toHaveLength(4);
    expect(reasons[0]).toMatch(/promotion/i);
    expect(reasons[1]).toMatch(/size/i);
    expect(reasons[2]).toMatch(/cheaper/i);
    expect(reasons[3]).toMatch(/dietary/i);
  });

  it('falls back to a generic explanation when nothing contributed positively', () => {
    const scored: ScoredOffer = {
      offer: offer(),
      score: 0,
      factorScores: [
        { factor: 'price', weight: 1, normalizedScore: 0 },
        { factor: 'promotion', weight: 1, normalizedScore: 0 },
      ],
    };

    const reasons = explainDecision(scored, [scored.offer], {});
    expect(reasons).toHaveLength(1);
    expect(reasons[0]).toMatch(/equally-matched/);
  });
});

describe('explainDecision — factor text, via real scoring output', () => {
  it('states a rounded percentage cheaper than the average of the others', () => {
    const cheap = offer({ siteProductId: 'cheap', price: 4 });
    const candidates = [
      cheap,
      offer({ siteProductId: 'a', price: 10 }),
      offer({ siteProductId: 'b', price: 10 }),
    ];
    const weights = {
      price: 1,
      unitPrice: 0,
      promotion: 0,
      brandMatch: 0,
      packageSizeFit: 0,
      dietaryMatch: 0,
    };
    const scored = scoreCandidates(candidates, {}, weights);
    const cheapScored = scored.find((s) => s.offer.siteProductId === 'cheap');
    expect(cheapScored).toBeDefined();

    const reasons = explainDecision(cheapScored!, candidates, {});
    expect(reasons[0]).toBe(
      '60% cheaper than the average of the other options',
    );
  });

  it('includes the promotion description', () => {
    const promoOffer = offer({
      promotion: { kind: 'percent-off', description: '20% off' },
    });
    const scored: ScoredOffer = {
      offer: promoOffer,
      score: 1,
      factorScores: [{ factor: 'promotion', weight: 1, normalizedScore: 1 }],
    };
    const reasons = explainDecision(scored, [promoOffer], {});
    expect(reasons[0]).toBe('currently on promotion: 20% off');
  });

  it('names the matched brand', () => {
    const brandedOffer = offer({ brand: 'Brand A' });
    const scored: ScoredOffer = {
      offer: brandedOffer,
      score: 1,
      factorScores: [{ factor: 'brandMatch', weight: 1, normalizedScore: 1 }],
    };
    const preferences: ItemPreferences = { preferredBrands: ['Brand A'] };
    const reasons = explainDecision(scored, [brandedOffer], preferences);
    expect(reasons[0]).toBe('matches your preferred brand (Brand A)');
  });

  it('states the preferred and actual package sizes', () => {
    const sizedOffer = offer({ packageSize: { amount: 1, unit: 'l' } });
    const scored: ScoredOffer = {
      offer: sizedOffer,
      score: 1,
      factorScores: [
        { factor: 'packageSizeFit', weight: 1, normalizedScore: 1 },
      ],
    };
    const preferences: ItemPreferences = {
      preferredPackageSize: { amount: 1, unit: 'l' },
    };
    const reasons = explainDecision(scored, [sizedOffer], preferences);
    expect(reasons[0]).toBe(
      'close to your preferred size of 1 l (this is 1 l)',
    );
  });

  it('lists the matched dietary tags', () => {
    const dietOffer = offer({ dietaryTags: ['organic', 'vegan'] });
    const scored: ScoredOffer = {
      offer: dietOffer,
      score: 1,
      factorScores: [{ factor: 'dietaryMatch', weight: 1, normalizedScore: 1 }],
    };
    const preferences: ItemPreferences = { dietary: ['organic'] };
    const reasons = explainDecision(scored, [dietOffer], preferences);
    expect(reasons[0]).toBe('matches your dietary preferences (organic)');
  });
});

describe('summarizeNoMatchReasons', () => {
  it('reports no candidates found when the list is empty', () => {
    expect(summarizeNoMatchReasons([])).toBe(
      'no candidates were found for this item',
    );
  });

  it('summarizes a single dominant rejection category', () => {
    const rejected: RejectedOffer[] = [
      {
        offer: offer({ siteProductId: 'a' }),
        reasons: ['missing required dietary tag(s): gluten-free'],
      },
      {
        offer: offer({ siteProductId: 'b' }),
        reasons: ['missing required dietary tag(s): gluten-free'],
      },
      {
        offer: offer({ siteProductId: 'c' }),
        reasons: ['missing required dietary tag(s): vegan'],
      },
    ];
    expect(summarizeNoMatchReasons(rejected)).toBe(
      '3 candidates found; all excluded — none meet the required dietary tags',
    );
  });

  it('uses singular wording for a single rejected candidate', () => {
    const rejected: RejectedOffer[] = [
      { offer: offer(), reasons: ['out of stock'] },
    ];
    expect(summarizeNoMatchReasons(rejected)).toBe(
      '1 candidate found; all excluded — none are in stock',
    );
  });

  it('picks the most frequent category among mixed rejection reasons', () => {
    const rejected: RejectedOffer[] = [
      { offer: offer({ siteProductId: 'a' }), reasons: ['out of stock'] },
      {
        offer: offer({ siteProductId: 'b' }),
        reasons: ['price 5 exceeds maximum of 3'],
      },
      {
        offer: offer({ siteProductId: 'c' }),
        reasons: ['price 6 exceeds maximum of 3'],
      },
    ];
    expect(summarizeNoMatchReasons(rejected)).toBe(
      '3 candidates found; all excluded — all exceed your price limit',
    );
  });

  it('distinguishes a unit-price ceiling from a package-price ceiling', () => {
    const rejected: RejectedOffer[] = [
      { offer: offer(), reasons: ['unit price 5 exceeds maximum of 3'] },
    ];
    expect(summarizeNoMatchReasons(rejected)).toBe(
      '1 candidate found; all excluded — all exceed your per-unit price limit',
    );
  });
});
