import type { DecisionResult } from './decision-result.js';
import type { ProductOffer } from './product-offer.js';
import type { PurchaseHistoryEntry } from './purchase-history.js';
import type { DecisionWeights, RecurringItem } from './recurring-item.js';

/**
 * What: Everything the AI decision engine needs to decide on one
 *   recurring item — the need itself, the real products found for it,
 *   the household's default scoring weights, and (optionally) how past
 *   decisions for this item turned out.
 * Why: Bundling these into one input type gives the engine everything it
 *   needs in a single call, and keeps it from having to know *how*
 *   candidates were found or *where* weights/history come from — it just
 *   receives them. This is a plain TypeScript type rather than a Zod
 *   schema because it's assembled directly from already-validated domain
 *   objects in code, not parsed from an external/serialized source.
 * Layer: Decision — the entry point to this layer, described in
 *   docs/decision-engine-architecture.md §2.
 * Who: Assembled by whatever orchestrates a shopping run (not built yet)
 *   from a RecurringItem, ProductOffers found by the browser automation
 *   layer, and household configuration; consumed by the AI decision
 *   engine.
 * Example: { item: milkNeed, candidates: [offerA, offerB], defaultWeights }.
 */
export interface DecisionEngineInput {
  item: RecurringItem;
  candidates: ProductOffer[];
  defaultWeights: DecisionWeights;
  history?: PurchaseHistoryEntry[];
}

/**
 * What: The contract every decision engine implementation must fulfill —
 *   take a DecisionEngineInput, return a DecisionResult. This is a
 *   behavioral contract (a function signature), not a data shape, so
 *   it's a plain TypeScript interface rather than a Zod schema, the same
 *   way CartAutomation is.
 * Why: `decide` is declared async even though today's rule-based
 *   implementation does no I/O and could run synchronously. An
 *   LLM-assisted engine (see architecture doc §8) *will* need to be
 *   async — declaring the interface this way from the start means
 *   swapping the implementation later never requires touching any
 *   caller.
 * Layer: Decision — the top-level interface of this layer.
 * Who: Implemented by decision engines (e.g. the rule-based engine in
 *   src/decision-engine/); called by whatever orchestrates a shopping
 *   run.
 * Example: await engine.decide({ item, candidates, defaultWeights }).
 */
export interface DecisionEngine {
  decide(input: DecisionEngineInput): Promise<DecisionResult>;
}
