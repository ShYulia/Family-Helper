import { z } from 'zod';

/**
 * What: A unit of measurement for quantities (weight, volume, or count).
 * Why: Grocery items are measured differently — some by weight (kg), some
 *   by volume (l), some just by count (unit). A shared set of units lets
 *   every other schema talk about "how much" in a consistent, comparable
 *   way.
 * Layer: Shared — used by both the Intent layer (RecurringItem) and the
 *   Catalog layer (ProductOffer), so quantities can be compared directly.
 * Who: Read/written by whoever builds the object it's embedded in — the
 *   user (for a RecurringItem) or the browser automation layer (for a
 *   ProductOffer).
 * Example: "2 l" of milk, "500 g" of pasta, "1 unit" for a jar of jam.
 */
export const unitSchema = z.enum(['g', 'kg', 'ml', 'l', 'unit']);
export type Unit = z.infer<typeof unitSchema>;

/**
 * What: An amount paired with a unit — e.g. "2 l" or "500 g".
 * Why: Almost every schema here needs to express "how much" of something
 *   (how much milk is needed, how big is this package). Bundling amount +
 *   unit into one reusable type avoids repeating both fields everywhere
 *   and keeps them from drifting apart.
 * Layer: Shared — used inside RecurringItem (Intent layer) and
 *   ProductOffer (Catalog layer).
 * Who: Same as Unit above — constructed by whoever builds the object it's
 *   embedded in.
 * Example: { amount: 2, unit: "l" } means "2 liters".
 */
export const quantitySchema = z.object({
  amount: z.number().positive(),
  unit: unitSchema,
});
export type Quantity = z.infer<typeof quantitySchema>;

/**
 * What: How important a recurring item is to the household, on a simple
 *   low/medium/high scale.
 * Why: Not every grocery need matters equally — running out of coffee
 *   might be more urgent than running out of a rarely-used spice. Priority
 *   gives the AI decision engine a signal for trade-offs, like spending
 *   more effort finding the *right* match for a high-priority item.
 * Layer: Intent — part of what the user is telling the system they want,
 *   before any product has been chosen.
 * Who: Set by the user when creating a RecurringItem; read by the AI
 *   decision engine when scoring candidate products.
 * Example: "high" priority for coffee, "low" priority for a spice bought
 *   once a year.
 */
export const prioritySchema = z.enum(['low', 'medium', 'high']);
export type Priority = z.infer<typeof prioritySchema>;

/**
 * What: A dietary or lifestyle label a product can carry, or a household
 *   can require.
 * Why: Households often have hard requirements (vegan, gluten-free) or
 *   soft preferences (organic) that aren't about price or brand at all.
 *   Modeling these as tags lets a *preference* ("we want organic") and a
 *   *product fact* ("this product is organic") reuse the exact same
 *   values, so they can be compared directly.
 * Layer: Shared — used by ItemPreferences (Intent layer) and ProductOffer
 *   (Catalog layer).
 * Who: The preference side is set by the user; product-side tags are read
 *   off the site by the browser automation layer.
 * Example: a household requires "gluten-free"; a product on the site is
 *   tagged "gluten-free" and "organic".
 */
export const dietaryTagSchema = z.enum([
  'organic',
  'vegan',
  'vegetarian',
  'gluten-free',
  'dairy-free',
  'nut-free',
  'kosher',
  'halal',
  'free-range',
  'sugar-free',
]);
export type DietaryTag = z.infer<typeof dietaryTagSchema>;

/**
 * What: How a product is physically packaged — carton, bag, bottle, etc.
 * Why: Some households have a real preference here (e.g. milk in a carton
 *   vs. a bag) that has nothing to do with brand, price, or size.
 * Layer: Shared — a product fact (ProductOffer) and a preference
 *   (ItemPreferences) can both use the same set of values.
 * Who: The preference side is set by the user; the fact side is parsed off
 *   the site by the browser automation layer (usually from the product
 *   name, since the site doesn't expose it as a separate structured field).
 * Example: a household prefers milk "in a carton"; a product is packaged
 *   in a bag instead.
 */
export const containerTypeSchema = z.enum([
  'carton',
  'bag',
  'bottle',
  'jar',
  'other',
]);
export type ContainerType = z.infer<typeof containerTypeSchema>;

/**
 * What: A standard size grade for graded products (eggs being the
 *   canonical example on this site) — small/medium/large/extra-large.
 * Why: For eggs specifically, "size" in the everyday sense (M vs L) is a
 *   grading label, not a package amount — `Quantity`/`preferredPackageSize`
 *   already cover pack *count* (e.g. "12 eggs"), which is a separate
 *   concern from the size of each individual egg.
 * Layer: Shared — same reasoning as ContainerType above.
 * Who: Same as ContainerType above.
 * Example: a household prefers size "M" eggs; a product on the site is
 *   graded "L".
 */
export const sizeGradeSchema = z.enum(['S', 'M', 'L', 'XL']);
export type SizeGrade = z.infer<typeof sizeGradeSchema>;
