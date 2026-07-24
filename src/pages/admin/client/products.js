// products.js — main catalog list view (Товары).
// The edit/create form itself lives in item-form.js and is shared with the
// Crocs/Adidas brand sections; this file only owns the list + row actions.

export const productsScript = `
let products = [];

async function showProducts() {
  currentRoute = 'products';
  renderNav('products');
  document.getElementById('page-title').textContent = 'Товары';
  document.getElementById('topbar-actions').innerHTML = \`
    <button class="btn btn-primary" onclick="openNewProduct()">+ Новый товар</button>
  \`;
  setContent('<div class="loading">Загрузка...</div>');
  try {
    await loadProducts();
  } catch(e) {
    setContent(\`<div class="loading" style="color:var(--danger)">Ошибка загрузки: \${esc(e.message)}</div>\`);
  }
}

async function loadProducts() {
  try {
    const data = await GET('/products');
    products = data.products;
    renderProductsTable();
  } catch(e) {
    setContent(\`<div class="loading" style="color:var(--danger)">Ошибка загрузки: \${esc(e.message)}</div>\`);
  }
}

function renderProductsTable() {
  const rows = products.filter(p => matchesSearch([p.title, p.slug, p.sku]));
  if (!rows.length) {
    setContent(\`<div class="empty">\${products.length ? 'Ничего не найдено' : 'No products yet. Create the first one!'}</div>\`);
    return;
  }
  setContent(\`
    <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Slug</th>
          <th>Status</th>
          <th>Variants</th>
          <th>Updated</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        \${rows.map(p => \`
          <tr>
            <td><strong>\${esc(p.title)}</strong></td>
            <td class="text-muted">\${esc(p.slug)}</td>
            <td>
              <select class="inline-status-select" data-id="\${p.id}" onchange="quickUpdateStatus(this)" style="font-size:0.82rem;padding:3px 6px;border-radius:6px;border:1px solid var(--border);background:var(--surface);color:var(--text);cursor:pointer;">
                <option value="active" \${p.status==='active'?'selected':''}>Active</option>
                <option value="draft" \${p.status==='draft'?'selected':''}>Draft</option>
                <option value="archived" \${p.status==='archived'?'selected':''}>Archived</option>
              </select>
            </td>
            <td>\${p.variant_count}</td>
            <td class="text-muted">\${formatDate(p.updated_at)}</td>
            <td>
              <div class="flex">
                <button class="btn btn-sm" onclick="openProductPage('\${p.id}')">Open</button>
                <button class="btn btn-sm btn-danger" onclick="deleteProduct('\${p.id}', '\${esc(p.title)}')">✕</button>
              </div>
            </td>
          </tr>
        \`).join('')}
      </tbody>
    </table>
    </div>
  \`);
}

function backToProducts() {
  showProducts();
}

async function quickUpdateStatus(sel) {
  const id = sel.dataset.id;
  const status = sel.value;
  try {
    await PATCH('/products/' + id, { status });
    toast('Status updated');
  } catch(e) {
    toast(e.message, 'err');
    await loadProducts(); // revert on error
  }
}

async function deleteProduct(id, title) {
  if (!confirm(\`Delete «\${title}»? All variants and images will also be removed.\`)) return;
  try {
    await DEL('/products/' + id);
    toast('Product deleted');
    await loadProducts();
  } catch(e) { toast(e.message, 'err'); }
}
`;
