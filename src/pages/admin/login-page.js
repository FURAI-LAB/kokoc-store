// login-page.js — /admin/login. Standalone page, no dependency on the SPA shell.

export function loginPage() {
  return /* html */`<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kokoc Admin</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg: #e89be8;
      --surface: #F4EDE4;
      --border: #181717;
      --accent: #F4EDE4;
      --text: #181717;
      --muted: #666;
      --danger: #ff4757;
      --font: 'DM Mono', 'Courier New', monospace;
    }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: var(--font);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .login-box {
      width: 340px;
    }
    .login-logo {
      font-size: 11px;
      letter-spacing: 0.3em;
      text-transform: uppercase;
      color: var(--muted);
      margin-bottom: 40px;
    }
    .login-logo span {
      color: var(--accent);
    }
    h1 {
      font-size: 28px;
      font-weight: 400;
      letter-spacing: -0.03em;
      margin-bottom: 32px;
    }
    input[type="password"] {
      width: 100%;
      background: var(--surface);
      border: 1px solid var(--border);
      color: var(--text);
      font-family: var(--font);
      font-size: 16px;
      padding: 14px 16px;
      outline: none;
      letter-spacing: 0.1em;
      margin-bottom: 12px;
      transition: border-color 0.15s;
    }
    input[type="password"]:focus { border-color: var(--accent); }
    button {
      width: 100%;
      background: var(--accent);
      color: #000;
      border: none;
      font-family: var(--font);
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      padding: 14px;
      cursor: pointer;
      transition: opacity 0.15s;
    }
    button:hover { opacity: 0.85; }
    .error {
      color: var(--danger);
      font-size: 12px;
      margin-top: 10px;
      min-height: 18px;
    }
  </style>
</head>
<body>
  <div class="login-box">
    <div class="login-logo"><span>KOKOC</span> / ADMIN</div>
    <h1>Вход</h1>
    <input type="password" id="pwd" placeholder="Пароль" autofocus>
    <button id="btn">Войти</button>
    <div class="error" id="err"></div>
  </div>
  <script>
    const btn = document.getElementById('btn');
    const pwd = document.getElementById('pwd');
    const err = document.getElementById('err');
 
    async function login() {
      err.textContent = '';
      btn.disabled = true;
      try {
        const r = await fetch('/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: pwd.value })
        });
        if (r.ok) { window.location.href = '/admin'; return; }
        err.textContent = 'Неверный пароль';
      } catch {
        err.textContent = 'Ошибка сети';
      }
      btn.disabled = false;
    }
 
    btn.addEventListener('click', login);
    pwd.addEventListener('keydown', e => { if (e.key === 'Enter') login(); });
  </script>
</body>
</html>`;
}
