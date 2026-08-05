import type {
  CartAction,
  DecisionEngine,
  DecisionResult,
  DecisionWeights,
  ProductSearch,
  RecurringItem,
} from '../domain/index.js';

export interface OrchestratorDeps {
  productSearch: ProductSearch;
  decisionEngine: DecisionEngine;
  defaultWeights: DecisionWeights;
}

export interface ShoppingRunResult {
  cartActions: CartAction[];
  needsReview: DecisionResult[];
}

// Runs one shopping pass over a household's recurring items: for each
// active item, searches for real candidates, asks the decision engine to
// choose one, and collects the outcome. This is
// docs/decision-engine-architecture.md §7 made real. It stops short of
// actually adding anything to a cart — that's a CartAutomation's job,
// once one exists, using the cartActions returned here.
export async function runShoppingRun(
  items: RecurringItem[],
  deps: OrchestratorDeps,
): Promise<ShoppingRunResult> {
  const cartActions: CartAction[] = [];
  const needsReview: DecisionResult[] = [];

  for (const item of items.filter((candidate) => candidate.active)) {
    const candidates = await deps.productSearch.search(item.searchTerms);
    const result = await deps.decisionEngine.decide({
      item,
      candidates,
      defaultWeights: deps.defaultWeights,
    });

    if (result.status === 'decided') {
      cartActions.push({
        siteProductId: result.decision.chosenOffer.siteProductId,
        quantity: result.decision.quantityToBuy,
      });
    } else {
      needsReview.push(result);
    }
  }

  return { cartActions, needsReview };
}
