import { z } from 'zod';
import { productOfferSchema } from './product-offer.js';

/**
 * What: A record of what actually happened to a past PurchaseDecision —
 *   whether the human kept it, swapped it for something else, or removed
 *   it entirely.
 * Why: This is the system's memory. It doesn't feed into any logic yet,
 *   but capturing this feedback now, in a stable shape, means a future
 *   "learn from what the household actually keeps" feature can be added
 *   without changing any of the schemas that already exist.
 * Layer: History — downstream of a completed decision and human review; a
 *   future input back into the AI decision engine's scoring.
 * Who: Written by the system once a decision's real-world outcome is
 *   known (e.g. after human approval/checkout); intended to be read, in a
 *   future iteration, by the AI decision engine.
 * Example: "Picked oat milk brand A, but the human swapped it for brand B
 *   at checkout" — a signal that brand B might be the better default next
 *   time.
 */
export const purchaseHistoryEntrySchema = z.object({
  recurringItemId: z.string().min(1),
  offer: productOfferSchema,
  purchasedAt: z.iso.datetime(),
  humanOutcome: z.enum(['accepted', 'swapped', 'removed']),
  replacedWith: productOfferSchema.optional(),
});
export type PurchaseHistoryEntry = z.infer<typeof purchaseHistoryEntrySchema>;
