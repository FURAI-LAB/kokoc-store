// brand-sections.js — Crocs / Adidas catalog sections (list views).
// BRAND_SECTIONS config and the shared edit form live in item-form.js;
// this file only owns the per-brand list + row actions.

export const brandSectionsScript = `
let brandProducts = { adidas: [], crocs: [] };

function showAdidas() { showBrandSection('adidas'); }
function showCrocs()  { showBrandSection('crocs'); }

async function showBrandSection(key) {
  const cfg = BRAND_SECTIONS[key];
  currentRoute = cfg.routeId;
  renderNav(cfg.routeId);
  document.getElementById('page-title').textContent = cfg.title;
  document.getElementById('topbar-actions').innerHTML = \`
    <button class="btn btn-primary" onclick="openNewBrandProduct('\${key}')">+ Новый товар</button>
  \`;
  setContent('<div class="loading">Загрузка...</div>');
  try {
    await loadBrandProducts(key);
  } catch(e) {
    setContent(\`<div class="loading" style="color:var(--danger)">Ошибка загрузки: \${esc(e.message)}</div>\`);
  }
}

function backToBrandSection(key) {
  showBrandSection(key);
}

async function loadBrandProducts(key) {
  const cfg = BRAND_SECTIONS[key];
  try {
    const data = await GET(cfg.apiPath);
    brandProducts[key] = data.products;
    renderBrandTable(key);
  } catch(e) {
    setContent(\`<div class="loading" style="color:var(--danger)">Ошибка загрузки: \${esc(e.message)}</div>\`);
  }
}

function renderAdidasTable() { renderBrandTable('adidas'); }
function renderCrocsTable()  { renderBrandTable('crocs'); }

function renderBrandTable(key) {
  const cfg = BRAND_SECTIONS[key];
  const q = normalizedSearch();
  const list = brandProducts[key] || [];
  const filtered = list.filter(p => matchesSearch([p.title, p.slug, p.brand]));

  if (!filtered.length) {
    setContent(\`
      <div class="pf-card pf-empty">
        <div>
          <div style="font-size:16px;letter-spacing:-0.02em">
            \${q ? 'Ничего не найдено' : cfg.emptyLabel}
          </div>
          <div class="text-muted" style="font-size:12px;margin-top:6px">
            \${q ? 'Попробуйте другой запрос.' : 'Создайте первый товар кнопкой «+ Новый товар».'}
          </div>
        </div>
      </div>
    \`);
    return;
  }

  setContent(\`
    <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>Название</th>
          <th>Slug</th>
          <th>Статус</th>
          <th>Варианты</th>
          <th>Обновлён</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        \${filtered.map(p => \`
          <tr>
            <td><strong>\${esc(p.title)}</strong></td>
            <td class="text-muted">\${esc(p.slug)}</td>
            <td>
              <select class="inline-status-select" data-id="\${p.id}" data-brand="\${key}" onchange="brandQuickStatus(this)"
                style="font-size:0.82rem;padding:3px 6px;border-radius:6px;border:1px solid var(--border);background:var(--surface);color:var(--text);cursor:pointer;">
                <option value="active" \${p.status==='active'?'selected':''}>Active</option>
                <option value="draft"  \${p.status==='draft'?'selected':''}>Draft</option>
                <option value="archived" \${p.status==='archived'?'selected':''}>Archived</option>
              </select>
            </td>
            <td>\${p.variant_count}</td>
            <td class="text-muted">\${formatDate(p.updated_at)}</td>
            <td>
              <div class="flex">
                <button class="btn btn-sm" onclick="openBrandProduct('\${key}','\${p.id}')">Open</button>
                <button class="btn btn-sm btn-danger" onclick="deleteBrandProduct('\${key}','\${p.id}', '\${esc(p.title)}')">✕</button>
              </div>
            </td>
          </tr>
        \`).join('')}
      </tbody>
    </table>
    </div>
  \`);
}

async function brandQuickStatus(sel) {
  const id = sel.dataset.id;
  const key = sel.dataset.brand;
  const status = sel.value;
  try {
    await PATCH('/products/' + id, { status });
    toast('Статус обновлён');
  } catch(e) {
    toast(e.message, 'err');
    await loadBrandProducts(key);
  }
}

async function deleteBrandProduct(key, id, title) {
  if (!confirm(\`Удалить «\${title}»? Все варианты и фото тоже будут удалены.\`)) return;
  try {
    await DEL('/products/' + id);
    toast('Товар удалён');
    await loadBrandProducts(key);
  } catch(e) { toast(e.message, 'err'); }
}
`;
