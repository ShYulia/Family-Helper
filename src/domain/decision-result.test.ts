import { describe, expect, it } from 'vitest';
import { decisionResultSchema } from './decision-result.js';

const offer = {
  siteProductId: 'abc123',
  name: 'Store-brand oat milk',
  packageSize: { amount: 1, unit: 'l' },
  price: 1.29,
  currency: 'EUR',
  available: true,
  fetchedAt: '2026-08-04T09:00:00Z',
};

const decision = {
  recurringItemId: 'item-1',
  chosenOffer: offer,
  quantityToBuy: 2,
  score: 0.87,
  reasoning: ['lowest unit price'],
  decidedAt: '2026-08-04T09:05:00Z',
};

describe('decisionResultSchema', () => {
  it('accepts a decided result wrapping a PurchaseDecision', () => {
    const result = { status: 'decided', decision };
    expect(decisionResultSchema.parse(result)).toEqual(result);
  });

  it('accepts a no-match result with a reason', () => {
    const result = {
      status: 'no-match',
      recurringItemId: 'item-1',
      reason: '3 candidates found; all excluded — none are gluten-free',
    };
    expect(decisionResultSchema.parse(result)).toEqual(result);
  });

  it('rejects an unknown status', () => {
    expect(() =>
      decisionResultSchema.parse({
        status: 'pending',
        recurringItemId: 'item-1',
      }),
    ).toThrow();
  });

  it('rejects a no-match result with an empty reason', () => {
    expect(() =>
      decisionResultSchema.parse({
        status: 'no-match',
        recurringItemId: 'item-1',
        reason: '',
      }),
    ).toThrow();
  });
});
