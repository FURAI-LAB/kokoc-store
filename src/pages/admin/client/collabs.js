// collabs.js — brand collaborations list + drawer editor.

export const collabsScript = `
let collabs = [];
let collabDrawerIdx = null;
let collabDragFrom = null;
let collabOrderDirty = false;

async function showCollabs() {
  currentRoute = 'collabs';
  renderNav('collabs');
  setTopbar('Collabs', '<button class="btn btn-primary" onclick="openCollabDrawer(null)">Новый коллаб</button>');
  setContent('<div class="loading">Загрузка...</div>');

  try {
    const data = await GET('/collabs');
    collabs = data.collabs || [];
    collabOrderDirty = false;
    renderCollabs();
  } catch (e) {
    setContent('<div class="pf-card pf-empty">' + esc(e.message) + '</div>');
  }
}

function renderCollabs() {
  if (!collabs.length) {
    setContent(\`
      <div class="pf-card pf-empty">
        <div>
          <div style="margin-bottom:14px">Нет коллабов</div>
          <button class="btn btn-primary" onclick="openCollabDrawer(null)">Добавить первый</button>
        </div>
      </div>
    \`);
    return;
  }

  const cards = collabs.map((c, i) => {
    const cover = c.bannerUrl
      ? '<img src="' + esc(c.bannerUrl) + '" alt="">'
      : (c.logoUrl ? '<img src="' + esc(c.logoUrl) + '" alt="" style="object-fit:contain;padding:20px;background:var(--surface2)">' : '<span>нет фото</span>');

    const logoBadge = c.logoUrl
      ? '<div class="collab-logo-badge"><img src="' + esc(c.logoUrl) + '" alt=""></div>'
      : '';

    const isActive = c.status === 'active';

    return '<div class="collab-card" draggable="true"' +
        ' data-idx="' + i + '"' +
        ' ondragstart="collabDragStart(event,' + i + ')"' +
        ' ondragover="collabDragOver(event,' + i + ')"' +
        ' ondragleave="collabDragLeave(event)"' +
        ' ondrop="collabDrop(event,' + i + ')"' +
        ' ondragend="collabDragEnd(event)">' +
      '<div class="collab-drag-handle" title="Перетащи, чтобы изменить порядок">⠿</div>' +
      '<div class="collab-cover">' + cover + logoBadge + '</div>' +
      '<div class="collab-card-body">' +
        '<div class="collab-card-top">' +
          '<div class="collab-card-title">' + esc(c.name) + '</div>' +
          badge(isActive ? 'active' : 'archived') +
        '</div>' +
        '<div class="collab-card-meta">' +
          '<span class="mono text-muted">/' + esc(c.slug) + '</span>' +
          '<span class="text-muted">·</span>' +
          '<span class="text-muted">' + esc(c.year || '—') + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="collab-card-actions">' +
        '<button class="btn btn-sm" onclick="openCollabDrawer(' + i + ')">Изменить</button>' +
        '<button class="btn btn-sm btn-danger" onclick="deleteCollab(' + i + ')">Удалить</button>' +
      '</div>' +
    '</div>';
  }).join('');

  const saveBar = collabOrderDirty
    ? '<div class="collab-order-bar">' +
        '<span>Порядок изменён — обнови сайт, чтобы применить</span>' +
        '<button class="btn btn-primary btn-sm" onclick="saveCollabOrder()">Сохранить порядок</button>' +
      '</div>'
    : '';

  setContent(\`
    <div class="pf-label" style="margin-bottom:12px">Коллабы на сайте · перетаскивай карточки, чтобы менять порядок</div>
    \${saveBar}
    <div class="collab-grid" id="collab-grid">\${cards}</div>
  \`);
}

function renderCollabsTable() { renderCollabs(); }

// ─── Drag & drop reordering ─────────────────────────────────────────────────

function collabDragStart(e, idx) {
  collabDragFrom = idx;
  e.dataTransfer.effectAllowed = 'move';
  e.currentTarget.classList.add('dragging');
}

function collabDragOver(e, idx) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  if (idx === collabDragFrom) return;
  e.currentTarget.classList.add('drag-over');
}

function collabDragLeave(e) {
  e.currentTarget.classList.remove('drag-over');
}

function collabDrop(e, idx) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  if (collabDragFrom === null || collabDragFrom === idx) return;

  const [moved] = collabs.splice(collabDragFrom, 1);
  collabs.splice(idx, 0, moved);
  collabDragFrom = null;
  collabOrderDirty = true;
  renderCollabs();
}

function collabDragEnd(e) {
  e.currentTarget.classList.remove('dragging');
  document.querySelectorAll('.collab-card.drag-over').forEach(el => el.classList.remove('drag-over'));
  collabDragFrom = null;
}

async function saveCollabOrder() {
  try {
    await api('PUT', '/collabs', { collabs });
    collabOrderDirty = false;
    toast('Порядок сохранён');
    renderCollabs();
  } catch (e) {
    toast(e.message, 'err');
  }
}

function collabPreviewHtml(url, field) {
  const isLogo = field === 'logo';
  if (!url) {
    return '<div style="width:' + (isLogo ? '72px;height:72px' : '140px;height:80px') + ';background:var(--surface2);border-radius:6px;border:1px solid var(--border);display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:11px">нет</div>';
  }
  return '<img src="' + esc(url) + '" style="width:' + (isLogo ? '72px;height:72px' : '140px;height:80px') + ';object-fit:' + (isLogo ? 'contain' : 'cover') + ';border-radius:6px;border:1px solid var(--border)" />';
}

function openCollabDrawer(idx) {
  collabDrawerIdx = idx;
  const c = idx !== null
    ? collabs[idx]
    : { id: '', name: '', slug: '', description: '', logoUrl: '', bannerUrl: '', status: 'active', year: new Date().getFullYear().toString() };

  const deleteButton = idx !== null
    ? '<button class="btn btn-danger" onclick="deleteCollab(' + idx + ');closeCollabDrawer()">Удалить</button>'
    : '';

  const drawerHtml =
    '<div class="modal-overlay" id="collab-overlay" onclick="if(event.target===this)closeCollabDrawer()">' +
      '<div class="modal" style="width:600px" onclick="event.stopPropagation()">' +
        '<div class="modal-header">' +
          '<span class="modal-title">' + (idx !== null ? 'Редактировать коллаб' : 'Новый коллаб') + '</span>' +
          '<button class="modal-close" onclick="closeCollabDrawer()">×</button>' +
        '</div>' +
        '<div class="modal-body">' +
          '<div class="form-row">' +
            '<div class="form-group">' +
              '<label class="form-label">Название *</label>' +
              '<input id="cd-name" value="' + esc(c.name) + '" placeholder="Crocs Classic" oninput="autoSlug()" />' +
            '</div>' +
            '<div class="form-group">' +
              '<label class="form-label">Slug *</label>' +
              '<input id="cd-slug" value="' + esc(c.slug) + '" placeholder="crocs-classic" />' +
            '</div>' +
          '</div>' +
          '<div class="form-row">' +
            '<div class="form-group">' +
              '<label class="form-label">Год</label>' +
              '<input id="cd-year" value="' + esc(c.year || '') + '" placeholder="2025" />' +
            '</div>' +
            '<div class="form-group">' +
              '<label class="form-label">Статус</label>' +
              '<select id="cd-status">' +
                '<option value="active" ' + (c.status === 'active' ? 'selected' : '') + '>Активен (показывается на сайте)</option>' +
                '<option value="archive" ' + (c.status === 'archive' ? 'selected' : '') + '>Архив (скрыт)</option>' +
              '</select>' +
            '</div>' +
          '</div>' +
          '<div class="form-group">' +
            '<label class="form-label">Описание (показывается на странице коллаба)</label>' +
            '<textarea id="cd-desc" rows="3">' + esc(c.description) + '</textarea>' +
          '</div>' +
          '<div class="form-group">' +
            '<label class="form-label">Баннер (широкое фото, 16:9 или 2:1)</label>' +
            '<div style="display:grid;grid-template-columns:150px 1fr;gap:12px;align-items:start">' +
              '<div id="cd-banner-preview" style="flex-shrink:0">' + collabPreviewHtml(c.bannerUrl, 'banner') + '</div>' +
              '<div style="flex:1">' +
                '<input id="cd-banner-url" value="' + esc(c.bannerUrl) + '" placeholder="URL или загрузи файл ниже" style="margin-bottom:8px" />' +
                '<label class="photo-dropzone">' +
                  'Загрузить баннер' +
                  \`<input type="file" accept="image/*" style="display:none" onchange="uploadCollabImage(this,'banner')">\` +
                '</label>' +
                '<div id="cd-banner-status" style="margin-top:8px;font-size:11px;color:var(--muted)"></div>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="form-group">' +
            '<label class="form-label">Логотип партнёра (квадрат, PNG с прозрачностью)</label>' +
            '<div style="display:grid;grid-template-columns:90px 1fr;gap:12px;align-items:start">' +
              '<div id="cd-logo-preview" style="flex-shrink:0">' + collabPreviewHtml(c.logoUrl, 'logo') + '</div>' +
              '<div style="flex:1">' +
                '<input id="cd-logo-url" value="' + esc(c.logoUrl) + '" placeholder="URL или загрузи файл ниже" style="margin-bottom:8px" />' +
                '<label class="photo-dropzone">' +
                  'Загрузить логотип' +
                  \`<input type="file" accept="image/*" style="display:none" onchange="uploadCollabImage(this,'logo')">\` +
                '</label>' +
                '<div id="cd-logo-status" style="margin-top:8px;font-size:11px;color:var(--muted)"></div>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="modal-footer" style="justify-content:space-between">' +
          '<div>' + deleteButton + '</div>' +
          '<div style="display:flex;gap:8px">' +
            '<button class="btn" onclick="closeCollabDrawer()">Отмена</button>' +
            '<button class="btn btn-primary" onclick="saveCollab()">Сохранить</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';

  document.body.insertAdjacentHTML('beforeend', drawerHtml);
}

function closeCollabDrawer() {
  document.getElementById('collab-overlay')?.remove();
}

function autoSlug() {
  const name = document.getElementById('cd-name').value;
  const slug = name.toLowerCase().trim()
    .replace(/\\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-');
  document.getElementById('cd-slug').value = slug;
}

async function uploadCollabImage(input, field) {
  const file = input.files[0];
  if (!file) return;
  const statusEl = document.getElementById('cd-' + field + '-status');
  statusEl.textContent = 'Загрузка…';

  try {
    const fd = new FormData();
    fd.append('file', file);
    const r = await fetch('/admin/api/collabs/upload', { method: 'POST', body: fd });
    const data = await r.json();
    if (!data.ok) throw new Error(data.error);

    document.getElementById('cd-' + field + '-url').value = data.url;
    document.getElementById('cd-' + field + '-preview').innerHTML = collabPreviewHtml(data.url, field);
    statusEl.textContent = '✓ Загружено';
    statusEl.style.color = 'var(--success)';
  } catch (e) {
    statusEl.textContent = '✗ ' + e.message;
    statusEl.style.color = 'var(--danger)';
  }
}

async function saveCollab() {
  const name = document.getElementById('cd-name').value.trim();
  const slug = document.getElementById('cd-slug').value.trim();
  if (!name || !slug) { toast('Заполни название и slug', 'err'); return; }

  const entry = {
    id: collabDrawerIdx !== null ? collabs[collabDrawerIdx].id : slug,
    name,
    slug,
    description: document.getElementById('cd-desc').value.trim(),
    year: document.getElementById('cd-year').value.trim(),
    status: document.getElementById('cd-status').value,
    bannerUrl: document.getElementById('cd-banner-url').value.trim(),
    logoUrl: document.getElementById('cd-logo-url').value.trim(),
  };

  if (collabDrawerIdx !== null) {
    collabs[collabDrawerIdx] = entry;
  } else {
    collabs.push(entry);
  }

  try {
    await api('PUT', '/collabs', { collabs });
    collabOrderDirty = false;
    toast('Сохранено');
    closeCollabDrawer();
    renderCollabsTable();
  } catch (e) {
    toast(e.message, 'err');
  }
}

async function deleteCollab(idx) {
  if (!confirm('Удалить «' + collabs[idx].name + '»?')) return;
  collabs.splice(idx, 1);
  try {
    await api('PUT', '/collabs', { collabs });
    collabOrderDirty = false;
    toast('Удалено');
    renderCollabsTable();
  } catch (e) {
    toast(e.message, 'err');
  }
}
`;
