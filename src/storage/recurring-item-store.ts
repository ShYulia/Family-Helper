import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { z } from 'zod';
import { recurringItemSchema } from '../domain/index.js';
import type { RecurringItem } from '../domain/index.js';

const recurringItemListSchema = z.array(recurringItemSchema);

export async function loadRecurringItems(
  filePath: string,
): Promise<RecurringItem[]> {
  let raw: string;
  try {
    raw = await readFile(filePath, 'utf8');
  } catch (error) {
    if (isNotFoundError(error)) {
      return [];
    }
    throw error;
  }

  const parsed: unknown = JSON.parse(raw);
  return recurringItemListSchema.parse(parsed);
}

export async function saveRecurringItems(
  filePath: string,
  items: RecurringItem[],
): Promise<void> {
  // Validated before writing, so a bug elsewhere in the app can never
  // corrupt the file on disk with data that wouldn't load back.
  const validated = recurringItemListSchema.parse(items);
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(validated, null, 2) + '\n', 'utf8');
}

function isNotFoundError(error: unknown): boolean {
  return (
    error instanceof Error && (error as NodeJS.ErrnoException).code === 'ENOENT'
  );
}
