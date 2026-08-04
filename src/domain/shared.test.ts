import { describe, expect, it } from 'vitest';
import {
  dietaryTagSchema,
  prioritySchema,
  quantitySchema,
  unitSchema,
} from './shared.js';

describe('unitSchema', () => {
  it('accepts a known unit', () => {
    expect(unitSchema.parse('kg')).toBe('kg');
  });

  it('rejects an unknown unit', () => {
    expect(() => unitSchema.parse('lb')).toThrow();
  });
});

describe('quantitySchema', () => {
  it('accepts a positive amount with a unit', () => {
    expect(quantitySchema.parse({ amount: 2, unit: 'l' })).toEqual({
      amount: 2,
      unit: 'l',
    });
  });

  it('rejects a zero or negative amount', () => {
    expect(() => quantitySchema.parse({ amount: 0, unit: 'l' })).toThrow();
    expect(() => quantitySchema.parse({ amount: -1, unit: 'l' })).toThrow();
  });
});

describe('prioritySchema', () => {
  it('accepts low, medium, high', () => {
    expect(prioritySchema.parse('high')).toBe('high');
  });

  it('rejects an arbitrary string', () => {
    expect(() => prioritySchema.parse('urgent')).toThrow();
  });
});

describe('dietaryTagSchema', () => {
  it('accepts a known tag', () => {
    expect(dietaryTagSchema.parse('organic')).toBe('organic');
  });

  it('rejects an unknown tag', () => {
    expect(() => dietaryTagSchema.parse('low-carb')).toThrow();
  });
});
