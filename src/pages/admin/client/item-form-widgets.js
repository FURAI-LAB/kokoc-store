// item-form-widgets.js — photo gallery, colors, tags, and variants
// sub-widgets used inside the item-edit form.
//
// These always operate on the fixed 'pf-' DOM id prefix and the global
// `pf` state object regardless of which section (main catalog or a brand
// section) opened the form — they were already shared, unparameterized,
// in both original copies of the form. Split out from item-form.js purely
// for file size / navigability.
//
// (Three unused variables — drawerProduct/drawerVariants/drawerImages,
// leftover from an earlier drawer-based product editor that predates the
// current full-page form — were dropped rather than carried over.)

export const itemFormWidgetsScript = `
// ── Photo upload (drag/drop, gallery, remove) ──
// Unchanged from the original — always operates on the fixed 'pf-' ids
// and the global \`pf.images\` array regardless of which form is open.

function renderPhotoGallery() {
  if (!pf.images.length) return '';
  return pf.images.map((img, i) => \`
    <div class="photo-thumb \${i===0?'is-primary':''}" onclick="pfSetPrimary(\${i})">
      \${img.url
        ? \`<img src="\${esc(img.url)}" alt="">\`
        : \`<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:9px;color:var(--muted);padding:4px;text-align:center;word-break:break-all">\${esc(img.name||img.r2_key?.split('/').pop()||'фото')}</div>\`
      }
      <div class="thumb-num">\${i+1}</div>
      <button class="thumb-del" onclick="event.stopPropagation();pfRemoveImage(\${i})">✕</button>
    </div>
  \`).join('');
}

function pfSetPrimary(idx) {
  if (idx === 0) return;
  const img = pf.images.splice(idx, 1)[0];
  pf.images.unshift(img);
  pfSyncGallery();
}

async function pfRemoveImage(idx) {
  const img = pf.images[idx];
  if (img && img.id) {
    /* Already saved to server — delete via API */
    if (!confirm('Удалить фото?')) return;
    try {
      await DEL('/images/' + img.id);
      const data = await GET('/products/' + pf.product.id);
      pf.images = normalizeImages(data.images);
      pfSyncGallery();
      toast('Фото удалено');
    } catch(e) { toast(e.message, 'err'); }
  } else {
    /* Local unsaved file — just remove from array */
    pf.images.splice(idx, 1);
    pfSyncGallery();
  }
}

function pfDragOver(e) {
  e.preventDefault();
  document.getElementById('pf-dropzone').classList.add('drag-over');
}
function pfDragLeave(e) {
  document.getElementById('pf-dropzone').classList.remove('drag-over');
}
function pfDrop(e) {
  e.preventDefault();
  document.getElementById('pf-dropzone').classList.remove('drag-over');
  pfHandleFiles(e.dataTransfer.files);
}
function pfFilesSelected(input) {
  pfHandleFiles(input.files);
}

// Максимальная сторона и качество для товарных фото — держим вес файла
// разумным (обычно вписывается в ~150-350 КБ для фото товара 1600px)
// без ресайза/переконвертации на стороне сервера (нет платного Images binding).
const PF_MAX_DIMENSION = 1600;
const PF_JPEG_QUALITY = 0.85;

async function pfResizeImage(file) {
  // GIF не трогаем — canvas сожрёт анимацию, оставляем как есть.
  if (file.type === 'image/gif') return file;

  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch (e) {
    // Формат не декодируется браузером (например, HEIC) — грузим оригинал,
    // сервер всё равно сохранит его как есть.
    return file;
  }

  const { width, height } = bitmap;
  const scale = Math.min(1, PF_MAX_DIMENSION / Math.max(width, height));
  if (scale === 1 && file.size <= 400 * 1024) {
    // Уже компактный и в разумном разрешении — не трогаем.
    bitmap.close?.();
    return file;
  }

  const targetW = Math.round(width * scale);
  const targetH = Math.round(height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0, targetW, targetH);
  bitmap.close?.();

  // PNG с прозрачностью оставляем PNG, всё остальное — в JPEG (меньше вес).
  const keepPng = file.type === 'image/png';
  const outType = keepPng ? 'image/png' : 'image/jpeg';
  const blob = await new Promise(resolve =>
    canvas.toBlob(resolve, outType, keepPng ? undefined : PF_JPEG_QUALITY)
  );
  if (!blob) return file;

  const newName = keepPng ? file.name : file.name.replace(/\\.[^.]+$/, '') + '.jpg';
  return new File([blob], newName, { type: outType });
}

async function pfHandleFiles(fileList) {
  const files = Array.from(fileList);
  for (const original of files) {
    const file = await pfResizeImage(original);
    const url = URL.createObjectURL(file);
    pf.images.push({ _file: file, url, name: file.name });
    pfSyncGallery();
  }
}

function pfSyncGallery() {
  const gallery = document.getElementById('pf-photo-gallery');
  const dropzone = document.getElementById('pf-dropzone');
  const hint = document.getElementById('pf-photo-hint');
  if (gallery) gallery.innerHTML = renderPhotoGallery();
  if (dropzone) dropzone.style.display = pf.images.length ? 'none' : '';
  if (hint) hint.style.display = pf.images.length ? '' : 'none';
}

// ── Colors ──

function renderColorList() {
  return pf.colors.map((c,i) => \`
    <div class="color-row">
      <div class="color-swatch" style="background:\${esc(c.hex)}"></div>
      <span class="color-name">\${esc(c.name)}</span>
      <span class="color-hex">\${esc(c.hex)}</span>
      <button class="color-remove" onclick="pfRemoveColor(\${i})">×</button>
    </div>
  \`).join('');
}

function pfRemoveColor(i) {
  pf.colors.splice(i, 1);
  document.getElementById('pf-color-list').innerHTML = renderColorList();
}

function pfAddColor() {
  const nameEl = document.getElementById('pf-color-name');
  const picker = document.getElementById('pf-color-picker');
  const name = nameEl.value.trim();
  const hex  = picker.value;
  if (!name) { toast('Введите название цвета', 'err'); nameEl.focus(); return; }
  pf.colors.push({ name, hex });
  document.getElementById('pf-color-list').innerHTML = renderColorList();
  nameEl.value = '';
  picker.value = '#ff5555';
  nameEl.focus();
}

// ── Tags chip input ──

function pfTagKeydown(e) {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault();
    const val = e.target.value.trim().replace(/,$/, '');
    if (val && !pf.tags.includes(val)) {
      pf.tags.push(val);
      pfReTags();
    }
    e.target.value = '';
  } else if (e.key === 'Backspace' && !e.target.value && pf.tags.length) {
    pf.tags.pop();
    pfReTags();
  }
}

function pfRemoveTag(i) {
  pf.tags.splice(i, 1);
  pfReTags();
}

function pfReTags() {
  const wrap = document.getElementById('pf-tags-wrap');
  const chips = pf.tags.map((t,i) => \`
    <span class="chip" style="background:var(--accent-dim);border-color:var(--accent);color:var(--text)">
      \${esc(t)}
      <button type="button" onclick="pfRemoveTag(\${i})">×</button>
    </span>
  \`).join('');
  wrap.innerHTML = chips + \`<input class="chip-input" id="pf-tag-input" placeholder="+ Добавить тег" onkeydown="pfTagKeydown(event)">\`;
  document.getElementById('pf-tag-input').focus();
  pfSyncKidsSizeHint();
}

// ── Kids size guide hint ──
// When a product carries the "kids" tag, variants use children's sizing
// (Crocs C/J scale) rather than adult sizing — shown as a reference table
// next to the variants list so admins pick the right size_label values.
// Purely a UI aid: size_label stays free-text, no schema change needed.

const KIDS_SIZE_GUIDE = [
  ['C11', '28–29', '17'],
  ['C12', '29–30', '18'],
  ['C13', '30–31', '19'],
  ['J1',  '32–33', '19,5'],
  ['J2',  '33–34', '20'],
  ['J3',  '34–35', '21'],
];

function isKidsProduct() {
  return pf.tags.includes('kids');
}

function renderKidsSizeHint() {
  if (!isKidsProduct()) return '';
  const rows = KIDS_SIZE_GUIDE.map(([us, eu, cm]) =>
    \`<tr><td>\${us}</td><td>\${eu}</td><td>\${cm} см</td></tr>\`
  ).join('');
  return \`
    <div class="kids-size-hint" style="margin-bottom:14px;padding:12px;border:1px solid var(--border);border-radius:8px;background:var(--accent-dim)">
      <div style="font-size:12px;font-weight:600;margin-bottom:8px">👶 Детский товар — используйте детскую размерную сетку (US C/J)</div>
      <table class="variants-table" style="margin-top:0">
        <thead><tr><th>US</th><th>EU</th><th>CM</th></tr></thead>
        <tbody>\${rows}</tbody>
      </table>
      <div style="font-size:11px;color:var(--muted);margin-top:8px">
        Указывайте размер варианта в формате US (например, «C12» или «J2») — как на детской размерной сетке сайта.
      </div>
    </div>\`;
}

function pfSyncKidsSizeHint() {
  const el = document.getElementById('pf-kids-size-hint');
  if (el) el.innerHTML = renderKidsSizeHint();
}

// ── Variants table + modal ──
// Unchanged — always keyed off pf.product.id / pf.variants, which are set
// by openItemForm regardless of which section (product or brand) is open.

function renderVariantsTable() {
  if (!pf.variants.length) {
    return '<div class="empty" style="padding:16px 0">Вариантов нет. Добавьте первый!</div>';
  }
  return \`<table class="variants-table">
    <thead><tr>
      <th>Название / SKU</th>
      <th>Размер</th>
      <th>Цвет</th>
      <th>Цена</th>
      <th>Остаток</th>
      <th>Статус</th>
      <th></th>
    </tr></thead>
    <tbody>
    \${pf.variants.map(v => \`
      <tr>
        <td>
          <div style="font-weight:500">\${esc(v.title)}</div>
          <div style="font-size:10px;color:var(--muted)">\${esc(v.sku)}</div>
        </td>
        <td>\${esc(v.size_label||'—')}</td>
        <td>\${esc(v.color_label||'—')}</td>
        <td class="price">\${rub(v.price_minor)}</td>
        <td class="\${v.inventory_quantity > 0 ? 'text-success' : 'text-danger'}">\${v.inventory_quantity} шт</td>
        <td>\${badge(v.is_active ? 'active' : 'archived')}</td>
        <td>
          <div class="flex">
            <button class="btn btn-sm" onclick="openEditVariant('\${v.id}')">✎</button>
            <button class="btn btn-sm btn-danger" onclick="deleteVariant('\${v.id}')">✕</button>
          </div>
        </td>
      </tr>
    \`).join('')}
    </tbody>
  </table>\`;
}

function openNewVariant() {
  variantModal(null);
}

function openEditVariant(vid) {
  const v = pf.variants.find(x => x.id === vid);
  variantModal(v);
}

function variantModal(v) {
  showModal(v ? 'Изменить вариант' : 'Новый вариант', \`
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Название *</label>
        <input id="v-title" value="\${esc(v?.title || '')}">
      </div>
      <div class="form-group">
        <label class="form-label">SKU *</label>
        <input id="v-sku" value="\${esc(v?.sku || '')}" \${v ? 'readonly style="opacity:0.5"' : ''}>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Размер</label>
        <input id="v-size" placeholder="\${isKidsProduct() ? 'C12 / J2' : 'M / 42 / S-M'}" value="\${esc(v?.size_label || '')}">
      </div>
      <div class="form-group">
        <label class="form-label">Цвет</label>
        <input id="v-color" placeholder="Чёрный" value="\${esc(v?.color_label || '')}">
      </div>
    </div>
    \${renderKidsSizeHint()}
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Цена (₽) *</label>
        <input id="v-price" type="number" placeholder="2990" value="\${v ? v.price_minor/100 : ''}">
      </div>
      <div class="form-group">
        <label class="form-label">Старая цена (₽)</label>
        <input id="v-compare" type="number" placeholder="3990" value="\${v?.compare_at_minor ? v.compare_at_minor/100 : ''}">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Остаток (шт)</label>
        <input id="v-stock" type="number" value="\${v?.inventory_quantity ?? 0}">
      </div>
      <div class="form-group">
        <label class="form-label">Активен</label>
        <select id="v-active">
          <option value="1" \${v?.is_active !== 0 ? 'selected' : ''}>Да</option>
          <option value="0" \${v?.is_active === 0 ? 'selected' : ''}>Нет</option>
        </select>
      </div>
    </div>
  \`, async () => {
    const price = parseFloat(document.getElementById('v-price').value);
    const compare = parseFloat(document.getElementById('v-compare').value);
    if (!document.getElementById('v-title').value.trim() || isNaN(price)) {
      toast('Заполните название и цену', 'err'); return;
    }
    try {
      const payload = {
        title: document.getElementById('v-title').value.trim(),
        size_label: document.getElementById('v-size').value.trim() || null,
        color_label: document.getElementById('v-color').value.trim() || null,
        price_minor: Math.round(price * 100),
        compare_at_minor: isNaN(compare) ? null : Math.round(compare * 100),
        inventory_quantity: parseInt(document.getElementById('v-stock').value, 10) || 0,
        is_active: parseInt(document.getElementById('v-active').value, 10),
      };
      if (v) {
        await PATCH('/variants/' + v.id, payload);
        toast('Вариант обновлён');
      } else {
        payload.sku = document.getElementById('v-sku').value.trim();
        await POST('/products/' + pf.product.id + '/variants', payload);
        toast('Вариант добавлен');
      }
      closeModal();
      const data = await GET('/products/' + pf.product.id);
      pf.variants = data.variants;
      const el = document.getElementById('pf-variants-list');
      if (el) el.innerHTML = renderVariantsTable();
    } catch(e) { toast(e.message, 'err'); }
  });
}

async function deleteVariant(vid) {
  if (!confirm('Удалить вариант?')) return;
  try {
    await DEL('/variants/' + vid);
    toast('Вариант удалён');
    const data = await GET('/products/' + pf.product.id);
    pf.variants = data.variants;
    const el = document.getElementById('pf-variants-list');
    if (el) el.innerHTML = renderVariantsTable();
  } catch(e) { toast(e.message, 'err'); }
}
`;
