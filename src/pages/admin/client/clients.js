// clients.js — client list + per-client order history.

export const clientsScript = `
let clientsData = [];

async function showClients() {
  currentRoute = 'clients';
  renderNav('clients');
  setTopbar('Клиенты');
  setContent('<div class="loading">Загрузка...</div>');
  try {
    const d = await GET('/clients');
    clientsData = d.clients || [];
    renderClientsList();
  } catch(e) { toast(e.message, 'err'); }
}

function renderClientsList() {
  const total = clientsData.length;
  setTopbar('Клиенты', \`<span style="font-size:12px;color:var(--muted)">\${total} клиент\${total===1?'':total>4?'ов':'а'}</span>\`);

  if (!clientsData.length) {
    setContent(\`
      <div class="pf-card pf-empty">
        <div>
          <div style="font-size:16px;letter-spacing:-0.02em">Нет клиентов</div>
          <div class="text-muted" style="font-size:12px;margin-top:6px">Клиенты появятся после первых заказов.</div>
        </div>
      </div>
    \`);
    return;
  }

  setContent(\`
    <div class="pf-card" style="padding:0;overflow:hidden">
      <table class="data-table" style="width:100%">
        <thead>
          <tr>
            <th>Клиент</th>
            <th>Город</th>
            <th>Заказов</th>
            <th>Сумма</th>
            <th>Последний заказ</th>
          </tr>
        </thead>
        <tbody>
          \${clientsData.map(c => \`
            <tr style="cursor:pointer" onclick="showClientDetail('\${esc(c.email)}')">
              <td>
                <div style="font-size:13px;font-weight:500">\${esc(c.name || '—')}</div>
                <div style="font-size:11px;color:var(--muted);margin-top:2px">\${esc(c.email)}</div>
                \${c.phone ? \`<div style="font-size:11px;color:var(--muted)">\${esc(c.phone)}</div>\` : ''}
              </td>
              <td style="color:var(--muted);font-size:13px">\${esc(c.city || '—')}</td>
              <td style="font-size:13px;font-weight:500">\${c.order_count}</td>
              <td style="font-size:13px;font-weight:500">\${rub(c.total_minor)}</td>
              <td style="font-size:12px;color:var(--muted)">\${formatDate(c.last_order_at)}</td>
            </tr>
          \`).join('')}
        </tbody>
      </table>
    </div>
  \`);
}

async function showClientDetail(email) {
  setContent('<div class="loading">Загрузка...</div>');
  try {
    const d = await GET('/orders?limit=200');
    const orders = (d.orders || []).filter(o => o.customer_email === email);
    const client = clientsData.find(c => c.email === email) || {};

    const totalSpent = orders.reduce((s, o) => s + (o.total_minor || 0), 0);

    document.getElementById('page-title').innerHTML =
      \`<span style="cursor:pointer;opacity:0.5" onclick="showClients()">← Клиенты</span>\`;

    setContent(\`
      <div class="pf-layout" style="display:grid;grid-template-columns:1fr 300px;gap:24px;align-items:start">
        <div>
          <div class="pf-card">
            <div class="pf-card-title">Заказы клиента</div>
            \${orders.length === 0 ? '<div class="text-muted">Заказов нет</div>' : ''}
            <table class="data-table" style="width:100%">
              <thead>
                <tr>
                  <th>№ Заказа</th>
                  <th>Статус</th>
                  <th>Сумма</th>
                  <th>Дата</th>
                </tr>
              </thead>
              <tbody>
                \${orders.map(o => \`
                  <tr>
                    <td style="font-size:13px;font-weight:500">#\${esc(o.order_number)}</td>
                    <td>\${badge(o.status)}</td>
                    <td style="font-size:13px">\${rub(o.total_minor)}</td>
                    <td style="font-size:12px;color:var(--muted)">\${formatDate(o.created_at)}</td>
                  </tr>
                \`).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <div class="pf-card">
            <div class="pf-card-title">Информация</div>
            <div style="display:flex;flex-direction:column;gap:12px">
              \${clientInfoRow('Имя', client.name || '—')}
              \${clientInfoRow('Email', client.email)}
              \${clientInfoRow('Телефон', client.phone || '—')}
              \${clientInfoRow('Город', client.city || '—')}
              \${clientInfoRow('Заказов', String(orders.length))}
              \${clientInfoRow('Потрачено', rub(totalSpent))}
              \${clientInfoRow('Первый заказ', formatDate(client.first_order_at))}
              \${clientInfoRow('Последний заказ', formatDate(client.last_order_at))}
            </div>
          </div>
        </div>
      </div>
    \`);
  } catch(e) { toast(e.message, 'err'); }
}

function clientInfoRow(label, value) {
  return \`
    <div style="display:flex;flex-direction:column;gap:2px">
      <div style="font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:var(--muted)">\${label}</div>
      <div style="font-size:13px">\${esc(value)}</div>
    </div>
  \`;
}
`;
