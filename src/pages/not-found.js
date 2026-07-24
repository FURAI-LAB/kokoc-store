import {
  i18n,
  languageSwitcherScript,
  languageSwitcherStyles,
  renderLanguageSwitcher
} from "../lib/i18n.js";
import { renderSeoHead } from "../lib/seo.js";
import { renderNavbar, navbarStyles, navbarScript, navbarUi } from "../lib/navbar.js";

export function renderNotFoundPage(appConfig, locale = "ru", whatsappNumber = "", nonce = null) {
  const tr = i18n(locale);
  const langSwitcher = renderLanguageSwitcher(tr);
  const waNumber = (whatsappNumber || "").replace(/\D/g, "");

  return `<!DOCTYPE html>
<html lang="${tr.locale}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    ${renderSeoHead({
      appConfig,
      title: `404 — ${tr.t("notFoundTitle")} — Kokoc Store`,
      description: tr.t("notFoundSub"),
      path: "/404",
      locale: tr.locale,
      noindex: true,
      alternates: { ru: "/404", en: "/404" }
    })}
    <meta name="theme-color" content="#F7F7F6" />
    <link rel="icon" type="image/png" sizes="32x32" href="/favsmall.png" />
    <link rel="apple-touch-icon" href="/favbig.jpg" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
    <style>
      ${languageSwitcherStyles}

      :root {
        --primary: #FF6B9A;
        --text: #1A1A1A;
        --secondary-text: #888;
        --white: #FFFFFF;
        --shadow-default: 0 8px 24px rgba(0,0,0,0.06);
        --shadow-hover: 0 16px 40px rgba(0,0,0,0.12);
        --container: 840px;
      }

      * { box-sizing: border-box; }

      html { scroll-behavior: smooth; background: #F7F7F6; overflow-x: hidden; }

      body {
        margin: 0;
        min-height: 100vh;
        background: radial-gradient(circle at 50% 0%, rgba(255,240,245,0.45), transparent 55%), #F7F7F6;
        color: var(--text);
        font-family: "Manrope", "Segoe UI", Arial, sans-serif;
        display: flex;
        flex-direction: column;
      }

      a { color: inherit; text-decoration: none; }
      button, input { font: inherit; }
      button { border: 0; padding: 0; color: inherit; background: none; cursor: pointer; }

      /* ── Navbar (shared shell) ── */
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
        position: absolute; left: 50%; display: flex;
        align-items: center; gap: 18px; transform: translateX(-50%);
        white-space: nowrap;
      }
      .desktop-nav a { font-size: 13px; font-weight: 600; transition: color 220ms; }
      .desktop-nav a:hover { color: var(--primary); }

      /* ── Shared navbar/search/cart/wishlist/menu styles ── */
      ${navbarStyles}

      /* ── 404 hero ── */
      .nf-wrap {
        flex: 1;
        width: min(calc(100% - 48px), 1080px);
        margin-inline: auto;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 0 0 64px;
      }
      .nf-img-frame {
        width: 100vw;
        margin-left: calc(50% - 50vw);
        margin-right: calc(50% - 50vw);
        margin-bottom: 12px;
        background: #F7F7F6;
      }
      .nf-img {
        display: block;
        width: 100%;
        height: auto;
      }
      .nf-actions {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
        justify-content: center;
        margin-top: 28px;
      }
      .nf-cta {
        display: inline-flex; align-items: center; justify-content: center;
        height: 52px; padding: 0 32px;
        border-radius: 999px;
        background: var(--text);
        color: #fff;
        font-size: 15px; font-weight: 700;
        transition: background 200ms, transform 200ms;
      }
      .nf-cta:hover { background: #333; transform: translateY(-2px); }
      .nf-cta--secondary {
        background: var(--white);
        color: var(--text);
        box-shadow: var(--shadow-default);
      }
      .nf-cta--secondary:hover { box-shadow: var(--shadow-hover); background: var(--white); }

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

      @media (max-width: 640px) {
        .nf-wrap { padding: 0 0 56px; }
        .nf-actions { flex-direction: column; align-items: stretch; width: 100%; }
        .nf-cta, .nf-cta--secondary { width: 100%; }
      }
    </style>
  </head>
  <body>

    ${renderNavbar(appConfig, tr, langSwitcher, waNumber)}

    <!-- Page content -->
    <main class="nf-wrap">
      <picture class="nf-img-frame">
        <source media="(max-width: 640px)" srcset="/images/404/404-mobile.webp" type="image/webp" />
        <source media="(max-width: 640px)" srcset="/images/404/404-mobile.jpg" />
        <source srcset="/images/404/404-desktop.webp" type="image/webp" />
        <img class="nf-img" src="/images/404/404-desktop.jpg" alt="${tr.t("notFoundImgAlt")}" width="1280" height="600" />
      </picture>
      <div class="nf-actions">
        <a href="/" class="nf-cta">${tr.t("notFoundCta")}</a>
        <a href="/catalog" class="nf-cta nf-cta--secondary">${tr.t("notFoundCtaSecondary")}</a>
      </div>
    </main>

    <!-- Footer -->
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
