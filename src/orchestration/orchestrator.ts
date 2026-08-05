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
    // TEMP DEBUG (remove once the wrong-cart-contents issue is diagnosed):
    console.log(
      `[dry-run debug] item "${item.id}" (${item.label}, searchTerms=` +
        `${JSON.stringify(item.searchTerms)}): ${candidates.length} unique candidate(s)`,
    );
    const result = await deps.decisionEngine.decide({
      item,
      candidates,
      defaultWeights: deps.defaultWeights,
    });

    if (result.status === 'decided') {
      console.log(
        `[dry-run debug]   DECIDED for "${item.id}": code=` +
          `${result.decision.chosenOffer.siteProductId} name="${result.decision.chosenOffer.name}" ` +
          `qty=${result.decision.quantityToBuy} score=${result.decision.score.toFixed(3)}`,
      );
      for (const line of result.decision.reasoning) {
        console.log(`[dry-run debug]     reason: ${line}`);
      }
      cartActions.push({
        siteProductId: result.decision.chosenOffer.siteProductId,
        quantity: result.decision.quantityToBuy,
        expectedName: result.decision.chosenOffer.name,
      });
    } else {
      console.log(
        `[dry-run debug]   NO-MATCH for "${item.id}": ${result.reason}`,
      );
      needsReview.push(result);
    }
  }

  return { cartActions, needsReview };
}
