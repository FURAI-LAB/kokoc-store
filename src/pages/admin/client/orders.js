// orders.js — order list + detail view.
//
// In the original admin.js, openOrder()/saveOrderDetail() lived ~570 lines
// away from the rest of the Orders section (they were sandwiched between
// Collabs and the Modal/Drawer helpers). Consolidated here as one section.

export const ordersScript = `
const orderFilters = [
  { label: 'Все',        value: '' },
  { label: 'Новые',      value: 'pending' },
  { label: 'В работе',   value: 'confirmed' },
  { label: 'Выполнены',  value: 'fulfilled' },
  { label: 'Отменены',   value: 'cancelled' },
];

let orders = [];
let ordersTotal = 0;
let orderFilter = '';

function orderStatusLabel(status) {
  const labels = {
    pending: 'Новый',
    confirmed: 'В работе',
    fulfilled: 'Выполнен',
    shipped: 'Отправлен',
    delivered: 'Доставлен',
    cancelled: 'Отменён',
    refunded: 'Возврат',
    awaiting_payment: 'Ожидает оплаты',
    paid: 'Оплачен',
    failed: 'Ошибка',
    unfulfilled: 'Не собран',
  };
  return labels[status] || status || '—';
}

function orderDotColor(status) {
  const colors = {
    pending: 'var(--warning)',
    confirmed: 'var(--info)',
    fulfilled: 'var(--accent)',
    shipped: 'var(--info)',
    delivered: 'var(--success)',
    cancelled: 'var(--danger)',
    refunded: 'var(--muted)',
  };
  return colors[status] || 'var(--muted)';
}

function orderMatchesFilter(order) {
  if (!orderFilter) return true;
  if (orderFilter === 'fulfilled') {
    return ['fulfilled', 'shipped', 'delivered'].includes(order.fulfillment_status);
  }
  return order.status === orderFilter;
}

function orderActionsHtml() {
  return orderFilters.map(f => \`
    <button class="btn btn-sm btn-filter \${orderFilter === f.value ? 'active' : ''}" onclick="filterOrders('\${f.value}')">\${f.label}</button>
  \`).join('');
}

async function showOrders() {
  currentRoute = 'orders';
  renderNav('orders');
  setTopbar('Заказы', orderActionsHtml());
  setContent('<div class="loading">Загрузка...</div>');
  try {
    await loadOrders();
  } catch(e) {
    setContent(\`<div class="loading" style="color:var(--danger)">Ошибка загрузки: \${esc(e.message)}</div>\`);
  }
}

async function loadOrders() {
  try {
    const data = await GET('/orders?limit=200');
    orders = data.orders || [];
    ordersTotal = data.total || orders.length;
    renderOrdersTable();
  } catch(e) {
    setContent(\`<div class="loading" style="color:var(--danger)">Ошибка загрузки: \${esc(e.message)}</div>\`);
  }
}

function renderOrdersTable() {
  const visibleOrders = orders
    .filter(orderMatchesFilter)
    .filter(o => matchesSearch([o.order_number, o.customer_email, o.shipping_name, o.customer_phone]));

  setContent(\`
    <div class="pf-card">
      <div class="flex" style="justify-content:space-between;margin-bottom:16px">
        <div class="pf-label" style="margin:0">Заказы · \${visibleOrders.length} из \${ordersTotal}</div>
      </div>
      \${!visibleOrders.length
        ? '<div class="pf-empty">Заказов не найдено</div>'
        : \`<div class="table-wrap card-table"><table>
        <thead>
          <tr>
            <th>№</th>
            <th>Клиент</th>
            <th>Сумма</th>
            <th>Статус</th>
            <th>Дата</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          \${visibleOrders.map(o => \`
            <tr class="click-row" onclick="openOrder('\${o.id}')">
              <td class="mono">\${esc(o.order_number)}</td>
              <td><strong>\${esc(o.shipping_name || o.customer_email)}</strong><br><span class="text-muted">\${esc(o.customer_email)}</span></td>
              <td class="price">\${rub(o.total_minor)}</td>
              <td><span class="flex"><span class="status-dot" style="background:\${orderDotColor(o.status)}"></span>\${badge(o.status)}</span></td>
              <td class="text-muted">\${formatDate(o.created_at)}</td>
              <td><button class="btn btn-sm" onclick="event.stopPropagation();openOrder('\${o.id}')">Open</button></td>
            </tr>
          \`).join('')}
        </tbody>
      </table></div>\`}
    </div>
  \`);
}

function filterOrders(status) {
  orderFilter = status;
  setTopbar('Заказы', orderActionsHtml());
  renderOrdersTable();
}

async function openOrder(id) {
  try {
    const data = await GET('/orders/' + id);
    const o = data.order;
    const items = data.items;
    currentRoute = 'order-detail';
    renderNav('orders');
    setTopbar('Заказ ' + o.order_number, '<button class="btn" onclick="showOrders()">← Назад к заказам</button>');
    setContent(\`
      <div class="pf-grid">
        <div class="pf-stack">
          <div class="pf-card">
            <div class="pf-card-title">Состав заказа</div>
            <div class="table-wrap card-table">
              <table>
                <thead>
                  <tr>
                    <th>Товар</th>
                    <th>SKU</th>
                    <th>Кол-во</th>
                    <th>Цена</th>
                    <th>Итого</th>
                  </tr>
                </thead>
                <tbody>
                  \${items.map(i => \`
                    <tr>
                      <td><strong>\${esc(i.product_title)}</strong><br><span class="text-muted">\${esc(i.variant_title)}</span></td>
                      <td class="text-muted">\${esc(i.sku)}</td>
                      <td>\${i.quantity}</td>
                      <td class="price">\${rub(i.price_minor)}</td>
                      <td class="price">\${rub(i.price_minor * i.quantity)}</td>
                    </tr>
                  \`).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <div class="pf-card">
            <div class="pf-card-title">Доставка</div>
            <div class="info-list">
              <div class="info-row"><span class="text-muted">Получатель</span><strong>\${esc(o.shipping_name || '—')}</strong></div>
              <div class="info-row"><span class="text-muted">Город</span><span>\${esc(o.shipping_city || '—')} \${esc(o.shipping_postal_code || '')}</span></div>
              <div class="info-row"><span class="text-muted">Адрес</span><span style="text-align:right">\${esc(o.shipping_address_line1 || '—')} \${esc(o.shipping_address_line2 || '')}</span></div>
            </div>
          </div>

          <div class="pf-card">
            <label class="pf-label">Комментарий</label>
            <textarea id="o-notes" placeholder="Комментарий менеджера...">\${esc(o.notes || '')}</textarea>
          </div>
        </div>

        <div class="pf-stack">
          <div class="pf-card">
            <div class="pf-card-title">Статус</div>
            <div class="form-group">
              <label class="pf-label">Заказ</label>
              <div class="flex">
                <span class="status-dot" id="o-status-dot" style="background:\${orderDotColor(o.status)}"></span>
                <select id="o-status" onchange="updateOrderStatusDot(this.value)">
                  \${['pending','confirmed','cancelled','refunded'].map(s => \`<option value="\${s}" \${o.status===s?'selected':''}>\${orderStatusLabel(s)}</option>\`).join('')}
                </select>
              </div>
            </div>
            <div class="form-group">
              <label class="pf-label">Оплата</label>
              <select id="o-payment">
                \${['awaiting_payment','paid','failed','refunded'].map(s => \`<option value="\${s}" \${o.payment_status===s?'selected':''}>\${orderStatusLabel(s)}</option>\`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="pf-label">Доставка</label>
              <select id="o-fulfillment">
                \${['unfulfilled','fulfilled','shipped','delivered'].map(s => \`<option value="\${s}" \${o.fulfillment_status===s?'selected':''}>\${orderStatusLabel(s)}</option>\`).join('')}
              </select>
            </div>
            <button class="btn btn-primary" style="width:100%;justify-content:center" onclick="saveOrderDetail('\${o.id}')">Сохранить</button>
          </div>

          <div class="pf-card">
            <div class="pf-card-title">Клиент</div>
            <div class="info-list">
              <div class="info-row"><span class="text-muted">Email</span><span style="text-align:right">\${esc(o.customer_email)}</span></div>
              <div class="info-row"><span class="text-muted">Телефон</span><span>\${esc(o.customer_phone || '—')}</span></div>
              <div class="info-row"><span class="text-muted">Дата заказа</span><span>\${formatDate(o.created_at)}</span></div>
            </div>
          </div>

          <div class="pf-card">
            <div class="pf-card-title">Итого</div>
            <div class="info-list">
              <div class="info-row"><span class="text-muted">Товары</span><span class="price">\${rub(o.subtotal_minor)}</span></div>
              <div class="info-row"><span class="text-muted">Доставка</span><span class="price">\${rub(o.shipping_minor)}</span></div>
              <div class="info-row"><strong>Всего</strong><strong class="price">\${rub(o.total_minor)}</strong></div>
            </div>
          </div>
        </div>
      </div>
    \`);
  } catch(e) { toast(e.message, 'err'); }
}

function updateOrderStatusDot(status) {
  const dot = document.getElementById('o-status-dot');
  if (dot) dot.style.background = orderDotColor(status);
}

async function saveOrderDetail(id) {
  try {
    await PATCH('/orders/' + id, {
      status: document.getElementById('o-status').value,
      payment_status: document.getElementById('o-payment').value,
      fulfillment_status: document.getElementById('o-fulfillment').value,
      notes: document.getElementById('o-notes').value.trim() || null,
    });
    toast('Заказ обновлён');
    await openOrder(id);
  } catch(e) { toast(e.message, 'err'); }
}
`;
