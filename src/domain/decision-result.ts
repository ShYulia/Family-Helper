import { z } from 'zod';
import { purchaseDecisionSchema } from './purchase-decision.js';

/**
 * What: The outcome of asking the AI decision engine to decide on one
 *   recurring item — either a concrete PurchaseDecision, or an explicit
 *   "nothing here is acceptable" outcome with a human-readable reason.
 * Why: Forcing every decision attempt to produce a PurchaseDecision would
 *   mean picking a bad match just to have an answer, e.g. buying a
 *   product that violates a dietary requirement because nothing else was
 *   found. Making "no match" a normal, typed outcome — instead of a
 *   thrown error or a fabricated decision — lets callers handle it
 *   explicitly (like flagging the item for human attention) without
 *   special-casing failures.
 * Layer: Decision — this is the actual return type of the AI decision
 *   engine, described in docs/decision-engine-architecture.md.
 * Who: Produced by the AI decision engine; consumed by whatever
 *   orchestrates a shopping run, to either queue a CartAction or flag the
 *   item for human review.
 * Example: no candidate for "milk" is gluten-free, so the engine returns
 *   { status: "no-match", recurringItemId: "item-1", reason: "3
 *   candidates found; all excluded — none are gluten-free" } instead of
 *   guessing.
 */
export const decisionResultSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('decided'),
    decision: purchaseDecisionSchema,
  }),
  z.object({
    status: z.literal('no-match'),
    recurringItemId: z.string().min(1),
    reason: z.string().min(1),
  }),
]);
export type DecisionResult = z.infer<typeof decisionResultSchema>;
