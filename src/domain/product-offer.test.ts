import { describe, expect, it } from 'vitest';
import { productOfferSchema, promotionSchema } from './product-offer.js';

const validOffer = {
  siteProductId: 'abc123',
  name: 'Store-brand oat milk',
  packageSize: { amount: 1, unit: 'l' },
  price: 1.29,
  currency: 'EUR',
  available: true,
  fetchedAt: '2026-08-04T09:00:00Z',
};

describe('productOfferSchema', () => {
  it('accepts a minimal valid offer', () => {
    expect(productOfferSchema.parse(validOffer)).toMatchObject({
      siteProductId: 'abc123',
    });
  });

  it('rejects a currency code that is not 3 letters', () => {
    expect(() =>
      productOfferSchema.parse({ ...validOffer, currency: 'euro' }),
    ).toThrow();
  });

  it('rejects a non-positive price', () => {
    expect(() =>
      productOfferSchema.parse({ ...validOffer, price: 0 }),
    ).toThrow();
  });

  it('rejects a fetchedAt that is not a valid ISO datetime', () => {
    expect(() =>
      productOfferSchema.parse({ ...validOffer, fetchedAt: 'yesterday' }),
    ).toThrow();
  });

  it('accepts optional fatPercentage/containerType/sizeGrade', () => {
    const offer = {
      ...validOffer,
      fatPercentage: 3,
      containerType: 'carton',
      sizeGrade: 'M',
    };
    expect(productOfferSchema.parse(offer)).toMatchObject({
      fatPercentage: 3,
      containerType: 'carton',
      sizeGrade: 'M',
    });
  });

  it('rejects an out-of-range fatPercentage', () => {
    expect(() =>
      productOfferSchema.parse({ ...validOffer, fatPercentage: 101 }),
    ).toThrow();
  });

  it('rejects an unknown containerType', () => {
    expect(() =>
      productOfferSchema.parse({ ...validOffer, containerType: 'box' }),
    ).toThrow();
  });
});

describe('promotionSchema', () => {
  it('accepts a percent-off promotion', () => {
    const promo = { kind: 'percent-off', description: '20% off' };
    expect(promotionSchema.parse(promo)).toEqual(promo);
  });

  it('rejects an unknown promotion kind', () => {
    expect(() =>
      promotionSchema.parse({ kind: 'clearance', description: '' }),
    ).toThrow();
  });
});
