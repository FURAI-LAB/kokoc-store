// core.js — router, API client, toast, formatters, modal/drawer, search.
//
// This file (like every module under client/) exports a plain JS *source
// string*, not an ES module in the usual sense: the admin SPA ships as one
// big inline <script> with no bundler (see client/index.js), so all these
// strings are concatenated server-side into a single flat scope, exactly
// the way html.js already ships CLIENT_ESC_HTML_SRC to individual pages.
// Treat everything below as if it runs in one shared global scope.

export const coreScript = `
// ─── State & Router ───────────────────────────────────────────────────────────

const routes = [
  { id: 'dashboard',   icon: '◈', label: 'Дашборд',    hash: '#/' },
  { id: 'products',    icon: '▦', label: 'Товары',      hash: '#/products' },
  { id: 'orders',      icon: '◎', label: 'Заказы',      hash: '#/orders' },
  { id: 'reviews',     icon: '★', label: 'Отзывы',      hash: '#/reviews' },
  { id: 'clients',     icon: '◑', label: 'Клиенты',     hash: '#/clients' },
  { id: 'subscribers', icon: '◉', label: 'Подписчики',  hash: '#/subscribers' },
  { id: 'collabs',     icon: '✦', label: 'Collabs',     hash: '#/collabs' },
  { id: 'categories',  icon: '▤', label: 'Категории',   hash: '#/categories' },
  { id: 'brands',      icon: '◐', label: 'Бренды',      hash: '#/brands' },
  { id: 'discounts',   icon: '◷', label: 'Скидки',      hash: '#/discounts' },
  { id: 'settings',    icon: '✿', label: 'Настройки',   hash: '#/settings' },
  { id: 'adidas',      icon: '◆', label: 'Adidas',       hash: '#/adidas' },
  { id: 'crocs',       icon: '◇', label: 'Crocs',        hash: '#/crocs' },
];

let currentRoute = 'dashboard';

// ─── Sidebar nav ──────────────────────────────────────────────────────────────

function renderNav(active) {
  document.getElementById('nav').innerHTML = routes.map(r =>
    \`<div class="nav-item \${r.id === active ? 'active' : ''}" onclick="navigate('\${r.hash}')">\` +
    \`<span class="icon">\${r.icon}</span>\` +
    r.label +
    '</div>'
  ).join('');
}
function setTopbar(title, actionsHtml) {
  var t = document.getElementById('page-title');
  var a = document.getElementById('topbar-actions');
  if (t) t.textContent = title;
  if (a) a.innerHTML = actionsHtml || '';
}

function navigate(hash) {
  if (window.location.hash === hash) { onHashChange(); return; }
  window.location.hash = hash;
}

async function logout() {
  await fetch('/admin/logout');
  window.location.href = '/admin/login';
}

function onHashChange() {
  var hash = window.location.hash || '#/';
  if      (hash.startsWith('#/products'))    showProducts();
  else if (hash.startsWith('#/orders'))      showOrders();
  else if (hash.startsWith('#/reviews'))     showReviews();
  else if (hash.startsWith('#/subscribers')) showSubscribers();
  else if (hash.startsWith('#/clients'))     showClients();
  else if (hash.startsWith('#/categories'))  showCategories();
  else if (hash.startsWith('#/brands'))      showBrands();
  else if (hash.startsWith('#/discounts'))   showDiscounts();
  else if (hash.startsWith('#/collabs'))     showCollabs();
  else if (hash.startsWith('#/settings'))    showSettings();
  else if (hash.startsWith('#/adidas'))      showAdidas();
  else if (hash.startsWith('#/crocs'))       showCrocs();
  else                                       showDashboard();
}


// ─── API helpers ──────────────────────────────────────────────────────────────

async function api(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch('/admin/api' + path, opts);
  const data = await r.json();
  if (!data.ok) throw new Error(data.error || 'Ошибка');
  return data;
}

const GET  = p      => api('GET', p);
const POST = (p, b) => api('POST', p, b);
const PATCH= (p, b) => api('PATCH', p, b);
const DEL  = p      => api('DELETE', p);

// ─── Toast ────────────────────────────────────────────────────────────────────

let toastTimer;
function toast(msg, type = 'ok') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast show ' + type;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
}

// ─── Utils ────────────────────────────────────────────────────────────────────

function rub(minor) {
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', minimumFractionDigits: 0 })
    .format(minor / 100);
}

function formatDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function badge(status) {
  const map = {
    active: ['active', 'Активен'],
    draft: ['draft', 'Черновик'],
    archived: ['archived', 'Архив'],
    paid: ['paid', 'Оплачен'],
    awaiting_payment: ['pending', 'Ожидание'],
    pending: ['pending', 'Новый'],
    confirmed: ['active', 'Подтверждён'],
    fulfilled: ['fulfilled', 'Выполнен'],
    shipped: ['shipped', 'Отправлен'],
    delivered: ['active', 'Доставлен'],
    cancelled: ['cancelled', 'Отменён'],
  };
  const [cls, label] = map[status] || ['draft', status];
  return \`<span class="badge badge-\${cls}">\${label}</span>\`;
}

// esc()/clientEscHtml is injected separately by client/index.js via
// html.js's CLIENT_ESC_HTML_SRC — the single source of truth for escaping,
// shared with every other page (see src/lib/html.js).

// ─── Coming Soon Sections ─────────────────────────────────────────────────────

function showComingSoon(key, title) {
  currentRoute = key;
  renderNav(key);
  setTopbar(title);
  setContent(\`
    <div class="pf-card pf-empty">
      <div>
        <div class="pf-label" style="margin-bottom:10px">Coming soon</div>
        <div style="font-size:16px;letter-spacing:-0.02em">\${esc(title)}</div>
        <div class="text-muted" style="font-size:12px;margin-top:6px">Раздел скоро появится в админке.</div>
      </div>
    </div>
  \`);
}

// ─── Modal ──────────────────────────────────────────────────────────────────

let modalSaveCallback = null;

function showModal(title, bodyHtml, onSave) {
  modalSaveCallback = onSave;
  document.body.insertAdjacentHTML('beforeend', \`
    <div class="modal-overlay" id="modal-overlay" onclick="onOverlayClick(event)">
      <div class="modal">
        <div class="modal-header">
          <div class="modal-title">\${esc(title)}</div>
          <button class="modal-close" onclick="closeModal()">×</button>
        </div>
        <div class="modal-body">\${bodyHtml}</div>
        <div class="modal-footer">
          <button class="btn" onclick="closeModal()">Отмена</button>
          <button class="btn btn-primary" onclick="saveModal()">Сохранить</button>
        </div>
      </div>
    </div>
  \`);
}

function onOverlayClick(e) {
  if (e.target.id === 'modal-overlay') closeModal();
}

function closeModal() {
  const el = document.getElementById('modal-overlay');
  if (el) el.remove();
  modalSaveCallback = null;
}

async function saveModal() {
  if (modalSaveCallback) await modalSaveCallback();
}

// ─── Drawer ─────────────────────────────────────────────────────────────────

let drawerEl = null;

function showDrawer(html) {
  closeDrawer();
  document.body.insertAdjacentHTML('beforeend', \`
    <div class="drawer-overlay" id="drawer-overlay" onclick="closeDrawer()"></div>
    <div class="drawer" id="drawer">\${html}</div>
  \`);
}

function setDrawerContent(html) {
  const el = document.getElementById('drawer');
  if (el) el.innerHTML = html;
  else showDrawer(html);
}

function closeDrawer() {
  document.getElementById('drawer-overlay')?.remove();
  document.getElementById('drawer')?.remove();
}

// ─── Content helper ───────────────────────────────────────────────────────────

function setContent(html) {
  document.getElementById('content').innerHTML = html;
}

// ─── Search (topbar filter, shared across list views) ─────────────────────────

let currentSearchFilter = '';

function normalizedSearch() {
  const q = currentSearchFilter.trim().toLowerCase();
  return q.length >= 2 ? q : '';
}

function matchesSearch(values) {
  const q = normalizedSearch();
  if (!q) return true;
  return values.some(v => String(v || '').toLowerCase().includes(q));
}

function resetSearch() {
  currentSearchFilter = '';
  const input = document.getElementById('topbar-search-input');
  if (input) input.value = '';
}

function onSearchInput(value) {
  currentSearchFilter = value;
  if (currentRoute === 'products') renderProductsTable();
  if (currentRoute === 'adidas') renderAdidasTable();
  if (currentRoute === 'crocs') renderCrocsTable();
  if (currentRoute === 'orders') renderOrdersTable();
  if (currentRoute === 'subscribers') renderSubscribersTable();
}
`;
