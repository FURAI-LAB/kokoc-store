// item-form.css.js — shared CSS for the product/brand-item edit form.
// Previously duplicated verbatim inside renderProductForm() and renderBrandForm();
// both now render through the single renderItemForm() and share this stylesheet.
// Exported as a plain string, interpolated into a <style> tag by item-form.js.

export const itemFormStyles = `
      .pf-layout { display:grid; grid-template-columns:1fr 320px; gap:24px; align-items:start; }
      .pf-card { background:var(--surface); border:1px solid var(--border); padding:28px; margin-bottom:20px; }
      .pf-card-title { font-size:13px; font-weight:600; letter-spacing:-0.01em; margin-bottom:20px; }
      .pf-row { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
      .pf-group { margin-bottom:16px; }
      .pf-group:last-child { margin-bottom:0; }
      .pf-label { display:block; font-size:10px; letter-spacing:0.15em; text-transform:uppercase; color:var(--muted); margin-bottom:6px; }
      .pf-label span { color:var(--danger); }
      .slug-preview { font-size:11px; color:var(--muted); margin-top:5px; }
      .slug-preview a { color:var(--accent); }
 
      /* Status dropdown with dot */
      .status-select-wrap { position:relative; }
      .status-dot { position:absolute; left:12px; top:50%; transform:translateY(-50%); width:8px; height:8px; border-radius:50%; background:var(--success); pointer-events:none; z-index:1; }
      .status-dot.draft { background:var(--muted); }
      .status-dot.archived { background:var(--danger); }
      select.has-dot { padding-left:28px; }
 
      /* Chips (sizes, tags) */
      .chips-wrap { display:flex; flex-wrap:wrap; gap:6px; align-items:center; padding:8px 10px; background:var(--surface2); border:1px solid var(--border); min-height:40px; cursor:text; }
      .chip { display:inline-flex; align-items:center; gap:4px; background:var(--surface); border:1px solid var(--border); border-radius:4px; padding:2px 8px; font-size:12px; }
      .chip button { background:none; border:none; color:var(--muted); font-size:14px; line-height:1; padding:0 0 0 2px; cursor:pointer; transition:color 0.1s; }
      .chip button:hover { color:var(--danger); }
      .chip-input { border:none; background:none; outline:none; font-size:12px; font-family:var(--font); color:var(--text); min-width:60px; flex:1; padding:0; }
 
      /* Color swatches */
      .color-list { display:flex; flex-direction:column; gap:8px; margin-bottom:10px; }
      .color-row { display:flex; align-items:center; gap:10px; padding:8px 12px; background:var(--surface2); border:1px solid var(--border); }
      .color-swatch { width:24px; height:24px; border-radius:50%; border:1px solid rgba(0,0,0,0.1); flex-shrink:0; }
      .color-name { flex:1; font-size:13px; }
      .color-hex { font-size:11px; color:var(--muted); font-family:monospace; }
      .color-remove { background:none; border:none; color:var(--muted); font-size:16px; cursor:pointer; padding:0; transition:color 0.1s; }
      .color-remove:hover { color:var(--danger); }
      .color-add-row { display:flex; gap:8px; align-items:center; }
      .color-add-row input[type=color] { width:36px; height:36px; padding:2px; border:1px solid var(--border); background:var(--surface2); cursor:pointer; }
      .color-add-row input[type=text] { flex:1; }
 
      /* Photo upload */
      .photo-dropzone {
        border:2px dashed var(--border);
        padding:28px 20px;
        text-align:center;
        color:var(--muted);
        cursor:pointer;
        transition:border-color 0.15s, background 0.15s;
        margin-bottom:14px;
        border-radius:2px;
      }
      .photo-dropzone:hover, .photo-dropzone.drag-over { border-color:var(--accent); background:var(--accent-dim); color:var(--text); }
      .photo-dropzone .upload-icon { font-size:28px; margin-bottom:8px; }
      .photo-dropzone .upload-main { font-size:13px; margin-bottom:4px; }
      .photo-dropzone .upload-link { color:var(--accent); cursor:pointer; text-decoration:underline; }
      .photo-dropzone .upload-hint { font-size:11px; color:var(--muted); }
      .photo-gallery { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; }
      .photo-thumb {
        position:relative; aspect-ratio:1;
        background:var(--surface2); border:2px solid transparent;
        overflow:hidden; border-radius:2px; cursor:pointer;
        transition:border-color 0.15s;
      }
      .photo-thumb.is-primary { border-color:var(--accent); }
      .photo-thumb img { width:100%; height:100%; object-fit:cover; }
      .photo-thumb .thumb-num {
        position:absolute; top:4px; left:4px;
        width:18px; height:18px; border-radius:50%;
        background:var(--accent); color:#fff; font-size:10px;
        display:flex; align-items:center; justify-content:center;
        opacity:0; transition:opacity 0.1s;
      }
      .photo-thumb.is-primary .thumb-num { opacity:1; }
      .photo-thumb .thumb-del {
        position:absolute; top:4px; right:4px;
        background:var(--surface); border:1px solid var(--border);
        color:var(--danger); width:20px; height:20px;
        font-size:11px; display:flex; align-items:center; justify-content:center;
        opacity:0; transition:opacity 0.1s; border-radius:2px;
      }
      .photo-thumb:hover .thumb-del { opacity:1; }
      .photo-thumb .thumb-label {
        position:absolute; bottom:0; left:0; right:0;
        background:rgba(0,0,0,0.55); color:#fff;
        font-size:9px; padding:3px 5px; text-align:center;
        white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
      }
      .photo-gallery-hint { font-size:11px; color:var(--muted); margin-top:8px; }
 
      /* Variants table */
      .variants-table { width:100%; border-collapse:collapse; margin-top:4px; }
      .variants-table th { font-size:10px; letter-spacing:0.12em; text-transform:uppercase; color:var(--muted); padding:8px 10px; border-bottom:1px solid var(--border); text-align:left; }
      .variants-table td { padding:10px 10px; border-bottom:1px solid var(--border); font-size:12px; vertical-align:middle; }
      .variants-table tr:last-child td { border-bottom:none; }
      .variants-table tr:hover td { background:var(--surface2); }
 
      /* Prices */
      .price-input-wrap { position:relative; display:flex; align-items:center; }
      .price-input-wrap input { padding-right:40px; }
      .price-currency {
        position:absolute; right:0; top:0; bottom:0;
        display:flex; align-items:center; justify-content:center;
        width:36px; background:var(--surface2); border-left:1px solid var(--border);
        font-size:12px; color:var(--muted); pointer-events:none;
      }

      /* Description rich-text editor */
      .rte-wrap { border:1px solid var(--border); background:var(--surface2); }
      .rte-toolbar { display:flex; gap:2px; padding:6px; border-bottom:1px solid var(--border); flex-wrap:wrap; }
      .rte-btn {
        display:inline-flex; align-items:center; justify-content:center;
        min-width:30px; height:28px; padding:0 8px;
        background:transparent; border:1px solid transparent; border-radius:3px;
        font-family:var(--font); font-size:12px; color:var(--text);
        cursor:pointer; transition:background 0.1s, border-color 0.1s;
      }
      .rte-btn:hover { background:var(--surface); border-color:var(--border); }
      .rte-btn.is-active { background:var(--accent-dim); border-color:var(--accent); color:var(--text); }
      .rte-btn b { font-weight:700; }
      .rte-btn i { font-style:italic; }
      .rte-sep { width:1px; background:var(--border); margin:4px 2px; }
      .rte-editor {
        min-height:130px; max-height:420px; overflow-y:auto;
        padding:12px 14px; font-size:13px; line-height:1.6; color:var(--text);
        background:var(--surface); outline:none;
      }
      .rte-editor:empty::before {
        content: attr(data-placeholder);
        color: var(--muted);
      }
      .rte-editor p { margin:0 0 10px; }
      .rte-editor p:last-child { margin-bottom:0; }
      .rte-editor h3 { font-size:14px; font-weight:600; margin:14px 0 8px; }
      .rte-editor h3:first-child { margin-top:0; }
      .rte-editor ul { margin:0 0 10px; padding-left:20px; }
      .rte-editor ul:last-child { margin-bottom:0; }
      .rte-editor li { margin-bottom:4px; }
`;
