import type { Quantity, Unit } from '../domain/index.js';

const UNIT_SCALE: Record<Unit, number> = {
  g: 1,
  kg: 1000,
  ml: 1,
  l: 1000,
  unit: 1,
};

const UNIT_DIMENSION: Record<Unit, 'weight' | 'volume' | 'count'> = {
  g: 'weight',
  kg: 'weight',
  ml: 'volume',
  l: 'volume',
  unit: 'count',
};

export function convertAmount(quantity: Quantity, toUnit: Unit): number {
  if (UNIT_DIMENSION[quantity.unit] !== UNIT_DIMENSION[toUnit]) {
    throw new Error(
      `Cannot convert ${quantity.unit} to ${toUnit} — incompatible units`,
    );
  }
  const baseAmount = quantity.amount * UNIT_SCALE[quantity.unit];
  return baseAmount / UNIT_SCALE[toUnit];
}

export function unitsNeededToCover(
  need: Quantity,
  packageSize: Quantity,
): number {
  const neededInPackageUnit = convertAmount(need, packageSize.unit);
  return Math.ceil(neededInPackageUnit / packageSize.amount);
}
