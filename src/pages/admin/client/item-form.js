// item-form.js — the shared product/brand-item edit form: config, open/save
// wrappers, and the renderItemForm() markup itself.
//
// Replaces the former renderProductForm()/renderBrandForm(key) pair plus
// their open/save wrappers (openProductPage / openBrandProduct,
// saveProductFull / saveBrandProduct) and the duplicated pfXxx()/bpfXxx(key)
// slug+status helpers — together ~530 lines of ~90%-identical code across
// two copies. Now there is one renderItemForm(cfg, product), driven by a
// small config object per section (PRODUCT_FORM_CONFIG for the main
// catalog, BRAND_SECTIONS[key] for Crocs/Adidas).
//
// Thin named wrappers (openNewProduct, openProductPage, saveProductFull,
// openNewBrandProduct(key), openBrandProduct(key,id), saveBrandProduct(key))
// are kept at the bottom so existing onclick="..." strings elsewhere in the
// SPA (product/brand list tables, nav) don't need to change.
//
// The right-column widgets (photo gallery, colors, tags) and the variants
// table/modal — already shared between the two original forms, always via
// a hardcoded 'pf-' id prefix — live in item-form-widgets.js.

export const itemFormScript = `
// ─── Form configs ─────────────────────────────────────────────────────────────
// backAction/saveAction are literal onclick-attribute strings (not just
// function names) so the brand-section variants can pass their \`key\`
// through, e.g. "backToBrandSection('crocs')" vs "backToProducts()".

const PRODUCT_FORM_CONFIG = {
  key: 'product',
  formPrefix: 'pf',
  title: 'Товары',
  newLabel: 'Новый товар',
  titlePlaceholder: 'Classic Clog',
  slugPlaceholder: 'classic-clog',
  skuPlaceholder: 'CC-BLK-39',
  descPlaceholder: 'Удобные и стильные сабо для повседневной носки...',
  tagsHint: 'Для коллаба — collab-<slug> (см. страницу Коллабы)',
  brandValue: null,
  showBrandSelect: true,
  showCategorySelect: true,
  showGenderType: false,
  backAction: 'backToProducts()',
  saveAction: 'saveProductFull()',
};

const BRAND_SECTIONS = {
  adidas: {
    key: 'adidas',
    routeId: 'adidas',
    brandValue: 'Adidas Originals',
    title: 'Adidas Originals',
    apiPath: '/adidas',
    formPrefix: 'apf',
    titlePlaceholder: 'Adidas Samba OG',
    slugPlaceholder: 'adidas-samba-og',
    skuPlaceholder: 'SKU-001',
    descPlaceholder: 'Классические кроссовки Adidas Originals...',
    newLabel: 'Новый товар Adidas',
    emptyLabel: 'Товаров Adidas ещё нет',
    tagsHint: 'Теги: sneakers, apparel, accessories, limited, sale. Для коллаба — collab-<slug> (см. страницу Коллабы)',
    showBrandSelect: false,
    showCategorySelect: false,
    showGenderType: true,
    backAction: "backToBrandSection('adidas')",
    saveAction: "saveBrandProduct('adidas')",
  },
  crocs: {
    key: 'crocs',
    routeId: 'crocs',
    brandValue: 'Crocs',
    title: 'Crocs',
    apiPath: '/crocs',
    formPrefix: 'cpf',
    titlePlaceholder: 'Crocs Classic Clog',
    slugPlaceholder: 'crocs-classic-clog',
    skuPlaceholder: 'SKU-001',
    descPlaceholder: 'Удобные кроксы из мягкого материала Croslite...',
    newLabel: 'Новый товар Crocs',
    emptyLabel: 'Товаров Crocs ещё нет',
    tagsHint: 'Теги: crocs, jibbitz, limited, sale, kids, unisex. Для коллаба — collab-<slug> (см. страницу Коллабы)',
    showBrandSelect: false,
    showCategorySelect: false,
    showGenderType: false,
    backAction: "backToBrandSection('crocs')",
    saveAction: "saveBrandProduct('crocs')",
  },
};

// ─── Open / new / save ──────────────────────────────────────────────────────

let pfCatalog = { brands: ['Crocs', 'Adidas Originals'], categories: [], discounts: [] };
let pf = { product: null, variants: [], images: [], colors: [], tags: [] };

async function loadPfCatalog() {
  try {
    const [b, c] = await Promise.all([GET('/brands'), GET('/categories')]);
    pfCatalog.brands = b.brands || ['Crocs', 'Adidas Originals'];
    pfCatalog.categories = c.categories || [];
  } catch(e) { /* fallback */ }
}

function normalizeImages(imgs) {
  return (imgs || []).map(img => ({
    ...img,
    url: img.url || (img.r2_key ? '/r2/' + img.r2_key : null),
  }));
}

async function openNewItemForm(cfg) {
  await loadPfCatalog();
  pf = { product: null, variants: [], images: [], colors: [], tags: [] };
  renderItemForm(cfg, null);
}

async function openItemForm(cfg, id, onError) {
  setContent('<div class="loading">Загрузка...</div>');
  try {
    const [data] = await Promise.all([GET('/products/' + id), loadPfCatalog()]);
    const p = data.product;
    pf = {
      product: p,
      variants: data.variants || [],
      images: normalizeImages(data.images),
      colors: p.colors ? (Array.isArray(p.colors) ? p.colors : JSON.parse(p.colors)) : [],
      tags: p.tags ? (Array.isArray(p.tags) ? p.tags : (p.tags.startsWith("[") ? JSON.parse(p.tags) : p.tags.split(",").map(t => t.trim()).filter(Boolean))) : [],
    };
    renderItemForm(cfg, p);
  } catch(e) {
    toast(e.message, 'err');
    await onError();
  }
}

async function saveItemForm(cfg, onNew, onSaved) {
  const fp = cfg.formPrefix;
  const title = document.getElementById(fp + '-title')?.value.trim();
  const slug  = document.getElementById(fp + '-slug')?.value.trim();
  if (!title || !slug) { toast('Заполните название и slug', 'err'); return; }

  const payload = {
    title, slug,
    status:      document.getElementById(fp + '-status')?.value,
    brand:       cfg.brandValue || document.getElementById(fp + '-brand')?.value,
    category:    cfg.showCategorySelect ? document.getElementById(fp + '-category')?.value : undefined,
    sku:         document.getElementById(fp + '-sku')?.value.trim() || null,
    description: document.getElementById(fp + '-desc')?.innerHTML.trim() || null,
    visibility:  document.getElementById(fp + '-visibility')?.value,
    badge:       document.getElementById(fp + '-badge')?.value || null,
    colors:      JSON.stringify(pf.colors),
    tags:        pf.tags.join(','),
    gender:       cfg.showGenderType ? (document.getElementById(fp + '-gender')?.value || null) : undefined,
    apparel_type: cfg.showGenderType ? (document.getElementById(fp + '-apparel-type')?.value || null) : undefined,
  };

  try {
    const isNew = !pf.product;
    let productId;
    if (pf.product) {
      await PATCH('/products/' + pf.product.id, payload);
      productId = pf.product.id;
      toast('Товар сохранён');
    } else {
      const res = await POST('/products', payload);
      productId = res.id;
      toast('Товар создан — добавьте варианты с размерами и ценой');
    }

    const newImages = pf.images.filter(img => img._file);
    for (let i = 0; i < newImages.length; i++) {
      const fd = new FormData();
      fd.append('file', newImages[i]._file);
      fd.append('position', String(i));
      await fetch('/admin/api/products/' + productId + '/images', { method: 'POST', body: fd });
    }

    if (isNew) {
      // Сразу открываем форму редактирования — чтобы добавить варианты
      await onNew(productId);
    } else {
      await onSaved();
    }
  } catch(e) { toast(e.message, 'err'); }
}

// ── Named wrappers used by onclick="..." elsewhere in the SPA ──

async function openNewProduct() { await openNewItemForm(PRODUCT_FORM_CONFIG); }
async function openProductPage(id) { await openItemForm(PRODUCT_FORM_CONFIG, id, loadProducts); }
async function saveProductFull() {
  await saveItemForm(PRODUCT_FORM_CONFIG, id => openProductPage(id), () => loadProducts());
}

async function openNewBrandProduct(key) { await openNewItemForm(BRAND_SECTIONS[key]); }
async function openBrandProduct(key, id) { await openItemForm(BRAND_SECTIONS[key], id, () => loadBrandProducts(key)); }
async function saveBrandProduct(key) {
  await saveItemForm(BRAND_SECTIONS[key], id => openBrandProduct(key, id), () => loadBrandProducts(key));
}

// ─── Render ───────────────────────────────────────────────────────────────────

function renderItemForm(cfg, p) {
  const fp = cfg.formPrefix;
  const isNew = !p;

  document.getElementById('page-title').innerHTML =
    \`<span style="cursor:pointer;opacity:0.5" onclick="\${cfg.backAction}">← \${cfg.title}</span>\`;
  document.getElementById('topbar-actions').innerHTML = \`
    <button class="btn" onclick="\${cfg.backAction}">Отмена</button>
    <button class="btn btn-primary" onclick="\${cfg.saveAction}" style="gap:8px">
      <span>✓</span> Сохранить товар
    </button>
  \`;

  const brandFieldHtml = cfg.showBrandSelect
    ? \`
            <div class="pf-group">
              <label class="pf-label">Бренд</label>
              <select id="\${fp}-brand">
                \${(p?.brand && !(pfCatalog.brands||[]).includes(p.brand))
                  ? \`<option value="\${esc(p.brand)}" selected>\${esc(p.brand)} (не в списке брендов)</option>\`
                  : ''}
                \${(pfCatalog.brands||['Crocs', 'Adidas Originals']).map(b =>
                  \`<option value="\${esc(b)}" \${p?.brand===b?'selected':''}>\${esc(b)}</option>\`
                ).join('')}
              </select>
            </div>\`
    : '';

  const categoryFieldHtml = cfg.showCategorySelect
    ? \`
            <div class="pf-group">
              <label class="pf-label">Категория</label>
              <select id="\${fp}-category">
                <option value="">— не выбрано —</option>
                \${(pfCatalog.categories||[]).map(c =>
                  \`<option value="\${esc(c)}" \${p?.category===c?'selected':''}>\${esc(c)}</option>\`
                ).join('')}
              </select>
            </div>\`
    : '';

  const skuFieldHtml = \`
            <div class="pf-group">
              <label class="pf-label">Артикул (SKU)</label>
              <input id="\${fp}-sku" value="\${esc(p?.sku || '')}" placeholder="\${esc(cfg.skuPlaceholder)}">
              \${cfg.showCategorySelect ? '<div class="slug-preview">Уникальный артикул для учёта товара</div>' : ''}
            </div>\`;

  const statusFieldHtml = \`
            <div class="pf-group">
              <label class="pf-label">Статус</label>
              <div class="status-select-wrap">
                <div class="status-dot \${p?.status === 'draft' ? 'draft' : p?.status === 'archived' ? 'archived' : ''}" id="\${fp}-status-dot"></div>
                <select id="\${fp}-status" class="has-dot" onchange="ifUpdateStatusDot('\${fp}')">
                  <option value="active"   \${(!p || p.status==='active')  ?'selected':''}>Активен</option>
                  <option value="draft"    \${p?.status==='draft'          ?'selected':''}>Черновик</option>
                  <option value="archived" \${p?.status==='archived'       ?'selected':''}>Архив</option>
                </select>
              </div>
            </div>\`;

  // Main catalog (brand+category pickers shown) keeps the original three-row
  // layout: [status | brand], [category | sku]. Brand sections (pickers
  // hidden) fold sku into the first row instead: [status | sku].
  const row2Html = cfg.showBrandSelect
    ? \`
          <div class="pf-row">
            \${statusFieldHtml}
            \${brandFieldHtml}
          </div>
          <div class="pf-row">
            \${categoryFieldHtml}
            \${skuFieldHtml}
          </div>\`
    : \`
          <div class="pf-row">
            \${statusFieldHtml}
            \${skuFieldHtml}
          </div>\`;

  const visibilityNoteHtml = cfg.brandValue
    ? \`Бренд зафиксирован: <b>\${esc(cfg.brandValue)}</b>. Метка <b>Hit</b> выводит товар первым на лендинге.\`
    : \`Цена, старая цена и остаток задаются в Вариантах. Метка <b>Hit</b> выводит товар первым на лендинге.\`;

  const tagsHintHtml = cfg.tagsHint
    ? \`<div style="font-size:11px;color:var(--muted);margin-top:8px">\${esc(cfg.tagsHint)}</div>\`
    : '';

  const genderTypeFieldsHtml = cfg.showGenderType
    ? \`
          <div class="pf-row" style="margin-top:14px">
            <div class="pf-group" style="margin-bottom:0">
              <label class="pf-label">Пол</label>
              <select id="\${fp}-gender">
                <option value=""      \${!p?.gender             ?'selected':''}>— не задано —</option>
                <option value="women" \${p?.gender==='women'    ?'selected':''}>Женский</option>
                <option value="men"   \${p?.gender==='men'      ?'selected':''}>Мужской</option>
              </select>
            </div>
            <div class="pf-group" style="margin-bottom:0">
              <label class="pf-label">Тип одежды</label>
              <select id="\${fp}-apparel-type">
                <option value=""       \${!p?.apparel_type            ?'selected':''}>— не задано —</option>
                <option value="top"    \${p?.apparel_type==='top'    ?'selected':''}>Верх (футболки, куртки, худи)</option>
                <option value="bottom" \${p?.apparel_type==='bottom' ?'selected':''}>Низ (шорты, брюки)</option>
              </select>
            </div>
          </div>
          <div style="font-size:11px;color:var(--muted);margin-top:8px">
            Задайте пол и тип для товаров с тегом <b>apparel</b> — по ним подбирается нужная таблица размеров на странице товара.
          </div>\`
    : '';

  setContent(\`
    <style>\${ITEM_FORM_STYLES}</style>

    <div style="margin-bottom:20px;display:flex;align-items:center;gap:10px">
      <button class="btn btn-sm" onclick="\${cfg.backAction}" style="gap:6px">← Назад</button>
      <h2 style="font-size:22px;font-weight:500;letter-spacing:-0.03em">
        \${isNew ? cfg.newLabel : esc(p.title)}
      </h2>
      \${cfg.brandValue ? \`<span style="font-size:11px;background:rgba(0,0,0,0.06);padding:3px 10px;border-radius:999px;color:var(--muted)">\${esc(cfg.brandValue)}</span>\` : ''}
    </div>

    <div class="pf-layout">

      <!-- LEFT COLUMN -->
      <div>

        <!-- Основная информация -->
        <div class="pf-card">
          <div class="pf-card-title">Основная информация</div>

          <div class="pf-row">
            <div class="pf-group">
              <label class="pf-label">Название товара <span>*</span></label>
              <input id="\${fp}-title" value="\${esc(p?.title || '')}" placeholder="\${esc(cfg.titlePlaceholder)}"
                oninput="ifAutoSlug('\${fp}')">
            </div>
            <div class="pf-group">
              <label class="pf-label">Slug (URL) <span>*</span></label>
              <input id="\${fp}-slug" value="\${esc(p?.slug || '')}" placeholder="\${esc(cfg.slugPlaceholder)}"
                oninput="window['\${fp}SlugTouched']=true;ifUpdateSlugPreview('\${fp}')">
              <div class="slug-preview" id="\${fp}-slug-preview">
                kokoc.store/product/<span id="\${fp}-slug-val">\${esc(p?.slug || '')}</span>
                \${p?.slug ? '<a href="https://kokoc.store/product/'+esc(p.slug)+'" target="_blank">↗</a>' : ''}
              </div>
            </div>
          </div>

          \${row2Html}

          <div class="pf-group">
            <label class="pf-label">Описание</label>
            <div class="rte-wrap">
              <div class="rte-toolbar">
                <button type="button" class="rte-btn" title="Обычный текст" onmousedown="event.preventDefault()" onclick="ifRteBlock('\${fp}','p')">Текст</button>
                <button type="button" class="rte-btn" title="Заголовок" onmousedown="event.preventDefault()" onclick="ifRteBlock('\${fp}','h3')">H3</button>
                <div class="rte-sep"></div>
                <button type="button" class="rte-btn" title="Жирный" onmousedown="event.preventDefault()" onclick="ifRteExec('\${fp}','bold')"><b>Ж</b></button>
                <button type="button" class="rte-btn" title="Курсив" onmousedown="event.preventDefault()" onclick="ifRteExec('\${fp}','italic')"><i>К</i></button>
                <div class="rte-sep"></div>
                <button type="button" class="rte-btn" title="Список" onmousedown="event.preventDefault()" onclick="ifRteExec('\${fp}','insertUnorderedList')">☰ Список</button>
                <div class="rte-sep"></div>
                <button type="button" class="rte-btn" title="По левому краю" onmousedown="event.preventDefault()" onclick="ifRteExec('\${fp}','justifyLeft')">⇤ Слева</button>
                <button type="button" class="rte-btn" title="По центру" onmousedown="event.preventDefault()" onclick="ifRteExec('\${fp}','justifyCenter')">⇔ Центр</button>
                <button type="button" class="rte-btn" title="По правому краю" onmousedown="event.preventDefault()" onclick="ifRteExec('\${fp}','justifyRight')">⇥ Справа</button>
                <button type="button" class="rte-btn" title="По ширине" onmousedown="event.preventDefault()" onclick="ifRteExec('\${fp}','justifyFull')">⬄ Ширина</button>
                <div class="rte-sep"></div>
                <button type="button" class="rte-btn" title="Очистить форматирование" onmousedown="event.preventDefault()" onclick="ifRteExec('\${fp}','removeFormat')">✕ Формат</button>
              </div>
              <div id="\${fp}-desc" class="rte-editor" contenteditable="true"
                data-placeholder="\${esc(cfg.descPlaceholder)}"
                oninput="ifRteSyncActive('\${fp}')" onkeyup="ifRteSyncActive('\${fp}')" onmouseup="ifRteSyncActive('\${fp}')"
              >\${p?.description || ''}</div>
            </div>
          </div>
        </div>

        <!-- Видимость -->
        <div class="pf-card">
          <div class="pf-row">
            <div class="pf-group" style="margin-bottom:0">
              <label class="pf-label">Видимость</label>
              <select id="\${fp}-visibility">
                <option value="visible" \${(!p || p.visibility !== 'hidden')?'selected':''}>Видимый</option>
                <option value="hidden"  \${p?.visibility==='hidden'        ?'selected':''}>Скрытый</option>
              </select>
            </div>
            <div class="pf-group" style="margin-bottom:0">
              <label class="pf-label">Метка (badge)</label>
              <select id="\${fp}-badge">
                <option value=""        \${!p?.badge            ?'selected':''}>— нет —</option>
                <option value="hit"     \${p?.badge==='hit'     ?'selected':''}>🔥 Hit</option>
                <option value="new"     \${p?.badge==='new'     ?'selected':''}>✨ New</option>
                <option value="limited" \${p?.badge==='limited' ?'selected':''}>⚡ Limited</option>
              </select>
            </div>
          </div>
          <div style="font-size:11px;color:var(--muted);margin-top:10px">
            \${visibilityNoteHtml}
          </div>
          \${genderTypeFieldsHtml}
        </div>

        <!-- Варианты -->
        <div class="pf-card">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
            <div class="pf-card-title" style="margin-bottom:0">Варианты</div>
            \${!isNew ? \`<button class="btn btn-sm" onclick="openNewVariant()">+ Добавить вариант</button>\` : ''}
          </div>
          <div id="pf-kids-size-hint">\${renderKidsSizeHint()}</div>
          \${isNew
            ? \`<div style="font-size:12px;color:var(--muted);padding:16px 0;border-top:1px solid var(--border)">
                Сначала сохраните товар — затем добавьте варианты с размерами, ценой и остатком.
               </div>\`
            : \`<div id="pf-variants-list">\${renderVariantsTable()}</div>\`
          }
        </div>


      </div>

      <!-- RIGHT COLUMN (shared: photo / colors / tags always use the fixed 'pf-' prefix) -->
      <div>

        <!-- Фото товара -->
        <div class="pf-card">
          <div class="pf-card-title">Фото товара</div>
          <label class="photo-dropzone" id="pf-dropzone"
            style="\${pf.images.length ? 'display:none' : ''}"
            ondragover="pfDragOver(event)" ondragleave="pfDragLeave(event)" ondrop="pfDrop(event)">
            <input type="file" multiple accept="image/*" style="display:none" id="pf-file-input"
              onchange="pfFilesSelected(this)">
            <div class="upload-icon">↑</div>
            <div class="upload-main">
              Загрузить фото<br>
              <span style="font-size:12px;font-weight:400">Перетащите файлы сюда или </span>
              <span class="upload-link">выберите на компьютере</span>
            </div>
            <div class="upload-hint" style="margin-top:6px">JPG, PNG до 10MB · Рекомендуется соотношение 1:1 · Автоматически сжимается перед загрузкой</div>
          </label>
          <div class="photo-gallery" id="pf-photo-gallery">
            \${renderPhotoGallery()}
          </div>
          <div id="pf-photo-hint" class="photo-gallery-hint" style="\${pf.images.length ? '' : 'display:none'}">
            Нажмите на фото, чтобы сделать его главным
            <button class="btn btn-sm" style="margin-left:8px;font-size:10px" onclick="document.getElementById('pf-dropzone').style.display='';document.getElementById('pf-dropzone').scrollIntoView({behavior:'smooth'})">+ Ещё фото</button>
          </div>
        </div>

        <!-- Цвета -->
        <div class="pf-card">
          <div class="pf-card-title">Цвет</div>
          <div style="font-size:11px;color:var(--muted);margin-bottom:12px">Выберите доступные цвета</div>
          <div class="color-list" id="pf-color-list">
            \${renderColorList()}
          </div>
          <div class="color-add-row" id="pf-color-add-row">
            <input type="color" id="pf-color-picker" value="#000000">
            <input type="text" id="pf-color-name" placeholder="Название цвета" style="flex:1"
              onkeydown="if(event.key==='Enter')pfAddColor()">
            <button class="btn btn-sm" onclick="pfAddColor()" style="white-space:nowrap">+ Добавить цвет</button>
          </div>
        </div>

        <!-- Теги -->
        <div class="pf-card">
          <div class="pf-card-title">Теги</div>
          <div class="chips-wrap" id="pf-tags-wrap" onclick="document.getElementById('pf-tag-input').focus()">
            \${pf.tags.map((t,i) => \`
              <span class="chip" style="background:var(--accent-dim);border-color:var(--accent);color:var(--text)">
                \${esc(t)}
                <button type="button" onclick="pfRemoveTag(\${i})">×</button>
              </span>
            \`).join('')}
            <input class="chip-input" id="pf-tag-input" placeholder="+ Добавить тег"
              onkeydown="pfTagKeydown(event)">
          </div>
          \${tagsHintHtml}
        </div>

      </div>
    </div>
  \`);

  // Init slug state
  window[fp + 'SlugTouched'] = !!p?.slug;
  ifUpdateStatusDot(fp);
}

// ── Slug / status helpers, shared by every item-form instance ──
// (formerly duplicated as pfAutoSlug/pfUpdateSlugPreview/pfUpdateStatusDot
// and bpfAutoSlug(key)/bpfUpdateSlugPreview(key)/bpfUpdateStatusDot(key))

function ifUpdateSlugPreview(fp) {
  const v = document.getElementById(fp + '-slug').value;
  const el = document.getElementById(fp + '-slug-val');
  if (el) el.textContent = v;
}

function ifAutoSlug(fp) {
  if (!window[fp + 'SlugTouched']) {
    const title = document.getElementById(fp + '-title').value;
    const slug = title.toLowerCase()
      .replace(/[аА]/g,'a').replace(/[бБ]/g,'b').replace(/[вВ]/g,'v')
      .replace(/[гГ]/g,'g').replace(/[дД]/g,'d').replace(/[еЕёЁ]/g,'e')
      .replace(/[жЖ]/g,'zh').replace(/[зЗ]/g,'z').replace(/[иИйЙ]/g,'i')
      .replace(/[кК]/g,'k').replace(/[лЛ]/g,'l').replace(/[мМ]/g,'m')
      .replace(/[нН]/g,'n').replace(/[оО]/g,'o').replace(/[пП]/g,'p')
      .replace(/[рР]/g,'r').replace(/[сС]/g,'s').replace(/[тТ]/g,'t')
      .replace(/[уУ]/g,'u').replace(/[фФ]/g,'f').replace(/[хХ]/g,'kh')
      .replace(/[цЦ]/g,'ts').replace(/[чЧ]/g,'ch').replace(/[шШ]/g,'sh')
      .replace(/[щЩ]/g,'shch').replace(/[ыЫ]/g,'y').replace(/[эЭ]/g,'e')
      .replace(/[юЮ]/g,'yu').replace(/[яЯ]/g,'ya')
      .replace(/\\s+/g,'-').replace(/[^a-z0-9-]/g,'').replace(/-+/g,'-');
    document.getElementById(fp + '-slug').value = slug;
    ifUpdateSlugPreview(fp);
  }
}

function ifUpdateStatusDot(fp) {
  const sel = document.getElementById(fp + '-status');
  const dot = document.getElementById(fp + '-status-dot');
  if (!sel || !dot) return;
  dot.className = 'status-dot ' + (sel.value === 'draft' ? 'draft' : sel.value === 'archived' ? 'archived' : '');
}

// ── Description rich-text editor (bold / italic / heading / list / align) ──
// Built on document.execCommand — deprecated but still universally
// supported, and simple enough for this admin's needs (no framework,
// no client-side HTML parser available). Whatever markup it produces
// is re-sanitized server-side (see lib/rich-text.js) down to a strict
// p/h3/strong/em/ul/li/br allow-list — plus a text-align style on
// p/h3 for the alignment buttons below — before it's stored, so a
// messy execCommand output (e.g. <div> or <b> instead of <strong>)
// can't leak anything unwanted into the storefront — worst case, the
// tag just gets dropped and its text survives as a plain paragraph.

function ifRteFocusEditor(fp) {
  const el = document.getElementById(fp + '-desc');
  if (!el) return null;
  el.focus();
  return el;
}

function ifRteExec(fp, command) {
  if (!ifRteFocusEditor(fp)) return;
  document.execCommand(command, false, null);
  ifRteSyncActive(fp);
}

function ifRteBlock(fp, tag) {
  if (!ifRteFocusEditor(fp)) return;
  document.execCommand('formatBlock', false, tag === 'p' ? '<p>' : '<' + tag + '>');
  ifRteSyncActive(fp);
}

function ifRteSyncActive(fp) {
  const toolbar = document.getElementById(fp + '-desc')?.previousElementSibling;
  if (!toolbar) return;
  const isActive = (cmd) => { try { return document.queryCommandState(cmd); } catch(e) { return false; } };
  const boldBtn   = toolbar.querySelector('[title="Жирный"]');
  const italicBtn = toolbar.querySelector('[title="Курсив"]');
  const listBtn   = toolbar.querySelector('[title="Список"]');
  const alignLeftBtn    = toolbar.querySelector('[title="По левому краю"]');
  const alignCenterBtn  = toolbar.querySelector('[title="По центру"]');
  const alignRightBtn   = toolbar.querySelector('[title="По правому краю"]');
  const alignFullBtn    = toolbar.querySelector('[title="По ширине"]');
  if (boldBtn)   boldBtn.classList.toggle('is-active', isActive('bold'));
  if (italicBtn) italicBtn.classList.toggle('is-active', isActive('italic'));
  if (listBtn)   listBtn.classList.toggle('is-active', isActive('insertUnorderedList'));
  if (alignLeftBtn)   alignLeftBtn.classList.toggle('is-active', isActive('justifyLeft'));
  if (alignCenterBtn) alignCenterBtn.classList.toggle('is-active', isActive('justifyCenter'));
  if (alignRightBtn)  alignRightBtn.classList.toggle('is-active', isActive('justifyRight'));
  if (alignFullBtn)   alignFullBtn.classList.toggle('is-active', isActive('justifyFull'));
}

`;
