import { z } from 'zod';

/**
 * What: The one instruction the browser automation layer understands: add
 *   this exact product, in this quantity, to the cart.
 * Why: This is deliberately the *only* vocabulary the automation layer
 *   speaks. It contains no price, no brand, no preferences — by the time
 *   a CartAction exists, every decision has already been made upstream.
 * Layer: Execution — the boundary between Decision and the actual browser
 *   automation.
 * Who: Created by whatever orchestrates a shopping run, derived from a
 *   PurchaseDecision produced by the AI decision engine; consumed
 *   exclusively by the browser automation layer.
 * Example: { siteProductId: "abc123", quantity: 2 }.
 */
export const cartActionSchema = z.object({
  siteProductId: z.string().min(1),
  quantity: z.number().int().positive(),
});
export type CartAction = z.infer<typeof cartActionSchema>;

/**
 * What: The outcome of trying to add one CartAction to the real cart —
 *   whether it worked, and what price was actually observed.
 * Why: Execution can fail in ways decisions can't predict, like an item
 *   going out of stock in the last second, or its price changing.
 *   Reporting that back keeps the automation layer honest about what it
 *   actually did, and gives PurchaseHistory real data to reconcile
 *   against.
 * Layer: Execution — the browser automation layer's report of what it
 *   did.
 * Who: Created by the browser automation layer; consumed by whatever
 *   orchestrates the run, and later by PurchaseHistory.
 * Example: { siteProductId: "abc123", success: true, observedPrice: 1.29 }.
 */
export const cartActionResultSchema = z.object({
  siteProductId: z.string().min(1),
  success: z.boolean(),
  observedPrice: z.number().positive().optional(),
  error: z.string().optional(),
});
export type CartActionResult = z.infer<typeof cartActionResultSchema>;

/**
 * What: The contract every browser automation implementation must
 *   fulfill — take a batch of CartActions, report back what happened.
 *   This is a behavioral contract (a function signature), not a data
 *   shape, so it's a plain TypeScript interface rather than a Zod schema.
 * Why: This is the seam that keeps business logic out of automation code.
 *   Anything that implements this interface is free to use Playwright,
 *   Puppeteer, or anything else internally — the rest of the system never
 *   needs to know or care, as long as it speaks CartAction in and
 *   CartActionResult out.
 * Layer: Execution — the top-level interface of this layer.
 * Who: Implemented by the browser automation layer; called by whatever
 *   orchestrates a shopping run.
 * Example: automation.addToCart([{ siteProductId: "abc123", quantity: 2 }]).
 */
export interface CartAutomation {
  addToCart(actions: CartAction[]): Promise<CartActionResult[]>;
}
