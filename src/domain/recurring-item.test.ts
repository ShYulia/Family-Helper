import { describe, expect, it } from 'vitest';
import {
  decisionWeightsSchema,
  itemPreferencesSchema,
  recurrenceRuleSchema,
  recurringItemSchema,
} from './recurring-item.js';

const validItem = {
  id: 'item-1',
  label: 'Whole milk',
  searchTerms: ['milk', 'whole milk'],
  quantity: { amount: 2, unit: 'l' },
  frequency: { everyNDays: 7 },
  priority: 'high',
  preferences: {},
  active: true,
};

describe('recurringItemSchema', () => {
  it('accepts a minimal valid item', () => {
    expect(recurringItemSchema.parse(validItem)).toMatchObject({
      label: 'Whole milk',
    });
  });

  it('rejects an item with no search terms', () => {
    expect(() =>
      recurringItemSchema.parse({ ...validItem, searchTerms: [] }),
    ).toThrow();
  });

  it('rejects an item with an invalid priority', () => {
    expect(() =>
      recurringItemSchema.parse({ ...validItem, priority: 'urgent' }),
    ).toThrow();
  });
});

describe('itemPreferencesSchema', () => {
  it('accepts an empty object — every field is optional', () => {
    expect(itemPreferencesSchema.parse({})).toEqual({});
  });

  it('accepts a fully populated set of preferences', () => {
    const prefs = {
      preferredBrands: ['Brand A'],
      excludedBrands: ['Brand X'],
      preferredPackageSize: { amount: 1, unit: 'l' },
      dietary: ['organic'],
      maxUnitPrice: 6,
      maxPrice: 8,
      preferOnPromotion: true,
      substitutionAllowed: true,
      preferredFatPercentage: 3,
      preferredContainerType: 'carton',
      preferredSizeGrade: 'M',
      requiredNameKeywords: ['almond'],
      weights: { price: 3 },
    };
    expect(itemPreferencesSchema.parse(prefs)).toEqual(prefs);
  });

  it('rejects an out-of-range preferredFatPercentage', () => {
    expect(() =>
      itemPreferencesSchema.parse({ preferredFatPercentage: 101 }),
    ).toThrow();
  });
});

describe('decisionWeightsSchema', () => {
  it('rejects a negative weight', () => {
    expect(() =>
      decisionWeightsSchema.parse({
        price: -1,
        unitPrice: 1,
        promotion: 1,
        brandMatch: 1,
        packageSizeFit: 1,
        dietaryMatch: 1,
        fatPercentageMatch: 1,
        containerTypeMatch: 1,
        sizeGradeMatch: 1,
      }),
    ).toThrow();
  });

  it('accepts a fully populated set of weights, including the new factors', () => {
    const weights = {
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
    expect(decisionWeightsSchema.parse(weights)).toEqual(weights);
  });
});

describe('recurrenceRuleSchema', () => {
  it('accepts a positive integer interval', () => {
    expect(recurrenceRuleSchema.parse({ everyNDays: 14 })).toEqual({
      everyNDays: 14,
    });
  });

  it('rejects a fractional interval', () => {
    expect(() => recurrenceRuleSchema.parse({ everyNDays: 1.5 })).toThrow();
  });
});
