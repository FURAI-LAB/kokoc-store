import {
  i18n,
  languageSwitcherScript,
  languageSwitcherStyles,
  renderLanguageSwitcher
} from "../lib/i18n.js";
import { renderSeoHead, breadcrumbJsonLd, jsonLdScripts } from "../lib/seo.js";
import { navbarStyles, navbarScript, navbarUi, renderNavbar } from "../lib/navbar.js";

export function renderDeliveryPage(appConfig, locale = "ru", whatsappNumber = "", nonce = null) {
  const tr = i18n(locale);
  const langSwitcher = renderLanguageSwitcher(tr);
  const isRu = locale === "ru";
  const waNumber = (whatsappNumber || "").replace(/\D/g, "");
  const waHref = waNumber ? `https://wa.me/${waNumber}` : null;

  const iconSearch = `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.7"></circle><path d="m20 20-4.45-4.45"></path></svg>`;
  const iconHeart  = `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20.2 4.85 13.55a4.7 4.7 0 0 1 6.65-6.65l.5.5.5-.5a4.7 4.7 0 1 1 6.65 6.65L12 20.2Z"></path></svg>`;
  const iconBag    = `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5.5 6.2h1.8l1 2.8"></path><path d="M8.3 9h10.4l-1.7 6H9.3Z"></path><circle cx="10.3" cy="17.3" r="1.2"></circle><circle cx="16" cy="17.3" r="1.2"></circle></svg>`;
  const iconMenu   = `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.85" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16"></path><path d="M4 12h16"></path><path d="M4 17h16"></path></svg>`;
  const iconTruck  = `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="1" y="3" width="15" height="13" rx="1.5"/><path d="M16 8h4l3 5v3h-7V8Z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`;
  const iconPin    = `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.5-7-11a7 7 0 0 1 14 0c0 4.5-7 11-7 11Z"/><circle cx="12" cy="10" r="2.5"/></svg>`;
  const iconBox    = `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>`;
  const iconClock  = `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>`;
  const iconCheck  = `<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>`;
  const iconWhatsapp = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>`;

  const heroTitle    = isRu ? "Доставка" : "Delivery";
  const heroSubtitle = isRu ? "Курьер СДЭК привезёт прямо до двери" : "CDEK courier delivers straight to your door";
  const infoTitle    = isRu ? "Как мы доставляем" : "How we deliver";

  const steps = isRu ? [
    { n: "01", icon: iconBox,   t: "Заказ обрабатывается", s: "1–3 дня после оплаты" },
    { n: "02", icon: iconTruck, t: "Отправка СДЭК",        s: "Трек-номер на почту" },
    { n: "03", icon: iconClock, t: "Курьер в пути",        s: "14–21 дней по России" },
    { n: "04", icon: iconCheck, t: "Доставка до двери",    s: "Звонок перед приездом" },
  ] : [
    { n: "01", icon: iconBox,   t: "Order processed",      s: "1–3 days after payment" },
    { n: "02", icon: iconTruck, t: "Shipped via CDEK",     s: "Tracking number by email" },
    { n: "03", icon: iconClock, t: "Courier en route",     s: "14–21 days across Russia" },
    { n: "04", icon: iconCheck, t: "Delivered to door",    s: "Call before arrival" },
  ];

  const faqs = isRu ? [
    { q: "Сколько стоит доставка?",              a: "Стоимость рассчитывается по тарифам СДЭК и зависит от веса посылки и расстояния. В среднем 300–700 ₽." },
    { q: "Как скоро приедет курьер?",            a: "Срок доставки — 14–21 рабочих дней в зависимости от региона. Курьер позвонит за 30–60 минут до приезда." },
    { q: "Можно ли изменить адрес доставки?",   a: "Да, до момента отправки посылки. Напиши нам в WhatsApp или Telegram." },
    { q: "Что делать, если меня не будет дома?", a: "Уточни у курьера удобное время для повторной доставки. Обычно делается до трёх попыток." },
    { q: "Можно ли вернуть или обменять товар?", a: "Товары надлежащего качества, заказанные по индивидуальному заказу с доставкой из-за рубежа, обмену и возврату не подлежат. В случае брака или ошибки при отправке свяжитесь с нами — мы поможем решить вопрос." },
  ] : [
    { q: "How much does delivery cost?",         a: "Cost is calculated by CDEK tariffs based on parcel weight and distance. Usually 300–700 ₽." },
    { q: "When will the courier arrive?",        a: "Delivery takes 14–21 business days depending on the region. The courier will call 30–60 minutes before arrival." },
    { q: "Can I change my delivery address?",    a: "Yes, before shipment. Message us on WhatsApp or Telegram." },
    { q: "What if I'm not home?",                a: "Arrange a convenient time for re-delivery with the courier. Usually up to three attempts are made." },
    { q: "Can I return or exchange an item?",    a: "Items of proper quality that are custom-ordered and shipped from abroad cannot be exchanged or returned. If you receive a defective or incorrect item, contact us — we'll help resolve the issue." },
  ];

  const faqTitle = isRu ? "Вопросы о доставке" : "Delivery FAQ";

  return `<!DOCTYPE html>
<html lang="${tr.locale}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    ${renderSeoHead({
      appConfig,
      title: tr.t("deliverySeoTitle"),
      description: tr.t("deliverySeoDescription"),
      path: "/delivery",
      locale: tr.locale,
      alternates: { ru: "/delivery", en: "/delivery" }
    })}
    ${jsonLdScripts(nonce, breadcrumbJsonLd(appConfig, [
      { name: tr.t("home"), path: "/" },
      { name: heroTitle, path: "/delivery" }
    ]))}
    <meta name="theme-color" content="#F7F7F6" />
    <link rel="icon" type="image/png" sizes="32x32" href="/favsmall.png" />
    <link rel="icon" type="image/jpeg" sizes="720x720" href="/favbig.jpg" />
    <link rel="apple-touch-icon" href="/favbig.jpg" />
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
        --cdek-green: #00b33c;
      }
      * { box-sizing: border-box; }
      html {
        scroll-behavior: smooth;
        background: radial-gradient(circle at 50% 0%, rgba(255,240,245,0.4), transparent 60%), #F7F7F6;
        overflow-x: hidden;
      }
      body {
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
        display: flex; align-items: center; justify-content: center;
        gap: 20px; transform: translateX(-50%);
        white-space: nowrap;
      }
      .desktop-nav a { color: var(--text); font-size: 13px; font-weight: 600; line-height: 1; transition: color 220ms, transform 220ms; }
      .desktop-nav a:hover { color: var(--primary); transform: translateY(-1px); }
      .desktop-nav a.active { color: var(--primary); }
      .nav-actions { display: flex; align-items: center; justify-content: flex-end; gap: 6px; }
      .mobile-only { display: none; }

