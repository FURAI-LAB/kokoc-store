// index.js — admin page entry point.
//
// Replaces the former monolithic src/pages/admin.js (3312 lines: one huge
// inline <script> holding ~130 functions for every admin section, plus two
// ~90%-duplicated product-edit forms). The app ships to the browser exactly
// the same way as before — one flat <script> with no bundler/imports at
// runtime — but the source is now organized as one file per admin section
// under client/, each exporting its script body as a string. This file is
// the only place that assembles them, in the order dependencies require
// (core utilities first, then the shared item-form, then each section).
//
// See client/item-form.js for the main deduplication: the former
// renderProductForm()/renderBrandForm(key) pair (~530 lines combined,
// ~90% identical) is now a single renderItemForm(cfg, product).

import { CLIENT_ESC_HTML_SRC } from "../../lib/html.js";
import { loginPage } from "./login-page.js";
import { shellHtml } from "./shell.js";
import { itemFormStyles } from "./client/item-form.css.js";
import { coreScript } from "./client/core.js";
import { itemFormScript } from "./client/item-form.js";
import { itemFormWidgetsScript } from "./client/item-form-widgets.js";
import { dashboardScript } from "./client/dashboard.js";
import { productsScript } from "./client/products.js";
import { brandSectionsScript } from "./client/brand-sections.js";
import { ordersScript } from "./client/orders.js";
import { reviewsScript } from "./client/reviews.js";
import { subscribersScript } from "./client/subscribers.js";
import { clientsScript } from "./client/clients.js";
import { collabsScript } from "./client/collabs.js";
import { catalogSettingsScript } from "./client/catalog-settings.js";
import { settingsScript } from "./client/settings.js";

export function renderAdminPage({ page }) {
  if (page === "login") return loginPage();
  return appPage();
}

function appPage() {
  return shellHtml() + `<script>
${CLIENT_ESC_HTML_SRC}
const esc = clientEscHtml;
const ITEM_FORM_STYLES = ${JSON.stringify(itemFormStyles)};
${coreScript}
${dashboardScript}
${productsScript}
${brandSectionsScript}
${itemFormScript}
${itemFormWidgetsScript}
${ordersScript}
${reviewsScript}
${subscribersScript}
${clientsScript}
${collabsScript}
${catalogSettingsScript}
${settingsScript}

// ─── Boot ─────────────────────────────────────────────────────────────────────
window.addEventListener('hashchange', onHashChange);
onHashChange();
</script>
</body>
</html>`;
}
