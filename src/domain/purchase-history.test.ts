import { describe, expect, it } from 'vitest';
import { purchaseHistoryEntrySchema } from './purchase-history.js';

const offer = {
  siteProductId: 'abc123',
  name: 'Store-brand oat milk',
  packageSize: { amount: 1, unit: 'l' },
  price: 1.29,
  currency: 'EUR',
  available: true,
  fetchedAt: '2026-08-04T09:00:00Z',
};

describe('purchaseHistoryEntrySchema', () => {
  it('accepts an accepted outcome with no replacement', () => {
    const entry = {
      recurringItemId: 'item-1',
      offer,
      purchasedAt: '2026-08-04T09:10:00Z',
      humanOutcome: 'accepted',
    };
    expect(purchaseHistoryEntrySchema.parse(entry)).toMatchObject({
      humanOutcome: 'accepted',
    });
  });

  it('accepts a swapped outcome with a replacement offer', () => {
    const entry = {
      recurringItemId: 'item-1',
      offer,
      purchasedAt: '2026-08-04T09:10:00Z',
      humanOutcome: 'swapped',
      replacedWith: { ...offer, siteProductId: 'def456' },
    };
    expect(purchaseHistoryEntrySchema.parse(entry)).toMatchObject({
      humanOutcome: 'swapped',
    });
  });

  it('rejects an unknown outcome', () => {
    const entry = {
      recurringItemId: 'item-1',
      offer,
      purchasedAt: '2026-08-04T09:10:00Z',
      humanOutcome: 'ignored',
    };
    expect(() => purchaseHistoryEntrySchema.parse(entry)).toThrow();
  });
});
