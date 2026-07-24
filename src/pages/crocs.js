/**
 * crocs.js — /crocs page.
 *
 * The 1241-line implementation that used to live here was ~84% identical
 * to adidas.js (the entire markup block was byte-for-byte the same). It
 * now lives once in pages/brand-catalog.js, driven by the Crocs entry in
 * config/brand-pages.js.
 *
 * The public signature is unchanged so server.js and the existing tests
 * keep working exactly as before.
 */

import { renderBrandCatalogPage } from "./brand-catalog.js";
import { BRAND_PAGES } from "../config/brand-pages.js";

export function renderCrocsPage(appConfig, data = {}, locale = "ru", whatsappNumber = "", nonce = null) {
  return renderBrandCatalogPage(BRAND_PAGES.crocs, appConfig, data, locale, whatsappNumber, nonce);
}
