import { z } from 'zod';
import { productOfferSchema } from './product-offer.js';

/**
 * What: The AI decision engine's conclusion for one recurring item — which
 *   real product to buy, how many, and why.
 * Why: This is the single handoff point between "deciding" and "doing".
 *   By giving the decision itself its own type, the browser automation
 *   layer only ever needs to consume decisions (or the even simpler
 *   CartAction derived from them) — it never needs to know about
 *   preferences, weights, or scoring at all.
 * Layer: Decision — sits between Intent + Catalog (its inputs) and
 *   Execution (its consumer).
 * Who: Created by the AI decision engine; consumed by the browser
 *   automation layer (to act on it) and, later, by a human-approval step
 *   (to review it before anything real happens).
 * Example: "For 'milk', buy 2x store-brand oat milk 1l — chosen for
 *   lowest unit price and an active promotion."
 */
export const purchaseDecisionSchema = z.object({
  recurringItemId: z.string().min(1),
  chosenOffer: productOfferSchema,
  quantityToBuy: z.number().int().positive(),
  score: z.number(),
  reasoning: z.array(z.string().min(1)).min(1),
  alternativesConsidered: z.array(productOfferSchema).optional(),
  decidedAt: z.iso.datetime(),
});
export type PurchaseDecision = z.infer<typeof purchaseDecisionSchema>;
