/**
 * adidas.js — /adidas page.
 *
 * See pages/brand-catalog.js for the shared implementation and
 * config/brand-pages.js for the Adidas Originals configuration
 * (filter chips, size chart, FAQ and SEO strings).
 *
 * The public signature is unchanged so server.js and the existing tests
 * keep working exactly as before.
 */

import { renderBrandCatalogPage } from "./brand-catalog.js";
import { BRAND_PAGES } from "../config/brand-pages.js";

export function renderAdidasPage(appConfig, data = {}, locale = "ru", whatsappNumber = "", nonce = null) {
  return renderBrandCatalogPage(BRAND_PAGES.adidas, appConfig, data, locale, whatsappNumber, nonce);
}
