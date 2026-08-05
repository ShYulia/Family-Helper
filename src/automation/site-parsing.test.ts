import { describe, expect, it } from 'vitest';
import {
  buildProductUrl,
  buildSearchUrl,
  parseContainerType,
  parseDietaryTags,
  parseFatPercentage,
  parsePackageSizeText,
  parseSizeAndBrand,
  parseSizeGrade,
  parseUnitPriceText,
} from './site-parsing.js';
import type { SiteSelectors } from './site-selectors.js';

const config: SiteSelectors = {
  baseUrl: 'https://example-market.test',
  searchPath: '/search?text={query}',
  productPath: '/p/{code}',
  currency: 'EUR',
  productTileSelector: '.tile',
  productCodeAttribute: 'data-code',
  productNameAttribute: 'data-name',
  productPriceAttribute: 'data-price',
  sizeAndBrandSelector: '.brand-name',
  unitPriceSelector: '.unit-price',
  unitPriceBasisAmount: 100,
  promotionSelector: '.promotion',
  outOfStockSelector: '.out-of-stock',
  addToCartButtonSelector: '.add',
  updateCartButtonSelector: '.update',
  quantityInputSelector: '.qty',
  priceSelector: '.price',
};

describe('buildSearchUrl', () => {
  it('substitutes and URL-encodes the query', () => {
    expect(buildSearchUrl(config, 'חלב')).toBe(
      'https://example-market.test/search?text=%D7%97%D7%9C%D7%91',
    );
  });
});

describe('buildProductUrl', () => {
  it('substitutes the product code', () => {
    expect(buildProductUrl(config, 'P_123')).toBe(
      'https://example-market.test/p/P_123',
    );
  });
});

describe('parseUnitPriceText', () => {
  it('converts a per-100-unit price to per-1000-unit (per kg/l)', () => {
    expect(parseUnitPriceText('0.74 ש"ח ל- 100 מ"ל', 100)).toBeCloseTo(7.4, 5);
  });

  it('returns undefined when no number is present', () => {
    expect(parseUnitPriceText('no price here', 100)).toBeUndefined();
  });
});

describe('parsePackageSizeText', () => {
  it.each([
    ['1 ליטר', { amount: 1, unit: 'l' }],
    ['500 גרם', { amount: 500, unit: 'g' }],
    ['250 מ"ל', { amount: 250, unit: 'ml' }],
    ['1 ק"ג', { amount: 1, unit: 'kg' }],
    ["6 יח'", { amount: 6, unit: 'unit' }],
  ])('parses %s', (text, expected) => {
    expect(parsePackageSizeText(text)).toEqual(expected);
  });

  it('returns undefined for unrecognized text', () => {
    expect(parsePackageSizeText('no size here')).toBeUndefined();
  });

  it('returns undefined for a non-positive amount', () => {
    expect(parsePackageSizeText('0 ליטר')).toBeUndefined();
  });
});

describe('parseSizeAndBrand', () => {
  it('splits "{size} | {brand}" into both parts', () => {
    expect(parseSizeAndBrand('1 ליטר | תנובה')).toEqual({
      size: { amount: 1, unit: 'l' },
      brand: 'תנובה',
    });
  });

  it('handles a missing brand gracefully', () => {
    expect(parseSizeAndBrand('1 ליטר')).toEqual({
      size: { amount: 1, unit: 'l' },
      brand: undefined,
    });
  });
});

describe('parseFatPercentage', () => {
  it.each([
    ['חלב מפוסטר 1% בקרטון', 1],
    ['חלב טרי מהגולן 3%', 3],
    ['חלב עיזים 4% שומן', 4],
  ])('parses %s', (name, expected) => {
    expect(parseFatPercentage(name)).toBe(expected);
  });

  it('returns undefined when no percentage is present', () => {
    expect(parseFatPercentage('ביצי משק טריות M')).toBeUndefined();
  });
});

describe('parseContainerType', () => {
  it.each([
    ['חלב בקרטון 3% שומן', 'carton'],
    ['חלב מפוסטר3% מהדרין שקית', 'bag'],
    ['חלב מועשר 3% בבקבוק', 'bottle'],
    ['חלב מועשר 3% בכד', 'jar'],
  ])('parses %s', (name, expected) => {
    expect(parseContainerType(name)).toBe(expected);
  });

  it('returns undefined for an unrecognized/absent container type', () => {
    expect(parseContainerType('ביצי משק טריות M')).toBeUndefined();
  });
});

describe('parseSizeGrade', () => {
  it.each([
    ['ביצי משק טריות M', 'M'],
    ['ביצי חופש L', 'L'],
    ['ביצים חופש אורגניות XL', 'XL'],
  ])('parses %s', (name, expected) => {
    expect(parseSizeGrade(name)).toBe(expected);
  });

  it('returns undefined when no size grade token is present', () => {
    expect(parseSizeGrade('חלב מפוסטר 1% בקרטון')).toBeUndefined();
  });
});

describe('parseDietaryTags', () => {
  it('detects free-range', () => {
    expect(parseDietaryTags('ביצי חופש L')).toEqual(['free-range']);
  });

  it('detects organic', () => {
    expect(parseDietaryTags('ביצים אורגניות M')).toEqual(['organic']);
  });

  it('detects both when a product is organic and free-range', () => {
    expect(parseDietaryTags('ביצי חופש אורגני L')).toEqual([
      'organic',
      'free-range',
    ]);
  });

  it('returns undefined when neither is present', () => {
    expect(parseDietaryTags('ביצי משק טריות M')).toBeUndefined();
  });

  it.each([
    ['משקה שקדים לל"ס', ['sugar-free']],
    ['משקה שקדים ללת"ס', ['sugar-free']],
    ['משקה סויה ללא תוספת סוכר', ['sugar-free']],
  ])('detects sugar-free from %s', (name, expected) => {
    expect(parseDietaryTags(name)).toEqual(expected);
  });

  it('does not flag a regular, non-sugar-free product', () => {
    expect(parseDietaryTags('משקה שקדים טרי')).toBeUndefined();
  });
});
