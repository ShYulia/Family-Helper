import { z } from 'zod';
import {
  dietaryTagSchema,
  prioritySchema,
  quantitySchema,
  unitSchema,
} from './shared.js';

/**
 * What: How much each scoring factor (price, brand match, etc.) should
 *   matter when the AI decision engine compares candidate products.
 * Why: Not every household weighs the same factors the same way — one
 *   family might care most about price, another about sticking to a
 *   preferred brand. Making weights explicit numbers, instead of
 *   hardcoded logic, lets the same decision engine serve different
 *   priorities without any code changes.
 * Layer: Intent — these are household- or item-level *preferences*, not
 *   facts about a product.
 * Who: Set by the user (directly, or via sensible defaults); read by the
 *   AI decision engine when scoring ProductOffers.
 * Example: { price: 3, unitPrice: 2, brandMatch: 5, ... } means "brand
 *   matters more to us than raw price" for this item.
 */
export const decisionWeightsSchema = z.object({
  price: z.number().min(0),
  unitPrice: z.number().min(0),
  promotion: z.number().min(0),
  brandMatch: z.number().min(0),
  packageSizeFit: z.number().min(0),
  dietaryMatch: z.number().min(0),
});
export type DecisionWeights = z.infer<typeof decisionWeightsSchema>;

/**
 * What: The soft rules and constraints that shape which product should be
 *   chosen for a recurring need — brand, size, diet, price ceilings, and
 *   whether substitution is allowed.
 * Why: This is the heart of "intent, not a specific product". Instead of
 *   the user picking one exact item once, they describe what a *good*
 *   match looks like, and let the AI re-evaluate that against whatever is
 *   actually available and on sale each week.
 * Layer: Intent — attached to a RecurringItem; describes what the user
 *   wants without referencing any real product.
 * Who: Set by the user when creating/editing a RecurringItem; read by the
 *   AI decision engine. Never touched by the browser automation layer.
 * Example: "prefer organic, avoid Brand X, max 6 EUR per liter, ok to
 *   substitute if unavailable."
 */
export const itemPreferencesSchema = z.object({
  preferredBrands: z.array(z.string().min(1)).optional(),
  excludedBrands: z.array(z.string().min(1)).optional(),
  preferredPackageSize: z
    .object({
      amount: z.number().positive(),
      unit: unitSchema,
      tolerance: z.number().min(0).optional(),
    })
    .optional(),
  dietary: z.array(dietaryTagSchema).optional(),
  maxUnitPrice: z.number().positive().optional(),
  maxPrice: z.number().positive().optional(),
  preferOnPromotion: z.boolean().optional(),
  substitutionAllowed: z.boolean().optional(),
  weights: decisionWeightsSchema.partial().optional(),
});
export type ItemPreferences = z.infer<typeof itemPreferencesSchema>;

/**
 * What: How often a recurring need repeats, expressed as "every N days".
 * Why: A single "every N days" number covers weekly (7), biweekly (14),
 *   or any custom cadence without needing a separate enum for each case —
 *   one flexible field instead of many rigid ones.
 * Layer: Intent — describes the household's shopping rhythm, not a
 *   product.
 * Who: Set by the user; read by whatever future scheduler decides when a
 *   recurring item is "due" to be considered again.
 * Example: { everyNDays: 7 } for a weekly milk purchase.
 */
export const recurrenceRuleSchema = z.object({
  everyNDays: z.number().int().positive(),
});
export type RecurrenceRule = z.infer<typeof recurrenceRuleSchema>;

/**
 * What: A single recurring shopping *need* — e.g. "we regularly need
 *   milk" — together with how much, how often, how important, and what
 *   makes a good match.
 * Why: This is the core input to the whole system. It deliberately does
 *   NOT name a specific product or SKU, so the AI decision engine can
 *   re-evaluate the best real product to buy every time, using current
 *   prices, stock, and promotions instead of a stale, hardcoded choice.
 * Layer: Intent — the top-level object of this layer; everything else in
 *   this file exists to describe one.
 * Who: Created and edited entirely by the user (the household). Read by
 *   the AI decision engine, which turns each RecurringItem into a
 *   PurchaseDecision. Never read by the browser automation layer.
 * Example: "We need 2 liters of milk every week, prefer organic, avoid
 *   Brand X, high priority."
 */
export const recurringItemSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  searchTerms: z.array(z.string().min(1)).min(1),
  category: z.string().optional(),
  quantity: quantitySchema,
  frequency: recurrenceRuleSchema,
  priority: prioritySchema,
  preferences: itemPreferencesSchema,
  active: z.boolean(),
  notes: z.string().optional(),
});
export type RecurringItem = z.infer<typeof recurringItemSchema>;
