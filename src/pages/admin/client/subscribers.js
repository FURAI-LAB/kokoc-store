// subscribers.js — newsletter subscriber list + CSV export.

export const subscribersScript = `
let subscribers = [];

async function showSubscribers() {
  currentRoute = 'subscribers';
  renderNav('subscribers');
  setTopbar('Подписчики', '<button class="btn" onclick="exportSubscribers()">Экспорт CSV</button>');
  setContent('<div class="loading">Загрузка...</div>');

  try {
    const data = await GET('/subscribers');
    subscribers = data.subscribers || [];
    renderSubscribersTable();
  } catch(e) {
    setContent(\`<div class="loading" style="color:var(--danger)">Ошибка загрузки: \${esc(e.message)}</div>\`);
  }
}

function renderSubscribersTable() {
  const visibleSubscribers = subscribers.filter(s => matchesSearch([s.email]));
  const now = Date.now();
  const last30 = subscribers.filter(s => {
    const t = new Date(s.created_at).getTime();
    return Number.isFinite(t) && now - t <= 30 * 24 * 60 * 60 * 1000;
  }).length;

  setContent(\`
    <div class="stats-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:20px">
      <div class="stat-card accent">
        <div class="stat-label">Всего</div>
        <div class="stat-value">\${subscribers.length}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">За последние 30 дней</div>
        <div class="stat-value">\${last30}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Активных</div>
        <div class="stat-value">\${subscribers.length}</div>
      </div>
    </div>
    <div class="pf-card">
      \${!visibleSubscribers.length
        ? '<div class="pf-empty">Подписчиков пока нет</div>'
        : \`<div class="table-wrap card-table">
      <table>
        <thead>
          <tr>
            <th>Email</th>
            <th>Дата подписки</th>
            <th>Источник</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          \${visibleSubscribers.map(s => \`
            <tr>
              <td>\${esc(s.email)}</td>
              <td class="text-muted">\${formatDate(s.created_at)}</td>
              <td><span class="chip">\${esc(s.source || 'site')}</span></td>
              <td><button class="btn btn-sm btn-danger" onclick="deleteSubscriberUnavailable()">Удалить</button></td>
            </tr>
          \`).join('')}
        </tbody>
      </table>
      </div>\`}
    </div>
  \`);
}

function deleteSubscriberUnavailable() {
  toast('Удаление подписчиков пока не подключено', 'err');
}

function exportSubscribers() {
  if (!subscribers.length) return;
  const csv = 'email,source,date\\n' +
    subscribers.map(s => \`\${s.email},\${s.source},\${s.created_at}\`).join('\\n');
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = 'subscribers.csv';
  a.click();
}
`;
