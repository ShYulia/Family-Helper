import { describe, expect, it } from 'vitest';
import { cartActionResultSchema, cartActionSchema } from './cart-automation.js';

describe('cartActionSchema', () => {
  it('accepts a product id with a positive integer quantity', () => {
    expect(
      cartActionSchema.parse({ siteProductId: 'abc123', quantity: 2 }),
    ).toEqual({
      siteProductId: 'abc123',
      quantity: 2,
    });
  });

  it('rejects a zero quantity', () => {
    expect(() =>
      cartActionSchema.parse({ siteProductId: 'abc123', quantity: 0 }),
    ).toThrow();
  });
});

describe('cartActionResultSchema', () => {
  it('accepts a successful result with an observed price', () => {
    const result = {
      siteProductId: 'abc123',
      success: true,
      observedPrice: 1.29,
    };
    expect(cartActionResultSchema.parse(result)).toEqual(result);
  });

  it('accepts a failed result with an error message', () => {
    const result = {
      siteProductId: 'abc123',
      success: false,
      error: 'out of stock',
    };
    expect(cartActionResultSchema.parse(result)).toEqual(result);
  });
});
