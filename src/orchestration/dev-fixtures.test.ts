import { describe, expect, it } from 'vitest';
import {
  devDefaultWeights,
  devRecurringItems,
  FakeProductSearch,
} from './dev-fixtures.js';
import { runShoppingRun } from './orchestrator.js';
import { RuleBasedDecisionEngine } from '../decision-engine/index.js';
import { recurringItemSchema } from '../domain/index.js';

describe('dev fixtures', () => {
  it('are valid RecurringItems', () => {
    for (const item of devRecurringItems) {
      expect(() => recurringItemSchema.parse(item)).not.toThrow();
    }
  });

  it('has at least one candidate for every dev item', async () => {
    const search = new FakeProductSearch();
    for (const item of devRecurringItems) {
      const candidates = await search.search(item.searchTerms);
      expect(candidates.length).toBeGreaterThan(0);
    }
  });

  it('runs end-to-end through the orchestrator and decides on every item', async () => {
    const result = await runShoppingRun(devRecurringItems, {
      productSearch: new FakeProductSearch(),
      decisionEngine: new RuleBasedDecisionEngine(),
      defaultWeights: devDefaultWeights,
    });

    expect(result.cartActions).toHaveLength(devRecurringItems.length);
    expect(result.needsReview).toHaveLength(0);
  });
});
