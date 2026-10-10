/* =========================================================
   Faculty views — Dashboard, Mark Attendance, Gradebook, My Courses
   FR-4.1, FR-4.2, FR-4.3, FR-5.3
   ========================================================= */
(function () {
  const { $, $$, esc, toast, modal, Charts } = UI;
  const O = OSMS;
  const fac = () => O.facultyById(App.user.ref);
  const mine = () => O.db.courses.filter(c => c.faculty === App.user.ref);
  const pendingGrades = c => O.db.enrollments.filter(e => e.courseId === c.id && e.status === 'enrolled' && !O.markSummary(e.marks).complete).length;
  const lastClassDate = c => { for (let k = 0; k < 14; k++) { const d = O.addDays(O.today, -k); const wd = d.getDay() - 1; if (c.slots.some(s => s[0] === wd)) return O.iso(d); } return O.iso(O.today); };

  window.APP_VIEWS = window.APP_VIEWS || {};
  window.APP_VIEWS.faculty = {
    dashboard(el) {
      const f = fac(); const cs = mine(); const students = cs.reduce((a, c) => a + c.filled, 0);
      const avg = Math.round(cs.reduce((a, c) => a + O.courseAttAvg(c.id), 0) / cs.length * 10) / 10;
      const pend = cs.reduce((a, c) => a + pendingGrades(c), 0); const next = App.nextClassDay(cs);
      const risk = []; cs.forEach(c => O.rosterOf(c.id).forEach(s => { const a = O.attStats(s.id, c.id); if (a.pct < 75) risk.push({ s, c, a }); }));
      const todayISO = O.iso(O.today);
      el.innerHTML =
        '<div class="hero-card" style="margin-bottom:20px"><div class="row-between wrap" style="gap:20px"><div><span class="badge badge-warning" style="margin-bottom:12px">' + icon('building', 'icon-sm') + esc(f.designation) + ' · ' + f.dept + '</span><h1 style="font-size:28px">Welcome back, ' + esc(f.name) + '</h1><p>' + (next && next.isToday ? 'You teach <strong>' + next.list.length + ' session' + (next.list.length > 1 ? 's' : '') + '</strong> today.' : 'No sessions today.') + ' ' + pend + ' grade entries are pending for Mid-II / End-Sem.</p></div><div class="row wrap"><a class="btn btn-primary" href="#/mark-attendance">' + icon('calendarCheck') + 'Mark attendance</a><a class="btn" href="#/gradebook">' + icon('cap') + 'Open gradebook</a></div></div></div>' +
        '<div class="grid grid-4" style="margin-bottom:20px">' + App.stat('Courses taught', cs.length, esc(O.db.settings.term), 'book', 'tone-teal') + App.stat('Students', students, 'Across all sections', 'users', 'tone-violet', 'data-count="' + students + '"') + App.stat('Avg attendance', avg + '%', 'All your courses', 'activity', avg >= 80 ? 'tone-green' : 'tone-amber', 'data-count="' + avg + '" data-suffix="%"') + App.stat('Pending grades', pend, 'Components to enter', 'listCheck', 'tone-amber', 'data-count="' + pend + '"') + '</div>' +
        '<div class="grid grid-main"><div class="stack" style="gap:20px"><div class="card"><div class="card-head"><div><h3>' + (next ? (next.isToday ? 'Today’s sessions' : 'Next sessions · ' + O.fmtDate(O.iso(next.date), { weekday: 'long', day: 'numeric', month: 'short' })) : 'Sessions') + '</h3><div class="sub">Tap to mark attendance</div></div></div><div class="card-body" style="padding-top:6px;padding-bottom:6px">' +
        (next ? next.list.map(x => { const done = next.isToday && O.db.attendance[x.c.id][todayISO]; return '<div class="list-item"><span class="ic tone-amber mono" style="font-size:12px;font-weight:600;width:56px">' + x.time + '</span><div class="grow"><strong>' + esc(x.c.title) + '</strong><small><span class="mono">' + x.c.id + '</span> · ' + x.room + ' · ' + O.rosterOf(x.c.id).length + ' on roster</small></div>' + (done ? '<span class="badge badge-success">' + icon('check', 'icon-sm') + 'Marked</span>' : next.isToday ? '<a class="btn btn-primary btn-sm" href="#/mark-attendance?c=' + x.c.id + '">Mark</a>' : '<span class="badge">Upcoming</span>') + '</div>'; }).join('') : '') + '</div></div>' +
        '<div class="card"><div class="card-head"><h3>Course overview</h3></div><div class="table-wrap"><table class="table"><thead><tr><th>Course</th><th class="num">Enrolled</th><th>Attendance</th><th>Grading</th></tr></thead><tbody>' +
        cs.map(c => { const a = O.courseAttAvg(c.id); const r = O.rosterOf(c.id).length; const p = pendingGrades(c); const done = Math.round((r - p) / Math.max(1, r) * 100); return '<tr><td><div class="cell-user"><div><strong>' + esc(c.title) + '</strong><small>' + c.id + '</small></div></div></td><td class="num">' + c.filled + '/' + c.capacity + '</td><td style="min-width:150px"><div class="row" style="gap:8px"><div class="progress grow ' + (a < 75 ? 'bad' : a < 85 ? 'warn' : '') + '" style="flex:1"><span style="width:' + a + '%"></span></div><span class="mono" style="font-size:12.5px">' + a + '%</span></div></td><td><span class="badge ' + (done === 100 ? 'badge-success' : 'badge-warning') + '">' + done + '% complete</span></td></tr>'; }).join('') + '</tbody></table></div></div></div>' +
        '<div class="stack" style="gap:20px"><div class="card"><div class="card-head"><div><h3>Students at risk</h3><div class="sub">Attendance below 75%</div></div><span class="badge badge-danger">' + risk.length + '</span></div><div class="card-body" style="padding-top:4px;padding-bottom:4px">' +
        (risk.length ? risk.slice(0, 6).map(x => '<div class="list-item"><span class="avatar" style="width:32px;height:32px;font-size:11px">' + O.initials(x.s.name) + '</span><div class="grow"><strong>' + esc(x.s.name) + '</strong><small class="mono">' + x.c.id + ' · ' + x.s.id + '</small></div><span class="badge badge-danger mono">' + x.a.pct + '%</span></div>').join('') : '<div class="empty">' + icon('checkCircle') + 'Everyone is above 75%</div>') + '</div></div>' +
        '<div class="card"><div class="card-head"><h3>Notices</h3><a class="btn btn-ghost btn-sm" href="#/notices">All</a></div><div class="card-body" style="padding-top:4px;padding-bottom:4px">' + O.noticesFor(App.user).slice(0, 3).map(App.noticeItem).join('') + '</div></div></div></div>';
      App.bindNotices(el);
    },

    'mark-attendance'(el) {
      const cs = mine(); const qp = new URLSearchParams(location.hash.split('?')[1] || '');
      let cid = qp.get('c') || cs[0].id; let date = qp.get('c') ? O.iso(O.today) : lastClassDate(O.course(cid));
      let marks = {};
      el.innerHTML = App.pageHead('Mark Attendance', 'Record or edit attendance for each session (FR-4.1). Changes are reflected instantly on student dashboards.') +
        '<div class="card" style="margin-bottom:20px"><div class="card-body"><div class="row wrap" style="gap:16px;align-items:flex-end">' +
        '<div class="field" style="min-width:260px;flex:1"><label for="att-course">Course</label><select class="select" id="att-course">' + cs.map(c => '<option value="' + c.id + '"' + (c.id === cid ? ' selected' : '') + '>' + c.id + ' · ' + esc(c.title) + '</option>').join('') + '</select></div>' +
        '<div class="field"><label for="att-date">Session date</label><input class="input" type="date" id="att-date" max="' + O.iso(O.today) + '"></div>' +
        '<div class="row" style="gap:8px"><button class="btn" id="all-p">' + icon('checkCircle', 'icon-sm') + 'All present</button><button class="btn" id="all-a">' + icon('x', 'icon-sm') + 'All absent</button></div></div><div id="sess-info" style="margin-top:14px"></div></div></div>' +
        '<div class="grid grid-main"><div class="card"><div class="card-head"><h3>Roster</h3><div class="input-group" style="width:220px">' + icon('search') + '<input class="input" id="roster-search" placeholder="Filter students"></div></div><div class="table-wrap"><table class="table"><thead><tr><th>Student</th><th class="num">Overall</th><th style="text-align:right">Status</th></tr></thead><tbody id="roster"></tbody></table></div><div class="modal-foot" style="border-radius:0 0 16px 16px"><span class="subtle" style="margin-right:auto;font-size:13px" id="att-sum"></span><button class="btn btn-primary" id="att-save">' + icon('check') + 'Save attendance</button></div></div>' +
        '<div class="card"><div class="card-head"><h3>Recent sessions</h3><span class="sub">Click to edit</span></div><div class="card-body" style="padding-top:4px;padding-bottom:4px" id="recent"></div></div></div>';
      const load = () => {
        const c = O.course(cid); $('#att-date', el).value = date;
        const existing = O.db.attendance[cid][date]; const roster = O.rosterOf(cid);
        marks = {}; roster.forEach(s => marks[s.id] = existing ? existing[s.id] || 'P' : 'P');
        const wd = new Date(date + 'T00:00').getDay() - 1; const scheduled = c.slots.some(s => s[0] === wd);
        $('#sess-info', el).innerHTML = existing ? '<div class="banner banner-info" style="margin:0">' + icon('pencil') + '<p>Editing an existing session for <strong>' + O.fmtDate(date, { weekday: 'long', day: 'numeric', month: 'short' }) + '</strong>. Saved changes overwrite the previous record.</p></div>'
          : '<div class="banner ' + (scheduled ? 'banner-info' : 'banner-warn') + '" style="margin:0">' + icon(scheduled ? 'calendarCheck' : 'alert') + '<p>' + (scheduled ? 'New session · ' + O.fmtDate(date, { weekday: 'long', day: 'numeric', month: 'short' }) + '. All students default to <strong>Present</strong>.' : 'No ' + c.id + ' class is scheduled on this day — saving will record an extra session.') + '</p></div>';
        drawRoster(); drawRecent();
      };
      const drawRoster = () => {
        const q = $('#roster-search', el).value.toLowerCase();
        $('#roster', el).innerHTML = O.rosterOf(cid).filter(s => !q || (s.name + s.id).toLowerCase().includes(q)).map(s => { const a = O.attStats(s.id, cid); return '<tr><td><div class="cell-user"><span class="avatar" style="width:32px;height:32px;font-size:11px">' + O.initials(s.name) + '</span><div><strong>' + esc(s.name) + '</strong><small>' + s.id + '</small></div></div></td><td class="num"><span class="' + (a.pct < 75 ? 'down' : '') + '">' + a.pct + '%</span></td><td style="text-align:right"><div class="att-toggle" role="radiogroup" aria-label="Attendance for ' + esc(s.name) + '" data-sid="' + s.id + '">' + ['P', 'L', 'A'].map(v => '<button role="radio" aria-checked="' + (marks[s.id] === v) + '" data-v="' + v + '" class="' + (marks[s.id] === v ? 'on' : '') + '" title="' + ({ P: 'Present', L: 'Late', A: 'Absent' })[v] + '">' + v + '</button>').join('') + '</div></td></tr>'; }).join('');
        sum();
      };
      const sum = () => { const v = Object.values(marks); $('#att-sum', el).innerHTML = '<span class="up">' + v.filter(x => x === 'P').length + ' present</span> · <span style="color:var(--warning)">' + v.filter(x => x === 'L').length + ' late</span> · <span class="down">' + v.filter(x => x === 'A').length + ' absent</span>'; };
      const drawRecent = () => {
        const sess = Object.keys(O.db.attendance[cid]).sort().reverse().slice(0, 8);
        $('#recent', el).innerHTML = sess.map(d => { const m = O.db.attendance[cid][d]; const v = Object.values(m); const p = v.filter(x => x !== 'A').length; return '<div class="list-item" style="cursor:pointer" data-date="' + d + '"><span class="ic ' + (d === date ? 'tone-teal' : 'tone-violet') + '">' + icon('calendar', 'icon-sm') + '</span><div class="grow"><strong>' + O.fmtDate(d, { weekday: 'short', day: 'numeric', month: 'short' }) + '</strong><small>' + p + '/' + v.length + ' present</small></div>' + icon('pencil', 'icon-sm subtle') + '</div>'; }).join('') || '<div class="empty">No sessions yet</div>';
        $$('[data-date]', el).forEach(x => x.onclick = () => { date = x.dataset.date; load(); });
      };
      $('#roster', el).addEventListener('click', e => { const b = e.target.closest('button[data-v]'); if (!b) return; const g = b.parentElement; marks[g.dataset.sid] = b.dataset.v; $$('button', g).forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', x === b); }); sum(); });
      $('#att-course', el).onchange = e => { cid = e.target.value; date = lastClassDate(O.course(cid)); load(); };
      $('#att-date', el).onchange = e => { if (e.target.value > O.iso(O.today)) { toast('Future dates are not allowed', '', 'error'); e.target.value = date; return; } date = e.target.value; load(); };
      $('#roster-search', el).oninput = drawRoster;
      $('#all-p', el).onclick = () => { Object.keys(marks).forEach(k => marks[k] = 'P'); drawRoster(); };
      $('#all-a', el).onclick = () => { Object.keys(marks).forEach(k => marks[k] = 'A'); drawRoster(); };
      $('#att-save', el).onclick = () => {
        const b = $('#att-save', el); b.innerHTML = '<span class="spinner"></span> Saving…'; b.disabled = true;
        setTimeout(() => {
          const was = !!O.db.attendance[cid][date]; O.db.attendance[cid][date] = Object.assign({}, marks); O.save(); O.log((was ? 'Edited' : 'Marked') + ' attendance ' + cid + ' ' + date, App.user.ref);
          b.innerHTML = icon('check') + 'Save attendance'; b.disabled = false;
          toast(was ? 'Attendance updated' : 'Attendance saved', cid + ' · ' + O.fmtDate(date) + ' · ' + Object.values(marks).filter(x => x !== 'A').length + '/' + Object.keys(marks).length + ' present');
          load();
        }, 600);
      };
      load();
    },

    gradebook(el) {
      const cs = mine(); let cid = cs[0].id; let dirty = false;
      el.innerHTML = App.pageHead('Gradebook', 'Enter marks for each assessment component. Totals and letter grades are calculated automatically (FR-4.2, FR-4.3).', '<button class="btn" id="gb-export">' + icon('download') + 'Export CSV</button><button class="btn btn-accent" id="gb-publish">' + icon('send') + 'Publish results</button>') +
        '<div class="row-between wrap" style="margin-bottom:16px"><div class="segmented" id="gb-tabs">' + cs.map(c => '<button data-c="' + c.id + '" class="' + (c.id === cid ? 'active' : '') + '">' + c.id + '</button>').join('') + '</div><div class="row"><button class="btn btn-ghost btn-sm" id="gb-sample">' + icon('sparkle', 'icon-sm') + 'Fill sample End-Sem marks</button></div></div>' +
        '<div class="card"><div class="card-head"><div><h3 id="gb-title"></h3><div class="sub">Weightage: ' + O.COMPONENTS.map(c => c.label + ' ' + c.max).join(' · ') + ' = 100</div></div><span id="gb-dirty"></span></div><div class="table-wrap"><table class="table"><thead><tr><th>Student</th>' + O.COMPONENTS.map(c => '<th class="num">' + c.label + '<div class="subtle" style="text-transform:none;letter-spacing:0">/ ' + c.max + '</div></th>').join('') + '<th class="num">Total</th><th>Grade</th></tr></thead><tbody id="gb-body"></tbody></table></div><div class="modal-foot" style="border-radius:0 0 16px 16px"><span class="subtle" style="margin-right:auto;font-size:13px" id="gb-stats"></span><button class="btn btn-primary" id="gb-save">' + icon('check') + 'Save grades</button></div></div>' +
        '<div class="grid grid-2" style="margin-top:20px"><div class="card"><div class="card-head"><h3>Grade distribution</h3><span class="sub">Final + projected</span></div><div class="card-body" id="gb-chart"></div></div><div class="card"><div class="card-head"><h3>Component averages</h3></div><div class="card-body" id="gb-avg"></div></div></div>';
      const ens = () => O.db.enrollments.filter(e => e.courseId === cid && e.status === 'enrolled');
      const rowHtml = e => { const s = O.student(e.studentId); const m = O.markSummary(e.marks); return '<tr data-e="' + e.id + '"><td><div class="cell-user"><span class="avatar" style="width:32px;height:32px;font-size:11px">' + O.initials(s.name) + '</span><div><strong>' + esc(s.name) + '</strong><small>' + s.id + '</small></div></div></td>' + O.COMPONENTS.map(k => '<td class="num"><input class="input" type="number" step="0.5" min="0" max="' + k.max + '" data-k="' + k.key + '" value="' + (e.marks[k.key] ?? '') + '" aria-label="' + k.label + ' for ' + esc(s.name) + '"></td>').join('') + '<td class="num total"><strong>' + m.total + '</strong></td><td class="grade">' + gradeBadge(m) + '</td></tr>'; };
      const gradeBadge = m => m.complete ? '<span class="badge ' + (m.letter === 'F' ? 'badge-danger' : m.point >= 9 ? 'badge-success' : 'badge-primary') + '">' + m.letter + '</span>' : '<span class="badge" title="Projected">~' + O.gradeFrom(m.projected).letter + '</span>';
      const draw = () => {
        const c = O.course(cid); $('#gb-title', el).textContent = c.id + ' · ' + c.title;
        $('#gb-body', el).innerHTML = ens().map(rowHtml).join(''); stats(); setDirty(false);
      };
      const stats = () => {
        const list = ens(); const sums = list.map(e => O.markSummary(e.marks)); const comp = sums.filter(s => s.complete).length;
        $('#gb-stats', el).textContent = comp + ' of ' + list.length + ' final grades computed';
        const dist = {}; O.GRADE_SCALE.forEach(g => dist[g[1]] = 0); sums.forEach(s => dist[s.complete ? s.letter : O.gradeFrom(s.projected).letter]++);
        $('#gb-chart', el).innerHTML = Charts.bar(O.GRADE_SCALE.map(g => ({ l: g[1], v: dist[g[1]], c: g[1] === 'F' ? '#F87171' : undefined })), { h: 200, values: true, label: 'Grade distribution' });
        $('#gb-avg', el).innerHTML = O.COMPONENTS.map(k => { const vals = list.map(e => e.marks[k.key]).filter(v => v !== undefined && v !== ''); const avg = vals.length ? vals.reduce((a, b) => a + +b, 0) / vals.length : 0; const pct = Math.round(avg / k.max * 100); return '<div style="margin-bottom:14px"><div class="seat-row"><span>' + k.label + ' <span class="subtle">(' + vals.length + '/' + list.length + ' entered)</span></span><strong>' + avg.toFixed(1) + ' / ' + k.max + '</strong></div><div class="progress ' + (pct < 50 ? 'warn' : '') + '"><span style="width:' + pct + '%"></span></div></div>'; }).join('');
      };
      const setDirty = d => { dirty = d; $('#gb-dirty', el).innerHTML = d ? '<span class="badge badge-warning"><span class="dot"></span>Unsaved changes</span>' : '<span class="badge badge-success">' + icon('check', 'icon-sm') + 'Saved</span>'; };
      $('#gb-body', el).addEventListener('input', e => {
        const inp = e.target; if (!inp.dataset.k) return; const tr = inp.closest('tr'); const en = O.db.enrollments.find(x => x.id === tr.dataset.e);
        const max = +inp.max; const v = inp.value;
        if (v !== '' && (+v < 0 || +v > max)) { inp.style.borderColor = 'var(--danger)'; inp.title = 'Must be between 0 and ' + max; return; }
        inp.style.borderColor = ''; inp.title = '';
        if (v === '') delete en.marks[inp.dataset.k]; else en.marks[inp.dataset.k] = +v;
        const m = O.markSummary(en.marks); $('.total', tr).innerHTML = '<strong>' + m.total + '</strong>'; $('.grade', tr).innerHTML = gradeBadge(m);
        setDirty(true); stats();
      });
      $('#gb-tabs', el).onclick = async e => { const b = e.target.closest('button'); if (!b) return; if (dirty && !(await UI.confirm('Discard unsaved changes?', 'You have unsaved marks for ' + cid + '.', 'Discard', true))) return; if (dirty) { O.reset !== undefined; location.reload(); return; } cid = b.dataset.c; $$('#gb-tabs button', el).forEach(x => x.classList.toggle('active', x === b)); draw(); };
      $('#gb-save', el).onclick = () => {
        if ($$('#gb-body input', el).some(i => i.style.borderColor)) return toast('Fix invalid marks first', 'Values must be within the component maximum', 'error');
        O.save(); O.log('Saved grades ' + cid, App.user.ref); setDirty(false); toast('Grades saved', cid + ' · final grades recalculated automatically');
      };
      $('#gb-sample', el).onclick = () => { ens().forEach(e => { if (e.marks.mid2 == null) e.marks.mid2 = Math.round((10 + Math.random() * 9) * 2) / 2; if (e.marks.end == null) e.marks.end = Math.round((22 + Math.random() * 17) * 2) / 2; }); draw(); setDirty(true); toast('Sample marks filled', 'Review and click Save grades', 'info'); };
      $('#gb-export', el).onclick = () => { const c = O.course(cid); UI.downloadCSV(cid + '_grades.csv', [['Roll No', 'Name', ...O.COMPONENTS.map(k => k.label), 'Total', 'Grade']].concat(ens().map(e => { const s = O.student(e.studentId); const m = O.markSummary(e.marks); return [s.id, s.name, ...O.COMPONENTS.map(k => e.marks[k.key] ?? ''), m.total, m.letter || 'Pending']; }))); toast('Exported', c.id + '_grades.csv downloaded'); };
      $('#gb-publish', el).onclick = async () => {
        if (dirty) O.save();
        const c = O.course(cid); const n = ens().length;
        if (!(await UI.confirm('Publish results for ' + c.id + '?', 'Students in ' + esc(c.title) + ' will be notified by email and SMS that their marks are available.', 'Publish & notify'))) return;
        O.addNotice({ title: 'Results published: ' + c.id, body: 'Marks for ' + c.title + ' have been updated in the Grades section. Final grades are calculated automatically once all components are entered.', category: 'Result', audience: { role: 'student', course: c.id }, channels: ['email', 'sms'], from: fac().name });
        O.log('Published results ' + c.id, App.user.ref); setDirty(false);
        toast('Results published', 'Notified ' + c.filled + ' students via Email & SMS');
      };
      draw();
    },

    'my-courses'(el) {
      const cs = mine();
      el.innerHTML = App.pageHead('My Courses', 'Courses assigned to you this semester.') +
        '<div class="input-group" style="width:280px;margin-bottom:16px">' + icon('search') + '<input class="input" id="course-search" placeholder="Filter courses"></div><div class="grid grid-3" id="fc-grid"></div>';
      const draw = () => {
        const q = $('#course-search', el).value.toLowerCase();
        $('#fc-grid', el).innerHTML = cs.filter(c => !q || (c.id + c.title).toLowerCase().includes(q)).map(c => { const a = O.courseAttAvg(c.id); const pct = Math.round(c.filled / c.capacity * 100); return '<article class="card card-hover course-card"><div class="row-between"><div><div class="code">' + c.id + '</div><h3>' + esc(c.title) + '</h3></div>' + Charts.ring(a, { size: 64, sw: 6, text: Math.round(a) + '%' }) + '</div><div class="meta"><span>' + icon('users') + c.filled + ' students</span><span>' + icon('layers') + c.credits + ' cr</span><span>' + icon('mapPin') + c.slots[0][2] + '</span></div><div><div class="seat-row"><span class="muted">Capacity</span><strong>' + c.filled + '/' + c.capacity + '</strong></div><div class="progress ' + (pct >= 100 ? 'bad' : '') + '"><span style="width:' + pct + '%"></span></div></div><div class="subtle" style="font-size:13px">' + c.slots.map(s => O.DAYS[s[0]] + ' ' + s[1]).join(' · ') + '</div><div class="foot"><button class="btn btn-sm" data-roster="' + c.id + '">' + icon('users', 'icon-sm') + 'Roster</button><a class="btn btn-sm" href="#/mark-attendance?c=' + c.id + '">' + icon('calendarCheck', 'icon-sm') + 'Attendance</a><span style="flex:1"></span><button class="btn btn-primary btn-sm" data-post="' + c.id + '" aria-label="Post announcement">' + icon('megaphone', 'icon-sm') + '</button></div></article>'; }).join('');
        Charts.animate(el);
      };
      $('#course-search', el).oninput = draw;
      el.addEventListener('click', e => {
        const r = e.target.closest('[data-roster]'); const p = e.target.closest('[data-post]');
        if (r) { const c = O.course(r.dataset.roster); modal({ title: c.id + ' roster', size: 'lg', body: '<p class="subtle" style="margin-bottom:12px;font-size:13px">Showing sample of named records (' + O.rosterOf(c.id).length + ' of ' + c.filled + ').</p><div class="table-wrap" style="max-height:55vh"><table class="table"><thead><tr><th>Student</th><th>Dept</th><th class="num">Attendance</th><th>Projected</th></tr></thead><tbody>' + O.rosterOf(c.id).map(s => { const a = O.attStats(s.id, c.id); const en = O.db.enrollments.find(x => x.studentId === s.id && x.courseId === c.id && x.status === 'enrolled'); const m = O.markSummary(en.marks); return '<tr><td><div class="cell-user"><span class="avatar" style="width:30px;height:30px;font-size:11px">' + O.initials(s.name) + '</span><div><strong>' + esc(s.name) + '</strong><small>' + s.id + '</small></div></div></td><td>' + s.dept + '</td><td class="num ' + (a.pct < 75 ? 'down' : '') + '">' + a.pct + '%</td><td><span class="badge">' + (m.letter || '~' + O.gradeFrom(m.projected).letter) + '</span></td></tr>'; }).join('') + '</tbody></table></div>', foot: '<button class="btn btn-primary" data-close>Close</button>' }); }
        if (p) {
          const c = O.course(p.dataset.post);
          const m = modal({ title: 'Announcement · ' + c.id, body: '<div class="stack">' + UI.field({ id: 'an-cat', label: 'Type', type: 'select', options: ['Announcement', 'Deadline', 'Timetable'] }) + UI.field({ id: 'an-title', label: 'Title', rule: 'required|min:5', placeholder: 'e.g. Assignment 3 deadline extended' }) + UI.field({ id: 'an-body', label: 'Message', type: 'textarea', rule: 'required|min:10' }) + '<div class="row"><label class="check"><input type="checkbox" id="an-email" checked>Email</label><label class="check"><input type="checkbox" id="an-sms">SMS</label></div></div>', foot: '<button class="btn" data-close>Cancel</button><button class="btn btn-primary" id="an-send">' + icon('send') + 'Send to ' + c.filled + ' students</button>' });
          m.$('#an-send').onclick = () => { if (!UI.validate(m.el)) return; const ch = []; if (m.$('#an-email').checked) ch.push('email'); if (m.$('#an-sms').checked) ch.push('sms'); if (!ch.length) return toast('Select at least one channel', '', 'error'); O.addNotice({ title: m.$('#an-title').value.trim(), body: m.$('#an-body').value.trim(), category: m.$('#an-cat').value, audience: { role: 'student', course: c.id }, channels: ch, from: fac().name }); m.close(); toast('Announcement sent', c.filled + ' students notified via ' + ch.map(x => x.toUpperCase()).join(' & ')); };
        }
      });
      draw();
    }
  };
})();
