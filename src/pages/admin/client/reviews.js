// reviews.js — review moderation queue.

export const reviewsScript = `
let reviews = [];
let reviewStatusFilter = 'pending';

const reviewFilters = [
  { value: 'pending',  label: 'На модерации' },
  { value: 'approved', label: 'Одобренные' },
  { value: 'rejected', label: 'Отклонённые' },
];

function reviewActionsHtml() {
  return reviewFilters.map(f => \`
    <button class="btn btn-sm btn-filter \${reviewStatusFilter === f.value ? 'active' : ''}" onclick="filterReviews('\${f.value}')">\${f.label}</button>
  \`).join('');
}

async function showReviews() {
  currentRoute = 'reviews';
  renderNav('reviews');
  setTopbar('Отзывы', reviewActionsHtml());
  setContent('<div class="loading">Загрузка...</div>');
  try {
    await loadReviews();
  } catch(e) {
    setContent(\`<div class="loading" style="color:var(--danger)">Ошибка загрузки: \${esc(e.message)}</div>\`);
  }
}

async function loadReviews() {
  try {
    const data = await GET('/reviews?status=' + reviewStatusFilter);
    reviews = data.reviews || [];
    renderReviewsTable();
  } catch(e) {
    setContent(\`<div class="loading" style="color:var(--danger)">Ошибка загрузки: \${esc(e.message)}</div>\`);
  }
}

function filterReviews(status) {
  reviewStatusFilter = status;
  setTopbar('Отзывы', reviewActionsHtml());
  setContent('<div class="loading">Загрузка...</div>');
  loadReviews();
}

function reviewStars(rating) {
  let out = '';
  for (let i = 1; i <= 5; i++) {
    out += \`<span style="color:\${i <= rating ? 'var(--accent)' : 'var(--border)'}">★</span>\`;
  }
  return out;
}

function renderReviewsTable() {
  const visibleReviews = reviews.filter(r => matchesSearch([r.author_name, r.product_title, r.body, r.title]));

  setContent(\`
    <div class="pf-card">
      <div class="flex" style="justify-content:space-between;margin-bottom:16px">
        <div class="pf-label" style="margin:0">Отзывы · \${visibleReviews.length}</div>
      </div>
      \${!visibleReviews.length
        ? '<div class="pf-empty">Отзывов не найдено</div>'
        : \`<div class="table-wrap card-table"><table>
        <thead>
          <tr>
            <th>Товар</th>
            <th>Автор</th>
            <th>Оценка</th>
            <th>Отзыв</th>
            <th>Дата</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          \${visibleReviews.map(r => \`
            <tr>
              <td><a href="/product/\${esc(r.product_slug)}" target="_blank" rel="noopener">\${esc(r.product_title)}</a></td>
              <td><strong>\${esc(r.author_name)}</strong></td>
              <td>\${reviewStars(r.rating)}</td>
              <td style="max-width:360px">
                \${r.title ? \`<strong>\${esc(r.title)}</strong><br>\` : ''}
                <span class="text-muted">\${esc(r.body)}</span>
              </td>
              <td class="text-muted">\${formatDate(r.created_at)}</td>
              <td>
                \${reviewStatusFilter === 'pending'
                  ? \`<div class="flex" style="gap:6px">
                       <button class="btn btn-sm" onclick="approveReview('\${r.id}')">Одобрить</button>
                       <button class="btn btn-sm" style="color:var(--danger)" onclick="rejectReview('\${r.id}')">Отклонить</button>
                     </div>\`
                  : badge(reviewStatusFilter)
                }
              </td>
            </tr>
          \`).join('')}
        </tbody>
      </table></div>\`}
    </div>
  \`);
}

async function approveReview(id) {
  try {
    await PATCH('/reviews/' + id, { approve: true });
    toast('Отзыв одобрен');
    reviews = reviews.filter(r => r.id !== id);
    renderReviewsTable();
  } catch(e) {
    toast(e.message, 'err');
  }
}

async function rejectReview(id) {
  if (!confirm('Отклонить этот отзыв?')) return;
  try {
    await PATCH('/reviews/' + id, { approve: false });
    toast('Отзыв отклонён');
    reviews = reviews.filter(r => r.id !== id);
    renderReviewsTable();
  } catch(e) {
    toast(e.message, 'err');
  }
}
`;
