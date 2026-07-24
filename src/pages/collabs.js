import { COLLABS } from "../lib/collabs.js";
import {
  i18n,
  pluralItems,
  languageSwitcherScript,
  languageSwitcherStyles,
  renderLanguageSwitcher
} from "../lib/i18n.js";
import { renderSeoHead, breadcrumbJsonLd, jsonLdScripts } from "../lib/seo.js";
import { renderNavbar, navbarStyles, navbarScript, navbarUi } from "../lib/navbar.js";
import { escapeHtml } from "../lib/html.js";

/**
 * renderCollabsPage — /collabs list.
 * Compact card grid; each card links to /collabs/:slug, which shows the
 * collab story plus the products tagged with its productTag (see
 * lib/collabs.js). productCounts is an optional Map<collabId, number>
 * used to show "N товаров" on each card — pass it from server.js via
 * getCollabProductCounts(). Omit it and the count line is simply hidden.
 */
export function renderCollabsPage(appConfig, collabs = COLLABS, locale = "ru", whatsappNumber = "", productCounts = null, nonce = null) {
  const tr = i18n(locale);
  const langSwitcher = renderLanguageSwitcher(tr);
  const waNumber = (whatsappNumber || "").replace(/\D/g, "");

  const iconMenu = `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.85" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/></svg>`;
  const iconBag  = `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5.5 6.2h1.8l1 2.8"/><path d="M8.3 9h10.4l-1.7 6H9.3Z"/><circle cx="10.3" cy="17.3" r="1.2"/><circle cx="16" cy="17.3" r="1.2"/></svg>`;
  const iconArrow = `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" width="14" height="14"><path d="M5 12h14"/><path d="m13 5 7 7-7 7"/></svg>`;

  const CollabCard = (c) => {
    const name        = escapeHtml(c.name);
    const description = escapeHtml(c.description);
    const bannerUrl   = escapeHtml(c.bannerUrl);
    const year        = escapeHtml(c.year);
    const slug        = escapeHtml(c.slug);
    const isArchive   = c.status === "archive";
    const count       = productCounts ? productCounts.get(c.id) : null;
    const countLabel  = count ? pluralItems(count, tr) : null;

    return `
      <article class="collab-card${isArchive ? " collab-card--archive" : ""}">
        <a href="/collabs/${slug}" class="collab-card__media" aria-label="${name}">
          <img src="${bannerUrl}" alt="${name}" loading="lazy" width="640" height="480" />
          <span class="collab-badge${isArchive ? " collab-badge--archive" : ""}">${isArchive ? tr.t("archiveBadge") : year}</span>
          ${countLabel ? `<span class="collab-count">${countLabel}</span>` : ""}
        </a>
        <div class="collab-card__body">
          <h2><a href="/collabs/${slug}">${name}</a></h2>
          <p>${description}</p>
          <a href="/collabs/${slug}" class="collab-card__cta">
            ${tr.t("viewCollab")}
            ${iconArrow}
          </a>
        </div>
      </article>
    `;
  };

  const active  = collabs.filter(c => c.status === "active");
  const archive = collabs.filter(c => c.status === "archive");

  return `<!DOCTYPE html>
<html lang="${tr.locale}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    ${renderSeoHead({
      appConfig,
      title: `${tr.t("collabsTitle")} — Kokoc Store`,
      description: tr.t("collabsDescription"),
      path: "/collabs",
      locale: tr.locale,
      alternates: { ru: "/collabs", en: "/collabs" }
    })}
    ${jsonLdScripts(nonce, breadcrumbJsonLd(appConfig, [
      { name: tr.t("home"), path: "/" },
      { name: tr.t("collabsTitle"), path: "/collabs" }
    ]))}
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

      /* ── Navbar (identical to landing) ── */
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

      /* ── Page layout ── */
      .page-inner {
        width: min(calc(100% - 48px), var(--container));
        margin-inline: auto;
        padding: 56px 0 80px;
      }
      .page-title {
        font-size: clamp(28px, 4vw, 40px); font-weight: 700;
        line-height: 1.1; letter-spacing: 0; margin: 0 0 6px;
      }
      .page-subtitle {
        color: var(--secondary-text); font-size: 13px;
        margin: 0 0 40px;
      }
      .collabs-section-label {
        font-size: 11px; font-weight: 700; letter-spacing: 0.1em;
        text-transform: uppercase; color: var(--secondary-text);
        margin: 0 0 16px;
      }

      /* ── Collab grid ── */
      .collabs-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 16px;
        margin-bottom: 48px;
      }
      .collabs-grid--single { grid-template-columns: minmax(0, 1fr); max-width: 360px; }

      .collab-card {
        border-radius: 18px;
        background: var(--white);
        box-shadow: var(--shadow-default);
        overflow: hidden;
        transition: transform 220ms ease, box-shadow 220ms ease;
      }
      .collab-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-hover); }
      .collab-card--archive { opacity: 0.7; }
      .collab-card--archive:hover { opacity: 1; }

      .collab-card__media {
        display: block; position: relative; overflow: hidden;
        background: #f0efed;
      }
      .collab-card__media img {
        width: 100%; aspect-ratio: 4/3; object-fit: cover;
        transition: transform 300ms ease;
        filter: contrast(1.05);
      }
      .collab-card:hover .collab-card__media img { transform: scale(1.04); }

      .collab-badge {
        position: absolute; top: 10px; left: 10px;
        display: inline-flex; align-items: center;
        height: 22px; padding: 0 10px;
        border-radius: 999px;
        background: var(--primary); color: #fff;
        font-size: 10px; font-weight: 700; line-height: 1;
      }
      .collab-badge--archive { background: rgba(0,0,0,0.55); }

      .collab-count {
        position: absolute; bottom: 10px; left: 10px;
        display: inline-flex; align-items: center;
        height: 22px; padding: 0 10px;
        border-radius: 999px;
        background: rgba(255,255,255,0.9); color: var(--text);
        font-size: 10px; font-weight: 700; line-height: 1;
      }

      .collab-card__body { padding: 12px 14px 14px; }
      .collab-card__body h2 {
        margin: 0 0 4px; font-size: 14px; font-weight: 700; line-height: 1.2;
      }
      .collab-card__body h2 a { display: block; }
      .collab-card__body p {
        margin: 0 0 10px; color: var(--secondary-text);
        font-size: 11px; line-height: 1.45;
        display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .collab-card__cta {
        display: inline-flex; align-items: center; gap: 5px;
        font-size: 11px; font-weight: 700; color: var(--text);
        transition: color 200ms ease, gap 200ms ease;
      }
      .collab-card__cta:hover { color: var(--primary); gap: 8px; }

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
        .nav-actions .language-switcher {
          display: none;
        }
        .page-inner { width: min(calc(100% - 32px), var(--container)); padding: 48px 0 64px; }
        .collabs-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      }
      @media (max-width: 480px) {
        .collabs-grid { grid-template-columns: 1fr; gap: 14px; }
        .collabs-grid--single { max-width: 100%; }
        .page-title { margin-bottom: 6px; }
        .page-subtitle { margin-bottom: 28px; }
        .page-inner { width: min(calc(100% - 24px), var(--container)); }
      }

    </style>
  </head>
  <body>
    ${renderNavbar(appConfig, tr, langSwitcher, waNumber, "collabs")}

    <main>
      <div class="page-inner">
        <h1 class="page-title">${tr.t("collabsTitle")}</h1>
        <p class="page-subtitle">${tr.t("collabsSubtitle")}</p>

        ${active.length > 0 ? `
          <p class="collabs-section-label">${tr.t("active")}</p>
          <div class="collabs-grid${active.length === 1 ? " collabs-grid--single" : ""}">
            ${active.map(CollabCard).join("")}
          </div>
        ` : ""}

        ${archive.length > 0 ? `
          <p class="collabs-section-label">${tr.t("archive")}</p>
          <div class="collabs-grid${archive.length === 1 ? " collabs-grid--single" : ""}">
            ${archive.map(CollabCard).join("")}
          </div>
        ` : ""}
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
