// settings.js — store-wide settings (WhatsApp contact number, etc).
//
// In the original admin.js this lived spliced in the middle of the Clients
// section with no section header of its own — moved out here.

export const settingsScript = `
async function showSettings() {
  currentRoute = 'settings';
  renderNav('settings');
  setTopbar('Настройки');
  setContent('<div class="loading">Загрузка...</div>');

  let settings = { whatsapp_number: '' };
  try {
    const d = await GET('/settings');
    settings = d.settings || {};
  } catch(e) { /* ignore, show empty form */ }

  setContent(\`
    <div class="pf-card" style="max-width:540px">
      <div class="pf-card-title">Контакты и мессенджеры</div>

      <div class="pf-group">
        <label class="pf-label">Номер WhatsApp</label>
        <input id="settings-wa" value="\${esc(settings.whatsapp_number || '')}"
          placeholder="+79991234567" style="width:100%">
        <div class="slug-preview" style="margin-top:6px">
          Формат: +79991234567 или 79991234567. Используется на странице «О нас» как кнопка «Задать вопрос».
        </div>
      </div>

      <div style="margin-top:20px">
        <button class="btn btn-primary" onclick="saveSettings()">Сохранить</button>
      </div>
    </div>
  \`);
}

async function saveSettings() {
  const whatsapp = document.getElementById('settings-wa')?.value.trim() || '';
  try {
    await fetch('/admin/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ whatsapp_number: whatsapp })
    });
    toast('Настройки сохранены');
  } catch(e) {
    toast('Ошибка сохранения', 'err');
  }
}
`;