${languageSwitcherStyles}
${navbarStyles}

      /* ── Layout ── */
      .page { min-height: 100vh; }
      .wrap { width: min(calc(100% - 48px), var(--container)); margin-inline: auto; }

      /* ── Hero ── */
      .delivery-hero {
        position: relative; overflow: hidden;
        border-radius: 0 0 32px 32px;
        margin-bottom: 56px;
        background: var(--primary);
        min-height: 180px;
        display: flex; align-items: center;
      }
      .delivery-hero__content {
        position: relative; z-index: 1;
        display: flex; flex-direction: column; justify-content: center;
        min-height: 180px; padding: 40px 48px;
      }
      .delivery-hero__eyebrow {
        display: inline-flex; align-items: center; gap: 8px;
        color: rgba(255,255,255,0.75); font-size: 12px; font-weight: 700;
        letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 10px;
      }
      .delivery-hero__eyebrow svg { width: 16px; height: 16px; stroke: currentColor; }
      .delivery-hero__title {
        margin: 0 0 6px; color: #fff;
        font-size: clamp(32px, 5vw, 58px);
        font-weight: 800; line-height: 1; letter-spacing: -0.02em;
      }
      .delivery-hero__sub { margin: 0; color: rgba(255,255,255,0.8); font-size: clamp(13px, 1.6vw, 16px); }

      /* ── Courier info section ── */
      .courier-section { margin-bottom: 56px; }
      .section-heading { margin: 0 0 8px; font-size: clamp(26px, 3vw, 36px); font-weight: 700; }
      .section-sub { margin: 0 0 28px; color: var(--secondary-text); font-size: 14px; }

      .courier-info-grid {
        display: grid; grid-template-columns: repeat(3, 1fr);
        gap: 16px; margin-bottom: 16px;
      }
      .courier-info-card {
        background: #fff; border-radius: 20px; padding: 28px 24px;
        box-shadow: var(--shadow-default);
        display: flex; flex-direction: column; gap: 12px;
      }
      .courier-info-card__icon {
        width: 44px; height: 44px; border-radius: 14px;
        background: rgba(255,107,154,0.08);
        display: flex; align-items: center; justify-content: center;
        color: var(--primary); flex-shrink: 0;
      }
      .courier-info-card__icon svg { width: 22px; height: 22px; stroke: currentColor; }
      .courier-info-card__title { font-size: 16px; font-weight: 700; margin: 0; }
      .courier-info-card__text { font-size: 13px; color: var(--secondary-text); margin: 0; line-height: 1.6; }

      /* ── Hint below map ── */
      .map-hint { margin-top: 4px; }
      .cdek-badge {
        display: flex; align-items: center; gap: 12px;
        padding: 14px 18px; border-radius: 14px;
        background: rgba(0,179,60,0.06);
        border: 1px solid rgba(0,179,60,0.18);
      }
      .cdek-badge__logo {
        font-size: 15px; font-weight: 900; color: var(--cdek-green);
        letter-spacing: -0.03em; line-height: 1; flex-shrink: 0;
      }
      .cdek-badge__text { font-size: 13px; color: var(--secondary-text); line-height: 1.5; }

      /* ── Steps ── */
      .steps-section { margin-bottom: 56px; }
      .steps-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
      .step-card { background: #fff; border-radius: 20px; padding: 24px 20px; box-shadow: var(--shadow-default); }
      .step-number { font-size: 11px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--primary); margin-bottom: 16px; }
      .step-icon {
        width: 40px; height: 40px; border-radius: 12px;
        background: rgba(255,107,154,0.08);
        display: flex; align-items: center; justify-content: center;
        color: var(--primary); margin-bottom: 14px;
      }
      .step-icon svg { width: 20px; height: 20px; stroke: currentColor; }
      .step-title { font-size: 16px; font-weight: 700; margin: 0 0 6px; }
      .step-text { font-size: 13px; color: var(--secondary-text); margin: 0; line-height: 1.5; }

      /* ── FAQ ── */
      .faq-section { margin-bottom: 72px; }
      .faq-list { display: flex; flex-direction: column; gap: 10px; }
      .faq-item { background: #fff; border-radius: 16px; box-shadow: var(--shadow-default); overflow: hidden; }
      .faq-question {
        width: 100%; display: flex; align-items: center; justify-content: space-between;
        gap: 16px; padding: 18px 22px;
        font-size: 15px; font-weight: 600; text-align: left;
        background: none; border: none; cursor: pointer; transition: color 200ms;
      }
      .faq-question:hover { color: var(--primary); }
      .faq-arrow { flex-shrink: 0; width: 20px; height: 20px; stroke: currentColor; transition: transform 250ms; }
      .faq-item.open .faq-arrow { transform: rotate(180deg); }
      .faq-answer {
        max-height: 0; overflow: hidden; padding: 0 22px;
        color: var(--secondary-text); font-size: 14px; line-height: 1.6;
        transition: max-height 300ms ease, padding 300ms ease;
      }
      .faq-item.open .faq-answer { max-height: 200px; padding: 0 22px 18px; }

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

      .mobile-nav { display: flex; flex-direction: column; padding: 12px 0; flex: 1; }
      .mobile-nav a {
        padding: 16px 24px; font-size: 20px; font-weight: 600;
        color: var(--text, #111); text-decoration: none;
        border-bottom: 1px solid rgba(0,0,0,0.05); transition: color 180ms, padding-left 180ms;
      }
      .mobile-nav a:hover, .mobile-nav a.active { color: var(--primary, #FF6B9A); padding-left: 32px; }
      .mobile-nav-footer { padding: 24px; flex-shrink: 0; display: flex; flex-direction: column; gap: 16px; }
      .mobile-nav-lang { display: flex; justify-content: center; }

      /* ── Responsive ── */
      @media (max-width: 900px) {
        .navbar { padding: 0 16px; }
        .brand { width: 74px; min-width: 74px; }
        .desktop-nav, .desktop-only { display: none; }
        .mobile-only { display: inline-flex; }
        .nav-actions .language-switcher {
          display: none;
        }
        .courier-info-grid { grid-template-columns: 1fr; }
        .steps-grid { grid-template-columns: repeat(2, 1fr); }
        .delivery-hero__content { padding: 32px 24px; }
      }
      @media (max-width: 600px) {
        .navbar { padding: 0 12px; }
        .delivery-hero { border-radius: 0 0 24px 24px; margin-bottom: 40px; }
        .delivery-hero__content { padding: 24px 16px; }
        .steps-grid { grid-template-columns: 1fr; }
        .wrap { width: calc(100% - 24px); }
      }
      @media (prefers-reduced-motion: reduce) {
        *, *::before, *::after { scroll-behavior: auto !important; transition-duration: 1ms !important; }
      }
    </style>
  </head>
  <body>
    <div class="page">
      <main>

        ${renderNavbar(appConfig, tr, langSwitcher, waNumber, "delivery")}

        <!-- Hero -->
        <section class="delivery-hero" aria-label="${heroTitle}">
          <div class="delivery-hero__content">
            <div class="delivery-hero__eyebrow">${iconTruck} ${heroTitle}</div>
            <h1 class="delivery-hero__title">${heroSubtitle}</h1>
            <p class="delivery-hero__sub">${isRu ? "Курьер позвонит за 30–60 минут до приезда" : "Courier will call 30–60 min before arrival"}</p>
          </div>
        </section>

        <!-- Courier info -->
        <section class="courier-section wrap" aria-label="${isRu ? "Курьерская доставка" : "Courier Delivery"}">
          <h2 class="section-heading">${isRu ? "Курьерская доставка" : "Courier Delivery"}</h2>
          <p class="section-sub">${isRu ? "СДЭК доставит посылку прямо к вашей двери" : "CDEK will deliver the parcel right to your door"}</p>

          <div class="courier-info-grid">
            <div class="courier-info-card">
              <div class="courier-info-card__icon">${iconTruck}</div>
              <h3 class="courier-info-card__title">${isRu ? "Доставка до двери" : "Door-to-door"}</h3>
              <p class="courier-info-card__text">${isRu ? "Курьер СДЭК привезёт посылку по указанному адресу в удобное время" : "CDEK courier will bring your parcel to the specified address at a convenient time"}</p>
            </div>
            <div class="courier-info-card">
              <div class="courier-info-card__icon">${iconClock}</div>
              <h3 class="courier-info-card__title">${isRu ? "Сроки доставки" : "Delivery time"}</h3>
              <p class="courier-info-card__text">${isRu ? "14–21 рабочих дней в зависимости от региона. Трек-номер придёт на почту после отправки" : "14–21 business days depending on the region. Tracking number will be sent by email after dispatch"}</p>
            </div>
            <div class="courier-info-card">
              <div class="courier-info-card__icon">${iconCheck}</div>
              <h3 class="courier-info-card__title">${isRu ? "Удобное получение" : "Convenient receipt"}</h3>
              <p class="courier-info-card__text">${isRu ? "Курьер позвонит за 30–60 минут до приезда" : "Courier will call 30–60 min before arrival"}</p>
            </div>
          </div>

          <div class="map-hint">
            <div class="cdek-badge">
              <div class="cdek-badge__logo">СДЭК</div>
              <div class="cdek-badge__text">${isRu ? "Укажи точный адрес доставки при оформлении заказа — курьер приедет к тебе." : "Enter your exact delivery address at checkout — the courier will come to you."}</div>
            </div>
          </div>
        </section>

        <!-- Steps -->
        <section class="steps-section wrap" aria-label="${infoTitle}">
          <h2 class="section-heading">${infoTitle}</h2>
          <p class="section-sub">${isRu ? "Просто и прозрачно" : "Simple and transparent"}</p>
          <div class="steps-grid">
            ${steps.map(s => `
            <div class="step-card">
              <div class="step-number">${s.n}</div>
              <div class="step-icon">${s.icon}</div>
              <h3 class="step-title">${s.t}</h3>
              <p class="step-text">${s.s}</p>
            </div>`).join("")}
          </div>
        </section>

        <!-- FAQ -->
        <section class="faq-section wrap" aria-label="${faqTitle}">
          <h2 class="section-heading">${faqTitle}</h2>
          <p class="section-sub">${isRu ? "Отвечаем на частые вопросы" : "Answers to common questions"}</p>
          <div class="faq-list">
            ${faqs.map((f, i) => `
            <div class="faq-item" id="faq-${i}">
              <button class="faq-question" type="button" aria-expanded="false" aria-controls="faq-answer-${i}">
                ${f.q}
                <svg class="faq-arrow" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round">
                  <path d="m6 9 6 6 6-6"/>
                </svg>
              </button>
              <div class="faq-answer" id="faq-answer-${i}" role="region">${f.a}</div>
            </div>`).join("")}
          </div>
        </section>

      </main>
    <footer class="site-footer">
      <span>© ${new Date().getFullYear()} ${appConfig.domain}</span>
      <span class="footer-tagline">stay chill</span>
      <a href="https://lab.furai.space" class="footer-credit" target="_blank" rel="noopener noreferrer">BUILT BY FURAI LAB</a>
    </footer>
    </div>

    <script nonce="${nonce}">
      (function () {
        /* ── Language switcher ── */
        ${languageSwitcherScript}

        /* ── FAQ accordion ── */
        document.querySelectorAll('.faq-question').forEach(btn => {
          btn.addEventListener('click', function () {
            const item   = this.closest('.faq-item');
            const isOpen = item.classList.contains('open');
            document.querySelectorAll('.faq-item').forEach(el => {
              el.classList.remove('open');
              el.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
            });
            if (!isOpen) { item.classList.add('open'); this.setAttribute('aria-expanded', 'true'); }
          });
        });

      })();
      ${navbarScript(navbarUi(tr, waNumber))}
    </script>
  </body>
</html>`;
}
