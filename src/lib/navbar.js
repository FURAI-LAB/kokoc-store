/**
 * navbar.js — Shared navbar/search/cart/wishlist/mobile-menu markup, styles and
 * client-side logic, used by every page (landing, catalog, adidas, crocs,
 * collabs, product, about, delivery, not-found, minigame).
 *
 * Goal: a single source of truth so the navbar, cart drawer, wishlist drawer
 * and search overlay behave identically everywhere, instead of each page
 * carrying its own (slowly diverging) copy.
 *
 * Cart/wishlist state lives in localStorage under "kokoc_cart" / "kokoc_favs":
 *   kokoc_cart  = { items: [{ variantId, productSlug, title, sizeLabel, priceMinor, image, qty }] }
 *   kokoc_favs  = ["slug-a", "slug-b", ...]
 *
 * Pages that let visitors add a specific product to the cart (catalog, adidas,
 * crocs, product) keep their own "add to cart" button logic — this module only
 * owns the navbar icons + the drawers/overlays that read and render that state.
 */

import { escapeAttr as escAttr, CLIENT_ESC_HTML_SRC } from "./html.js";

const icons = {
  search: `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.7"/><path d="m20 20-4.45-4.45"/></svg>`,
  heart: `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20.2 4.85 13.55a4.7 4.7 0 0 1 6.65-6.65l.5.5.5-.5a4.7 4.7 0 1 1 6.65 6.65L12 20.2Z"/></svg>`,
  bag: `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5.5 6.2h1.8l1 2.8"/><path d="M8.3 9h10.4l-1.7 6H9.3Z"/><circle cx="10.3" cy="17.3" r="1.2"/><circle cx="16" cy="17.3" r="1.2"/></svg>`,
  menu: `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.85" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/></svg>`,
  close: `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.85" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`,
  whatsapp: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>`
};

export const navbarIcons = icons;

/* ── Nav links shown in both desktop and mobile nav, in canonical order ──
 * `key` matches the href's last path segment and is what pages pass as
 * `activeKey` to renderNavbar() to highlight the current section. catalog.js
 * is the one page where "active" depends on a query param rather than the
 * path itself (?brand=adidas), so it computes its own key ("adidas" vs
 * "catalog") instead of this module inspecting the URL.
 */
function navLinks(tr, activeKey) {
  return [
    { key: "crocs", href: "/crocs", label: "Crocs" },
    { key: "adidas", href: "/adidas", label: "Adidas" },
    { key: "catalog", href: "/catalog", label: tr.t("navAllProducts") },
    { key: "collabs", href: "/collabs", label: tr.t("navCollabs") },
    { key: "delivery", href: "/delivery", label: tr.t("deliveryTitle") },
    { key: "about", href: "/about", label: tr.t("navAbout") }
  ].map(l => `<a href="${l.href}"${l.key === activeKey ? ' class="active"' : ""}>${l.label}</a>`).join("\n        ");
}

/**
 * Renders the <header class="navbar"> plus every overlay/drawer it controls
 * (search, cart, wishlist, mobile menu, checkout/payment modal).
 *
 * @param {object} appConfig
 * @param {object} tr            - i18n translator from i18n(locale)
 * @param {string} langSwitcher  - pre-rendered language switcher HTML
 * @param {string} waNumber      - digits-only WhatsApp number (may be empty)
 * @param {string|null} activeKey - one of "crocs"|"adidas"|"catalog"|"collabs"|"delivery"|"about",
 *                                  or null/omitted on pages with no matching nav item (landing,
 *                                  product, not-found, minigame).
 * @param {string} emptyStateHref - where the empty-cart/empty-wishlist "browse shop" CTA points.
 *                                  Brand landing pages (crocs.js, adidas.js) keep visitors in
 *                                  context by pointing this at themselves ("/crocs", "/adidas");
 *                                  every other page defaults to "/catalog".
 * @param {string} searchValue   - pre-fills the search input, e.g. from a "?q=" param so the
 *                                  overlay shows what the visitor already searched for.
 */

export function renderNavbar(appConfig, tr, langSwitcher, waNumber = "", activeKey = null, emptyStateHref = "/catalog", searchValue = "") {
  const waHref = waNumber ? `https://wa.me/${waNumber}` : null;
  const safeSearchValue = escAttr(searchValue);

  return `
    <!-- Navbar -->
    <header class="navbar" aria-label="${tr.t("menu")}">
      <a class="brand" href="/" aria-label="${appConfig.domain}">
        <img src="/menu-logo.png" alt="Kokoc Store" />
      </a>
      <nav class="desktop-nav">
        ${navLinks(tr, activeKey)}
      </nav>
      <div class="nav-actions" aria-label="Quick actions">
        ${langSwitcher}
        <button class="icon-button" type="button" id="search-btn" aria-label="${tr.t("search")}">${icons.search}</button>
        <button class="icon-button" type="button" id="wishlist-btn" aria-label="${tr.t("wishlist")}">${icons.heart}<span class="nav-badge" id="wishlist-badge" aria-hidden="true"></span></button>
        <button class="icon-button" type="button" id="cart-btn" aria-label="${tr.t("cart")}">${icons.bag}<span class="nav-badge" id="cart-badge" aria-hidden="true"></span></button>
        <button class="icon-button mobile-only" type="button" id="menu-btn" aria-label="${tr.t("menu")}">${icons.menu}</button>
      </div>
    </header>

    <!-- Search overlay -->
    <div class="search-overlay" id="search-overlay" role="dialog" aria-modal="true" aria-label="${tr.t("search")}">
      <div class="search-box">
        <input type="search" id="search-input" placeholder="${tr.t("searchPlaceholder")}" autocomplete="off"${searchValue ? ` value="${safeSearchValue}"` : ""} />
        <button class="search-close" type="button" id="search-close" aria-label="${tr.t("closeSearch")}">${icons.close}</button>
      </div>
    </div>

    <!-- Cart drawer -->
    <div class="drawer-overlay" id="cart-overlay" role="dialog" aria-modal="true" aria-label="${tr.t("cart")}">
      <div class="side-drawer" id="cart-drawer">
        <div class="drawer-head">
          <span class="drawer-title">${tr.t("cart")}</span>
          <button class="drawer-close" type="button" id="cart-close" aria-label="${tr.t("closeCart")}">${icons.close}</button>
        </div>
        <div class="drawer-body" id="cart-body">
          <div class="drawer-empty">
            ${icons.bag}
            <p>${tr.t("emptyCart")}</p>
            <a href="${emptyStateHref}" class="drawer-cta">${tr.t("browseShop")}</a>
          </div>
        </div>
        <div class="drawer-footer" id="cart-footer" style="display:none;">
          <div class="cart-subtotal">
            <span class="cart-subtotal-label">${tr.t("subtotal")}</span>
            <span class="cart-subtotal-value" id="cart-total">0 ₽</span>
          </div>
          <button type="button" id="checkout-btn" class="btn-checkout">${tr.t("checkout")}</button>
        </div>
      </div>
    </div>

    <!-- Checkout / payment modal -->
    <div class="payment-modal-overlay" id="payment-modal-overlay" role="dialog" aria-modal="true" aria-label="${tr.t("paymentModalTitle")}">
      <div class="payment-modal">
        <button class="payment-modal-close" type="button" id="payment-modal-close" aria-label="${tr.t("paymentModalClose")}">${icons.close}</button>
        <p class="payment-modal-title">${tr.t("paymentModalTitle")}</p>
        <p class="payment-modal-text">${tr.t("paymentModalText")}</p>
        ${waHref ? `
        <a href="${waHref}" class="payment-modal-cta" id="payment-modal-wa-link" target="_blank" rel="noopener noreferrer">
          ${icons.whatsapp}
          ${tr.t("paymentModalCta")}
        </a>
        ` : `
        <p class="payment-modal-text" style="margin-bottom:0;">${tr.t("paymentModalNoNumber")}</p>
        `}
      </div>
    </div>

    <!-- Wishlist drawer -->
    <div class="drawer-overlay" id="wishlist-overlay" role="dialog" aria-modal="true" aria-label="${tr.t("wishlist")}">
      <div class="side-drawer" id="wishlist-drawer">
        <div class="drawer-head">
          <span class="drawer-title">${tr.t("wishlist")}</span>
          <button class="drawer-close" type="button" id="wishlist-close" aria-label="${tr.t("closeMenu")}">${icons.close}</button>
        </div>
        <div class="drawer-body" id="wishlist-body">
          <div class="drawer-empty" id="wishlist-empty">
            ${icons.heart}
            <p>${tr.t("wishlist") + ` ${tr.locale === "ru" ? "пуст" : "is empty"}`}</p>
            <a href="${emptyStateHref}" class="drawer-cta">${tr.t("browseShop")}</a>
          </div>
        </div>
      </div>
    </div>

    <!-- Mobile menu drawer -->
    <div class="drawer-overlay" id="menu-overlay" role="dialog" aria-modal="true" aria-label="${tr.t("menu")}">
      <div class="side-drawer side-drawer--left" id="menu-drawer">
        <div class="drawer-head">
          <span class="drawer-title">${tr.t("menu")}</span>
          <button class="drawer-close" type="button" id="menu-close" aria-label="${tr.t("closeMenu")}">${icons.close}</button>
        </div>
        <nav class="mobile-nav">
          ${navLinks(tr, activeKey)}
        </nav>
        <div class="mobile-nav-footer">
          <a href="/catalog" class="drawer-cta" style="width:100%;box-sizing:border-box;text-align:center">${tr.t("shopNow")}</a>
          <div class="mobile-nav-lang">${langSwitcher}</div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Shared CSS for navbar + all overlays/drawers + cart items + payment modal.
 * Pages still keep their own .navbar sizing/media-query tweaks; this covers
 * the parts that must look and behave identically everywhere.
 */
export const navbarStyles = `
  .icon-button {
    display: inline-flex; align-items: center; justify-content: center;
    width: 40px; height: 40px; border-radius: 50%;
    position: relative; background: none; border: none; cursor: pointer; color: inherit;
    transition: color 220ms, transform 220ms, background 220ms;
  }
  .icon-button svg { width: 22px; height: 22px; stroke: currentColor; }
  .icon-button:hover { background: rgba(0,0,0,0.06); }
  .nav-actions { display: flex; align-items: center; gap: 14px; }
  .mobile-only { display: none; }
  .desktop-only { display: inline-flex; }

  /* ── Nav badges (cart + wishlist) ── */
  .nav-badge {
    position: absolute; top: 2px; right: 2px;
    min-width: 16px; height: 16px; padding: 0 4px;
    background: var(--primary); color: #fff;
    font-size: 10px; font-weight: 700; line-height: 16px;
    border-radius: 999px; text-align: center;
    display: none; pointer-events: none;
  }
  .nav-badge.visible {
    display: block;
    animation: badgePop 280ms cubic-bezier(.34,1.56,.64,1);
  }
  @keyframes badgePop {
    from { transform: scale(0); opacity: 0; }
    to   { transform: scale(1); opacity: 1; }
  }
  @keyframes heartBeat {
    0%   { transform: scale(1); }
    30%  { transform: scale(1.32); }
    55%  { transform: scale(0.9); }
    75%  { transform: scale(1.15); }
    100% { transform: scale(1); }
  }
  #wishlist-btn.fav-just-added svg { animation: heartBeat 420ms cubic-bezier(.36,.07,.19,.97); }
  @keyframes bagShake {
    0%   { transform: rotate(0deg); }
    20%  { transform: rotate(-12deg); }
    40%  { transform: rotate(10deg); }
    60%  { transform: rotate(-7deg); }
    80%  { transform: rotate(5deg); }
    100% { transform: rotate(0deg); }
  }
  #cart-btn.cart-just-added svg { animation: bagShake 380ms ease; color: var(--primary); }

  /* ── Search overlay ── */
  .search-overlay {
    display: none; position: fixed; inset: 0; z-index: 400;
    background: rgba(247,247,246,0.92);
    backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
    align-items: flex-start; justify-content: center;
    padding-top: 80px;
  }
  .search-overlay.open { display: flex; }
  .search-box { display: flex; align-items: center; gap: 12px; width: min(calc(100% - 48px), 600px); }
  #search-input {
    flex: 1; height: 52px; border-radius: 999px;
    border: 1.5px solid rgba(0,0,0,0.12);
    background: #fff; padding: 0 20px;
    font-size: 16px; font-family: inherit; outline: none;
    transition: border-color 180ms;
  }
  #search-input:focus { border-color: var(--primary); }
  .search-close {
    display: inline-flex; align-items: center; justify-content: center;
    width: 40px; height: 40px; border-radius: 50%;
    background: rgba(0,0,0,0.06); border: none; cursor: pointer;
    flex-shrink: 0; transition: background 180ms;
  }
  .search-close svg { width: 18px; height: 18px; stroke: currentColor; }
  .search-close:hover { background: rgba(0,0,0,0.12); }

  /* ── Drawer overlay ── */
  .drawer-overlay { display: none; position: fixed; inset: 0; z-index: 400; background: rgba(0,0,0,0.35); }
  .drawer-overlay.open { display: block; }
  .side-drawer {
    position: absolute; top: 0; right: 0; bottom: 0;
    width: min(380px, 90vw); background: var(--white);
    display: flex; flex-direction: column;
    animation: slideInRight 260ms cubic-bezier(.32,.72,0,1);
  }
  .side-drawer--left { right: auto; left: 0; animation-name: slideInLeft; }
  @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
  @keyframes slideInLeft  { from { transform: translateX(-100%); } to { transform: translateX(0); } }
  .drawer-head {
    display: flex; align-items: center; justify-content: space-between;
    padding: 20px 24px; border-bottom: 1px solid rgba(0,0,0,0.06); flex-shrink: 0;
  }
  .drawer-title { font-size: 15px; font-weight: 700; letter-spacing: -0.02em; }
  .drawer-close {
    display: inline-flex; align-items: center; justify-content: center;
    width: 32px; height: 32px; border-radius: 50%;
    background: rgba(0,0,0,0.05); border: none; cursor: pointer;
    transition: background 180ms;
  }
  .drawer-close svg { width: 16px; height: 16px; stroke: currentColor; }
  .drawer-close:hover { background: rgba(0,0,0,0.1); }
  .drawer-body { flex: 1; overflow-y: auto; padding: 24px; }
  #cart-drawer .drawer-body { padding: 0; }
  .drawer-empty {
    display: flex; flex-direction: column; align-items: center;
    gap: 12px; padding: 48px 0; text-align: center; color: var(--secondary-text);
  }
  .drawer-empty svg { width: 40px; height: 40px; stroke: currentColor; opacity: .4; }
  .drawer-empty p { margin: 0; font-size: 14px; }
  .drawer-cta {
    display: inline-flex; align-items: center; justify-content: center;
    padding: 12px 28px; border-radius: 999px;
    background: var(--text, #111); color: #fff;
    font-size: 14px; font-weight: 600; text-decoration: none; transition: background 200ms;
  }
  .drawer-cta:hover { background: var(--primary, #FF6B9A); }

  /* ── Cart items ── */
  .cart-item { display: flex; align-items: center; gap: 14px; padding: 16px 24px; border-bottom: 1px solid rgba(0,0,0,.05); }
  .cart-item-link {
    display: flex; align-items: center; gap: 14px; flex: 1; min-width: 0;
    color: inherit; text-decoration: none;
  }
  .cart-item-img { width: 64px; height: 64px; border-radius: 12px; overflow: hidden; flex-shrink: 0; background: #F7F7F6; }
  .cart-item-img img { width: 100%; height: 100%; object-fit: cover; }
  .cart-item-body { flex: 1; min-width: 0; }
  .cart-item-title { font-size: 13px; font-weight: 500; margin: 0 0 3px; line-height: 1.3; }
  .cart-item-meta { font-size: 12px; color: var(--secondary-text); margin: 0; }
  .cart-item-price { font-size: 14px; font-weight: 600; white-space: nowrap; }
  .cart-item-remove {
    width: 28px; height: 28px; border-radius: 50%;
    display: inline-flex; align-items: center; justify-content: center;
    flex-shrink: 0; color: var(--secondary-text); background: none; border: none; cursor: pointer;
    transition: background 160ms, color 160ms;
  }
  .cart-item-remove:hover { background: rgba(0,0,0,.06); color: var(--text); }
  .cart-item-remove svg { width: 14px; height: 14px; stroke: currentColor; }
  .drawer-footer { flex-shrink: 0; padding: 20px 24px; border-top: 1px solid rgba(0,0,0,.06); }
  .cart-subtotal { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; font-size: 14px; }
  .cart-subtotal-label { color: var(--secondary-text); }
  .cart-subtotal-value { font-size: 18px; font-weight: 700; }
  .btn-checkout {
    display: flex; width: 100%; height: 52px; align-items: center; justify-content: center;
    border-radius: 999px; background: var(--text); color: #fff;
    font-size: 15px; font-weight: 600; text-align: center; border: none; cursor: pointer;
    transition: background 200ms; font-family: inherit;
  }
  .btn-checkout:hover { background: var(--primary); }

  /* ── Checkout / payment modal ── */
  .payment-modal-overlay {
    display: none; position: fixed; inset: 0; z-index: 500;
    background: rgba(0,0,0,0.4); align-items: center; justify-content: center; padding: 20px;
  }
  .payment-modal-overlay.open { display: flex; }
  .payment-modal { position: relative; width: min(380px, 100%); background: var(--white); border-radius: 20px; padding: 32px 28px; text-align: center; }
  .payment-modal-close {
    position: absolute; top: 14px; right: 14px;
    display: inline-flex; align-items: center; justify-content: center;
    width: 28px; height: 28px; border-radius: 50%;
    background: rgba(0,0,0,.06); border: none; cursor: pointer;
  }
  .payment-modal-close svg { width: 14px; height: 14px; stroke: currentColor; }
  .payment-modal-close:hover { background: rgba(0,0,0,.1); }
  .payment-modal-title { font-size: 17px; font-weight: 700; margin: 0 0 10px; }
  .payment-modal-text { font-size: 14px; color: var(--secondary-text); margin: 0 0 20px; line-height: 1.5; }
  .payment-modal-cta {
    display: inline-flex; align-items: center; justify-content: center; gap: 10px;
    width: 100%; height: 50px; border-radius: 999px;
    background: #25D366; color: #fff; font-size: 15px; font-weight: 600;
    text-decoration: none; transition: background 200ms;
  }
  .payment-modal-cta:hover { background: #1ebe57; }
  .payment-modal-cta svg { width: 19px; height: 19px; flex-shrink: 0; }

  /* ── Mobile ── */
  @media (max-width: 900px) {
    .mobile-only { display: inline-flex; }
    .nav-actions .language-switcher { display: none; }
    .desktop-only { display: none; }
    .desktop-nav { display: none; }
  }

  /* ── Mobile nav links (inside the menu drawer) ── */
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
`;

/**
 * Client-side script powering the navbar: search overlay, cart drawer
 * (rendering real items from localStorage), wishlist drawer, mobile menu,
 * and the WhatsApp checkout modal. Inserted verbatim inside a page's
 * top-level <script> IIFE, after languageSwitcherScript.
 *
 * @param {object} ui  - small dict of UI strings the client script needs:
 *   { locale, emptyCart, browseShop, sizeMeta, removeFromCart, wishlistEmptyRu, wishlistEmptyEn, waMessage }
 *   waMessage: text used to prefill the WhatsApp message when a number is set.
 */
export function navbarScript(ui) {
  const uiJson = JSON.stringify(ui);
  return `
  /* ── Shared navbar/cart/wishlist/search/menu logic (lib/navbar.js) ── */
  (function () {
    const UI = ${uiJson};

    ${CLIENT_ESC_HTML_SRC}
    const escHtml = clientEscHtml;

    /* ── Search ── */
    const searchOverlay = document.getElementById('search-overlay');
    function openSearch() {
      searchOverlay?.classList.add('open');
      document.body.style.overflow = 'hidden';
      setTimeout(() => document.getElementById('search-input')?.focus(), 50);
    }
    function closeSearch() { searchOverlay?.classList.remove('open'); document.body.style.overflow = ''; }
    document.getElementById('search-btn')?.addEventListener('click', openSearch);
    document.getElementById('search-close')?.addEventListener('click', closeSearch);
    searchOverlay?.addEventListener('click', e => { if (e.target === searchOverlay) closeSearch(); });
    document.getElementById('search-input')?.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeSearch();
      if (e.key === 'Enter') {
        const q = e.target.value.trim();
        if (q) window.location.href = '/catalog?q=' + encodeURIComponent(q);
      }
    });

    /* ── Cart state ── */
    function readCart() {
      try {
        const value = JSON.parse(localStorage.getItem('kokoc_cart') || '{"items":[]}');
        return value && Array.isArray(value.items) ? value : { items: [] };
      }
      catch { return { items: [] }; }
    }
    function writeStorage(key, value) {
      try { localStorage.setItem(key, value); }
      catch { /* Storage can be unavailable in private browsing or strict browser modes. */ }
    }
    function saveCart(cart) { writeStorage('kokoc_cart', JSON.stringify(cart)); }
    function cartCount(cart) { return cart.items.reduce((s, i) => s + (i.qty || 1), 0); }
    function cartTotal(cart) { return cart.items.reduce((s, i) => s + (i.priceMinor || 0) * (i.qty || 1), 0); }
    function fmtMoney(minor) {
      return new Intl.NumberFormat(UI.locale === 'en' ? 'en-US' : 'ru-RU', {
        style: 'currency', currency: 'RUB', minimumFractionDigits: 0
      }).format(minor / 100);
    }

    function updateCartBadge() {
      const badge = document.getElementById('cart-badge');
      if (!badge) return;
      const count = cartCount(readCart());
      badge.textContent = count;
      if (count > 0) {
        badge.classList.remove('visible');
        void badge.offsetWidth;
        badge.classList.add('visible');
      } else {
        badge.classList.remove('visible');
      }
    }
    function triggerCartNavAnim() {
      const btn = document.getElementById('cart-btn');
      if (!btn) return;
      btn.classList.remove('cart-just-added');
      void btn.offsetWidth;
      btn.classList.add('cart-just-added');
      btn.addEventListener('animationend', () => btn.classList.remove('cart-just-added'), { once: true });
    }
    // Exposed so per-page "add to cart" buttons can update the navbar badge
    // and trigger the bag-shake animation after writing to kokoc_cart.
    window.kokocReadCart = readCart;
    window.kokocUpdateCartBadge = updateCartBadge;
    window.kokocTriggerCartAnim = triggerCartNavAnim;

    function renderCartDrawer() {
      const body = document.getElementById('cart-body');
      const footer = document.getElementById('cart-footer');
      const totalEl = document.getElementById('cart-total');
      if (!body) return;
      const cart = readCart();

      if (!cart.items.length) {
        body.innerHTML = '<div class="drawer-empty">' +
          '${icons.bag.replace(/'/g, "\\'")}' +
          '<p>' + UI.emptyCart + '</p>' +
          '<a href="/catalog" class="drawer-cta">' + UI.browseShop + '</a>' +
          '</div>';
        if (footer) footer.style.display = 'none';
        return;
      }

      body.innerHTML = cart.items.map((item, idx) => {
        const href = item.productSlug ? '/product/' + encodeURIComponent(item.productSlug) : null;
        const openTag = href ? '<a href="' + href + '" class="cart-item-link">' : '<div class="cart-item-link">';
        const closeTag = href ? '</a>' : '</div>';
        const safeImage = escHtml(item.image || '/crops/product-placeholder.png');
        const safeTitle = escHtml(item.title || '');
        const safeSize = escHtml(item.sizeLabel || '—');
        return \`
        <div class="cart-item" data-idx="\${idx}">
          \${openTag}
          <div class="cart-item-img"><img src="\${safeImage}" alt="\${safeTitle}" loading="lazy" /></div>
          <div class="cart-item-body">
            <p class="cart-item-title">\${safeTitle}</p>
            <p class="cart-item-meta">\${UI.sizeMeta}: \${safeSize}\${item.qty > 1 ? ' · ×' + item.qty : ''}</p>
          </div>
          <span class="cart-item-price">\${fmtMoney((item.priceMinor || 0) * (item.qty || 1))}</span>
          \${closeTag}
          <button class="cart-item-remove" data-idx="\${idx}" aria-label="\${UI.removeFromCart}">${icons.close}</button>
        </div>
      \`;
      }).join('');

      body.querySelectorAll('.cart-item-remove').forEach(btn => {
        btn.addEventListener('click', () => {
          const c = readCart();
          c.items.splice(+btn.dataset.idx, 1);
          saveCart(c);
          updateCartBadge();
          renderCartDrawer();
        });
      });

      if (totalEl) totalEl.textContent = fmtMoney(cartTotal(cart));
      if (footer) footer.style.display = '';
    }

    const cartOverlay = document.getElementById('cart-overlay');
    function openCart() {
      renderCartDrawer();
      cartOverlay?.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
    function closeCart() { cartOverlay?.classList.remove('open'); document.body.style.overflow = ''; }
    document.getElementById('cart-btn')?.addEventListener('click', openCart);
    document.getElementById('cart-close')?.addEventListener('click', closeCart);
    cartOverlay?.addEventListener('click', e => { if (e.target === cartOverlay) closeCart(); });

    /* ── Checkout / WhatsApp modal ── */
    const paymentOverlay = document.getElementById('payment-modal-overlay');
    function openPaymentModal() {
      const waLink = document.getElementById('payment-modal-wa-link');
      const cart = readCart();
      if (waLink && UI.waMessage) {
        const baseHref = waLink.href.split('?')[0];
        const lines = cart.items.map(i => '- ' + (i.title || '') + (i.sizeLabel ? ' (' + UI.sizeMeta + ' ' + i.sizeLabel + ')' : '') + (i.qty > 1 ? ' ×' + i.qty : '')).join('\\n');
        const text = UI.waMessage + (lines ? '\\n' + lines : '');
        waLink.href = baseHref + '?text=' + encodeURIComponent(text);
      }
      /* Fire-and-forget: record order in D1 */
      if (cart.items.length > 0) {
        const payload = {
          items: cart.items.map(i => ({
            variantId:   i.variantId,
            productId:   i.productId || '',
            productSlug: i.productSlug || '',
            title:       i.title || '',
            sizeLabel:   i.sizeLabel || '—',
            priceMinor:  i.priceMinor || 0,
            qty:         i.qty || 1,
          })),
          source: 'whatsapp',
        };
        fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        .then(r => r.json())
        .then(d => {
          if (d.ok) {
            saveCart({ items: [] });
            updateCartBadge();
            renderCartDrawer();
          }
        })
        .catch(() => { /* non-blocking */ });
      }
      paymentOverlay?.classList.add('open');
    }
    function closePaymentModal() { paymentOverlay?.classList.remove('open'); }
    document.getElementById('checkout-btn')?.addEventListener('click', openPaymentModal);
    document.getElementById('payment-modal-close')?.addEventListener('click', closePaymentModal);
    paymentOverlay?.addEventListener('click', e => { if (e.target === paymentOverlay) closePaymentModal(); });

    /* ── Wishlist ── */
    function readFavs() {
      try {
        const value = JSON.parse(localStorage.getItem('kokoc_favs') || '[]');
        return Array.isArray(value) ? new Set(value) : new Set();
      } catch {
        return new Set();
      }
    }

    const favs = readFavs();
    function saveFavs() { writeStorage('kokoc_favs', JSON.stringify([...favs])); }
    window.kokocFavs = favs;
    window.kokocSaveFavs = saveFavs;

    function updateWishlistBadge() {
      const badge = document.getElementById('wishlist-badge');
      if (!badge) return;
      const count = favs.size;
      badge.textContent = count;
      if (count > 0) {
        badge.classList.remove('visible');
        void badge.offsetWidth;
        badge.classList.add('visible');
      } else {
        badge.classList.remove('visible');
      }
    }
    function triggerWishlistNavAnim() {
      const btn = document.getElementById('wishlist-btn');
      if (!btn) return;
      btn.classList.remove('fav-just-added');
      void btn.offsetWidth;
      btn.classList.add('fav-just-added');
      btn.addEventListener('animationend', () => btn.classList.remove('fav-just-added'), { once: true });
    }
    window.kokocUpdateWishlistBadge = updateWishlistBadge;
    window.kokocTriggerWishlistAnim = triggerWishlistNavAnim;

    const wishlistOverlay = document.getElementById('wishlist-overlay');
    const wishlistBody = document.getElementById('wishlist-body');
    const wishlistEmptyHtml = wishlistBody ? wishlistBody.innerHTML : '';
    function renderWishlistDrawer() {
      if (!wishlistBody) return;
      const slugs = [...favs];
      if (!slugs.length) { wishlistBody.innerHTML = wishlistEmptyHtml; return; }
      wishlistBody.innerHTML = slugs.map(slug => {
        const label = escHtml(slug.replace(/-/g, ' '));
        const safeSlug = escHtml(slug);
        return \`<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid rgba(0,0,0,0.06)">
          <a href="/product/\${encodeURIComponent(slug)}" style="font-size:14px;font-weight:500;color:var(--text);text-decoration:none;flex:1">\${label}</a>
          <button type="button" data-slug="\${safeSlug}" aria-label="Remove"
            style="background:none;border:none;cursor:pointer;padding:4px 8px;color:#aaa;font-size:18px;line-height:1">×</button>
        </div>\`;
      }).join('') + \`<div style="margin-top:20px"><a href="/catalog" class="drawer-cta" style="width:100%;box-sizing:border-box">\${UI.browseShop}</a></div>\`;

      wishlistBody.querySelectorAll('button[data-slug]').forEach(btn => {
        btn.addEventListener('click', () => {
          favs.delete(btn.dataset.slug);
          saveFavs();
          updateWishlistBadge();
          if (typeof window.kokocOnFavRemoved === 'function') window.kokocOnFavRemoved(btn.dataset.slug);
          renderWishlistDrawer();
        });
      });
    }
    window.kokocRenderWishlistDrawer = renderWishlistDrawer;
    function openWishlist() { renderWishlistDrawer(); wishlistOverlay?.classList.add('open'); document.body.style.overflow = 'hidden'; }
    function closeWishlist() { wishlistOverlay?.classList.remove('open'); document.body.style.overflow = ''; }
    document.getElementById('wishlist-btn')?.addEventListener('click', openWishlist);
    document.getElementById('wishlist-close')?.addEventListener('click', closeWishlist);
    wishlistOverlay?.addEventListener('click', e => { if (e.target === wishlistOverlay) closeWishlist(); });

    updateCartBadge();
    updateWishlistBadge();

    /* ── Mobile menu ── */
    const menuOverlay = document.getElementById('menu-overlay');
    document.getElementById('menu-btn')?.addEventListener('click', () => {
      menuOverlay?.classList.add('open');
      document.body.style.overflow = 'hidden';
    });
    document.getElementById('menu-close')?.addEventListener('click', closeMenu);
    menuOverlay?.addEventListener('click', e => { if (e.target === menuOverlay) closeMenu(); });
    function closeMenu() { menuOverlay?.classList.remove('open'); document.body.style.overflow = ''; }

    /* ── Escape key closes whichever overlay is open ── */
    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      closeSearch(); closeCart(); closeWishlist(); closeMenu(); closePaymentModal();
    });

    /* ── Cross-tab badge sync ── */
    window.addEventListener('storage', e => {
      if (e.key === 'kokoc_cart') updateCartBadge();
      if (e.key === 'kokoc_favs') {
        try {
          const freshValue = JSON.parse(e.newValue || '[]');
          const fresh = Array.isArray(freshValue) ? new Set(freshValue) : new Set();
          favs.clear(); fresh.forEach(v => favs.add(v));
          updateWishlistBadge();
        } catch {}
      }
    });
  })();
  `;
}

/**
 * Builds the small UI-string dict that navbarScript() needs, from a
 * translator. Keeps every page's <script> block identical.
 */
export function navbarUi(tr, waNumber = "") {
  return {
    locale: tr.locale,
    emptyCart: tr.t("emptyCart"),
    browseShop: tr.t("browseShop"),
    sizeMeta: tr.t("sizeMeta"),
    removeFromCart: tr.t("removeFromCart"),
    waMessage: waNumber
      ? (tr.locale === "en" ? "Hi! I'd like to place an order:" : "Привет! Хочу оформить заказ:")
      : ""
  };
}
