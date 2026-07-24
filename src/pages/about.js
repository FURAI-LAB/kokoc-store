import {
  i18n,
  languageSwitcherScript,
  languageSwitcherStyles,
  renderLanguageSwitcher
} from "../lib/i18n.js";
import { renderSeoHead, breadcrumbJsonLd, jsonLdScripts } from "../lib/seo.js";
import { navbarStyles, navbarScript, navbarUi, renderNavbar } from "../lib/navbar.js";

export function renderAboutPage(appConfig, locale = "ru", whatsappNumber = "", nonce = null) {
  const tr = i18n(locale);
  const langSwitcher = renderLanguageSwitcher(tr);

  const iconSearch = `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.7"/><path d="m20 20-4.45-4.45"/></svg>`;
  const iconHeart  = `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20.2 4.85 13.55a4.7 4.7 0 0 1 6.65-6.65l.5.5.5-.5a4.7 4.7 0 1 1 6.65 6.65L12 20.2Z"/></svg>`;
  const iconBag    = `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5.5 6.2h1.8l1 2.8"/><path d="M8.3 9h10.4l-1.7 6H9.3Z"/><circle cx="10.3" cy="17.3" r="1.2"/><circle cx="16" cy="17.3" r="1.2"/></svg>`;
  const iconMenu   = `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.85" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/></svg>`;
  const iconWhatsapp = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>`;

  const isRu = locale === "ru";

  // WhatsApp link — strip non-digits, build wa.me URL
  const waNumber = (whatsappNumber || "").replace(/\D/g, "");
  const waHref = waNumber ? `https://wa.me/${waNumber}` : null;

  const heroText = isRu
    ? "Просто почему?"
    : "Just why?";

  const heroSub = isRu
    ? "Потому что мы можем себе это позволить."
    : "Because we can.";

  const introParagraph = isRu
    ? "Пока мир спорит о вкусах, мы выбираем комфорт. Kokoc Store вырос из простой идеи: обувь должна дарить свободу, а не диктовать правила."
    : "While the world debates taste, we choose comfort. Kokoc Store grew from a simple idea: footwear should give you freedom, not dictate rules.";

  const cultureParagraph = isRu
    ? "Для нас это не просто сабо. Это визуальная культура."
    : "For us, it's not just clogs. It's visual culture.";

  const teamParagraph = isRu
    ? "Как команда, сфокусированная на дизайне и эстетике, мы находим во Вьетнаме те самые редкие коллаборации и лимитированные дропы, которые превращают «утилитарную вещь» в стритвир-икону."
    : "As a team focused on design and aesthetics, we source rare collaborations and limited drops in Vietnam — the kind that turn a \"utilitarian object\" into a streetwear icon.";

  const whyTitle = isRu ? "Почему выбирают нас:" : "Why choose us:";

  const reasons = isRu ? [
    { title: "Кураторский отбор", body: "Привозим только то, что надели бы сами — от минималистичной классики до смелых лимитированных коллекций." },
    { title: "Прямиком из Вьетнама", body: "Находимся в эпицентре производства, поэтому имеем доступ к самым интересным и редким моделям." },
    { title: "Состояние, а не товар", body: "Мы продаем легкость, ироничное отношение к моде и уверенность в каждом шаге." }
  ] : [
    { title: "Curated Selection", body: "We only bring what we'd wear ourselves — from minimalist classics to bold limited collections." },
    { title: "Straight from Vietnam", body: "We're at the epicenter of production, so we have access to the most interesting and rare models." },
    { title: "A State of Mind", body: "We sell lightness, an ironic attitude toward fashion, and confidence in every step." }
  ];

  const deliveryText = isRu
    ? "Мы доставляем заказы по всей России, чтобы вы могли просто забить на чужое мнение и кайфовать от своего выбора."
    : "We deliver orders across Russia so you can just forget everyone else's opinion and enjoy your own choice.";

  const tagline = isRu
    ? "Kokoc Store — свобода быть собой."
    : "Kokoc Store — freedom to be yourself.";

  const ctaText = isRu ? "Смотреть каталог" : "Browse catalog";
  const waCtaText = isRu ? "Задать вопрос" : "Ask a question";
  const waCtaSubText = isRu ? "Ответим в WhatsApp" : "We'll reply on WhatsApp";

  // WhatsApp SVG icon
  const iconWhatsApp = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" width="20" height="20"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>`;

  const aboutTitle = isRu ? "О нас" : "About Us";
  const aboutDescription = isRu
    ? "Kokoc Store — кураторский магазин Crocs и Adidas Originals прямо из Вьетнама. Лимитированные коллекции, стритвир-иконы и свобода быть собой."
    : "Kokoc Store — curated Crocs and Adidas Originals shop straight from Vietnam. Limited collections, streetwear icons, and freedom to be yourself.";

  return `<!DOCTYPE html>
<html lang="${tr.locale}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    ${renderSeoHead({
      appConfig,
      title: `${aboutTitle} — Kokoc Store`,
      description: aboutDescription,
      path: "/about",
      locale: tr.locale,
      alternates: { ru: "/about", en: "/about" }
    })}
    ${jsonLdScripts(nonce, breadcrumbJsonLd(appConfig, [
      { name: tr.t("home"), path: "/" },
      { name: aboutTitle, path: "/about" }
    ]))}
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
        --wa-green: #25D366;
      }

      * { box-sizing: border-box; }

      html { scroll-behavior: smooth; background: #F7F7F6; overflow-x: hidden; }

      body {
        margin: 0;
        min-height: 100vh;
        background: radial-gradient(circle at 50% 0%, rgba(255,240,245,0.45), transparent 55%), #F7F7F6;
        color: var(--text);
        font-family: "Manrope", "Segoe UI", Arial, sans-serif;
      }

      a { color: inherit; text-decoration: none; }
      button, input { font: inherit; }
      button { border: 0; padding: 0; color: inherit; background: none; cursor: pointer; }

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
        position: absolute; left: 50%; display: flex;
        align-items: center; gap: 18px; transform: translateX(-50%);
        white-space: nowrap;
      }
      .desktop-nav a { font-size: 13px; font-weight: 600; transition: color 220ms; }
      .desktop-nav a:hover, .desktop-nav a.active { color: var(--primary); }
      .nav-actions { display: flex; align-items: center; gap: 6px; }
      .mobile-only { display: none; }
      .desktop-only { display: inline-flex; }

${navbarStyles}

      /* ── Page layout ── */
      .page-wrap {
        width: min(calc(100% - 48px), var(--container));
        margin-inline: auto;
        padding-top: 64px;
        padding-bottom: 96px;
      }

      /* ── Hero block ── */
      .about-hero {
        margin-bottom: 56px;
        text-align: center;
      }
      .about-hero__eyebrow {
        display: inline-block;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--primary);
        margin-bottom: 16px;
      }
      .about-hero__title {
        margin: 0 0 16px;
        font-family: "Manrope", "Segoe UI", Arial, sans-serif;
        font-size: clamp(36px, 7vw, 72px);
        font-weight: 800;
        letter-spacing: -0.02em;
        line-height: 1.1;
      }
      .about-hero__sub {
        margin: 0;
        font-size: clamp(18px, 2.5vw, 24px);
        font-weight: 500;
        color: var(--secondary-text);
        line-height: 1.4;
      }

      /* ── Body copy ── */
      .about-body {
        display: grid;
        gap: 28px;
        margin-bottom: 56px;
      }
      .about-body p {
        margin: 0;
        font-size: clamp(15px, 1.7vw, 17px);
        line-height: 1.7;
        color: var(--text);
      }
      .about-body p.culture {
        font-size: clamp(18px, 2.2vw, 22px);
        font-weight: 600;
        line-height: 1.4;
      }

      /* ── Why us section ── */
      .why-section {
        margin-bottom: 56px;
      }
      .why-title {
        font-size: clamp(22px, 3vw, 30px);
        font-weight: 700;
        margin: 0 0 28px;
        letter-spacing: -0.02em;
      }
      .why-list {
        display: grid;
        gap: 16px;
        list-style: none;
        margin: 0;
        padding: 0;
      }
      .why-item {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 16px;
        align-items: start;
        padding: 20px 22px;
        background: #FFFFFF;
        border-radius: 18px;
        box-shadow: var(--shadow-default);
      }
      .why-item__bullet {
        width: 36px; height: 36px;
        border-radius: 50%;
        background: rgba(255,107,154,0.12);
        display: flex; align-items: center; justify-content: center;
        font-size: 16px;
        flex-shrink: 0;
      }
      .why-item__copy { display: grid; gap: 4px; }
      .why-item__title {
        font-size: 15px; font-weight: 700;
        margin: 0; letter-spacing: -0.01em;
      }
      .why-item__body {
        font-size: 14px; line-height: 1.55;
        color: var(--secondary-text); margin: 0;
      }

      /* ── Delivery & tagline ── */
      .about-footer-text {
        font-size: clamp(14px, 1.6vw, 16px);
        line-height: 1.7;
        color: var(--secondary-text);
        margin: 0 0 48px;
      }
      .about-tagline {
        font-size: clamp(22px, 3.5vw, 34px);
        font-weight: 800;
        letter-spacing: -0.03em;
        margin: 0 0 32px;
        line-height: 1.2;
      }

      /* ── CTA buttons row ── */
      .about-cta-row {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
      }
      .about-cta {
        display: inline-flex; align-items: center; justify-content: center;
        height: 52px; padding: 0 32px;
        border-radius: 999px;
        background: var(--text);
        color: #fff;
        font-size: 15px; font-weight: 700;
        transition: background 200ms, transform 200ms;
      }
      .about-cta:hover { background: #333; transform: translateY(-2px); }

      /* ── WhatsApp CTA ── */
      .about-wa-btn {
        display: inline-flex; align-items: center; gap: 10px;
        height: 52px; padding: 0 24px;
        border-radius: 999px;
        background: var(--wa-green);
        color: #fff;
        font-size: 15px; font-weight: 700;
        text-decoration: none;
        transition: opacity 200ms, transform 200ms;
        flex-shrink: 0;
      }
      .about-wa-btn:hover { opacity: 0.88; transform: translateY(-2px); }
      .about-wa-btn__sub {
        font-size: 11px;
        font-weight: 400;
        opacity: 0.82;
        display: block;
        line-height: 1;
        margin-top: 1px;
      }
      .about-wa-btn__inner {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        line-height: 1.2;
      }

      /* ── Divider ── */
      .about-divider {
        border: none;
        border-top: 1px solid rgba(0,0,0,0.07);
        margin: 0 0 48px;
      }

      /* ── Footer ── */
      .site-footer {
        width: min(calc(100% - 48px), var(--container));
        margin: 0 auto; padding: 4px 0 calc(28px + env(safe-area-inset-bottom, 0px));
        border-top: 1px solid rgba(0,0,0,0.07);
        color: var(--secondary-text); font-size: 13px; display: flex; align-items: center; justify-content: space-between;
        flex-wrap: wrap; gap: 6px 16px;
      }
      .footer-legal { opacity: 0.3; }
      .footer-tagline { opacity: 0.3; }
      .footer-credit {
        color: inherit; opacity: 0.45; text-decoration: none;
        font-size: inherit; transition: opacity 180ms;
      }
      .footer-credit:hover { opacity: 0.75; }
      @media (max-width: 900px) { .site-footer { width: min(calc(100% - 32px), var(--container)); } }
      @media (max-width: 480px)  { .site-footer { width: min(calc(100% - 24px), var(--container)); font-size: 12px; } }

      /* ── Mobile ── */
      @media (max-width: 900px) {
        .mobile-only { display: inline-flex; }
        .nav-actions .language-switcher {
          display: none;
        }
        .desktop-only { display: none; }
        .desktop-nav { display: none; }
        .page-wrap { width: min(calc(100% - 32px), var(--container)); padding-top: 48px; }
      }

      @media (max-width: 640px) {
        .about-hero { margin-bottom: 40px; }
        .why-item { grid-template-columns: 1fr; }
        .why-item__bullet { display: none; }
        .page-wrap { padding-top: 36px; padding-bottom: 64px; }
        .about-cta-row { flex-direction: column; align-items: flex-start; }
        .about-cta, .about-wa-btn { width: 100%; justify-content: center; }
      }
    </style>
  </head>
  <body>

    ${renderNavbar(appConfig, tr, langSwitcher, waNumber, "about")}

    <!-- Page content -->
    <main class="page-wrap" aria-label="${isRu ? "О нас" : "About Us"}">

      <!-- Hero -->
      <div class="about-hero">
        <span class="about-hero__eyebrow">Kokoc Store</span>
        <h1 class="about-hero__title">${heroText}</h1>
        <p class="about-hero__sub">${heroSub}</p>
      </div>

      <!-- Body copy -->
      <div class="about-body">
        <p>${introParagraph}</p>
        <p class="culture">${cultureParagraph}</p>
        <p>${teamParagraph}</p>
      </div>

      <!-- Why us -->
      <section class="why-section" aria-label="${whyTitle}">
        <h2 class="why-title">${whyTitle}</h2>
        <ul class="why-list">
          ${reasons.map((r, i) => `
          <li class="why-item">
            <div class="why-item__bullet">${["🎯","🇻🇳","✨"][i]}</div>
            <div class="why-item__copy">
              <p class="why-item__title">${r.title}</p>
              <p class="why-item__body">${r.body}</p>
            </div>
          </li>`).join("")}
        </ul>
      </section>

      <hr class="about-divider" />

      <p class="about-footer-text">${deliveryText}</p>
      <p class="about-tagline">${tagline}</p>

      <div class="about-cta-row">
        <a href="/catalog" class="about-cta">${ctaText}</a>
        ${waHref ? `
        <a href="${waHref}" class="about-wa-btn" target="_blank" rel="noopener noreferrer" aria-label="${waCtaText}">
          ${iconWhatsApp}
          <span class="about-wa-btn__inner">
            <span>${waCtaText}</span>
            <span class="about-wa-btn__sub">${waCtaSubText}</span>
          </span>
        </a>` : ""}
      </div>

    </main>

    <!-- Footer -->
    <footer class="site-footer">
      <span>© ${new Date().getFullYear()} ${appConfig.domain}</span>
      <span class="footer-legal">ИП Мингазиев Зариф Зайнуллович</span>
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
