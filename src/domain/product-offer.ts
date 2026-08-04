import { z } from 'zod';
import { dietaryTagSchema, quantitySchema } from './shared.js';

/**
 * What: A discount or special offer currently active on a product.
 * Why: Promotions change what "the best choice" means from week to week —
 *   a normally pricier brand might beat a cheaper one while on sale. This
 *   needs to be captured as data so the AI decision engine can factor it
 *   in, rather than being lost the moment a human glances at the page.
 * Layer: Catalog — a fact about a real product on the real site right
 *   now.
 * Who: Read off the page and written by the browser automation layer;
 *   consumed by the AI decision engine.
 * Example: "20% off", ending tomorrow, bringing the price from 5 EUR to
 *   4 EUR.
 */
export const promotionSchema = z.object({
  kind: z.enum(['percent-off', 'amount-off', 'bundle']),
  description: z.string().min(1),
  discountedPrice: z.number().positive().optional(),
  endsAt: z.iso.datetime().optional(),
});
export type Promotion = z.infer<typeof promotionSchema>;

/**
 * What: A snapshot of one real, purchasable product as it currently exists
 *   on the supermarket's site — name, brand, price, size, availability.
 * Why: This is pure observed fact, with zero opinions in it. Keeping it
 *   free of any preference or scoring logic is what lets the browser
 *   automation layer stay "dumb": its only job is to read pages and
 *   produce ProductOffers, never to decide which one is "best".
 * Layer: Catalog — the AI decision engine's raw material, alongside a
 *   RecurringItem's preferences.
 * Who: Created by the browser automation layer (by reading the site);
 *   consumed by the AI decision engine. The user never sees or edits this
 *   directly.
 * Example: "Store-brand oat milk, 1 l, 1.29 EUR, in stock, 10% off until
 *   Friday."
 */
export const productOfferSchema = z.object({
  siteProductId: z.string().min(1),
  name: z.string().min(1),
  brand: z.string().optional(),
  packageSize: quantitySchema,
  price: z.number().positive(),
  unitPrice: z.number().positive().optional(),
  currency: z.string().length(3),
  available: z.boolean(),
  promotion: promotionSchema.optional(),
  dietaryTags: z.array(dietaryTagSchema).optional(),
  fetchedAt: z.iso.datetime(),
});
export type ProductOffer = z.infer<typeof productOfferSchema>;
