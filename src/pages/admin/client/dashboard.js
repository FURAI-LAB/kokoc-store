// dashboard.js — the "/" overview: quick stats + shortcuts.

export const dashboardScript = `
async function showDashboard() {
  currentRoute = 'dashboard';
  renderNav('dashboard');
  document.getElementById('page-title').textContent = 'Дашборд';
  document.getElementById('topbar-actions').innerHTML = '';
  setContent('<div class="loading">Загрузка...</div>');

  try {
    const s = await GET('/stats');
    setContent(\`
      <div class="stats-grid">
        <div class="stat-card accent">
          <div class="stat-label">Активных товаров</div>
          <div class="stat-value">\${s.activeProducts}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Всего заказов</div>
          <div class="stat-value">\${s.totalOrders}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Ожидают обработки</div>
          <div class="stat-value \${s.pendingOrders > 0 ? 'text-danger' : 'text-muted'}">\${s.pendingOrders}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Отзывы на модерации</div>
          <div class="stat-value \${s.pendingReviews > 0 ? 'text-danger' : 'text-muted'}">\${s.pendingReviews}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Выручка (оплачено)</div>
          <div class="stat-value">\${rub(s.revenueMinor)}</div>
        </div>
      </div>
      <div class="text-muted" style="font-size:11px;margin-top:8px">
        Быстрые ссылки: &nbsp;
        <span style="cursor:pointer;text-decoration:underline" onclick="navigate('#/products')">Товары →</span>
        &nbsp;&nbsp;
        <span style="cursor:pointer;text-decoration:underline" onclick="navigate('#/orders')">Заказы →</span>
        &nbsp;&nbsp;
        <span style="cursor:pointer;text-decoration:underline" onclick="navigate('#/reviews')">Отзывы →</span>
      </div>
    \`);
  } catch(e) {
    setContent(\`<div class="loading" style="color:var(--danger)">Ошибка загрузки: \${esc(e.message)}</div>\`);
  }
}
`;
