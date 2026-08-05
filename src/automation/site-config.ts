import { readFile } from 'node:fs/promises';
import { siteSelectorsSchema, type SiteSelectors } from './site-selectors.js';

// Unlike RecurringItem persistence, a missing file here is a genuine setup
// error, not a valid empty state — so this deliberately does not fall back
// to a default the way loadRecurringItems does.
export async function loadSiteSelectors(
  filePath: string,
): Promise<SiteSelectors> {
  const raw = await readFile(filePath, 'utf8');
  return siteSelectorsSchema.parse(JSON.parse(raw));
}
