// admin-shell.css.js — base CSS for the admin SPA shell (sidebar, topbar, tables, cards, badges, forms).
// Exported as a plain string and interpolated into the <style> block of shell.js.

export const adminBaseStyles = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg: #F7F7F6;
      --surface: #FFFFFF;
      --surface2: #F0F0EF;
      --border: rgba(0,0,0,0.08);
      --text: #111111;
      --muted: #888888;
      --accent: #FF6B9A;
      --success: #22C55E;
      --warning: #F59E0B;
      --danger: #EF4444;
      --info: #3B82F6;
      --font: "Avenir Next", "Segoe UI", Arial, sans-serif;
      --border2: var(--border);
      --accent-dim: rgba(255,107,154,0.12);
      --muted2: #BBBBBB;
      --sidebar: 220px;
    }
 
    /* ── Reset & base ── */
    body { background: var(--bg); color: var(--text); font-family: var(--font); font-size: 13px; line-height: 1.5; }
    a { color: inherit; text-decoration: none; }
    button { cursor: pointer; font-family: var(--font); }
    input, textarea, select {
      font-family: var(--font);
      font-size: 13px;
      background: var(--surface2);
      border: 1px solid var(--border2);
      color: var(--text);
      outline: none;
      padding: 9px 12px;
      width: 100%;
      transition: border-color 0.15s;
    }
    input:focus, textarea:focus, select:focus { border-color: var(--accent); }
    textarea { resize: vertical; min-height: 80px; }
 
    /* ── Layout ── */
    #app { display: flex; min-height: 100vh; }
 
    /* ── Sidebar ── */
    #sidebar {
      width: var(--sidebar);
      background: var(--surface);
      border-right: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
      position: fixed;
      top: 0; left: 0; bottom: 0;
    }
    .sidebar-logo {
      padding: 20px 20px 18px;
      border-bottom: 1px solid var(--border);
      font-size: 11px;
      letter-spacing: 0.25em;
      text-transform: uppercase;
      color: var(--muted);
    }
    .sidebar-logo span { color: var(--accent); }
    nav { flex: 1; padding: 12px 0; }
    .nav-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 20px;
      color: var(--muted);
      font-size: 12px;
      letter-spacing: 0.05em;
      cursor: pointer;
      transition: color 0.12s, background 0.12s;
      user-select: none;
    }
    .nav-item:hover { color: var(--text); background: var(--surface2); }
    .nav-item.active { color: var(--accent); background: var(--accent-dim); }
    .nav-item .icon { font-size: 16px; width: 20px; text-align: center; }
    .sidebar-footer {
      padding: 16px 20px;
      border-top: 1px solid var(--border);
    }
    .logout-btn {
      background: none;
      border: 1px solid var(--border2);
      color: var(--muted);
      font-size: 11px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      padding: 7px 12px;
      width: 100%;
      transition: all 0.12s;
    }
    .logout-btn:hover { border-color: var(--danger); color: var(--danger); }
 
    /* ── Main ── */
    #main {
      flex: 1;
      margin-left: var(--sidebar);
      display: flex;
      flex-direction: column;
    }
    .topbar {
      padding: 18px 28px;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: var(--surface);
      position: sticky;
      top: 0;
      z-index: 10;
    }
    .topbar-title {
      font-size: 15px;
      letter-spacing: -0.02em;
    }
    .content { padding: 28px; flex: 1; }
 
    /* ── Stats ── */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 32px;
    }
    .stat-card {
      background: var(--surface);
      border: 1px solid var(--border);
      padding: 20px 24px;
    }
    .stat-label {
      font-size: 10px;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: var(--muted);
      margin-bottom: 10px;
    }
    .stat-value {
      font-size: 28px;
      letter-spacing: -0.04em;
    }
    .stat-card.accent .stat-value { color: var(--accent); }
 
    /* ── Table ── */
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; }
    th {
      text-align: left;
      font-size: 10px;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: var(--muted);
      padding: 10px 14px;
      border-bottom: 1px solid var(--border);
      white-space: nowrap;
    }
    td {
      padding: 12px 14px;
      border-bottom: 1px solid var(--border);
      vertical-align: middle;
    }
    tr:hover td { background: var(--surface2); }
    .mono { font-family: var(--font); }
 
    /* ── Badge ── */
    .badge {
      display: inline-block;
      font-size: 10px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      padding: 2px 8px;
      border: 1px solid currentColor;
    }
    .badge-active { color: var(--success); }
    .badge-draft { color: var(--muted); }
    .badge-archived { color: var(--danger); }
    .badge-paid { color: var(--success); }
    .badge-pending { color: var(--warning); }
    .badge-fulfilled { color: var(--accent); }
    .badge-shipped { color: var(--info); }
    .badge-cancelled { color: var(--danger); }
 
    /* ── Buttons ── */
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border: 1px solid var(--border2);
      background: none;
      color: var(--text);
      font-size: 11px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      padding: 8px 14px;
      transition: all 0.12s;
    }
    .btn:hover { border-color: var(--text); }
    .btn-primary {
      background: var(--accent);
      border-color: var(--accent);
      color: var(--text);
      font-weight: 700;
    }
    .btn-primary:hover { opacity: 0.85; }
    .btn-danger { color: var(--danger); border-color: var(--danger); }
    .btn-danger:hover { background: var(--danger); color: var(--surface); }
    .btn-sm { padding: 5px 10px; font-size: 10px; }
 
    /* ── Form / Modal ── */
    .modal-overlay {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.5);
      display: flex; align-items: center; justify-content: center;
      z-index: 100;
    }
    .modal {
      background: var(--surface);
      border: 1px solid var(--border2);
      width: 540px;
      max-width: 95vw;
      max-height: 90vh;
      overflow-y: auto;
    }
    .modal-header {
      padding: 20px 24px;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: sticky;
      top: 0;
      background: var(--surface);
      z-index: 1;
    }
    .modal-title { font-size: 14px; letter-spacing: -0.02em; }
    .modal-close {
      background: none;
      border: none;
      color: var(--muted);
      font-size: 20px;
      line-height: 1;
      transition: color 0.12s;
    }
    .modal-close:hover { color: var(--text); }
    .modal-body { padding: 24px; }
    .form-group { margin-bottom: 16px; }
    .form-label {
      display: block;
      font-size: 10px;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: var(--muted);
      margin-bottom: 6px;
    }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .modal-footer {
      padding: 16px 24px;
      border-top: 1px solid var(--border);
      display: flex;
      gap: 10px;
      justify-content: flex-end;
    }
 
    /* ── Drawer (product detail) ── */
    .drawer-overlay {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.5);
      z-index: 90;
    }
    .drawer {
      position: fixed;
      top: 0; right: 0; bottom: 0;
      width: 700px;
      max-width: 95vw;
      background: var(--surface);
      border-left: 1px solid var(--border2);
      overflow-y: auto;
      z-index: 91;
    }
    .drawer-header {
      padding: 20px 28px;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: sticky;
      top: 0;
      background: var(--surface);
    }
    .drawer-body { padding: 24px 28px; }
    .section-title {
      font-size: 10px;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: var(--muted);
      margin-bottom: 14px;
      margin-top: 28px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--border);
    }
    .section-title:first-child { margin-top: 0; }
 
    /* ── Variants inline ── */
    .variant-row {
      display: grid;
      grid-template-columns: 1fr 80px 80px 70px 60px auto;
      gap: 8px;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid var(--border);
    }
    .variant-row:last-child { border-bottom: none; }
    .variant-inp {
      background: var(--surface2);
      border: 1px solid transparent;
      padding: 6px 8px;
      color: var(--text);
      font-family: var(--font);
      font-size: 12px;
      width: 100%;
    }
    .variant-inp:focus { border-color: var(--accent); outline: none; }
 
    /* ── Upload ── */
    .upload-zone {
      border: 1px dashed var(--border2);
      padding: 20px;
      text-align: center;
      color: var(--muted);
      cursor: pointer;
      transition: border-color 0.15s, color 0.15s;
    }
    .upload-zone:hover { border-color: var(--accent); color: var(--text); }
    .image-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-top: 12px;
    }
    .image-thumb {
      position: relative;
      aspect-ratio: 1;
      background: var(--surface2);
      border: 1px solid var(--border);
      overflow: hidden;
    }
    .image-thumb img { width: 100%; height: 100%; object-fit: cover; }
    .image-thumb button {
      position: absolute;
      top: 4px; right: 4px;
      background: var(--surface);
      border: 1px solid var(--border);
      color: var(--danger);
      width: 22px; height: 22px;
      font-size: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
 
    /* ── Collabs grid ── */
    .collab-order-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      background: var(--accent-dim);
      border: 1px solid var(--accent);
      padding: 10px 16px;
      font-size: 12px;
      margin-bottom: 16px;
      position: sticky;
      top: 0;
      z-index: 5;
    }
    .collab-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 16px;
    }
    .collab-card {
      position: relative;
      background: var(--surface);
      border: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      cursor: grab;
      transition: border-color 0.12s, box-shadow 0.12s, opacity 0.12s;
    }
    .collab-card:hover { border-color: var(--border2); box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
    .collab-card.dragging { opacity: 0.4; }
    .collab-card.drag-over { border-color: var(--accent); box-shadow: 0 0 0 2px var(--accent-dim); }
    .collab-drag-handle {
      position: absolute;
      top: 8px; left: 8px;
      width: 26px; height: 26px;
      display: flex; align-items: center; justify-content: center;
      background: rgba(255,255,255,0.9);
      border: 1px solid var(--border);
      color: var(--muted);
      font-size: 14px;
      z-index: 2;
      cursor: grab;
    }
    .collab-drag-handle:active { cursor: grabbing; }
    .collab-cover {
      position: relative;
      aspect-ratio: 16/9;
      background: var(--surface2);
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .collab-cover img { width: 100%; height: 100%; object-fit: cover; }
    .collab-cover span { color: var(--muted); font-size: 11px; letter-spacing: 0.05em; text-transform: uppercase; }
    .collab-logo-badge {
      position: absolute;
      bottom: 8px; right: 8px;
      width: 40px; height: 40px;
      background: var(--surface);
      border: 1px solid var(--border);
      display: flex; align-items: center; justify-content: center;
      padding: 4px;
    }
    .collab-logo-badge img { width: 100%; height: 100%; object-fit: contain; }
    .collab-card-body { padding: 14px 16px 10px; flex: 1; }
    .collab-card-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 6px;
    }
    .collab-card-title {
      font-size: 14px;
      letter-spacing: -0.02em;
      font-weight: 700;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .collab-card-meta {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
    }
    .collab-card-actions {
      display: flex;
      gap: 8px;
      padding: 0 16px 16px;
    }
    .collab-card-actions .btn { flex: 1; justify-content: center; }

    /* ── Misc ── */
    .empty { color: var(--muted); padding: 40px; text-align: center; font-size: 12px; }
    .loading { color: var(--muted); padding: 20px; text-align: center; }
    .toolbar { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
    .toolbar-spacer { flex: 1; }
    .price { font-variant-numeric: tabular-nums; }
    .text-muted { color: var(--muted); }
    .text-success { color: var(--success); }
    .text-danger { color: var(--danger); }
    .flex { display: flex; align-items: center; gap: 8px; }
    .toast {
      position: fixed;
      bottom: 24px; right: 24px;
      background: var(--surface2);
      border: 1px solid var(--border2);
      padding: 12px 18px;
      font-size: 12px;
      z-index: 200;
      opacity: 0;
      transform: translateY(8px);
      transition: all 0.2s;
      pointer-events: none;
    }
    .toast.show { opacity: 1; transform: translateY(0); }
    .toast.ok { border-color: var(--success); color: var(--success); }
    .toast.err { border-color: var(--danger); color: var(--danger); }
 
    select { appearance: none; }
    .filter-select {
      width: auto;
      padding: 7px 30px 7px 12px;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23666'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 10px center;
    }
`;
