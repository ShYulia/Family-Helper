import type { ProductOffer } from './product-offer.js';

/**
 * What: The contract for finding real candidate products for a shopping
 *   need — given search terms, return what's currently available on the
 *   supermarket's site.
 * Why: This is the mirror image of CartAutomation. Where CartAutomation
 *   turns a decision into real cart contents, ProductSearch turns a need
 *   into real candidates a decision can be made about. Both are meant to
 *   be implemented by the browser automation layer, and both are plain
 *   TypeScript interfaces (behavioral contracts) rather than Zod schemas,
 *   for the same reason.
 * Layer: sits between Intent and Catalog — it's what actually produces
 *   ProductOffers from a RecurringItem's searchTerms.
 * Who: Implemented by the browser automation layer (not built yet — a
 *   fixture-based fake stands in for development, see
 *   src/orchestration/dev-fixtures.ts); called by the orchestrator.
 * Example: await search.search(["milk"]) -> [offerA, offerB, ...].
 */
export interface ProductSearch {
  search(searchTerms: string[]): Promise<ProductOffer[]>;
}
