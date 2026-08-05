import type { Locator, Page } from 'playwright';
import type { ProductOffer, ProductSearch } from '../domain/index.js';
import { humanPacingDelay } from './pacing.js';
import {
  buildSearchUrl,
  parseContainerType,
  parseDietaryTags,
  parseFatPercentage,
  parseSizeAndBrand,
  parseSizeGrade,
  parseUnitPriceText,
} from './site-parsing.js';
import type { SiteSelectors } from './site-selectors.js';

export class PlaywrightProductSearch implements ProductSearch {
  constructor(
    private readonly page: Page,
    private readonly config: SiteSelectors,
  ) {}

  async search(searchTerms: string[]): Promise<ProductOffer[]> {
    const found = new Map<string, ProductOffer>();

    for (const term of searchTerms) {
      await this.page.goto(buildSearchUrl(this.config, term));
      const tiles = this.page.locator(this.config.productTileSelector);
      const count = await tiles.count();
      // TEMP DEBUG (remove once the wrong-cart-contents issue is diagnosed):
      console.log(`[dry-run debug] term "${term}": ${count} tile(s) matched`);

      for (let i = 0; i < count; i++) {
        const offer = await this.extractOffer(tiles.nth(i));
        if (offer) {
          found.set(offer.siteProductId, offer);
          console.log(
            `[dry-run debug]   tile ${i}: code=${offer.siteProductId} ` +
              `name="${offer.name}" brand=${offer.brand ?? '(none)'} ` +
              `price=${offer.price} available=${offer.available}`,
          );
        } else {
          console.log(
            `[dry-run debug]   tile ${i}: SKIPPED (missing code/name/price/size)`,
          );
        }
      }

      await humanPacingDelay();
    }

    return [...found.values()];
  }

  private async extractOffer(tile: Locator): Promise<ProductOffer | undefined> {
    const code = await tile.getAttribute(this.config.productCodeAttribute);
    const name = await tile.getAttribute(this.config.productNameAttribute);
    const priceRaw = await tile.getAttribute(this.config.productPriceAttribute);
    if (!code || !name || !priceRaw) {
      return undefined;
    }

    const price = Number(priceRaw);
    if (!Number.isFinite(price)) {
      return undefined;
    }

    const sizeAndBrandText = await tile
      .locator(this.config.sizeAndBrandSelector)
      .first()
      .textContent()
      .catch(() => null);
    const { size, brand } = sizeAndBrandText
      ? parseSizeAndBrand(sizeAndBrandText)
      : {};
    if (!size) {
      // Can't build a valid ProductOffer without a package size.
      return undefined;
    }

    const unitPriceText = await tile
      .locator(this.config.unitPriceSelector)
      .first()
      .textContent()
      .catch(() => null);
    const unitPrice = unitPriceText
      ? parseUnitPriceText(unitPriceText, this.config.unitPriceBasisAmount)
      : undefined;

    const outOfStock = await tile
      .locator(this.config.outOfStockSelector)
      .first()
      .isVisible()
      .catch(() => false);

    const promotionLocator = tile
      .locator(this.config.promotionSelector)
      .first();
    const hasPromotion = await promotionLocator.isVisible().catch(() => false);
    const promotionText = hasPromotion
      ? ((await promotionLocator.textContent().catch(() => null))?.trim() ??
        undefined)
      : undefined;

    return {
      siteProductId: code,
      name,
      brand,
      packageSize: size,
      price,
      unitPrice,
      currency: this.config.currency,
      available: !outOfStock,
      // The site's promotion badge doesn't distinguish percent-off from
      // amount-off/bundle deals in a way we've parsed yet — "percent-off"
      // is a reasonable default label, not a verified fact about the deal.
      promotion: hasPromotion
        ? {
            kind: 'percent-off',
            description: promotionText || 'promotion active',
          }
        : undefined,
      dietaryTags: parseDietaryTags(name),
      fatPercentage: parseFatPercentage(name),
      containerType: parseContainerType(name),
      sizeGrade: parseSizeGrade(name),
      fetchedAt: new Date().toISOString(),
    };
  }
}
