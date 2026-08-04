import { describe, expect, it } from 'vitest';
import { applyHardFilters } from './hard-filters.js';
import type { ItemPreferences, ProductOffer } from '../domain/index.js';

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

describe('applyHardFilters', () => {
  it('passes an offer with no preferences set', () => {
    const result = applyHardFilters({}, [offer()]);
    expect(result.passed).toHaveLength(1);
    expect(result.rejected).toHaveLength(0);
  });

  it('rejects an unavailable offer', () => {
    const result = applyHardFilters({}, [offer({ available: false })]);
    expect(result.passed).toHaveLength(0);
    expect(result.rejected[0]?.reasons).toContain('out of stock');
  });

  it('rejects an offer whose brand is excluded', () => {
    const preferences: ItemPreferences = { excludedBrands: ['Brand X'] };
    const result = applyHardFilters(preferences, [offer({ brand: 'Brand X' })]);
    expect(result.passed).toHaveLength(0);
    expect(result.rejected[0]?.reasons[0]).toMatch(/excluded/);
  });

  it('passes an offer whose brand is not excluded', () => {
    const preferences: ItemPreferences = { excludedBrands: ['Brand X'] };
    const result = applyHardFilters(preferences, [offer({ brand: 'Brand Y' })]);
    expect(result.passed).toHaveLength(1);
  });

  it('rejects an offer missing a required dietary tag', () => {
    const preferences: ItemPreferences = { dietary: ['organic', 'vegan'] };
    const result = applyHardFilters(preferences, [
      offer({ dietaryTags: ['organic'] }),
    ]);
    expect(result.passed).toHaveLength(0);
    expect(result.rejected[0]?.reasons[0]).toMatch(/vegan/);
  });

  it('rejects an offer with no dietary tags at all when tags are required', () => {
    const preferences: ItemPreferences = { dietary: ['gluten-free'] };
    const result = applyHardFilters(preferences, [offer()]);
    expect(result.passed).toHaveLength(0);
  });

  it('passes an offer over price but under a maxPrice ceiling', () => {
    const preferences: ItemPreferences = { maxPrice: 2 };
    const result = applyHardFilters(preferences, [offer({ price: 1.5 })]);
    expect(result.passed).toHaveLength(1);
  });

  it('rejects an offer over the maxPrice ceiling', () => {
    const preferences: ItemPreferences = { maxPrice: 1 };
    const result = applyHardFilters(preferences, [offer({ price: 1.5 })]);
    expect(result.passed).toHaveLength(0);
    expect(result.rejected[0]?.reasons[0]).toMatch(/exceeds maximum/);
  });

  it('rejects an offer over the maxUnitPrice ceiling', () => {
    const preferences: ItemPreferences = { maxUnitPrice: 2 };
    const result = applyHardFilters(preferences, [offer({ unitPrice: 3 })]);
    expect(result.passed).toHaveLength(0);
  });

  it('does not reject on maxUnitPrice when the offer has no unitPrice', () => {
    const preferences: ItemPreferences = { maxUnitPrice: 2 };
    const result = applyHardFilters(preferences, [
      offer({ unitPrice: undefined }),
    ]);
    expect(result.passed).toHaveLength(1);
  });

  it('treats preferredBrands as soft when substitution is allowed', () => {
    const preferences: ItemPreferences = {
      preferredBrands: ['Brand A'],
      substitutionAllowed: true,
    };
    const result = applyHardFilters(preferences, [offer({ brand: 'Brand B' })]);
    expect(result.passed).toHaveLength(1);
  });

  it('treats preferredBrands as hard when substitution is disallowed', () => {
    const preferences: ItemPreferences = {
      preferredBrands: ['Brand A'],
      substitutionAllowed: false,
    };
    const result = applyHardFilters(preferences, [offer({ brand: 'Brand B' })]);
    expect(result.passed).toHaveLength(0);
    expect(result.rejected[0]?.reasons[0]).toMatch(
      /substitution is not allowed/,
    );
  });

  it('passes a preferred-brand offer when substitution is disallowed', () => {
    const preferences: ItemPreferences = {
      preferredBrands: ['Brand A'],
      substitutionAllowed: false,
    };
    const result = applyHardFilters(preferences, [offer({ brand: 'Brand A' })]);
    expect(result.passed).toHaveLength(1);
  });

  it('collects multiple reasons when an offer fails more than one filter', () => {
    const preferences: ItemPreferences = {
      maxPrice: 1,
      excludedBrands: ['Brand X'],
    };
    const result = applyHardFilters(preferences, [
      offer({ price: 5, brand: 'Brand X', available: false }),
    ]);
    expect(result.rejected[0]?.reasons).toHaveLength(3);
  });
});
