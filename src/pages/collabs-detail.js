import {
  i18n,
  pluralItems,
  languageSwitcherScript,
  languageSwitcherStyles,
  renderLanguageSwitcher
} from "../lib/i18n.js";
import { renderSeoHead, breadcrumbJsonLd, itemListJsonLd, jsonLdScripts } from "../lib/seo.js";
import { renderNavbar, navbarStyles, navbarScript, navbarUi } from "../lib/navbar.js";
import { escapeHtml } from "../lib/html.js";

/**
 * renderCollabDetailPage — /collabs/:slug
 * Shows the collab banner/story plus a grid of the products tagged with
 * its productTag (see lib/collabs.js getCollabDetail). Product cards are
 * static links to /product/:slug — no quick-view/add-to-cart JS here,
 * keeping this page light; shoppers land on the full product page to buy.
 */
export function renderCollabDetailPage(appConfig, data, locale = "ru", whatsappNumber = "", nonce = null) {
  const tr = i18n(locale);
  const langSwitcher = renderLanguageSwitcher(tr);
  const waNumber = (whatsappNumber || "").replace(/\D/g, "");
  const { collab, products = [], total = 0 } = data;

  const iconArrowLeft = `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" width="15" height="15"><path d="M19 12H5"/><path d="m11 18-6-6 6-6"/></svg>`;
  const iconChev = `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.85" stroke-linecap="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>`;

  const name        = escapeHtml(collab.name);
  const description = escapeHtml(collab.description);
  const bannerUrl    = escapeHtml(collab.bannerUrl);
  const year         = escapeHtml(collab.year);
  const isArchive    = collab.status === "archive";

  const badgeMap = { new: tr.t("new"), hit: tr.t("hit"), limited: tr.t("limited") };
  const badgeClass = { new: "badge-new", hit: "badge-hit", limited: "badge-ltd" };

  const ProductCard = (p) => {
    const title = escapeHtml(p.title);
    const slug  = escapeHtml(p.slug);
    const image = escapeHtml(p.image);
    const price = escapeHtml(p.price || tr.t("outOfStock"));
    const comparePrice = p.comparePrice ? escapeHtml(p.comparePrice) : null;
    const badge = p.badge && badgeMap[p.badge];
    const bc    = badge ? badgeClass[p.badge] : "";

    return `
      <a href="/product/${slug}" class="pc" aria-label="${tr.t("open")} ${title}">
        <div class="pc-media">
          <img src="${image}" alt="${title}" loading="lazy" width="640" height="640" />
          ${badge ? `<span class="badge ${bc}">${badge}</span>` : ""}
        </div>
        <div class="pc-body">
          <h3>${title}</h3>
          <div class="pc-foot">
            <div class="pc-price">
              ${comparePrice ? `<s>${comparePrice}</s>` : ""}
              <strong>${price}</strong>
            </div>
            <span class="cart-btn-icon" aria-hidden="true">${iconChev}</span>
          </div>
        </div>
      </a>`;
  };

  return `<!DOCTYPE html>
<html lang="${tr.locale}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    ${renderSeoHead({
      appConfig,
      title: `${name} — ${tr.t("collabsTitle")} — Kokoc Store`,
      description: collab.description,
      path: `/collabs/${collab.slug}`,
      locale: tr.locale,
      alternates: { ru: `/collabs/${collab.slug}`, en: `/collabs/${collab.slug}` }
    })}
    ${jsonLdScripts(
      nonce,
      breadcrumbJsonLd(appConfig, [
        { name: tr.t("home"), path: "/" },
        { name: tr.t("collabsTitle"), path: "/collabs" },
        { name: collab.name, path: `/collabs/${collab.slug}` }
      ]),
      ...(products.length ? [itemListJsonLd(appConfig, products, `/collabs/${collab.slug}`)] : [])
    )}
    <meta name="theme-color" content="#F7F7F6" />
    <link rel="icon" type="image/png" sizes="32x32" href="/favsmall.png" />
    <link rel="preload" as="image" href="/menu-logo.png" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
    <style>
      :root {
        --background: #F7F7F6;
        --primary: #FF6B9A;
        --text: #111;
        --secondary-text: #888;
        --white: #FFFFFF;
        --shadow-default: 0 8px 24px rgba(0,0,0,0.06);
        --shadow-hover: 0 16px 40px rgba(0,0,0,0.12);
        --container: 1180px;
      }
      * { box-sizing: border-box; }
      html { overflow-x: hidden; }
      html, body {
        margin: 0; min-height: 100vh;
        background: radial-gradient(circle at 50% 0%, rgba(255,240,245,0.4), transparent 60%), #F7F7F6;
        color: var(--text);
        font-family: "Manrope", "Segoe UI", Arial, sans-serif;
      }
      a { color: inherit; text-decoration: none; }
      button, input { font: inherit; }
      button { border: 0; padding: 0; color: inherit; background: none; cursor: pointer; }
      img { display: block; max-width: 100%; }

      /* ── Navbar ── */
      .navbar {
        position: sticky; top: 0; z-index: 100;
        display: flex; align-items: center; justify-content: space-between;
        height: 56px; padding: 0 24px;
        background: rgba(255,255,255,0.6);
        border-bottom: 1px solid rgba(0,0,0,0.05);
        backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
      }
      .brand { display: inline-flex; align-items: center; width: 82px; min-width: 82px; }
      .brand img { width: 100%; height: auto; }
      .desktop-nav {
        position: absolute; left: 50%;
        display: flex; align-items: center; gap: 20px;
        transform: translateX(-50%);
        white-space: nowrap;
      }
      .desktop-nav a {
        color: var(--text); font-size: 13px; font-weight: 600; line-height: 1;
        transition: color 220ms ease, transform 220ms ease;
      }
      .desktop-nav a:hover { color: var(--primary); transform: translateY(-1px); }
      .desktop-nav a.active { color: var(--primary); }
      .nav-actions { display: flex; align-items: center; gap: 6px; }
      .mobile-only { display: none; }

${languageSwitcherStyles}
${navbarStyles}

      /* ── Breadcrumb back-link ── */
      .page-inner {
        width: min(calc(100% - 48px), var(--container));
        margin-inline: auto;
        padding: 32px 0 80px;
      }
      .back-link {
        display: inline-flex; align-items: center; gap: 6px;
        font-size: 12px; font-weight: 600; color: var(--secondary-text);
        margin-bottom: 24px;
        transition: color 180ms ease, gap 180ms ease;
      }
      .back-link:hover { color: var(--text); gap: 9px; }

      /* ── Hero ── */
      .collab-hero {
        position: relative; overflow: hidden;
        border-radius: 22px;
        background: #f0efed;
        margin-bottom: 40px;
      }
      .collab-hero img {
        width: 100%; aspect-ratio: 21/9; object-fit: cover;
        filter: contrast(1.05);
      }
      .collab-hero-overlay {
        position: absolute; inset: 0;
        background: linear-gradient(0deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 55%);
        display: flex; flex-direction: column; justify-content: flex-end;
        padding: 28px 32px;
      }
      .collab-hero-badge {
        display: inline-flex; align-items: center; width: fit-content;
        height: 24px; padding: 0 12px; margin-bottom: 12px;
        border-radius: 999px;
        background: ${isArchive ? "rgba(255,255,255,0.25)" : "var(--primary)"};
        color: #fff; font-size: 11px; font-weight: 700;
      }
      .collab-hero h1 {
        margin: 0 0 6px; color: #fff;
        font-size: clamp(22px, 3.4vw, 34px); font-weight: 700; line-height: 1.15;
      }
      .collab-hero p {
        margin: 0; color: rgba(255,255,255,0.85);
        font-size: 13px; line-height: 1.5; max-width: 520px;
      }

      /* ── Hero: desktop shows text only, no banner image ── */
      @media (min-width: 901px) {
        .collab-hero {
          border-radius: 0;
          background: none;
          margin-bottom: 32px;
        }
        .collab-hero img { display: none; }
        .collab-hero-overlay {
          position: static;
          background: none;
          padding: 0;
        }
        .collab-hero-badge {
          background: ${isArchive ? "rgba(0,0,0,0.08)" : "var(--primary)"};
          color: ${isArchive ? "var(--text)" : "#fff"};
        }
        .collab-hero h1 { color: var(--text); }
        .collab-hero p { color: var(--secondary-text); }
      }

      /* ── Product section ── */
      .products-section-label {
        display: flex; align-items: baseline; justify-content: space-between;
        margin: 0 0 20px;
      }
      .products-section-label h2 {
        margin: 0; font-size: 18px; font-weight: 700;
      }
      .products-section-label span {
        font-size: 12px; color: var(--secondary-text);
      }
      .product-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 18px;
      }

      .pc {
        position: relative; display: grid; gap: 0;
        border-radius: 18px;
        background: var(--white);
        box-shadow: var(--shadow-default);
        overflow: hidden;
        transition: transform 220ms ease, box-shadow 220ms ease;
      }
      .pc:hover, .pc:focus-visible {
        transform: translateY(-4px);
        box-shadow: var(--shadow-hover);
      }
      .pc:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
      .pc-media { position: relative; overflow: hidden; background: var(--white); }
      .pc-media img {
        width: 100%; height: auto;
        filter: contrast(1.08);
        transition: transform 300ms ease;
        aspect-ratio: 1/1; object-fit: cover;
      }
      .pc:hover .pc-media img { transform: scale(1.04); }
      .badge {
        position: absolute; top: 10px; left: 10px;
        display: inline-flex; align-items: center;
        min-height: 22px; padding: 3px 9px;
        border-radius: 999px;
        font-size: 10px; font-weight: 500; line-height: 1;
        letter-spacing: 0.03em;
        color: var(--white);
        background: rgba(0,0,0,.72);
        backdrop-filter: blur(6px);
        -webkit-backdrop-filter: blur(6px);
      }
      .pc-body { display: grid; gap: 8px; padding: 12px 14px 14px; }
      .pc-body h3 {
        margin: 0; font-size: 12.5px;
        font-weight: 500; line-height: 1.3;
      }
      .pc-foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
      .pc-price { display: flex; flex-direction: column; gap: 2px; }
      .pc-price s { font-size: 10px; color: var(--secondary-text); font-weight: 400; }
      .pc-price strong { font-size: 13px; font-weight: 500; }
      .cart-btn-icon { display: inline-flex; color: var(--secondary-text); }
      .cart-btn-icon svg { width: 16px; height: 16px; stroke: currentColor; }
      .pc:hover .cart-btn-icon { color: var(--primary); }

      .empty-products {
        border-radius: 18px; background: var(--white);
        box-shadow: var(--shadow-default);
        padding: 40px 24px; text-align: center;
        color: var(--secondary-text); font-size: 13px;
      }

      /* ── Footer ── */
      .site-footer {
        width: min(calc(100% - 48px), var(--container));
        margin: 0 auto; padding: 4px 0 calc(28px + env(safe-area-inset-bottom, 0px));
        border-top: 1px solid rgba(0,0,0,0.07);
        color: var(--secondary-text); font-size: 13px; display: flex; align-items: center; justify-content: space-between;
      }
      .footer-tagline { opacity: 0.3; }
      .footer-credit {
        color: inherit; opacity: 0.45; text-decoration: none;
        font-size: inherit; transition: opacity 180ms;
      }
      .footer-credit:hover { opacity: 0.75; }
      @media (max-width: 900px) { .site-footer { width: min(calc(100% - 32px), var(--container)); } }
      @media (max-width: 480px)  { .site-footer { width: min(calc(100% - 24px), var(--container)); } }

      /* ── Responsive ── */
      @media (max-width: 900px) {
        .navbar { padding: 0 16px; }
        .brand { width: 74px; min-width: 74px; }
        .desktop-nav, .desktop-only { display: none; }
        .mobile-only { display: inline-flex; }
        .nav-actions .language-switcher { display: none; }
        .page-inner { width: min(calc(100% - 32px), var(--container)); padding: 24px 0 64px; }
        .product-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
        .collab-hero { border-radius: 18px; }
        .collab-hero-overlay { padding: 20px; }
      }
      @media (max-width: 640px) {
        .collab-hero img { aspect-ratio: 4/3; }
      }
      @media (max-width: 480px) {
        .product-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
        .page-inner { width: min(calc(100% - 24px), var(--container)); }
      }

    </style>
  </head>
  <body>
    ${renderNavbar(appConfig, tr, langSwitcher, waNumber, "collabs")}

    <main>
      <div class="page-inner">
        <a href="/collabs" class="back-link">${iconArrowLeft} ${tr.t("collabsTitle")}</a>

        <div class="collab-hero">
          <img src="${bannerUrl}" alt="${name}" width="1280" height="549" />
          <div class="collab-hero-overlay">
            <span class="collab-hero-badge">${isArchive ? tr.t("archiveBadge") : `${tr.t("activeBadge")} · ${year}`}</span>
            <h1>${name}</h1>
            <p>${description}</p>
          </div>
        </div>

        <div class="products-section-label">
          <h2>${tr.t("navAllProducts")}</h2>
          ${total > 0 ? `<span>${pluralItems(total, tr)}</span>` : ""}
        </div>

        ${products.length > 0
          ? `<div class="product-grid">${products.map(ProductCard).join("")}</div>`
          : `<div class="empty-products">${tr.t("noProducts")}</div>`
        }
      </div>
    </main>

    <footer class="site-footer">
      <span>© ${new Date().getFullYear()} ${appConfig.domain}</span>
      <span class="footer-tagline">stay chill</span>
      <a href="https://lab.furai.space" class="footer-credit" target="_blank" rel="noopener noreferrer">BUILT BY FURAI LAB</a>
    </footer>

    <script nonce="${nonce}">
      (function () {
        ${languageSwitcherScript}
      })();
      ${navbarScript(navbarUi(tr, waNumber))}
    </script>
  </body>
</html>`;
}
