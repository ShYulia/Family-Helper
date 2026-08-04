import { describe, expect, it } from 'vitest';
import { RuleBasedDecisionEngine } from './engine.js';
import type {
  DecisionWeights,
  ProductOffer,
  RecurringItem,
} from '../domain/index.js';

function item(overrides: Partial<RecurringItem> = {}): RecurringItem {
  return {
    id: 'item-1',
    label: 'Milk',
    searchTerms: ['milk'],
    quantity: { amount: 2, unit: 'l' },
    frequency: { everyNDays: 7 },
    priority: 'medium',
    preferences: {},
    active: true,
    ...overrides,
  };
}

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

const defaultWeights: DecisionWeights = {
  price: 1,
  unitPrice: 1,
  promotion: 1,
  brandMatch: 1,
  packageSizeFit: 1,
  dietaryMatch: 1,
};

describe('RuleBasedDecisionEngine — decided path', () => {
  it('chooses the cheapest surviving candidate and computes quantity to buy', async () => {
    const engine = new RuleBasedDecisionEngine();
    const candidates = [
      offer({ siteProductId: 'a', price: 1 }),
      offer({ siteProductId: 'b', price: 2 }),
      offer({ siteProductId: 'c', price: 1.5 }),
    ];

    const result = await engine.decide({
      item: item(),
      candidates,
      defaultWeights,
    });

    expect(result.status).toBe('decided');
    if (result.status !== 'decided') return;
    expect(result.decision.chosenOffer.siteProductId).toBe('a');
    expect(result.decision.quantityToBuy).toBe(2);
    expect(result.decision.reasoning.length).toBeGreaterThan(0);
    expect(
      result.decision.alternativesConsidered?.map((o) => o.siteProductId),
    ).toEqual(['c', 'b']);
  });

  it('lets a heavily-weighted brand preference outweigh a large price difference', async () => {
    const engine = new RuleBasedDecisionEngine();
    const candidates = [
      offer({ siteProductId: 'cheap', price: 1 }),
      offer({ siteProductId: 'branded', price: 5, brand: 'Brand B' }),
    ];
    const preferredItem = item({
      preferences: {
        preferredBrands: ['Brand B'],
        weights: { brandMatch: 100 },
      },
    });

    const result = await engine.decide({
      item: preferredItem,
      candidates,
      defaultWeights,
    });

    expect(result.status).toBe('decided');
    if (result.status !== 'decided') return;
    expect(result.decision.chosenOffer.siteProductId).toBe('branded');
  });

  it('caps alternativesConsidered and excludes the chosen offer', async () => {
    const engine = new RuleBasedDecisionEngine();
    const candidates = Array.from({ length: 8 }, (_, i) =>
      offer({ siteProductId: `p${i}`, price: i + 1 }),
    );

    const result = await engine.decide({
      item: item(),
      candidates,
      defaultWeights,
    });

    expect(result.status).toBe('decided');
    if (result.status !== 'decided') return;
    expect(result.decision.chosenOffer.siteProductId).toBe('p0');
    expect(result.decision.alternativesConsidered).toHaveLength(5);
    expect(result.decision.alternativesConsidered?.[0]?.siteProductId).toBe(
      'p1',
    );
    expect(
      result.decision.alternativesConsidered?.some(
        (o) => o.siteProductId === 'p0',
      ),
    ).toBe(false);
  });

  it('breaks ties deterministically by siteProductId, regardless of input order', async () => {
    const engine = new RuleBasedDecisionEngine();
    const x = offer({ siteProductId: 'x', price: 1 });
    const y = offer({ siteProductId: 'y', price: 1 });

    const firstOrder = await engine.decide({
      item: item(),
      candidates: [x, y],
      defaultWeights,
    });
    const secondOrder = await engine.decide({
      item: item(),
      candidates: [y, x],
      defaultWeights,
    });

    expect(firstOrder.status).toBe('decided');
    expect(secondOrder.status).toBe('decided');
    if (firstOrder.status !== 'decided' || secondOrder.status !== 'decided')
      return;
    expect(firstOrder.decision.chosenOffer.siteProductId).toBe('x');
    expect(secondOrder.decision.chosenOffer.siteProductId).toBe('x');
  });
});

describe('RuleBasedDecisionEngine — no-match path', () => {
  it('returns no-match with a reason when every candidate is filtered out', async () => {
    const engine = new RuleBasedDecisionEngine();
    const dietItem = item({ preferences: { dietary: ['gluten-free'] } });
    const candidates = [
      offer({ dietaryTags: undefined }),
      offer({ dietaryTags: ['organic'] }),
    ];

    const result = await engine.decide({
      item: dietItem,
      candidates,
      defaultWeights,
    });

    expect(result.status).toBe('no-match');
    if (result.status !== 'no-match') return;
    expect(result.recurringItemId).toBe(dietItem.id);
    expect(result.reason).toMatch(/dietary/);
  });

  it('returns no-match when no candidates are given at all', async () => {
    const engine = new RuleBasedDecisionEngine();
    const result = await engine.decide({
      item: item(),
      candidates: [],
      defaultWeights,
    });

    expect(result.status).toBe('no-match');
    if (result.status !== 'no-match') return;
    expect(result.reason).toBe('no candidates were found for this item');
  });
});
