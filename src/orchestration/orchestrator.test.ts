import { describe, expect, it, vi } from 'vitest';
import { runShoppingRun } from './orchestrator.js';
import { RuleBasedDecisionEngine } from '../decision-engine/index.js';
import type {
  DecisionWeights,
  ProductOffer,
  ProductSearch,
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
    fetchedAt: '2026-08-05T09:00:00Z',
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
  fatPercentageMatch: 1,
  containerTypeMatch: 1,
  sizeGradeMatch: 1,
};

describe('runShoppingRun', () => {
  it('turns a decided item into a cart action', async () => {
    const productSearch: ProductSearch = {
      search: vi
        .fn()
        .mockResolvedValue([offer({ siteProductId: 'a', price: 1 })]),
    };

    const result = await runShoppingRun([item()], {
      productSearch,
      decisionEngine: new RuleBasedDecisionEngine(),
      defaultWeights,
    });

    expect(result.cartActions).toEqual([
      { siteProductId: 'a', quantity: 2, expectedName: 'Oat milk' },
    ]);
    expect(result.needsReview).toHaveLength(0);
  });

  it('flags a no-match item for review instead of adding to cart', async () => {
    const productSearch: ProductSearch = {
      search: vi.fn().mockResolvedValue([]),
    };

    const result = await runShoppingRun([item()], {
      productSearch,
      decisionEngine: new RuleBasedDecisionEngine(),
      defaultWeights,
    });

    expect(result.cartActions).toHaveLength(0);
    expect(result.needsReview).toHaveLength(1);
    expect(result.needsReview[0]).toMatchObject({
      status: 'no-match',
      recurringItemId: 'item-1',
    });
  });

  it('skips inactive items entirely, without searching for them', async () => {
    const search = vi.fn().mockResolvedValue([offer()]);

    const result = await runShoppingRun([item({ active: false })], {
      productSearch: { search },
      decisionEngine: new RuleBasedDecisionEngine(),
      defaultWeights,
    });

    expect(search).not.toHaveBeenCalled();
    expect(result.cartActions).toHaveLength(0);
    expect(result.needsReview).toHaveLength(0);
  });

  it('processes multiple items independently', async () => {
    const milk = item({ id: 'milk', searchTerms: ['milk'] });
    const eggs = item({
      id: 'eggs',
      searchTerms: ['eggs'],
      quantity: { amount: 12, unit: 'unit' },
    });
    const productSearch: ProductSearch = {
      search: vi.fn(async (terms: string[]) => {
        if (terms[0] === 'milk') {
          return [offer({ siteProductId: 'milk-a', price: 1 })];
        }
        return [];
      }),
    };

    const result = await runShoppingRun([milk, eggs], {
      productSearch,
      decisionEngine: new RuleBasedDecisionEngine(),
      defaultWeights,
    });

    expect(result.cartActions).toEqual([
      { siteProductId: 'milk-a', quantity: 2, expectedName: 'Oat milk' },
    ]);
    expect(result.needsReview).toHaveLength(1);
    expect(result.needsReview[0]).toMatchObject({ recurringItemId: 'eggs' });
  });
});
