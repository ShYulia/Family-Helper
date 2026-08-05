// Fixture data for developing and demoing the orchestrator before the
// real browser automation layer exists. Not used in production — swap
// FakeProductSearch for a real ProductSearch implementation once one
// exists (see docs/decision-engine-architecture.md §7-8). A small,
// realistic set of items is enough to exercise the orchestrator; it does
// not require a household's full real recurring list.

import type {
  DecisionWeights,
  ProductOffer,
  ProductSearch,
  RecurringItem,
} from '../domain/index.js';

export const devDefaultWeights: DecisionWeights = {
  price: 1,
  unitPrice: 1,
  promotion: 0.5,
  brandMatch: 1,
  packageSizeFit: 0.5,
  dietaryMatch: 1,
  fatPercentageMatch: 1,
  containerTypeMatch: 1,
  sizeGradeMatch: 1,
};

export const devRecurringItems: RecurringItem[] = [
  {
    id: 'milk',
    label: 'Milk',
    searchTerms: ['milk'],
    category: 'dairy',
    quantity: { amount: 2, unit: 'l' },
    frequency: { everyNDays: 7 },
    priority: 'high',
    preferences: { preferOnPromotion: true },
    active: true,
  },
  {
    id: 'eggs',
    label: 'Eggs',
    searchTerms: ['eggs'],
    category: 'dairy',
    quantity: { amount: 12, unit: 'unit' },
    frequency: { everyNDays: 14 },
    priority: 'medium',
    preferences: {
      preferredPackageSize: { amount: 12, unit: 'unit', tolerance: 6 },
    },
    active: true,
  },
  {
    id: 'olive-oil',
    label: 'Olive oil',
    searchTerms: ['olive oil'],
    category: 'pantry',
    quantity: { amount: 1, unit: 'l' },
    frequency: { everyNDays: 30 },
    priority: 'medium',
    preferences: {
      preferredBrands: ['Brand A'],
      maxUnitPrice: 12,
      weights: { brandMatch: 3 },
    },
    active: true,
  },
  {
    id: 'bread',
    label: 'Bread',
    searchTerms: ['bread'],
    category: 'bakery',
    quantity: { amount: 1, unit: 'unit' },
    frequency: { everyNDays: 7 },
    priority: 'low',
    preferences: { dietary: ['gluten-free'] },
    active: true,
  },
];

const FETCHED_AT = '2026-08-05T09:00:00Z';

const catalog: Record<string, ProductOffer[]> = {
  milk: [
    {
      siteProductId: 'milk-store-brand',
      name: 'Store-brand milk',
      brand: 'Store Brand',
      packageSize: { amount: 1, unit: 'l' },
      price: 1.1,
      unitPrice: 1.1,
      currency: 'EUR',
      available: true,
      promotion: { kind: 'percent-off', description: '15% off' },
      fetchedAt: FETCHED_AT,
    },
    {
      siteProductId: 'milk-brand-b',
      name: 'Brand B whole milk',
      brand: 'Brand B',
      packageSize: { amount: 1, unit: 'l' },
      price: 1.6,
      unitPrice: 1.6,
      currency: 'EUR',
      available: true,
      fetchedAt: FETCHED_AT,
    },
  ],
  eggs: [
    {
      siteProductId: 'eggs-dozen',
      name: 'Free-range eggs, 12-pack',
      packageSize: { amount: 12, unit: 'unit' },
      price: 3.2,
      currency: 'EUR',
      available: true,
      fetchedAt: FETCHED_AT,
    },
    {
      siteProductId: 'eggs-six',
      name: 'Free-range eggs, 6-pack',
      packageSize: { amount: 6, unit: 'unit' },
      price: 1.8,
      currency: 'EUR',
      available: true,
      fetchedAt: FETCHED_AT,
    },
  ],
  'olive oil': [
    {
      siteProductId: 'oil-brand-a',
      name: 'Brand A extra virgin olive oil',
      brand: 'Brand A',
      packageSize: { amount: 1, unit: 'l' },
      price: 9.5,
      unitPrice: 9.5,
      currency: 'EUR',
      available: true,
      fetchedAt: FETCHED_AT,
    },
    {
      siteProductId: 'oil-brand-c',
      name: 'Brand C extra virgin olive oil',
      brand: 'Brand C',
      packageSize: { amount: 1, unit: 'l' },
      price: 7.9,
      unitPrice: 7.9,
      currency: 'EUR',
      available: true,
      fetchedAt: FETCHED_AT,
    },
  ],
  bread: [
    {
      siteProductId: 'bread-regular',
      name: 'White bread',
      packageSize: { amount: 1, unit: 'unit' },
      price: 2.2,
      currency: 'EUR',
      available: true,
      fetchedAt: FETCHED_AT,
    },
    {
      siteProductId: 'bread-gf',
      name: 'Gluten-free bread',
      packageSize: { amount: 1, unit: 'unit' },
      price: 3.5,
      currency: 'EUR',
      available: true,
      dietaryTags: ['gluten-free'],
      fetchedAt: FETCHED_AT,
    },
  ],
};

export class FakeProductSearch implements ProductSearch {
  async search(searchTerms: string[]): Promise<ProductOffer[]> {
    const found = new Map<string, ProductOffer>();
    for (const term of searchTerms) {
      for (const offer of catalog[term] ?? []) {
        found.set(offer.siteProductId, offer);
      }
    }
    return [...found.values()];
  }
}
