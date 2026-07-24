// catalog-settings.js — simple reference lists: categories, brands,
// discounts/promo codes. Categories and brands share the same generic
// list CRUD (renderCatalogList/catalogAddItem/catalogEditItem/
// catalogDeleteItem); discounts get their own richer editor because each
// entry is a small object, not a plain string.

export const catalogSettingsScript = `
let catalogData = { categories: [], brands: [], discounts: [] };

async function showCategories() {
  currentRoute = 'categories';
  renderNav('categories');
  setTopbar('Категории', \`<button class="btn btn-primary" onclick="catalogAddItem('categories','Новая категория')">+ Добавить</button>\`);
  setContent('<div class="loading">Загрузка...</div>');
  try {
    const d = await GET('/categories');
    catalogData.categories = d.categories || [];
    renderCatalogList('categories');
  } catch(e) { toast(e.message,'err'); }
}

async function showBrands() {
  currentRoute = 'brands';
  renderNav('brands');
  setTopbar('Бренды', \`<button class="btn btn-primary" onclick="catalogAddItem('brands','Новый бренд')">+ Добавить</button>\`);
  setContent('<div class="loading">Загрузка...</div>');
  try {
    const d = await GET('/brands');
    catalogData.brands = d.brands || [];
    renderCatalogList('brands');
  } catch(e) { toast(e.message,'err'); }
}

async function showDiscounts() {
  currentRoute = 'discounts';
  renderNav('discounts');
  setTopbar('Скидки', \`<button class="btn btn-primary" onclick="discountAdd()">+ Добавить</button>\`);
  setContent('<div class="loading">Загрузка...</div>');
  try {
    const d = await GET('/discounts');
    catalogData.discounts = d.discounts || [];
    renderDiscountsList();
  } catch(e) { toast(e.message,'err'); }
}

function renderCatalogList(key) {
  const titles = { categories: 'Категории', brands: 'Бренды' };
  const items = catalogData[key] || [];
  setContent(\`
    <div class="pf-card">
      <div class="pf-card-title">\${titles[key]}</div>
      \${items.length === 0 ? '<div class="text-muted" style="font-size:13px">Нет элементов. Добавьте первый.</div>' : ''}
      <div id="catalog-list" style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px">
        \${items.map((item, i) => \`
          <div style="display:flex;align-items:center;gap:12px;padding:10px 14px;background:var(--surface2);border:1px solid var(--border);">
            <span style="flex:1;font-size:13px">\${esc(item)}</span>
            <button class="btn btn-sm" onclick="catalogEditItem('\${key}',\${i})">✎</button>
            <button class="btn btn-sm" style="color:var(--danger)" onclick="catalogDeleteItem('\${key}',\${i})">×</button>
          </div>
        \`).join('')}
      </div>
    </div>
  \`);
}

function catalogAddItem(key, placeholder) {
  showModal(\`Добавить\`, \`
    <div class="pf-group">
      <label class="pf-label">Название</label>
      <input id="catalog-item-input" placeholder="\${esc(placeholder)}" style="width:100%">
    </div>
  \`, async () => {
    const val = document.getElementById('catalog-item-input')?.value.trim();
    if (!val) { toast('Введите название','err'); return; }
    catalogData[key].push(val);
    await catalogSave(key);
    if (key === 'categories') renderCatalogList('categories');
    else renderCatalogList('brands');
    closeModal();
  });
  setTimeout(() => document.getElementById('catalog-item-input')?.focus(), 50);
}

function catalogEditItem(key, i) {
  const old = catalogData[key][i];
  showModal('Редактировать', \`
    <div class="pf-group">
      <label class="pf-label">Название</label>
      <input id="catalog-item-input" value="\${esc(old)}" style="width:100%">
    </div>
  \`, async () => {
    const val = document.getElementById('catalog-item-input')?.value.trim();
    if (!val) { toast('Введите название','err'); return; }
    catalogData[key][i] = val;
    await catalogSave(key);
    if (key === 'categories') renderCatalogList('categories');
    else renderCatalogList('brands');
    closeModal();
  });
  setTimeout(() => document.getElementById('catalog-item-input')?.focus(), 50);
}

async function catalogDeleteItem(key, i) {
  if (!confirm('Удалить?')) return;
  catalogData[key].splice(i, 1);
  await catalogSave(key);
  if (key === 'categories') renderCatalogList('categories');
  else renderCatalogList('brands');
}

async function catalogSave(key) {
  try {
    await fetch('/admin/api/' + key, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: catalogData[key] })
    });
    toast('Сохранено');
  } catch(e) { toast(e.message,'err'); }
}

// ── Discounts / promo codes ──

function renderDiscountsList() {
  const items = catalogData.discounts || [];
  setContent(\`
    <div class="pf-card">
      <div class="pf-card-title">Скидки и промокоды</div>
      \${items.length === 0 ? '<div class="text-muted" style="font-size:13px">Нет скидок. Добавьте первую.</div>' : ''}
      <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px">
        \${items.map((d, i) => \`
          <div style="display:flex;align-items:center;gap:12px;padding:10px 14px;background:var(--surface2);border:1px solid var(--border);">
            <div style="flex:1">
              <div style="font-size:13px;font-weight:600;letter-spacing:0.05em">\${esc(d.code)}</div>
              <div style="font-size:11px;color:var(--muted);margin-top:2px">
                \${d.type === 'percent' ? d.value + '%' : d.value + ' ₽'} скидка
                \${d.min_order ? '· от ' + d.min_order + ' ₽' : ''}
                \${d.expires ? '· до ' + d.expires : ''}
              </div>
            </div>
            <span class="badge \${d.active ? 'badge-ok' : 'badge-neutral'}">\${d.active ? 'Активна' : 'Отключена'}</span>
            <button class="btn btn-sm" onclick="discountEdit(\${i})">✎</button>
            <button class="btn btn-sm" style="color:var(--danger)" onclick="discountDelete(\${i})">×</button>
          </div>
        \`).join('')}
      </div>
    </div>
  \`);
}

function discountAdd() { discountEdit(null); }

function discountEdit(idx) {
  const d = idx !== null ? catalogData.discounts[idx] : { code:'', type:'percent', value:'', min_order:'', expires:'', active:true };
  showModal(idx !== null ? 'Редактировать скидку' : 'Новая скидка', \`
    <div class="pf-group">
      <label class="pf-label">Промокод</label>
      <input id="d-code" value="\${esc(d.code)}" placeholder="SUMMER20" style="width:100%;text-transform:uppercase">
    </div>
    <div class="pf-row" style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="pf-group">
        <label class="pf-label">Тип</label>
        <select id="d-type">
          <option value="percent" \${d.type==='percent'?'selected':''}>% от суммы</option>
          <option value="fixed" \${d.type==='fixed'?'selected':''}>Фиксированная ₽</option>
        </select>
      </div>
      <div class="pf-group">
        <label class="pf-label">Размер скидки</label>
        <input id="d-value" type="number" value="\${esc(String(d.value))}" placeholder="20" style="width:100%">
      </div>
    </div>
    <div class="pf-row" style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="pf-group">
        <label class="pf-label">Мин. сумма заказа (₽)</label>
        <input id="d-min" type="number" value="\${esc(String(d.min_order||''))}" placeholder="0" style="width:100%">
      </div>
      <div class="pf-group">
        <label class="pf-label">Действует до</label>
        <input id="d-expires" type="date" value="\${esc(d.expires||'')}" style="width:100%">
      </div>
    </div>
    <div class="pf-group">
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
        <input type="checkbox" id="d-active" \${d.active?'checked':''}>
        <span style="font-size:13px">Скидка активна</span>
      </label>
    </div>
  \`, async () => {
    const code = document.getElementById('d-code')?.value.trim().toUpperCase();
    if (!code) { toast('Введите промокод','err'); return; }
    const val = parseFloat(document.getElementById('d-value')?.value);
    if (!val) { toast('Введите размер скидки','err'); return; }
    const rec = {
      code,
      type: document.getElementById('d-type')?.value,
      value: val,
      min_order: parseFloat(document.getElementById('d-min')?.value)||0,
      expires: document.getElementById('d-expires')?.value || '',
      active: document.getElementById('d-active')?.checked ?? true,
    };
    if (idx !== null) catalogData.discounts[idx] = rec;
    else catalogData.discounts.push(rec);
    await catalogSave('discounts');
    renderDiscountsList();
    closeModal();
  });
  setTimeout(() => document.getElementById('d-code')?.focus(), 50);
}

async function discountDelete(i) {
  if (!confirm('Удалить скидку?')) return;
  catalogData.discounts.splice(i, 1);
  await catalogSave('discounts');
  renderDiscountsList();
}
`;
