/* Shared UI primitives: theme, toast, modal, charts, print, csv */
(function () {
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---------- theme ----------
  const Theme = {
    init() { document.documentElement.setAttribute('data-theme', localStorage.getItem('osms_theme') || 'dark'); },
    toggle() { const t = Theme.current() === 'dark' ? 'light' : 'dark'; document.documentElement.setAttribute('data-theme', t); localStorage.setItem('osms_theme', t); return t; },
    current: () => document.documentElement.getAttribute('data-theme') || 'dark'
  };
  Theme.init();

  // ---------- toast ----------
  function toast(title, msg, type) {
    type = type || 'success';
    let stack = $('.toast-stack');
    if (!stack) { stack = document.createElement('div'); stack.className = 'toast-stack'; stack.setAttribute('aria-live', 'polite'); document.body.appendChild(stack); }
    const ic = { success: 'checkCircle', error: 'alert', info: 'info', warning: 'alert' }[type];
    const el = document.createElement('div');
    el.className = 'toast toast-' + type; el.setAttribute('role', 'status');
    el.innerHTML = icon(ic) + '<div><strong>' + esc(title) + '</strong>' + (msg ? '<p>' + msg + '</p>' : '') + '</div>';
    stack.appendChild(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 250); }, type === 'error' ? 5000 : 3800);
  }

  // ---------- modal ----------
  function modal(opts) {
    const back = document.createElement('div');
    back.className = 'modal-backdrop';
    back.innerHTML = '<div class="modal ' + (opts.size === 'lg' ? 'modal-lg' : '') + '" role="dialog" aria-modal="true" aria-labelledby="modal-title">' +
      '<div class="modal-head"><h3 id="modal-title">' + opts.title + '</h3><button class="btn btn-ghost btn-icon btn-sm" data-close aria-label="Close">' + icon('x') + '</button></div>' +
      '<div class="modal-body">' + opts.body + '</div>' + (opts.foot ? '<div class="modal-foot">' + opts.foot + '</div>' : '') + '</div>';
    const prevFocus = document.activeElement;
    function close() { back.classList.add('closing'); setTimeout(() => back.remove(), 200); document.removeEventListener('keydown', onKey); prevFocus && prevFocus.focus && prevFocus.focus(); opts.onClose && opts.onClose(); }
    function onKey(e) { if (e.key === 'Escape' && !opts.locked) close(); }
    back.addEventListener('click', e => { if ((e.target === back && !opts.locked) || e.target.closest('[data-close]')) close(); });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(back);
    const first = back.querySelector('input:not([type=hidden]):not([readonly]), select, textarea, .btn-primary');
    setTimeout(() => first && first.focus(), 60);
    const api = { el: back, close, $: s => back.querySelector(s), $$: s => Array.from(back.querySelectorAll(s)) };
    opts.onOpen && opts.onOpen(api);
    return api;
  }
  function confirmBox(title, msg, okLabel, danger) {
    return new Promise(res => {
      let ok = false;
      const m = modal({
        title, body: '<p class="muted">' + msg + '</p>',
        foot: '<button class="btn" data-close>Cancel</button><button class="btn ' + (danger ? 'btn-danger' : 'btn-primary') + '" id="confirm-ok">' + (okLabel || 'Confirm') + '</button>',
        onClose: () => res(ok)
      });
      m.$('#confirm-ok').onclick = () => { ok = true; m.close(); };
    });
  }

  // ---------- form validation ----------
  function validate(root) {
    let ok = true;
    $$('[data-rule]', root).forEach(inp => {
      const field = inp.closest('.field'); const v = inp.value.trim(); const rules = inp.dataset.rule.split('|'); let err = '';
      rules.forEach(r => {
        if (err) return;
        if (r === 'required' && !v) err = 'This field is required';
        if (r === 'email' && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) err = 'Enter a valid email address';
        if (r === 'phone' && v && !/^\+?[\d\s-]{10,15}$/.test(v)) err = 'Enter a valid phone number';
        if (r.startsWith('min:') && v.length < +r.slice(4)) err = 'Must be at least ' + r.slice(4) + ' characters';
        if (r.startsWith('num:')) { const [a, b] = r.slice(4).split(',').map(Number); if (v === '' || isNaN(+v) || +v < a || +v > b) err = 'Enter a number between ' + a + ' and ' + b; }
        if (r === 'strong' && v && !(/[A-Z]/.test(v) && /\d/.test(v) && /[^A-Za-z0-9]/.test(v) && v.length >= 8)) err = 'Use 8+ chars with uppercase, number & symbol';
      });
      if (field) { field.classList.toggle('invalid', !!err); const fe = field.querySelector('.field-error'); if (fe) fe.textContent = err; }
      inp.setAttribute('aria-invalid', err ? 'true' : 'false');
      if (err) ok = false;
    });
    const firstBad = $('.field.invalid input, .field.invalid select, .field.invalid textarea', root);
    firstBad && firstBad.focus();
    return ok;
  }
  function field(o) {
    const id = o.id; const attrs = (o.rule ? ' data-rule="' + o.rule + '"' : '') + (o.readonly ? ' readonly' : '') + (o.placeholder ? ' placeholder="' + esc(o.placeholder) + '"' : '') + (o.attrs || '');
    let control;
    if (o.type === 'select') control = '<select class="select" id="' + id + '"' + attrs + '>' + o.options.map(op => { const [v, l] = Array.isArray(op) ? op : [op, op]; return '<option value="' + esc(v) + '"' + (String(v) === String(o.value) ? ' selected' : '') + '>' + esc(l) + '</option>'; }).join('') + '</select>';
    else if (o.type === 'textarea') control = '<textarea class="textarea" id="' + id + '"' + attrs + '>' + esc(o.value || '') + '</textarea>';
    else control = '<input class="input" id="' + id + '" type="' + (o.type || 'text') + '" value="' + esc(o.value == null ? '' : o.value) + '"' + attrs + '>';
    return '<div class="field ' + (o.span ? 'span-2' : '') + '"><label for="' + id + '">' + o.label + '</label>' + control + (o.hint ? '<span class="hint">' + o.hint + '</span>' : '') + '<span class="field-error"></span></div>';
  }

  // ---------- charts (pure SVG) ----------
  const Charts = {
    bar(data, opts) {
      opts = opts || {}; const W = 560, H = opts.h || 220, padL = 36, padB = 28, padT = 12;
      const max = opts.max || Math.max(...data.map(d => d.v)) * 1.15 || 1;
      const bw = (W - padL) / data.length; let s = '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(opts.label || 'Bar chart') + '">';
      for (let i = 0; i <= 4; i++) { const y = padT + (H - padB - padT) * i / 4; s += '<line class="grid-line" x1="' + padL + '" x2="' + W + '" y1="' + y + '" y2="' + y + '" stroke-dasharray="3 4"/><text x="' + (padL - 8) + '" y="' + (y + 4) + '" text-anchor="end">' + Math.round(max * (1 - i / 4)) + (opts.suffix || '') + '</text>'; }
      data.forEach((d, i) => {
        const h = (H - padB - padT) * d.v / max; const x = padL + i * bw + bw * 0.2; const w = bw * 0.6; const y = H - padB - h;
        s += '<rect class="bar-anim" style="animation-delay:' + (i * 60) + 'ms" x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="6" fill="' + (d.c || 'url(#gbar)') + '"><title>' + esc(d.l) + ': ' + d.v + (opts.suffix || '') + '</title></rect>';
        s += '<text x="' + (x + w / 2) + '" y="' + (H - 8) + '" text-anchor="middle">' + esc(d.l) + '</text>';
        if (opts.values) s += '<text x="' + (x + w / 2) + '" y="' + (y - 6) + '" text-anchor="middle" style="fill:var(--text-2);font-weight:600">' + d.v + (opts.suffix || '') + '</text>';
      });
      s += '<defs><linearGradient id="gbar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2DD4BF"/><stop offset="1" stop-color="#0D9488" stop-opacity=".55"/></linearGradient></defs></svg>';
      return s;
    },
    line(series, labels, opts) {
      opts = opts || {}; const W = 560, H = opts.h || 220, padL = 36, padB = 28, padT = 14;
      const all = series.flatMap(s => s.data); const min = opts.min != null ? opts.min : Math.min(...all) * 0.9; const max = opts.max || Math.max(...all) * 1.05;
      const X = i => padL + (W - padL - 10) * i / (labels.length - 1); const Y = v => padT + (H - padB - padT) * (1 - (v - min) / (max - min));
      let s = '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(opts.label || 'Line chart') + '"><defs>';
      series.forEach((se, k) => { s += '<linearGradient id="gl' + k + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + se.c + '" stop-opacity=".28"/><stop offset="1" stop-color="' + se.c + '" stop-opacity="0"/></linearGradient>'; });
      s += '</defs>';
      for (let i = 0; i <= 4; i++) { const v = min + (max - min) * (1 - i / 4); const y = Y(v); s += '<line class="grid-line" x1="' + padL + '" x2="' + W + '" y1="' + y + '" y2="' + y + '" stroke-dasharray="3 4"/><text x="' + (padL - 8) + '" y="' + (y + 4) + '" text-anchor="end">' + (Math.round(v * 10) / 10) + (opts.suffix || '') + '</text>'; }
      labels.forEach((l, i) => { if (labels.length < 10 || i % 2 === 0) s += '<text x="' + X(i) + '" y="' + (H - 8) + '" text-anchor="middle">' + esc(l) + '</text>'; });
      series.forEach((se, k) => {
        const pts = se.data.map((v, i) => [X(i), Y(v)]);
        const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
        s += '<path d="' + d + ' L' + X(se.data.length - 1) + ' ' + (H - padB) + ' L' + padL + ' ' + (H - padB) + ' Z" fill="url(#gl' + k + ')"/>';
        s += '<path class="line-anim" d="' + d + '" fill="none" stroke="' + se.c + '" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>';
        pts.forEach((p, i) => { s += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="3.5" fill="var(--surface)" stroke="' + se.c + '" stroke-width="2"><title>' + esc(labels[i]) + ': ' + se.data[i] + (opts.suffix || '') + '</title></circle>'; });
      });
      return s + '</svg>';
    },
    donut(parts, opts) {
      opts = opts || {}; const size = opts.size || 180, r = size / 2 - 14, c = 2 * Math.PI * r, total = parts.reduce((a, p) => a + p.v, 0) || 1; let off = 0;
      let s = '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" role="img" aria-label="' + esc(opts.label || 'Donut chart') + '" style="transform:rotate(-90deg)">';
      s += '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="var(--surface-hover)" stroke-width="18"/>';
      parts.forEach(p => { const len = c * p.v / total; s += '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="' + p.c + '" stroke-width="18" stroke-dasharray="' + Math.max(0, len - 3) + ' ' + c + '" stroke-dashoffset="' + (-off) + '" stroke-linecap="round"><title>' + esc(p.l) + '</title></circle>'; off += len; });
      return '<div class="ring">' + s + '</svg><div class="ring-label">' + (opts.center || '') + '</div></div>';
    },
    ring(pct, opts) {
      opts = opts || {}; const size = opts.size || 96, sw = opts.sw || 9, r = (size - sw) / 2, c = 2 * Math.PI * r;
      const col = opts.color || (pct >= 85 ? 'var(--success)' : pct >= 75 ? 'var(--primary)' : 'var(--danger)');
      return '<div class="ring"><svg width="' + size + '" height="' + size + '" aria-hidden="true"><circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="var(--surface-hover)" stroke-width="' + sw + '"/>' +
        '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="' + col + '" stroke-width="' + sw + '" stroke-linecap="round" stroke-dasharray="' + c + '" stroke-dashoffset="' + c + '" style="transition:stroke-dashoffset 1s cubic-bezier(.2,.8,.2,1)" data-ring="' + (c * (1 - Math.min(100, pct) / 100)) + '"/></svg>' +
        '<div class="ring-label"><strong style="font-size:' + (size > 90 ? 20 : 15) + 'px">' + (opts.text || pct + '%') + '</strong>' + (opts.sub ? '<small>' + opts.sub + '</small>' : '') + '</div></div>';
    },
    animate(root) { requestAnimationFrame(() => setTimeout(() => $$('[data-ring]', root).forEach(c => c.style.strokeDashoffset = c.dataset.ring), 50)); }
  };

  // ---------- print / export ----------
  function printDoc(html) {
    let root = $('#print-root'); if (!root) { root = document.createElement('div'); root.id = 'print-root'; document.body.appendChild(root); }
    root.innerHTML = html; setTimeout(() => window.print(), 100);
  }
  function downloadCSV(name, rows) {
    const csv = rows.map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  // ---------- count-up ----------
  function countUp(root) {
    $$('[data-count]', root).forEach(el => {
      const target = parseFloat(el.dataset.count); const dec = (el.dataset.count.split('.')[1] || '').length; const pre = el.dataset.prefix || ''; const suf = el.dataset.suffix || '';
      const fmt = v => pre + (el.dataset.inr ? Math.round(v).toLocaleString('en-IN') : v.toFixed(dec)) + suf;
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) { el.textContent = fmt(target); return; }
      const t0 = performance.now(); const dur = 900;
      (function step(t) { const k = Math.min(1, (t - t0) / dur); const e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(target * e); if (k < 1) requestAnimationFrame(step); })(t0);
    });
  }

  window.UI = { $, $$, esc, Theme, toast, modal, confirm: confirmBox, validate, field, Charts, printDoc, downloadCSV, countUp };
})();
