import { z } from 'zod';

/**
 * What: The set of CSS selectors, data-attribute names, and URL patterns
 *   the browser automation layer needs to find products and prices on
 *   the target supermarket's real site.
 * Why: This is exactly the kind of implementation detail CLAUDE.md's
 *   "Public Repository Discipline" says must never be committed — real
 *   selectors reveal which site this targets. Modeling the *shape* here
 *   (generic, no real values) lets the automation code be committed and
 *   reviewed, while the real values live in a local, gitignored
 *   data/site-selectors.json (see data/site-selectors.example.json for
 *   the shape with placeholder values).
 * Layer: Execution — configuration the browser automation layer depends
 *   on. Unlike ProductSearch/CartAutomation, this isn't a contract other
 *   layers know about; it's purely internal to how the automation layer
 *   implements those contracts.
 * Who: Populated once by the household (by inspecting the real site);
 *   read by PlaywrightProductSearch/PlaywrightCartAutomation.
 * Example: { baseUrl: "https://example-market.com", searchPath: "/search?q={query}", ... }
 */
export const siteSelectorsSchema = z.object({
  baseUrl: z.url(),
  searchPath: z.string().min(1),
  productPath: z.string().min(1),
  currency: z.string().length(3),

  productTileSelector: z.string().min(1),
  productCodeAttribute: z.string().min(1),
  productNameAttribute: z.string().min(1),
  productPriceAttribute: z.string().min(1),
  sizeAndBrandSelector: z.string().min(1),
  unitPriceSelector: z.string().min(1),
  // The site's displayed unit price is "per N base units" (e.g. per 100 g
  // or 100 ml) rather than per kg/l — this records N so it can be
  // converted to our per-kg/per-l convention.
  unitPriceBasisAmount: z.number().positive(),
  promotionSelector: z.string().min(1),
  outOfStockSelector: z.string().min(1),

  // Scopes quantityInputSelector/addToCartButtonSelector/
  // updateCartButtonSelector/priceSelector to the real product page's own
  // buy-box. On at least one real target site, those same CSS classes are
  // reused by a mini-cart/cart-summary widget rendered elsewhere on the
  // page for whatever products are already in the cart — an unscoped
  // page-wide `.first()` match can silently land on that widget's
  // controls instead of the intended product's, mutating the wrong cart
  // line. This selector must resolve to exactly one element.
  buyBoxSelector: z.string().min(1),
  addToCartButtonSelector: z.string().min(1),
  updateCartButtonSelector: z.string().min(1),
  quantityInputSelector: z.string().min(1),
  priceSelector: z.string().min(1),
  // The product's displayed name/title on its own page, used to verify —
  // both before and after clicking add/update — that the buy-box being
  // acted on actually belongs to the product we intended, not a
  // navigation or selector-scoping mistake.
  productPageTitleSelector: z.string().min(1),
});
export type SiteSelectors = z.infer<typeof siteSelectorsSchema>;
