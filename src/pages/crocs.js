import {
  i18n,
  languageSwitcherScript,
  languageSwitcherStyles,
  pluralItems,
  renderLanguageSwitcher
} from "../lib/i18n.js";
import { renderSeoHead, breadcrumbJsonLd, itemListJsonLd, faqJsonLd, jsonLdScripts } from "../lib/seo.js";
import { navbarStyles, navbarScript, navbarUi, renderNavbar } from "../lib/navbar.js";
import { escapeHtml, CLIENT_ESC_HTML_SRC } from "../lib/html.js";
import { stripHtmlToText } from "../lib/rich-text.js";

/**
 * crocs.js — Server-rendered /crocs page.
 * Dedicated, keyword-targeted landing page for Crocs (own clean URL, own
 * H1/intro copy/FAQ) instead of routing Crocs through /catalog?brand=crocs.
 * Design tokens match landing.js exactly.
 * Client JS handles: sort/filter, quick-view modal, size guide, add-to-cart.
 */

export function renderCrocsPage(appConfig, data = {}, locale = "ru", whatsappNumber = "", nonce = null) {
  const tr = i18n(locale);
  const langSwitcher = renderLanguageSwitcher(tr);
  const waNumber = (whatsappNumber || "").replace(/\D/g, "");
  const waHref = waNumber ? `https://wa.me/${waNumber}` : null;
  const uiJson = JSON.stringify({
    addToCart: tr.t("addToCart"),
    added: tr.t("added"),
    addToWishlist: tr.t("addToWishlist"),
    close: tr.t("closeMenu"),
    crocsSizeGuide: tr.t("crocsSizeGuide"),
    crocsKidsSizeGuide: tr.t("crocsKidsSizeGuide"),
    hit: tr.t("hit"),
    limited: tr.t("limited"),
    new: tr.t("new"),
    outOfStock: tr.t("outOfStock"),
    photo: tr.t("photo"),
    size: tr.t("size"),
    sizeGuide: tr.t("sizeGuide")
  });
  const {
    products = [],
    total = 0,
    limit = 12,
    offset = 0,
    sort = "newest",
    tag = null,
    q = null,
  } = data;
 
  const page = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);
 
  /* ── SVG icons (same stroke style as landing) ─────────────────── */
  const iconSearch = `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.7"/><path d="m20 20-4.45-4.45"/></svg>`;
  const iconHeart  = `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20.2 4.85 13.55a4.7 4.7 0 0 1 6.65-6.65l.5.5.5-.5a4.7 4.7 0 1 1 6.65 6.65L12 20.2Z"/></svg>`;
  const iconBag    = `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5.5 6.2h1.8l1 2.8"/><path d="M8.3 9h10.4l-1.7 6H9.3Z"/><circle cx="10.3" cy="17.3" r="1.2"/><circle cx="16" cy="17.3" r="1.2"/></svg>`;
  const iconMenu   = `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.85" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/></svg>`;
  const iconClose  = `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.85" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`;
  const iconWhatsapp = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>`;
  const iconChev   = `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.85" stroke-linecap="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>`;
  const iconRuler  = `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21.3 10.53 10.5 21.3a1.5 1.5 0 0 1-2.12 0L2.7 15.62a1.5 1.5 0 0 1 0-2.12L13.47 2.7a1.5 1.5 0 0 1 2.12 0l5.71 5.71a1.5 1.5 0 0 1 0 2.12Z"/><path d="m7.5 10.5 1.5 1.5"/><path d="m10.5 7.5 1.5 1.5"/><path d="m13.5 4.5 1.5 1.5"/><path d="m4.5 13.5 1.5 1.5"/></svg>`;
 
  /* ── Tag chips for filter bar ─────────────────────────────────── */
  const ALL_TAGS = [
    { key: "",        label: tr.t("all") },
    { key: "new",      label: tr.t("new") },
    { key: "hit",      label: tr.t("hit") },
    { key: "limited",  label: tr.t("limited") },
    { key: "sale",     label: tr.t("sale") },
    { key: "kids",     label: tr.t("kids") },
    { key: "jibbitz",  label: "Jibbitz" },
  ];
 
  /* ── Product card ─────────────────────────────────────────────── */
  const escHtml = escapeHtml;
 
  const badgeMap = { new: tr.t("new"), hit: tr.t("hit"), limited: tr.t("limited") };
  const badgeClass = { new: "badge-new", hit: "badge-hit", limited: "badge-ltd" };
 
  const ProductCard = (p) => {
    const title = escHtml(p.title);
    const slug  = escHtml(p.slug);
    const image = escHtml(p.image);
    const price = escHtml(p.price || tr.t("outOfStock"));
    const comparePrice = p.comparePrice ? escHtml(p.comparePrice) : null;
    const badge = p.badge && badgeMap[p.badge];
    const bc    = badge ? badgeClass[p.badge] : "";
 
    return `
      <article class="pc" data-slug="${slug}" tabindex="0" role="button"
        aria-label="${tr.t("open")} ${title}">
        <div class="pc-media">
          <img src="${image}" alt="${title}" loading="lazy" width="800" height="800" />
          ${badge ? `<span class="badge ${bc}">${badge}</span>` : ""}
          <button class="fav-btn" type="button" data-slug="${slug}"
            aria-label="${tr.t("addToWishlist")}: ${title}" aria-pressed="false">
            ${iconHeart}
          </button>
        </div>
        <div class="pc-body">
          <h3>${title}</h3>
          <div class="pc-foot">
            <div class="pc-price">
              ${comparePrice ? `<s>${comparePrice}</s>` : ""}
              <strong>${price}</strong>
            </div>
            <a class="cart-btn" href="/product/${slug}"
              aria-label="${tr.t("open")} ${title}">
              <span class="cart-btn-label">${tr.t("view")}</span>
              <span class="cart-btn-icon" aria-hidden="true">${iconChev}</span>
            </a>
          </div>
        </div>
      </article>`;
  };
 
  /* ── Pagination links ─────────────────────────────────────────── */
  const pageLink = (p, label, disabled = false, current = false) => {
    if (disabled) return `<span class="pg-btn pg-disabled">${label}</span>`;
    if (current)  return `<span class="pg-btn pg-current">${label}</span>`;
    const newOffset = (p - 1) * limit;
    return `<a class="pg-btn" href="?sort=${sort}${tag ? `&tag=${tag}` : ""}&offset=${newOffset}">${label}</a>`;
  };
 
  const PaginationBar = () => {
    if (totalPages <= 1) return "";
    let btns = pageLink(page - 1, "←", page === 1);
    for (let i = 1; i <= totalPages; i++) {
      btns += pageLink(i, i, false, i === page);
    }
    btns += pageLink(page + 1, "→", page === totalPages);
    return `<nav class="pagination" aria-label="Catalog pages">${btns}</nav>`;
  };
 
  /* ── Size guide table data (matches product.js crocsSizeGuide) ───── */
  const sizeGuide = [
    ["M3 W5",   "34–35", "21"],
    ["M4 W6",   "36–37", "22"],
    ["M5 W7",   "37–38", "23"],
    ["M6 W8",   "38–39", "24"],
    ["M7 W9",   "39–40", "25"],
    ["M8 W10",  "41–42", "26"],
    ["M9 W11",  "42–43", "27"],
    ["M10 W12", "43–44", "28"],
    ["M11",     "45–46", "29"],
  ];

  /* Kids' Crocs sizing (US C/J scale, matches product.js crocsKidsSizeGuide) */
  const kidsSizeGuide = [
    ["C11", "28–29", "17"],
    ["C12", "29–30", "18"],
    ["C13", "30–31", "19"],
    ["J1",  "32–33", "19,5"],
    ["J2",  "33–34", "20"],
    ["J3",  "34–35", "21"],
  ];

  const sizeGuideLabel = tr.t("crocsSizeGuide");

  const SizeGuideTable = () => `
    <table class="sg-table" aria-label="${sizeGuideLabel}">
      <thead>
        <tr>
          <th>Crocs</th>
          <th>EU</th>
          <th>CM</th>
        </tr>
      </thead>
      <tbody>
        ${sizeGuide.map(([cs, eu, cm]) => `
          <tr>
            <td>${cs}</td>
            <td>${eu}</td>
            <td>${cm} cm</td>
          </tr>`).join("")}
      </tbody>
    </table>`;
 
  /* ── Serialise products to JSON for client quick-view ─────────── */
  const productsJson = JSON.stringify(products.map(p => ({
    slug: p.slug,
    title: p.title,
    // description is sanitized rich-text HTML — quick-view shows a
    // plain-text preview, so strip tags here rather than in client JS.
    description: stripHtmlToText(p.description),
    badge: p.badge,
    image: p.image,
    price: p.price,
    comparePrice: p.comparePrice,
    tags: p.tags || [],
  })));
 
  const breadcrumbs = breadcrumbJsonLd(appConfig, [
    { name: tr.t("home"), path: "/" },
    { name: tr.t("crocsPageTitle"), path: "/crocs" }
  ]);
  const itemList = itemListJsonLd(appConfig, products, "/crocs");
  const seoNoindex = Boolean(q) || page > 1;
  const seoCanonicalPath = tag && !seoNoindex
    ? `/crocs?tag=${encodeURIComponent(tag)}`
    : "/crocs";
  const tagLabelMap = { new: tr.t("new"), hit: tr.t("hit"), limited: tr.t("limited"), sale: tr.t("sale") };
  const seoTitle = tag && tagLabelMap[tag]
    ? `${tagLabelMap[tag]} — ${tr.t("crocsSeoTitle")}`
    : tr.t("crocsSeoTitle");

  /* FAQ content — targets long-tail "купить crocs" delivery/sizing/order
     questions; only rendered (and only added to JSON-LD) on the bare,
     unfiltered page so it stays attached to the one canonical URL. */
  const faqItems = [
    { question: tr.t("crocsFaqQ1"), answer: tr.t("crocsFaqA1") },
    { question: tr.t("crocsFaqQ2"), answer: tr.t("crocsFaqA2") },
    { question: tr.t("crocsFaqQ3"), answer: tr.t("crocsFaqA3") },
    { question: tr.t("crocsFaqQ4"), answer: tr.t("crocsFaqA4") }
  ];
  const showFaq = !tag && !q && page === 1;
  const faq = showFaq ? faqJsonLd(faqItems) : null;

  /* ── HTML shell ───────────────────────────────────────────────── */
  return `<!DOCTYPE html>
<html lang="${tr.locale}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  ${renderSeoHead({
    appConfig,
    title: seoTitle,
    description: tr.t("crocsSeoDescription"),
    path: seoCanonicalPath,
    locale: tr.locale,
    noindex: seoNoindex,
    alternates: { ru: seoCanonicalPath, en: seoCanonicalPath }
  })}
  ${jsonLdScripts(nonce, breadcrumbs, products.length ? itemList : null, faq)}
  <link rel="icon" href="/favsmall.png" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <style>
    /* ─── Design tokens (match landing.js) ─────────────────── */
    :root {
      --background: #F7F7F6;
      --primary: #FF6B9A;
      --text: #111111;
      --secondary-text: #888888;
      --white: #FFFFFF;
      --shadow-default: 0 8px 24px rgba(0,0,0,.06);
      --shadow-hover: 0 16px 40px rgba(0,0,0,.12);
      --container: 1180px;
      --radius-card: 24px;
      --radius-inner: 16px;
    }
 
    *,*::before,*::after { box-sizing: border-box; }
 
    html {
      scroll-behavior: smooth;
      background: #F7F7F6;
      overflow-x: hidden;
    }
 
    body {
      margin: 0;
      min-height: 100vh;
      background:
        radial-gradient(circle at 50% 0%, rgba(255,240,245,.4), transparent 60%),
        var(--background);
      color: var(--text);
      font-family: "Manrope", "Segoe UI", Arial, sans-serif;
    }
 
    a { color: inherit; text-decoration: none; }
    button, input, select { font: inherit; }
    button { border: 0; padding: 0; background: none; cursor: pointer; color: inherit; }
    img { display: block; max-width: 100%; }
 
    /* ─── Navbar (identical to landing) ────────────────────── */
    .navbar {
      position: sticky; top: 0; z-index: 200;
      display: flex; align-items: center; justify-content: space-between;
      height: 56px; padding: 0 24px;
      background: rgba(255,255,255,.6);
      border-bottom: 1px solid rgba(0,0,0,.05);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
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
      font-size: 13px; font-weight: 600; line-height: 1;
      transition: color 220ms ease, transform 220ms ease;
    }
    .desktop-nav a:hover { color: var(--primary); transform: translateY(-1px); }
    .desktop-nav a.active { color: var(--primary); }
    .nav-actions { display: flex; align-items: center; gap: 6px; }
    .mobile-only { display: none; }

${languageSwitcherStyles}
${navbarStyles}
 
    /* ─── Page shell ────────────────────────────────────────── */
    .page { min-height: 100vh; }
    .inner {
      width: min(calc(100% - 48px), var(--container));
      margin-inline: auto;
    }
 
    /* ─── Catalog header ────────────────────────────────────── */
    .cat-header {
      display: flex; align-items: flex-end; justify-content: space-between;
      gap: 16px;
      padding-top: 48px; padding-bottom: 28px;
      flex-wrap: wrap;
    }
    .cat-title {
      font-size: clamp(34px, 5vw, 56px);
      font-weight: 700; line-height: 1; margin: 0;
    }
    .cat-meta { color: var(--secondary-text); font-size: 13px; padding-bottom: 6px; }

    /* ─── Intro copy (SEO content block) ───────────────────── */
    .crocs-intro {
      max-width: 760px;
      margin: 0 0 28px;
      color: var(--secondary-text);
      font-size: 15px;
      line-height: 1.6;
    }

    /* ─── FAQ section ───────────────────────────────────────── */
    .faq-section { padding: 16px 0 56px; max-width: 760px; }
    .faq-section h2 { font-size: 22px; font-weight: 700; margin: 0 0 16px; }
    .faq-item {
      border-bottom: 1px solid rgba(0,0,0,.08);
      padding: 16px 0;
    }
    .faq-item summary {
      cursor: pointer;
      font-weight: 600;
      font-size: 15px;
      list-style: none;
    }
    .faq-item summary::-webkit-details-marker { display: none; }
    .faq-item summary::after { content: "+"; float: right; color: var(--primary); font-weight: 700; }
    .faq-item[open] summary::after { content: "−"; }
    .faq-item p {
      margin: 10px 0 0;
      color: var(--secondary-text);
      font-size: 14px;
      line-height: 1.6;
    }
 
    /* ─── Controls bar ──────────────────────────────────────── */
    .controls {
      padding-bottom: 28px;
    }
    .tag-chips {
      display: flex; gap: 8px;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
      padding-bottom: 4px;
    }
    .tag-chips::-webkit-scrollbar { display: none; }
    .chip {
      padding: 8px 18px; border-radius: 999px;
      font-size: 13px; font-weight: 500;
      border: 1px solid rgba(0,0,0,.12);
      background: var(--white);
      color: var(--text);
      white-space: nowrap;
      flex-shrink: 0;
      transition: background 180ms, border-color 180ms, color 180ms;
    }
    .chip:hover:not(.chip-active) { background: rgba(0,0,0,.04); }
    .chip.chip-active { background: var(--text); color: var(--white); border-color: var(--text); }
    .search-active-bar {
      display: flex; align-items: center; gap: 12px;
      padding: 6px 0 2px;
      font-size: 0.9rem; color: var(--muted);
    }
    .search-active-bar strong { color: var(--text); }
    .search-clear {
      display: inline-flex; align-items: center;
      padding: 3px 10px; border-radius: 999px;
      background: rgba(0,0,0,.06); color: var(--text);
      text-decoration: none; font-size: 0.82rem;
      transition: background 150ms;
    }
    .search-clear:hover { background: rgba(0,0,0,.12); }
 
    /* ─── Product grid ──────────────────────────────────────── */
    .product-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 24px;
      padding-bottom: 48px;
    }
 
    /* ─── Product card ──────────────────────────────────────── */
    .pc {
      position: relative; display: grid; gap: 0;
      border-radius: var(--radius-card);
      background: var(--white);
      box-shadow: var(--shadow-default);
      overflow: hidden;
      cursor: pointer;
      transition: transform 250ms ease, box-shadow 250ms ease;
      outline: none;
    }
    .pc:hover, .pc:focus-visible {
      transform: translateY(-4px);
      box-shadow: var(--shadow-hover);
    }
    .pc:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
 
    .pc-media {
      position: relative; overflow: hidden;
      background: var(--white);
    }
    .pc-media img {
      width: 100%; height: auto;
      filter: contrast(1.08);
      transition: transform 300ms ease;
      aspect-ratio: 1/1; object-fit: cover;
    }
    .pc:hover .pc-media img { transform: scale(1.04); }
 
    .badge {
      position: absolute; top: 12px; left: 12px;
      display: inline-flex; align-items: center;
      min-height: 24px; padding: 4px 10px;
      border-radius: 999px;
      font-size: 11px; font-weight: 500; line-height: 1;
      letter-spacing: 0.03em;
      color: var(--white);
      background: rgba(0,0,0,.72);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
    }
    .badge-new, .badge-hit, .badge-ltd { /* единый стиль */ }
 
    .fav-btn {
      position: absolute; top: 12px; right: 12px;
      display: inline-flex; align-items: center; justify-content: center;
      width: 32px; height: 32px; border-radius: 50%;
      background: rgba(255,255,255,.9);
      transition: color 220ms, transform 220ms;
    }
    .fav-btn svg { width: 18px; height: 18px; stroke: currentColor; }
    .fav-btn:hover { color: var(--primary); transform: scale(1.1); }
    .fav-btn[aria-pressed="true"] { color: var(--primary); }
    .fav-btn[aria-pressed="true"] svg path { fill: var(--primary); stroke: var(--primary); }
 
    .pc-body { display: grid; gap: 10px; padding: 14px 16px 16px; }
    .pc-body h3 {
      margin: 0; font-size: clamp(13px, 1.3vw, 15px);
      font-weight: 500; line-height: 1.3;
    }
    .pc-foot {
      display: flex; align-items: center; justify-content: space-between; gap: 8px;
    }
    .pc-price { display: flex; flex-direction: column; gap: 2px; }
    .pc-price s { font-size: 11px; color: var(--secondary-text); font-weight: 400; }
    .pc-price strong { font-size: clamp(14px, 1.4vw, 16px); font-weight: 500; }
 
    .cart-btn {
      display: inline-flex; align-items: center; justify-content: center;
      height: 36px; padding: 0 16px;
      border-radius: 999px;
      background: var(--text); color: var(--white);
      font-size: 12px; font-weight: 500;
      flex-shrink: 0;
      gap: 6px;
      transition: opacity 180ms;
    }
    .cart-btn:hover { opacity: .72; }
    .cart-btn-icon { display: none; }
    .cart-btn-icon svg { width: 16px; height: 16px; stroke: currentColor; }
 
    /* ─── Empty state ───────────────────────────────────────── */
    .empty-state {
      grid-column: 1/-1; padding: 60px 0; text-align: center;
      color: var(--secondary-text); font-size: 14px;
    }
 
    /* ─── Pagination ────────────────────────────────────────── */
    .pagination {
      display: flex; align-items: center; justify-content: center;
      gap: 6px; padding-bottom: 60px;
    }
    .pg-btn {
      display: inline-flex; align-items: center; justify-content: center;
      min-width: 36px; height: 36px; padding: 0 8px;
      border-radius: 10px; font-size: 13px; font-weight: 500;
      border: 1px solid rgba(0,0,0,.1); background: var(--white);
      transition: background 180ms, color 180ms;
    }
    a.pg-btn:hover { background: var(--background); }
    .pg-current { background: var(--text); color: var(--white); border-color: var(--text); }
    .pg-disabled { opacity: .35; pointer-events: none; }
 
    /* ─── Quick-view modal ──────────────────────────────────── */
    .qv-overlay {
      display: none;
      position: fixed; inset: 0; z-index: 500;
      background: rgba(0,0,0,.5);
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .qv-overlay.open { display: flex; }

    .qv-sheet {
      width: 100%; max-width: 900px;
      max-height: 90dvh;
      background: var(--white);
      border-radius: 28px;
      overflow: hidden;
      display: grid;
      grid-template-columns: 1fr 1fr;
      animation: qvFadeUp 260ms cubic-bezier(.32,.72,0,1);
    }
    @keyframes qvFadeUp {
      from { transform: translateY(16px) scale(.98); opacity: 0; }
      to   { transform: translateY(0) scale(1);      opacity: 1; }
    }

    /* ── Gallery (left column) ── */
    .qv-gallery {
      position: relative;
      background: var(--background);
      display: flex; flex-direction: column;
      overflow: hidden; min-height: 0; min-width: 0;
    }
    .qv-main-img {
      flex: 1; overflow: hidden; min-height: 0;
    }
    .qv-main-img img {
      width: 100%; height: 100%;
      object-fit: cover;
      filter: contrast(1.06);
      transition: opacity 180ms ease;
    }
    .qv-main-img img.switching { opacity: 0; }

    .qv-thumbs {
      display: flex; gap: 8px; padding: 12px;
      overflow-x: auto; scrollbar-width: none;
      flex-shrink: 0;
    }
    .qv-thumbs::-webkit-scrollbar { display: none; }
    .qv-thumb {
      flex-shrink: 0;
      width: 56px; height: 56px; border-radius: 12px;
      overflow: hidden; cursor: pointer;
      border: 2px solid transparent;
      background: rgba(0,0,0,.05);
      transition: border-color 180ms, transform 180ms;
    }
    .qv-thumb img { width: 100%; height: 100%; object-fit: cover; }
    .qv-thumb:hover { transform: scale(1.06); }
    .qv-thumb.active { border-color: var(--text); }

    /* ── Info (right column) ── */
    .qv-info {
      display: flex; flex-direction: column;
      padding: 32px 32px 28px;
      overflow-y: auto;
      overscroll-behavior: contain;
      min-width: 0;
    }

    .qv-header {
      display: flex; align-items: flex-start; justify-content: space-between;
      margin-bottom: 20px; gap: 12px;
    }
    .qv-header-left { display: flex; flex-direction: column; gap: 6px; }
    .qv-close {
      display: inline-flex; align-items: center; justify-content: center;
      width: 36px; height: 36px; border-radius: 50%;
      flex-shrink: 0;
      background: var(--background);
      transition: background 180ms;
    }
    .qv-close svg { width: 18px; height: 18px; stroke: currentColor; }
    .qv-close:hover { background: rgba(0,0,0,.1); }

    .qv-badge { display: inline-flex; }

    .qv-title {
      font-size: clamp(17px, 2vw, 22px); font-weight: 700;
      line-height: 1.2; margin: 0;
    }
    .qv-desc {
      font-size: 13px; color: var(--secondary-text);
      line-height: 1.6; margin: 0 0 20px;
    }

    .qv-price-row {
      display: flex; align-items: baseline; gap: 10px; margin-bottom: 24px;
    }
    .qv-price-row strong { font-size: 26px; font-weight: 700; letter-spacing: -0.02em; }
    .qv-price-row s { font-size: 14px; color: var(--secondary-text); }

    /* Size selector */
    .size-section { margin-bottom: 24px; }
    .size-label {
      font-size: 11px; font-weight: 600; text-transform: uppercase;
      letter-spacing: .08em; color: var(--secondary-text);
      margin-bottom: 10px;
      display: flex; align-items: center; gap: 8px;
    }
    .size-guide-link {
      font-size: 11px; font-weight: 500; color: var(--primary);
      text-transform: none; letter-spacing: 0;
      cursor: pointer; display: inline-flex; align-items: center; gap: 3px;
    }
    .size-guide-link svg { width: 13px; height: 13px; stroke: currentColor; }
    .size-chips { display: flex; gap: 8px; flex-wrap: wrap; }
    .sz {
      padding: 8px 16px; border-radius: 12px;
      border: 1.5px solid rgba(0,0,0,.12);
      font-size: 13px; font-weight: 500;
      background: var(--white); cursor: pointer;
      transition: border-color 180ms, background 180ms;
    }
    .sz:hover { border-color: var(--text); }
    .sz.sz-active { border-color: var(--text); background: var(--text); color: var(--white); }
    .sz.sz-oos { opacity: .4; pointer-events: none; text-decoration: line-through; }

    /* Actions */
    .qv-actions { display: flex; gap: 10px; margin-top: auto; padding-top: 8px; }
    .btn-cart {
      flex: 1; height: 52px; border-radius: 999px;
      background: var(--text); color: var(--white);
      font-size: 15px; font-weight: 600;
      transition: background 220ms, transform 120ms;
    }
    .btn-cart:hover { background: var(--primary); }
    .btn-cart:active { transform: scale(.97); }
    .btn-fav {
      width: 52px; height: 52px; border-radius: 50%;
      border: 1.5px solid rgba(0,0,0,.12);
      background: var(--white);
      display: inline-flex; align-items: center; justify-content: center;
      transition: border-color 180ms, color 180ms;
    }
    .btn-fav svg { width: 20px; height: 20px; stroke: currentColor; }
    .btn-fav:hover { color: var(--primary); border-color: var(--primary); }
    .btn-fav.on { color: var(--primary); border-color: var(--primary); }

    /* ── Mobile: single column sheet ── */
    @media (max-width: 640px) {
      .qv-overlay { padding: 0; align-items: flex-end; }
      .qv-sheet {
        grid-template-columns: 1fr;
        border-radius: 28px 28px 0 0;
        max-height: 94dvh;
        animation-name: qvSlideUp;
      }
      @keyframes qvSlideUp {
        from { transform: translateY(40px); opacity: 0; }
        to   { transform: translateY(0);    opacity: 1; }
      }
      .qv-gallery { flex-direction: column; height: auto; max-height: none; }
      .qv-main-img { flex: none; height: 62vw; max-height: 280px; }
      .qv-thumbs { display: none; }
      .qv-dots {
        display: flex; justify-content: center; gap: 6px;
        padding: 10px 0 4px; flex-shrink: 0;
      }
      .qv-dot {
        width: 6px; height: 6px; border-radius: 50%;
        background: rgba(0,0,0,.18);
        transition: background 180ms, transform 180ms;
        cursor: pointer; border: none; padding: 0;
      }
      .qv-dot.active { background: var(--text); transform: scale(1.3); }
      .qv-thumb { width: 52px; height: 52px; }
      .qv-info { padding: 20px 20px 32px; }
      .qv-actions { margin-top: 20px; }
    }
 
    /* ─── Size guide panel ──────────────────────────────────── */
    .sg-panel {
      display: none; margin-top: 20px; padding: 20px;
      border-radius: 18px; background: var(--background);
    }
    .sg-panel.open { display: block; }
    .sg-title {
      font-size: 13px; font-weight: 600; margin: 0 0 14px;
      color: var(--text);
    }
    .sg-table {
      width: 100%; border-collapse: collapse;
      font-size: 13px;
    }
    .sg-table th {
      font-weight: 600; font-size: 11px; text-transform: uppercase;
      letter-spacing: .06em; color: var(--secondary-text);
      padding: 6px 10px; text-align: left;
      border-bottom: 1px solid rgba(0,0,0,.08);
    }
    .sg-table td {
      padding: 9px 10px; color: var(--text);
      border-bottom: 1px solid rgba(0,0,0,.05);
    }
    .sg-table tr.sg-highlight td {
      background: rgba(255,107,154,.08);
      font-weight: 600;
    }
    .sg-table tr:last-child td { border-bottom: 0; }
 
    /* ─── Footer ────────────────────────────────────────────── */
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
 
    /* ─── Responsive ────────────────────────────────────────── */
    @media (max-width: 900px) {
      .navbar { padding: 0 16px; }
      .brand { width: 74px; min-width: 74px; }
      .desktop-nav, .desktop-only { display: none; }
      .mobile-only { display: inline-flex; }
        .nav-actions .language-switcher {
          display: none;
        }
      .inner { width: min(calc(100% - 32px), var(--container)); }
      .site-footer { width: min(calc(100% - 32px), var(--container)); }
      .cart-btn { height: 40px; padding: 0 18px; font-size: 13px; }
      .fav-btn { width: 40px; height: 40px; }
    }
 
    @media (max-width: 768px) {
      .product-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 16px;
      }
      .cat-header { padding-top: 32px; padding-bottom: 20px; }
    }
 
    @media (max-width: 480px) {
      .inner { width: min(calc(100% - 24px), var(--container)); }
      .site-footer { width: min(calc(100% - 24px), var(--container)); }
      .product-grid { gap: 12px; }
      .pc { border-radius: 20px; }
      .pc-body { padding: 10px 12px 12px; gap: 8px; }
      .pc-body h3 { font-size: 12px; }
      .cart-btn { height: 36px; width: 36px; padding: 0; border-radius: 50%; }
      .cart-btn-label { display: none; }
      .cart-btn-icon { display: flex; }
      .qv-sheet { padding: 20px 20px 36px; }
    }

    @media (max-width: 360px) {
      .product-grid {
        grid-template-columns: 1fr;
        gap: 12px;
      }
      .cat-title { font-size: 28px; }
    }
 
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        transition-duration: 1ms !important;
        animation-duration: 1ms !important;
      }
    }
 
    .mobile-nav {
      display: flex; flex-direction: column;
      padding: 12px 0; flex: 1;
    }
    .mobile-nav a, .mobile-nav button {
      padding: 16px 24px;
      font-size: 20px; font-weight: 600;
      color: var(--text, #111); text-decoration: none;
      border-bottom: 1px solid rgba(0,0,0,0.05);
      transition: color 180ms, padding-left 180ms;
    }
    .mobile-nav a:hover, .mobile-nav a.active,
    .mobile-nav button:hover { color: var(--primary, #FF6B9A); padding-left: 32px; }
    .mobile-nav button {
      display: flex; align-items: center; gap: 10px;
      width: 100%; background: none; border: none;
      font-family: inherit; cursor: pointer; text-align: left;
    }
    .mobile-nav button svg { width: 22px; height: 22px; stroke: currentColor; flex-shrink: 0; }
    .mobile-nav-footer { padding: 24px; flex-shrink: 0; display: flex; flex-direction: column; gap: 16px; }
      .mobile-nav-lang { display: flex; justify-content: center; }
  </style>
</head>
<body>
<div class="page">
 
  ${renderNavbar(appConfig, tr, langSwitcher, waNumber, "crocs", "/crocs", q)}
 
  <main>
    <div class="inner">
 
      <!-- Catalog header -->
      <div class="cat-header">
        <h1 class="cat-title">${tr.t("crocsPageH1")}</h1>
        <p class="cat-meta">${pluralItems(total, tr)}</p>
      </div>

      <p class="crocs-intro">${tr.t("crocsIntro")}</p>
 
      <!-- Controls: tag chips -->
      <div class="controls">
        <div class="tag-chips" role="group" aria-label="${tr.t("filterByCategory")}">
          ${ALL_TAGS.map(t => `
            <a class="chip${(tag || "") === t.key ? " chip-active" : ""}"
              href="?sort=${sort}${t.key ? `&tag=${t.key}` : ""}${q ? `&q=${encodeURIComponent(q)}` : ""}"
              aria-current="${(tag || "") === t.key ? "true" : "false"}">
              ${t.label}
            </a>`).join("")}
        </div>
        ${q ? `<div class="search-active-bar">
          <span class="search-active-label">${tr.t("searchResultsFor") || "Поиск"}: <strong>${q.replace(/</g,"&lt;")}</strong></span>
          <a class="search-clear" href="?sort=${sort}${tag ? `&tag=${tag}` : ""}">${tr.t("clearSearch") || "✕ Сбросить"}</a>
        </div>` : ""}
      </div>
 
      <!-- Product grid -->
      <div class="product-grid" id="product-grid">
        ${products.length > 0
          ? products.map(ProductCard).join("")
          : `<div class="empty-state">${tr.t("noProducts")}</div>`}
      </div>
 
      <!-- Pagination -->
      ${PaginationBar()}

      <!-- FAQ (mirrors FAQPage JSON-LD in <head>) -->
      ${showFaq ? `
      <section class="faq-section" aria-label="${tr.t("crocsFaqTitle")}">
        <h2>${tr.t("crocsFaqTitle")}</h2>
        ${faqItems.map(item => `
        <details class="faq-item">
          <summary>${item.question}</summary>
          <p>${item.answer}</p>
        </details>`).join("")}
      </section>` : ""}

    </div><!-- /.inner -->
  </main>
 
  <footer class="site-footer">
    <span>© ${new Date().getFullYear()} ${appConfig.domain}</span>
    <span class="footer-tagline">stay chill</span>
    <a href="https://lab.furai.space" class="footer-credit" target="_blank" rel="noopener noreferrer">BUILT BY FURAI LAB</a>
  </footer>
</div><!-- /.page -->
 
<!-- Quick-view modal -->
<div class="qv-overlay" id="qv-overlay" role="dialog" aria-modal="true"
  aria-label="${tr.t("quickView")}">
  <div class="qv-sheet" id="qv-sheet">
    <div class="qv-gallery" id="qv-gallery">
      <div class="qv-main-img" id="qv-main-img">
        <!-- main image filled by JS -->
      </div>
      <div class="qv-thumbs" id="qv-thumbs">
        <!-- thumbnails filled by JS -->
      </div>
      <div class="qv-dots" id="qv-dots" aria-hidden="true">
        <!-- dots filled by JS on mobile -->
      </div>
    </div>
    <div class="qv-info" id="qv-info">
      <!-- info filled by JS -->
    </div>
  </div>
</div>
 
<script nonce="${nonce}">
/* ── Product data (SSR-injected) ────────────────────────────── */
const PRODUCTS = ${productsJson};
const SIZE_GUIDE = ${JSON.stringify(sizeGuide)};
const SIZE_GUIDE_KIDS = ${JSON.stringify(kidsSizeGuide)};
const UI = ${uiJson};
${languageSwitcherScript}
${navbarScript(navbarUi(tr, waNumber))}

${CLIENT_ESC_HTML_SRC}

/* ── Sort: default newest, no UI control ────────────────────── */

function syncFavButtons() {
  document.querySelectorAll(".fav-btn[data-slug]").forEach(btn => {
    btn.setAttribute("aria-pressed", window.kokocFavs.has(btn.dataset.slug) ? "true" : "false");
  });
}
window.kokocOnFavRemoved = syncFavButtons;
syncFavButtons();

document.getElementById("product-grid").addEventListener("click", (e) => {
  const favBtn = e.target.closest(".fav-btn");
  if (favBtn) {
    e.stopPropagation();
    const favs = window.kokocFavs;
    const s = favBtn.dataset.slug;
    const adding = !favs.has(s);
    favs.has(s) ? favs.delete(s) : favs.add(s);
    window.kokocSaveFavs();
    favBtn.setAttribute("aria-pressed", favs.has(s) ? "true" : "false");
    if (adding) {
      favBtn.classList.remove("fav-just-added"); void favBtn.offsetWidth;
      favBtn.classList.add("fav-just-added");
      favBtn.addEventListener("animationend", () => favBtn.classList.remove("fav-just-added"), { once: true });
      window.kokocTriggerWishlistAnim();
    }
    window.kokocUpdateWishlistBadge();
    return;
  }
  /* Клик на карточку → переход на страницу товара */
  const card = e.target.closest(".pc[data-slug]");
  if (card && !e.target.closest("a")) {
    window.location.href = "/product/" + card.dataset.slug;
  }
});
 
 
 
/* ── Quick-view ─────────────────────────────────────────────── */
const overlay = document.getElementById("qv-overlay");
 
const badgeLabel = { new: UI.new || "${tr.t("new")}", hit: UI.hit || "${tr.t("hit")}", limited: UI.limited || "${tr.t("limited")}" };
const badgeClass = { new: "badge-new", hit: "badge-hit", limited: "badge-ltd" };

function buildSizeGuideHtml(isKids) {
  const guide = isKids ? SIZE_GUIDE_KIDS : SIZE_GUIDE;
  const cols = isKids ? ['US', 'EU', 'CM'] : ['US', 'UK', 'EU', 'CM'];
  const rows = isKids
    ? guide.map(([us, eu, cm]) =>
        '<tr><td>' + us + '</td><td>' + eu + '</td><td>' + cm + ' cm</td></tr>'
      ).join('')
    : guide.map(([us, uk, eu, cm]) =>
        '<tr><td>' + us + '</td><td>' + uk + '</td><td>' + eu + '</td><td>' + cm + ' cm</td></tr>'
      ).join('');
  const label = isKids ? UI.crocsKidsSizeGuide : UI.crocsSizeGuide;
  return '<table class="sg-table" aria-label="' + label + '">' +
    '<thead><tr>' + cols.map(c => '<th>' + c + '</th>').join('') + '</tr></thead>' +
    '<tbody>' + rows + '</tbody></table>';
}
 
function openQuickView(slug) {
  const p = PRODUCTS.find(x => x.slug === slug);
  if (!p) return;

  /* Show immediately with basic data */
  renderQuickView(p, null);
  overlay.classList.add("open");
  document.body.style.overflow = "hidden";
  requestAnimationFrame(() => document.querySelector(".qv-close")?.focus());

  /* Fetch full variant/image data */
  fetch('/api/catalog/products/' + encodeURIComponent(slug))
    .then(r => r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status)))
    .then(data => { if (overlay.classList.contains("open")) renderQuickView(p, data); })
    .catch(() => {
      /* Fetch failed — show link to full product page as fallback */
      const infoEl = document.getElementById('qv-info');
      if (infoEl && overlay.classList.contains("open")) {
        const errBanner = document.createElement('p');
        errBanner.style.cssText = 'margin:0 0 16px;padding:10px 14px;background:rgba(0,0,0,0.04);border-radius:10px;font-size:13px;color:var(--secondary-text)';
        errBanner.innerHTML = '<a href="/product/' + encodeURIComponent(slug) + '" style="color:var(--primary);font-weight:600">${tr.t("view")} →</a>';
        infoEl.prepend(errBanner);
      }
    });
}

function renderQuickView(p, data) {
  const isKids = Array.isArray(p.tags) && p.tags.includes('kids');
  const sizeGuideHtml = buildSizeGuideHtml(isKids);
  const sizeGuideLabel = isKids ? UI.crocsKidsSizeGuide : UI.crocsSizeGuide;
  const badge = p.badge && badgeLabel[p.badge]
    ? '<span class="badge qv-badge ' + (badgeClass[p.badge] || '') + '">' + badgeLabel[p.badge] + '</span>'
    : '';

  const product  = data?.product ?? data ?? null;
  const variants = product?.variants || [];
  const rawImages = product?.images?.length ? product.images : [{ src: p.image, alt: p.title }];
  const images = rawImages.map(img => ({
    src: clientEscHtml(img.src || ''),
    alt: clientEscHtml(img.alt || '')
  }));
  const safeTitle = clientEscHtml(p.title || '');
  const safeDescription = clientEscHtml(p.description || '');

  /* ── Gallery ── */
  const mainImgEl = document.getElementById('qv-main-img');
  const thumbsEl  = document.getElementById('qv-thumbs');
  const dotsEl    = document.getElementById('qv-dots');

  if (mainImgEl) {
    mainImgEl.innerHTML = '<img src="' + images[0].src + '" alt="' + images[0].alt + '" id="qv-active-img" />';
  }

  /* shared switch helper — updates image + thumbs + dots */
  function switchImage(idx) {
    const activeImg = document.getElementById('qv-active-img');
    if (!activeImg) return;
    activeImg.classList.add('switching');
    setTimeout(() => {
      activeImg.src = images[idx].src;
      activeImg.alt = images[idx].alt;
      activeImg.classList.remove('switching');
    }, 100);
    if (thumbsEl) thumbsEl.querySelectorAll('.qv-thumb').forEach((b, i) => b.classList.toggle('active', i === idx));
    if (dotsEl)   dotsEl.querySelectorAll('.qv-dot').forEach((d, i) => d.classList.toggle('active', i === idx));
  }

  if (thumbsEl) {
    if (images.length > 1) {
      thumbsEl.innerHTML = images.map((img, i) =>
        '<button class="qv-thumb' + (i === 0 ? ' active' : '') + '" type="button" data-idx="' + i + '">' +
          '<img src="' + img.src + '" alt="' + img.alt + '" loading="lazy" />' +
        '</button>'
      ).join('');
      thumbsEl.style.display = '';

      thumbsEl.querySelectorAll('.qv-thumb').forEach(btn => {
        btn.addEventListener('click', () => switchImage(+btn.dataset.idx));
      });
    } else {
      thumbsEl.style.display = 'none';
    }
  }

  /* ── Dots (mobile only — rendered always, CSS hides on desktop) ── */
  if (dotsEl) {
    if (images.length > 1) {
      dotsEl.innerHTML = images.map((_, i) =>
        '<button class="qv-dot' + (i === 0 ? ' active' : '') + '" type="button" data-idx="' + i + '" aria-label="' + UI.photo + ' ' + (i + 1) + '"></button>'
      ).join('');
      dotsEl.querySelectorAll('.qv-dot').forEach(dot => {
        dot.addEventListener('click', () => switchImage(+dot.dataset.idx));
      });
    } else {
      dotsEl.style.display = 'none';
    }
  }

  /* ── Sizes HTML ── */
  const sizesHtml = variants.length
    ? '<div class="size-section">' +
        '<div class="size-label">' + UI.size +
          '<button class="size-guide-link" id="sg-toggle" type="button" aria-expanded="false">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21.3 10.53 10.5 21.3a1.5 1.5 0 0 1-2.12 0L2.7 15.62a1.5 1.5 0 0 1 0-2.12L13.47 2.7a1.5 1.5 0 0 1 2.12 0l5.71 5.71a1.5 1.5 0 0 1 0 2.12Z"/><path d="m7.5 10.5 1.5 1.5"/><path d="m10.5 7.5 1.5 1.5"/><path d="m13.5 4.5 1.5 1.5"/><path d="m4.5 13.5 1.5 1.5"/></svg>' +
            UI.sizeGuide +
          '</button>' +
        '</div>' +
        '<div class="size-chips">' +
          variants.map(v =>
            '<button class="sz' + (v.inStock ? '' : ' sz-oos') + '" ' +
              'data-variant-id="' + v.id + '" ' +
              'data-price="' + (v.price || '') + '" ' +
              'data-compare="' + (v.comparePrice || '') + '">' +
              clientEscHtml(v.crocsSize || v.sizeLabel || v.title || '') +
            '</button>'
          ).join('') +
        '</div>' +
        '<div class="sg-panel" id="sg-panel">' +
          '<p class="sg-title">' + sizeGuideLabel + '</p>' +
          sizeGuideHtml +
        '</div>' +
      '</div>'
    : '';

  /* ── Info panel ── */
  const infoEl = document.getElementById('qv-info');
  if (!infoEl) return;

  infoEl.innerHTML =
    '<div class="qv-header">' +
      '<div class="qv-header-left">' +
        (badge ? badge + ' ' : '') +
        '<h2 class="qv-title">' + safeTitle + '</h2>' +
      '</div>' +
      '<button class="qv-close" type="button" aria-label="' + UI.close + '">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.85" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>' +
      '</button>' +
    '</div>' +
    (safeDescription ? '<p class="qv-desc">' + safeDescription + '</p>' : '') +
    '<div class="qv-price-row">' +
      (p.comparePrice ? '<s>' + clientEscHtml(p.comparePrice) + '</s>' : '') +
      '<strong id="qv-price">' + clientEscHtml(p.price || UI.outOfStock) + '</strong>' +
    '</div>' +
    sizesHtml +
    '<div class="qv-actions">' +
      '<button class="btn-cart" type="button" id="qv-add-btn">' + UI.addToCart + '</button>' +
      '<button class="btn-fav ' + (window.kokocFavs.has(p.slug) ? 'on' : '') + '" type="button" id="qv-fav-btn" aria-label="' + UI.addToWishlist + '">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20.2 4.85 13.55a4.7 4.7 0 0 1 6.65-6.65l.5.5.5-.5a4.7 4.7 0 1 1 6.65 6.65L12 20.2Z"/></svg>' +
      '</button>' +
    '</div>';

  /* Close */
  infoEl.querySelector(".qv-close").addEventListener("click", closeQuickView);

  /* Size guide toggle */
  const sgToggle = infoEl.querySelector("#sg-toggle");
  const sgPanel  = infoEl.querySelector("#sg-panel");
  if (sgToggle && sgPanel) {
    sgToggle.addEventListener("click", () => {
      const open = sgPanel.classList.toggle("open");
      sgToggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  /* Size chip select */
  infoEl.querySelectorAll(".sz:not(.sz-oos)").forEach(btn => {
    btn.addEventListener("click", () => {
      infoEl.querySelectorAll(".sz").forEach(b => b.classList.remove("sz-active"));
      btn.classList.add("sz-active");
      if (btn.dataset.price) {
        const priceEl = infoEl.querySelector("#qv-price");
        if (priceEl) priceEl.textContent = btn.dataset.price;
      }
    });
  });

  /* Fav */
  const favBtn = infoEl.querySelector("#qv-fav-btn");
  if (favBtn) {
    favBtn.addEventListener("click", () => {
      const favs = window.kokocFavs;
      const s = p.slug;
      const adding = !favs.has(s);
      favs.has(s) ? favs.delete(s) : favs.add(s);
      window.kokocSaveFavs();
      syncFavButtons();
      favBtn.classList.toggle("on", favs.has(s));
      if (adding) window.kokocTriggerWishlistAnim();
      window.kokocUpdateWishlistBadge();
    });
  }

  /* Add to cart — Fix #3: real localStorage cart, Fix #8: require size when variants exist */
  infoEl.querySelector("#qv-add-btn")?.addEventListener("click", () => {
    const activeSize = infoEl.querySelector(".sz.sz-active");

    /* Fix #8: if variants exist but no size selected, prompt and abort */
    if (variants.length > 0 && !activeSize) {
      const sizeSection = infoEl.querySelector(".size-section");
      if (sizeSection) {
        sizeSection.style.outline = '2px solid var(--primary)';
        sizeSection.style.borderRadius = '12px';
        sizeSection.style.padding = '8px';
        sizeSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        setTimeout(() => { sizeSection.style.outline = ''; sizeSection.style.padding = ''; }, 1800);
      }
      return;
    }

    const variantId    = activeSize?.dataset.variantId || null;
    const sizeLabel    = activeSize ? activeSize.textContent.trim() : '—';
    const priceMinor   = variantId
      ? (variants.find(v => String(v.id) === String(variantId))?.priceMinor || 0)
      : 0;
    const image = p.image || '/crops/product-placeholder.png';

    /* Read cart from localStorage */
    let cart = window.kokocReadCart ? window.kokocReadCart() : { items: [] };
    const existing = cart.items.find(i => i.variantId === variantId && i.productSlug === p.slug);
    if (existing) {
      existing.qty = (existing.qty || 1) + 1;
    } else {
      cart.items.push({
        variantId,
        productId:   p.id,
        productSlug: p.slug,
        title:       p.title,
        sizeLabel,
        priceMinor,
        image,
        qty: 1,
      });
    }
    localStorage.setItem('kokoc_cart', JSON.stringify(cart));

    /* Update cart badge + shake animation */
    window.kokocUpdateCartBadge(); window.kokocTriggerCartAnim();

    /* Button feedback */
    const addBtn = infoEl.querySelector("#qv-add-btn");
    if (addBtn) {
      const prev = addBtn.textContent;
      addBtn.textContent = "✓ " + UI.added;
      addBtn.style.background = '#27ae60';
      setTimeout(() => {
        if (addBtn) { addBtn.textContent = prev; addBtn.style.background = ''; }
      }, 1800);
    }
  });
}
 
function closeQuickView() {
  overlay.classList.remove("open");
  document.body.style.overflow = "";
}
 
overlay.addEventListener("click", (e) => {
  if (e.target === overlay) closeQuickView();
});
 
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeQuickView();
});

/* ── Auto-redirect from ?open=slug (landing link) ── */
(function() {
  const params = new URLSearchParams(location.search);
  const openSlug = params.get("open");
  if (openSlug) {
    /* Редирект на страницу товара — убираем ?open= из URL и переходим */
    window.location.replace("/product/" + encodeURIComponent(openSlug));
  }
})();
</script>
</body>
</html>`;
}
