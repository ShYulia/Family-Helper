import { describe, expect, it } from 'vitest';
import {
  containerTypeSchema,
  dietaryTagSchema,
  prioritySchema,
  quantitySchema,
  sizeGradeSchema,
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

  it('accepts free-range', () => {
    expect(dietaryTagSchema.parse('free-range')).toBe('free-range');
  });

  it('accepts sugar-free', () => {
    expect(dietaryTagSchema.parse('sugar-free')).toBe('sugar-free');
  });

  it('rejects an unknown tag', () => {
    expect(() => dietaryTagSchema.parse('low-carb')).toThrow();
  });
});

describe('containerTypeSchema', () => {
  it('accepts a known container type', () => {
    expect(containerTypeSchema.parse('carton')).toBe('carton');
  });

  it('rejects an unknown container type', () => {
    expect(() => containerTypeSchema.parse('box')).toThrow();
  });
});

describe('sizeGradeSchema', () => {
  it('accepts a known size grade', () => {
    expect(sizeGradeSchema.parse('M')).toBe('M');
  });

  it('rejects an unknown size grade', () => {
    expect(() => sizeGradeSchema.parse('XXL')).toThrow();
  });
});
