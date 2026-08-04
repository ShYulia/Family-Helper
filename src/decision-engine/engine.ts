import { decisionResultSchema } from '../domain/index.js';
import type {
  DecisionEngine,
  DecisionEngineInput,
  DecisionResult,
} from '../domain/index.js';
import { applyHardFilters } from './hard-filters.js';
import { explainDecision, summarizeNoMatchReasons } from './reasoning.js';
import { resolveWeights, scoreCandidates } from './scoring.js';
import type { ScoredOffer } from './scoring.js';
import { unitsNeededToCover } from './units.js';

// Caps how many runner-up offers ride along in a decision, so a large
// candidate set doesn't balloon every PurchaseDecision.
const MAX_ALTERNATIVES = 5;

export class RuleBasedDecisionEngine implements DecisionEngine {
  async decide(input: DecisionEngineInput): Promise<DecisionResult> {
    const { item, candidates, defaultWeights } = input;
    const { passed, rejected } = applyHardFilters(item.preferences, candidates);

    if (passed.length === 0) {
      return decisionResultSchema.parse({
        status: 'no-match',
        recurringItemId: item.id,
        reason: summarizeNoMatchReasons(rejected),
      });
    }

    const weights = resolveWeights(item.preferences.weights, defaultWeights);
    const ranked = [...scoreCandidates(passed, item.preferences, weights)].sort(
      compareScored,
    );
    const best = ranked[0];
    const alternativesConsidered = ranked
      .slice(1, 1 + MAX_ALTERNATIVES)
      .map((scored) => scored.offer);

    return decisionResultSchema.parse({
      status: 'decided',
      decision: {
        recurringItemId: item.id,
        chosenOffer: best.offer,
        quantityToBuy: unitsNeededToCover(
          item.quantity,
          best.offer.packageSize,
        ),
        score: best.score,
        reasoning: explainDecision(best, passed, item.preferences),
        alternativesConsidered,
        decidedAt: new Date().toISOString(),
      },
    });
  }
}

// Ties are broken by siteProductId so the same input always produces the
// same decision (see docs/decision-engine-architecture.md §5).
function compareScored(a: ScoredOffer, b: ScoredOffer): number {
  if (b.score !== a.score) {
    return b.score - a.score;
  }
  return a.offer.siteProductId.localeCompare(b.offer.siteProductId);
}
