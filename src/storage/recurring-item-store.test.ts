import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  loadRecurringItems,
  saveRecurringItems,
} from './recurring-item-store.js';
import type { RecurringItem } from '../domain/index.js';

let dir: string;
let filePath: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'family-helper-test-'));
  filePath = join(dir, 'recurring-items.json');
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

// Hebrew text proves round-tripping non-Latin script through JSON + UTF-8
// works, since the target site (and its product names) will be in Hebrew.
const milk: RecurringItem = {
  id: 'item-1',
  label: 'חלב',
  searchTerms: ['חלב'],
  quantity: { amount: 2, unit: 'l' },
  frequency: { everyNDays: 7 },
  priority: 'high',
  preferences: {},
  active: true,
};

describe('loadRecurringItems', () => {
  it('returns an empty array when the file does not exist yet', async () => {
    expect(await loadRecurringItems(filePath)).toEqual([]);
  });

  it('loads previously saved items, round-tripping non-Latin text', async () => {
    await saveRecurringItems(filePath, [milk]);
    const loaded = await loadRecurringItems(filePath);
    expect(loaded).toEqual([milk]);
    expect(loaded[0]?.label).toBe('חלב');
  });

  it('throws a clear error when the file contains invalid data', async () => {
    await writeFile(filePath, JSON.stringify([{ id: 'bad' }]), 'utf8');
    await expect(loadRecurringItems(filePath)).rejects.toThrow();
  });
});

describe('saveRecurringItems', () => {
  it('creates the parent directory if it does not exist', async () => {
    const nestedPath = join(dir, 'nested', 'recurring-items.json');
    await saveRecurringItems(nestedPath, [milk]);
    expect(await loadRecurringItems(nestedPath)).toEqual([milk]);
  });

  it('rejects invalid items and does not write the file', async () => {
    const invalid = { id: 'bad' } as unknown as RecurringItem;
    await expect(saveRecurringItems(filePath, [invalid])).rejects.toThrow();
    await expect(readFile(filePath, 'utf8')).rejects.toThrow();
  });
});
