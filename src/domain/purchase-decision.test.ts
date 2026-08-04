import { describe, expect, it } from 'vitest';
import { purchaseDecisionSchema } from './purchase-decision.js';

const offer = {
  siteProductId: 'abc123',
  name: 'Store-brand oat milk',
  packageSize: { amount: 1, unit: 'l' },
  price: 1.29,
  currency: 'EUR',
  available: true,
  fetchedAt: '2026-08-04T09:00:00Z',
};

const validDecision = {
  recurringItemId: 'item-1',
  chosenOffer: offer,
  quantityToBuy: 2,
  score: 0.87,
  reasoning: ['lowest unit price', 'active promotion'],
  decidedAt: '2026-08-04T09:05:00Z',
};

describe('purchaseDecisionSchema', () => {
  it('accepts a valid decision', () => {
    expect(purchaseDecisionSchema.parse(validDecision)).toMatchObject({
      recurringItemId: 'item-1',
    });
  });

  it('rejects a decision with no reasoning given', () => {
    expect(() =>
      purchaseDecisionSchema.parse({ ...validDecision, reasoning: [] }),
    ).toThrow();
  });

  it('rejects a non-integer quantity', () => {
    expect(() =>
      purchaseDecisionSchema.parse({ ...validDecision, quantityToBuy: 1.5 }),
    ).toThrow();
  });
});
