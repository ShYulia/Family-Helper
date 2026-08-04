import { describe, expect, it } from 'vitest';
import { convertAmount, unitsNeededToCover } from './units.js';

describe('convertAmount', () => {
  it('converts within the weight dimension', () => {
    expect(convertAmount({ amount: 500, unit: 'g' }, 'kg')).toBe(0.5);
    expect(convertAmount({ amount: 1, unit: 'kg' }, 'g')).toBe(1000);
  });

  it('converts within the volume dimension', () => {
    expect(convertAmount({ amount: 2, unit: 'l' }, 'ml')).toBe(2000);
    expect(convertAmount({ amount: 250, unit: 'ml' }, 'l')).toBe(0.25);
  });

  it('is a no-op when converting a unit to itself', () => {
    expect(convertAmount({ amount: 3, unit: 'unit' }, 'unit')).toBe(3);
    expect(convertAmount({ amount: 2, unit: 'l' }, 'l')).toBe(2);
  });

  it('throws when converting across dimensions', () => {
    expect(() => convertAmount({ amount: 1, unit: 'kg' }, 'l')).toThrow(
      /incompatible/,
    );
    expect(() => convertAmount({ amount: 1, unit: 'unit' }, 'g')).toThrow(
      /incompatible/,
    );
  });
});

describe('unitsNeededToCover', () => {
  it('computes exact package counts', () => {
    expect(
      unitsNeededToCover({ amount: 2, unit: 'l' }, { amount: 1, unit: 'l' }),
    ).toBe(2);
  });

  it('rounds up when the need does not divide evenly', () => {
    expect(
      unitsNeededToCover({ amount: 2, unit: 'l' }, { amount: 1.5, unit: 'l' }),
    ).toBe(2);
  });

  it('converts units before dividing', () => {
    expect(
      unitsNeededToCover({ amount: 1, unit: 'kg' }, { amount: 500, unit: 'g' }),
    ).toBe(2);
  });

  it('always needs at least one package', () => {
    expect(
      unitsNeededToCover(
        { amount: 1, unit: 'unit' },
        { amount: 6, unit: 'unit' },
      ),
    ).toBe(1);
  });
});
