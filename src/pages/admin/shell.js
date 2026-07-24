// shell.js — the static HTML shell for the admin SPA: <head>/<style>
// (via admin-shell.css.js) plus the sidebar/topbar/content markup that the
// client script (assembled in index.js) mounts into.
//
// Note: a `topbar-search-input` element is referenced by resetSearch() in
// core.js but was never actually added to this markup in the original —
// resetSearch() silently no-ops via its `if (input)` guard. Left as-is;
// flagging here rather than quietly finishing the feature.

import { adminBaseStyles } from './admin-shell.css.js';

export function shellHtml() {
  return /* html */`<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kokoc Admin</title>
  <style>${adminBaseStyles}</style>
</head>
<body>
<div id="app">
  <!-- Sidebar -->
  <aside id="sidebar">
    <div class="sidebar-logo"><span>KOKOC</span> / ADMIN</div>
    <nav id="nav"></nav>
    <div class="sidebar-footer">
      <button class="logout-btn" onclick="logout()">Выйти</button>
    </div>
  </aside>

  <!-- Main -->
  <div id="main">
    <div class="topbar">
      <div class="topbar-title" id="page-title">Загрузка...</div>
      <div id="topbar-actions"></div>
    </div>
    <div class="content" id="content">
      <div class="loading">Загрузка...</div>
    </div>
  </div>
</div>

<!-- Toast -->
<div class="toast" id="toast"></div>
`;
}
