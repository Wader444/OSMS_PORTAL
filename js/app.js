/* =========================================================
   OSMS App Shell — session, RBAC routing, topbar, shared views
   ========================================================= */
(function () {
  const { $, $$, esc, toast, modal, Charts } = UI;
  const O = OSMS;

  // ---------- session / RBAC (FR-1.1, FR-1.2) ----------
  let session;
  try { session = JSON.parse(localStorage.getItem('osms_session')); } catch (e) { session = null; }
  if (!session || !O.db.users.some(u => u.ref === session.ref)) {
    if (!localStorage.getItem('osms_logged_out')) {
      session = { ref: '24881A1264', role: 'student', at: Date.now() };
      localStorage.setItem('osms_session', JSON.stringify(session));
    } else {
      location.replace('login.html');
      return;
    }
  }
  const user = O.db.users.find(u => u.ref === session.ref);

  const NAV = {
    student: [
      ['Overview', [['dashboard', 'Dashboard', 'dashboard'], ['courses', 'Course Enrollment', 'book'], ['attendance', 'Attendance', 'calendarCheck'], ['grades', 'Grades & Transcript', 'cap'], ['fees', 'Fees & Payments', 'wallet']]],
      ['Campus', [['timetable', 'Timetable', 'calendar'], ['notices', 'Notices', 'bell'], ['profile', 'My Profile', 'user']]]
    ],
    faculty: [
      ['Teaching', [['dashboard', 'Dashboard', 'dashboard'], ['mark-attendance', 'Mark Attendance', 'calendarCheck'], ['gradebook', 'Gradebook', 'cap'], ['my-courses', 'My Courses', 'book']]],
      ['Campus', [['timetable', 'Timetable', 'calendar'], ['notices', 'Notices', 'bell'], ['profile', 'My Profile', 'user']]]
    ],
    admin: [
      ['Administration', [['dashboard', 'Dashboard', 'dashboard'], ['users', 'Manage Users', 'users'], ['courses-admin', 'Courses & Seats', 'book'], ['fees-admin', 'Fee Management', 'wallet'], ['broadcast', 'Broadcast Notices', 'megaphone']]],
      ['Insights', [['reports', 'Reports', 'chart'], ['settings', 'System Settings', 'sliders'], ['profile', 'My Profile', 'user']]]
    ]
  };

  const App = {
    user, views: window.APP_VIEWS || {},
    profile: () => O.profileOf(user),
    go(route) { location.hash = '#/' + route; },
    refresh() { render(); },
    refreshChrome() { renderSidebar(); renderTopbarBadges(); }
  };
  window.App = App;

  // ---------- shell markup ----------
  document.body.innerHTML = `
  <a href="#main" class="sr-only">Skip to content</a>
  <div class="app">
    <aside class="sidebar" id="sidebar" aria-label="Primary">
      <a class="brand" href="index.html" id="brand-link"><span class="brand-mark">${icon('cap')}</span><span class="brand-name">OSMS<small>Student Management</small></span></a>
      <nav id="nav"></nav>
      <div class="sidebar-foot">
        <div class="role-switch">
          <div class="label subtle">${icon('swap', 'icon-sm')} Demo · switch role</div>
          <div class="segmented" id="role-switch">
            <button data-role="student">Student</button><button data-role="faculty">Faculty</button><button data-role="admin">Admin</button>
          </div>
        </div>
        <button class="btn btn-ghost btn-block" id="logout-btn" style="justify-content:flex-start">${icon('logout')} Sign out</button>
      </div>
    </aside>
    <div class="scrim" id="scrim"></div>
    <div class="main">
      <header class="topbar">
        <button class="icon-btn menu-toggle" id="menu-toggle" aria-label="Open menu">${icon('menu')}</button>
        <div class="search input-group">${icon('search')}<input class="input" id="global-search" type="search" placeholder="Search courses, students, notices…  ( / )" aria-label="Search"></div>
        <div class="topbar-actions">
          <span class="badge badge-primary" id="term-badge" style="margin-right:6px">${icon('calendar', 'icon-sm')} ${esc(O.db.settings.term)}</span>
          <button class="icon-btn" id="theme-btn" aria-label="Toggle theme"></button>
          <div style="position:relative"><button class="icon-btn" id="notif-btn" aria-label="Notifications" aria-haspopup="true">${icon('bell')}<span class="pip" id="notif-pip" hidden></span></button></div>
          <div style="position:relative"><button class="user-chip" id="user-chip" aria-haspopup="true"></button></div>
        </div>
      </header>
      <main class="content" id="main" tabindex="-1"></main>
    </div>
  </div>`;

  function renderSidebar() {
    const unread = O.unreadFor(user);
    $('#nav').innerHTML = NAV[user.role].map(([label, items]) => '<div class="nav-label">' + label + '</div><div class="nav">' +
      items.map(([r, t, ic]) => '<a href="#/' + r + '" data-route="' + r + '" id="nav-' + r + '">' + icon(ic) + '<span>' + t + '</span>' + (r === 'notices' && unread ? '<span class="count">' + unread + '</span>' : '') + '</a>').join('') + '</div>').join('');
    $$('#role-switch button').forEach(b => b.classList.toggle('active', b.dataset.role === user.role));
    highlightNav();
  }
  function highlightNav() { const r = currentRoute(); $$('#nav a').forEach(a => a.classList.toggle('active', a.dataset.route === r)); }
  function renderTopbarBadges() {
    const p = App.profile(); const n = O.unreadFor(user);
    const pip = $('#notif-pip'); pip.hidden = !n; pip.textContent = n;
    $('#user-chip').innerHTML = '<span class="avatar ' + (user.role === 'faculty' ? 'amber' : user.role === 'admin' ? 'violet' : '') + '">' + O.initials(p.name) + '</span><div><strong>' + esc(p.name) + '</strong><small>' + user.role + '</small></div>' + icon('chevronDown', 'icon-sm');
    $('#theme-btn').innerHTML = icon(UI.Theme.current() === 'dark' ? 'sun' : 'moon');
  }

  // ---------- dropdowns ----------
  function closeDropdowns() { $$('.dropdown').forEach(d => d.remove()); }
  document.addEventListener('click', e => { if (!e.target.closest('.dropdown') && !e.target.closest('#notif-btn') && !e.target.closest('#user-chip')) closeDropdowns(); });
  const CAT = { Deadline: ['clock', 'tone-amber'], Result: ['award', 'tone-green'], Announcement: ['megaphone', 'tone-teal'], Timetable: ['calendar', 'tone-violet'], Enrollment: ['book', 'tone-sky'], Payment: ['receipt', 'tone-green'] };
  App.CAT = CAT;
  $('#notif-btn').addEventListener('click', e => {
    e.stopPropagation(); const open = $('.dropdown.notif-dd'); closeDropdowns(); if (open) return;
    const list = O.noticesFor(user).slice(0, 8);
    const dd = document.createElement('div'); dd.className = 'dropdown notif-dd';
    dd.innerHTML = '<div class="dropdown-head"><strong>Notifications</strong><button class="btn btn-ghost btn-sm" id="mark-all">Mark all read</button></div><div class="dropdown-list">' +
      (list.length ? list.map(n => { const [ic, tone] = CAT[n.category] || CAT.Announcement; return '<div class="notif ' + (n.readBy.includes(user.ref) ? '' : 'unread') + '" data-id="' + n.id + '"><span class="ic ' + tone + '">' + icon(ic, 'icon-sm') + '</span><div style="min-width:0"><strong class="truncate">' + esc(n.title) + '</strong><p>' + esc(n.from) + ' · ' + O.timeAgo(n.date) + '</p></div></div>'; }).join('') : '<div class="empty">' + icon('bell') + 'You’re all caught up</div>') +
      '</div><div style="padding:10px;border-top:1px solid var(--border)"><a class="btn btn-ghost btn-block btn-sm" href="#/notices">View all notices</a></div>';
    e.currentTarget.parentElement.appendChild(dd);
    dd.querySelector('#mark-all').onclick = () => { O.noticesFor(user).forEach(n => { if (!n.readBy.includes(user.ref)) n.readBy.push(user.ref); }); O.save(); closeDropdowns(); App.refreshChrome(); toast('All caught up', 'Notifications marked as read'); };
    dd.querySelectorAll('.notif').forEach(el => el.onclick = () => { closeDropdowns(); App.go('notices'); setTimeout(() => openNotice(el.dataset.id), 50); });
    dd.addEventListener('click', ev => ev.stopPropagation());
  });
  $('#user-chip').addEventListener('click', e => {
    e.stopPropagation(); const open = $('.dropdown.user-dd'); closeDropdowns(); if (open) return;
    const p = App.profile();
    const dd = document.createElement('div'); dd.className = 'dropdown user-dd'; dd.style.width = '260px';
    dd.innerHTML = '<div class="dropdown-head"><div><strong>' + esc(p.name) + '</strong><div class="subtle mono" style="font-size:12px">' + esc(p.email) + '</div></div></div>' +
      '<button class="menu-item" data-act="profile">' + icon('user', 'icon-sm') + 'My profile</button>' +
      '<button class="menu-item" data-act="password">' + icon('key', 'icon-sm') + 'Change password</button>' +
      '<button class="menu-item" data-act="reset">' + icon('refresh', 'icon-sm') + 'Reset demo data</button>' +
      '<div style="border-top:1px solid var(--border)"></div><button class="menu-item" data-act="logout" style="color:var(--danger)">' + icon('logout', 'icon-sm') + 'Sign out</button>';
    e.currentTarget.parentElement.appendChild(dd);
    dd.addEventListener('click', async ev => {
      const b = ev.target.closest('[data-act]'); if (!b) return; closeDropdowns();
      if (b.dataset.act === 'profile') App.go('profile');
      if (b.dataset.act === 'password') changePassword();
      if (b.dataset.act === 'logout') logout();
      if (b.dataset.act === 'reset' && await UI.confirm('Reset demo data?', 'All changes (enrollments, payments, attendance, notices) will be restored to the original seed data.', 'Reset', true)) { O.reset(); toast('Demo data reset', 'Fresh seed data loaded'); App.refreshChrome(); render(); }
    });
  });
  $('#theme-btn').onclick = () => { UI.Theme.toggle(); renderTopbarBadges(); };
  $('#logout-btn').onclick = logout;
  $('#role-switch').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || b.dataset.role === user.role) return;
    const u = O.db.users.find(x => x.role === b.dataset.role);
    localStorage.setItem('osms_session', JSON.stringify({ ref: u.ref, role: u.role, at: Date.now() }));
    location.hash = '#/dashboard'; location.reload();
  });
  $('#menu-toggle').onclick = () => { $('#sidebar').classList.add('open'); $('#scrim').classList.add('show'); };
  $('#scrim').onclick = () => { $('#sidebar').classList.remove('open'); $('#scrim').classList.remove('show'); };

  function logout() { localStorage.setItem('osms_logged_out', '1'); localStorage.removeItem('osms_session'); O.log('Signed out', user.ref); location.href = 'login.html?signedout=1'; }
  App.logout = logout;

  function changePassword() {
    const m = modal({
      title: 'Change password',
      body: '<div class="stack">' + UI.field({ id: 'cp-old', label: 'Current password', type: 'password', rule: 'required' }) + UI.field({ id: 'cp-new', label: 'New password', type: 'password', rule: 'required|strong', hint: 'Stored as a salted bcrypt hash — never in plain text (NFR Security).' }) + UI.field({ id: 'cp-conf', label: 'Confirm new password', type: 'password', rule: 'required' }) + '</div>',
      foot: '<button class="btn" data-close>Cancel</button><button class="btn btn-primary" id="cp-save">Update password</button>'
    });
    m.$('#cp-save').onclick = () => {
      if (!UI.validate(m.el)) return;
      if (m.$('#cp-old').value !== user.password) { const f = m.$('#cp-old').closest('.field'); f.classList.add('invalid'); f.querySelector('.field-error').textContent = 'Current password is incorrect'; return; }
      if (m.$('#cp-new').value !== m.$('#cp-conf').value) { const f = m.$('#cp-conf').closest('.field'); f.classList.add('invalid'); f.querySelector('.field-error').textContent = 'Passwords do not match'; return; }
      user.password = m.$('#cp-new').value; O.save(); m.close(); toast('Password updated', 'Use your new password next time you sign in');
    };
  }

  // ---------- global search ----------
  document.addEventListener('keydown', e => { if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); $('#global-search').focus(); } });
  $('#global-search').addEventListener('keydown', e => {
    if (e.key !== 'Enter') return; const q = e.target.value.trim().toLowerCase(); if (!q) return;
    const c = O.db.courses.find(x => x.id.toLowerCase().includes(q) || x.title.toLowerCase().includes(q));
    const s = user.role !== 'student' && O.db.students.find(x => x.id.toLowerCase().includes(q) || x.name.toLowerCase().includes(q));
    if (s && user.role === 'admin') { App.go('users'); setTimeout(() => { const i = $('#user-search'); if (i) { i.value = q; i.dispatchEvent(new Event('input')); } }, 60); }
    else if (c) { App.go(user.role === 'admin' ? 'courses-admin' : user.role === 'faculty' ? 'my-courses' : 'courses'); setTimeout(() => { const i = $('#course-search'); if (i) { i.value = q; i.dispatchEvent(new Event('input')); } }, 60); }
    else { App.go('notices'); setTimeout(() => { const i = $('#notice-search'); if (i) { i.value = q; i.dispatchEvent(new Event('input')); } }, 60); }
    e.target.blur();
  });

  // ---------- idle session timeout (NFR Security) ----------
  let lastActive = Date.now(), warned = null;
  ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach(ev => document.addEventListener(ev, () => { if (!warned) lastActive = Date.now(); }, { passive: true }));
  setInterval(() => {
    const limit = O.db.settings.sessionTimeout * 60000; const idle = Date.now() - lastActive;
    if (idle > limit) { localStorage.removeItem('osms_session'); location.href = 'login.html?expired=1'; }
    else if (idle > limit - 30000 && !warned) {
      warned = modal({
        title: 'Session about to expire', locked: true,
        body: '<div class="row">' + '<span class="stat-ic ic tone-amber" style="width:48px;height:48px;border-radius:12px;display:grid;place-items:center">' + icon('hourglass') + '</span><p class="muted">You have been idle for a while. For your security you will be signed out in <strong id="idle-count" class="mono">30</strong> seconds.</p></div>',
        foot: '<button class="btn" id="idle-out">Sign out</button><button class="btn btn-primary" id="idle-stay">Stay signed in</button>',
        onClose: () => { warned = null; lastActive = Date.now(); }
      });
      warned.$('#idle-stay').onclick = () => warned.close();
      warned.$('#idle-out').onclick = logout;
    }
    if (warned) { const c = warned.$('#idle-count'); if (c) c.textContent = Math.max(0, Math.ceil((limit - idle) / 1000)); }
  }, 1000);

  // ---------- router ----------
  function currentRoute() { return (location.hash.replace(/^#\/?/, '') || 'dashboard').split('?')[0]; }
  function render() {
    const r = currentRoute(); const views = window.APP_VIEWS[user.role]; const shared = window.APP_VIEWS.shared;
    const allowed = NAV[user.role].flatMap(g => g[1].map(i => i[0]));
    const main = $('#main');
    if (!allowed.includes(r)) {
      main.innerHTML = '<div class="card empty" style="margin-top:40px">' + icon('lock') + '<h2>Access restricted</h2><p>The <span class="mono">' + esc(r) + '</span> page is not available for the <strong>' + user.role + '</strong> role (RBAC · FR-1.2).</p><a href="#/dashboard" class="btn btn-primary">Back to dashboard</a></div>';
      highlightNav(); return;
    }
    const view = (views && views[r]) || (shared && shared[r]);
    main.innerHTML = '';
    const wrap = document.createElement('div'); wrap.className = 'view stagger'; main.appendChild(wrap);
    view(wrap);
    UI.countUp(wrap); Charts.animate(wrap);
    highlightNav();
    document.title = (($('h1', wrap) || {}).textContent || 'Dashboard') + ' · OSMS';
    $('#sidebar').classList.remove('open'); $('#scrim').classList.remove('show');
    window.scrollTo({ top: 0 });
  }
  window.addEventListener('hashchange', render);

  // ---------- shared helpers for views ----------
  App.pageHead = (title, sub, actions, crumb) => '<div class="page-head"><div>' + (crumb ? '<div class="crumbs">' + crumb + '</div>' : '') + '<h1>' + title + '</h1>' + (sub ? '<p>' + sub + '</p>' : '') + '</div>' + (actions ? '<div class="actions">' + actions + '</div>' : '') + '</div>';
  App.stat = (label, value, meta, ic, tone, countAttrs) => '<div class="card stat ' + tone + '"><div class="stat-top"><div><div class="stat-label">' + label + '</div><div class="stat-value" ' + (countAttrs || '') + '>' + value + '</div></div><span class="stat-ic">' + icon(ic) + '</span></div><div class="stat-meta">' + meta + '</div></div>';
  App.noticeItem = n => { const [ic, tone] = CAT[n.category] || CAT.Announcement; const unread = !n.readBy.includes(user.ref); return '<div class="list-item" style="cursor:pointer" data-notice="' + n.id + '"><span class="ic ' + tone + '">' + icon(ic, 'icon-sm') + '</span><div class="grow"><strong class="truncate">' + (unread ? '<span class="live-dot" style="width:6px;height:6px;margin-right:8px;vertical-align:middle;background:var(--accent)"></span>' : '') + esc(n.title) + '</strong><small>' + esc(n.from) + ' · ' + O.timeAgo(n.date) + '</small></div>' + icon('chevronRight', 'icon-sm subtle') + '</div>'; };
  App.bindNotices = root => $$('[data-notice]', root).forEach(el => el.onclick = () => openNotice(el.dataset.notice));

  function openNotice(id) {
    const n = O.db.notices.find(x => x.id === id); if (!n) return;
    if (!n.readBy.includes(user.ref)) { n.readBy.push(user.ref); O.save(); App.refreshChrome(); }
    const [ic, tone] = CAT[n.category] || CAT.Announcement;
    modal({
      title: esc(n.title),
      body: '<div class="row wrap" style="margin-bottom:16px"><span class="badge ' + ({ Deadline: 'badge-warning', Result: 'badge-success', Timetable: 'badge-violet' }[n.category] || 'badge-primary') + '">' + icon(ic, 'icon-sm') + n.category + '</span>' + n.channels.map(c => '<span class="badge">' + icon(c === 'sms' ? 'sms' : 'mail', 'icon-sm') + (c === 'sms' ? 'SMS' : 'Email') + '</span>').join('') + (n.audience.course ? '<span class="badge mono">' + n.audience.course + '</span>' : '') + '</div><p style="font-size:15px;line-height:1.7">' + esc(n.body) + '</p><div class="divider"></div><p class="subtle" style="font-size:13px">From <strong>' + esc(n.from) + '</strong> · ' + O.fmtDate(n.date.slice(0, 10), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + ' at ' + n.date.slice(11) + '</p>',
      foot: '<button class="btn btn-primary" data-close>Got it</button>'
    });
    const el = $('[data-notice="' + id + '"] .live-dot'); el && el.remove();
  }
  App.openNotice = openNotice;

  // timetable builder
  App.timetable = (courses, opts) => {
    opts = opts || {}; const todayIdx = O.today.getDay() - 1; const colors = ['#2DD4BF', '#F59E0B', '#A78BFA', '#38BDF8', '#4ADE80', '#F472B6', '#FB923C'];
    let h = '<div class="table-wrap"><div class="tt"><div></div>' + O.DAYS.map((d, i) => '<div class="tt-h ' + (i === todayIdx ? 'today' : '') + '">' + d + (i === todayIdx ? ' · Today' : '') + '</div>').join('');
    O.SLOTS.forEach(t => {
      h += '<div class="tt-time">' + t + '</div>';
      O.DAYS.forEach((d, di) => {
        let found = null;
        courses.forEach((c, ci) => c.slots.forEach(s => { if (s[0] === di && s[1] === t) found = { c, s, col: colors[ci % colors.length] }; }));
        if (found) { const changed = O.db.timetableChanges[found.c.id + '-' + di + '-' + t]; h += '<div class="tt-slot ' + (changed ? 'changed' : '') + '" style="--_c:' + found.col + '" title="' + esc(found.c.title) + '"><strong>' + found.c.id + '</strong><span class="truncate" style="display:block">' + esc(found.c.title) + '</span><span class="mono" style="font-size:11px">' + found.s[2] + ' · ' + t + '–' + O.SLOT_END[t] + '</span>' + (changed ? '<span class="badge badge-warning" style="margin-top:4px;font-size:10px;padding:1px 6px">Updated</span>' : '') + '</div>'; }
        else h += '<div class="tt-cell"></div>';
      });
    });
    return h + '</div></div>';
  };
  App.todayClasses = courses => {
    const di = O.today.getDay() - 1; const out = [];
    courses.forEach(c => c.slots.forEach(s => { if (s[0] === di) out.push({ c, time: s[1], room: s[2] }); }));
    return out.sort((a, b) => a.time.localeCompare(b.time));
  };
  App.nextClassDay = courses => { for (let k = 0; k < 7; k++) { const d = O.addDays(O.today, k); const di = d.getDay() - 1; const list = []; courses.forEach(c => c.slots.forEach(s => { if (s[0] === di) list.push({ c, time: s[1], room: s[2] }); })); if (list.length) return { date: d, list: list.sort((a, b) => a.time.localeCompare(b.time)), isToday: k === 0 }; } return null; };

  // ---------- shared views ----------
  window.APP_VIEWS = window.APP_VIEWS || {};
  window.APP_VIEWS.shared = {
    notices(el) {
      let filter = 'All';
      const canPost = user.role !== 'student';
      el.innerHTML = App.pageHead('Notices & Announcements', 'Email / SMS alerts for deadlines, results, announcements and timetable changes (FR-5.3).', canPost ? '<a class="btn btn-primary" href="' + (user.role === 'admin' ? '#/broadcast' : '#/my-courses') + '" id="new-notice">' + icon('megaphone') + (user.role === 'admin' ? 'Broadcast notice' : 'Post to a course') + '</a>' : '') +
        '<div class="row-between wrap" style="margin-bottom:16px"><div class="segmented" id="notice-filter">' + ['All', 'Unread', 'Deadline', 'Result', 'Announcement', 'Timetable'].map(f => '<button data-f="' + f + '" class="' + (f === 'All' ? 'active' : '') + '">' + f + '</button>').join('') + '</div><div class="input-group" style="width:280px;max-width:100%">' + icon('search') + '<input class="input" id="notice-search" placeholder="Search notices"></div></div>' +
        '<div class="card"><div class="card-body" style="padding-top:8px;padding-bottom:8px" id="notice-list"></div></div>';
      const draw = () => {
        const q = $('#notice-search', el).value.toLowerCase();
        const list = O.noticesFor(user).filter(n => (filter === 'All' || (filter === 'Unread' ? !n.readBy.includes(user.ref) : n.category === filter)) && (!q || (n.title + n.body + n.from).toLowerCase().includes(q)));
        $('#notice-list', el).innerHTML = list.length ? list.map(n => {
          const [ic, tone] = CAT[n.category] || CAT.Announcement; const unread = !n.readBy.includes(user.ref);
          return '<div class="list-item" style="cursor:pointer;align-items:flex-start;padding:16px 0" data-notice="' + n.id + '"><span class="ic ' + tone + '">' + icon(ic, 'icon-sm') + '</span><div class="grow"><div class="row-between"><strong>' + esc(n.title) + '</strong><small class="subtle" style="white-space:nowrap">' + O.timeAgo(n.date) + '</small></div><p class="muted" style="font-size:13.5px;margin:4px 0 8px">' + esc(n.body) + '</p><div class="row wrap" style="gap:6px">' + (unread ? '<span class="badge badge-warning"><span class="dot"></span>New</span>' : '') + '<span class="badge">' + esc(n.from) + '</span>' + n.channels.map(c => '<span class="badge">' + icon(c === 'sms' ? 'sms' : 'mail', 'icon-sm') + (c === 'sms' ? 'SMS' : 'Email') + '</span>').join('') + '</div></div></div>';
        }).join('') : '<div class="empty">' + icon('bell') + '<strong>No notices match</strong><span>Try a different filter or search term.</span></div>';
        App.bindNotices(el);
      };
      $('#notice-filter', el).onclick = e => { const b = e.target.closest('button'); if (!b) return; filter = b.dataset.f; $$('#notice-filter button', el).forEach(x => x.classList.toggle('active', x === b)); draw(); };
      $('#notice-search', el).oninput = draw;
      draw();
    },
    timetable(el) {
      const courses = user.role === 'student' ? O.enrollmentsOf(user.ref).map(e => O.course(e.courseId)) : user.role === 'faculty' ? O.db.courses.filter(c => c.faculty === user.ref) : O.db.courses;
      el.innerHTML = App.pageHead('Weekly Timetable', user.role === 'student' ? 'Built automatically from your enrolled courses. Changes are pushed as notifications.' : 'Your teaching schedule for ' + esc(O.db.settings.term) + '.', '<button class="btn" id="tt-print">' + icon('printer') + 'Print</button>') +
        '<div class="card card-body">' + App.timetable(courses) + '<div class="legend" style="margin-top:16px">' + courses.map(c => '<span><span class="mono" style="color:var(--primary)">' + c.id + '</span> ' + esc(c.title) + ' · ' + esc(O.facultyById(c.faculty).name) + '</span>').join('') + '</div></div>';
      $('#tt-print', el).onclick = () => UI.printDoc('<div class="doc"><div class="doc-head"><div><h2>Weekly Timetable</h2><div class="muted">' + esc(App.profile().name) + ' · ' + esc(O.db.settings.term) + '</div></div><strong>OSMS</strong></div><table><tr><th>Day</th><th>Time</th><th>Course</th><th>Room</th></tr>' + O.DAYS.flatMap((d, di) => courses.flatMap(c => c.slots.filter(s => s[0] === di).map(s => [d, s[1], c, s[2]]))).sort((a, b) => O.DAYS.indexOf(a[0]) - O.DAYS.indexOf(b[0]) || a[1].localeCompare(b[1])).map(r => '<tr><td>' + r[0] + '</td><td>' + r[1] + '–' + O.SLOT_END[r[1]] + '</td><td>' + r[2].id + ' · ' + esc(r[2].title) + '</td><td>' + r[3] + '</td></tr>').join('') + '</table></div>');
    },
    profile(el) {
      const p = App.profile(); const isStu = user.role === 'student';
      const dept = p.dept ? O.dept(p.dept).name : 'Administration';
      el.innerHTML = App.pageHead('My Profile', isStu ? 'You can update permitted personal details; academic fields are managed by the Admin office (FR-2.2).' : 'Your account information.') +
        '<div class="grid grid-main"><div class="card"><div class="card-head"><h3>Personal details</h3>' + (isStu ? '<span class="badge badge-primary">' + icon('pencil', 'icon-sm') + 'Editable fields highlighted</span>' : '') + '</div><div class="card-body"><form id="profile-form" class="form-grid" novalidate>' +
        UI.field({ id: 'pf-name', label: 'Full name', value: p.name, readonly: true }) +
        UI.field({ id: 'pf-id', label: isStu ? 'Roll number' : 'Employee ID', value: p.id, readonly: true }) +
        UI.field({ id: 'pf-email', label: 'Institutional email', value: p.email, readonly: true }) +
        UI.field({ id: 'pf-dept', label: 'Department', value: dept, readonly: true }) +
        UI.field({ id: 'pf-phone', label: 'Mobile number', value: p.phone || '+91 90000 00000', rule: 'required|phone', readonly: !isStu && user.role !== 'faculty' }) +
        (isStu ? UI.field({ id: 'pf-guardian', label: 'Guardian / emergency contact', value: p.guardian, rule: 'required' }) + UI.field({ id: 'pf-address', label: 'Residential address', value: p.address, type: 'textarea', rule: 'required', span: true }) : UI.field({ id: 'pf-desig', label: 'Designation', value: p.designation, readonly: true })) +
        '<div class="span-2 row" style="justify-content:flex-end">' + (isStu || user.role === 'faculty' ? '<button class="btn btn-primary" type="submit" id="pf-save">' + icon('check') + 'Save changes</button>' : '') + '</div></form></div></div>' +
        '<div class="stack"><div class="card card-body" style="text-align:center"><div class="avatar avatar-lg ' + (user.role === 'faculty' ? 'amber' : user.role === 'admin' ? 'violet' : '') + '" style="margin:0 auto 12px">' + O.initials(p.name) + '</div><h3>' + esc(p.name) + '</h3><p class="muted" style="font-size:13.5px">' + esc(p.designation || '') + '</p><div class="row" style="justify-content:center;margin-top:12px;gap:6px"><span class="badge badge-success"><span class="dot"></span>Active</span><span class="badge" style="text-transform:capitalize">' + user.role + '</span></div></div>' +
        (isStu ? '<div class="card card-body"><h3 style="font-size:15px;margin-bottom:12px">Academic snapshot</h3><dl class="kv" style="grid-template-columns:120px 1fr"><dt>Program</dt><dd>B.Tech · ' + p.dept + '</dd><dt>Year / Sem</dt><dd>III / I · Sec ' + p.section + '</dd><dt>CGPA</dt><dd class="mono">' + O.cgpa(p.id).toFixed(2) + '</dd><dt>Joined</dt><dd>' + O.fmtDate(p.joined) + '</dd></dl></div>' : '') +
        '<div class="card card-body"><h3 style="font-size:15px;margin-bottom:12px">Security</h3><div class="list-item">' + '<span class="ic tone-green">' + icon('shield', 'icon-sm') + '</span><div class="grow"><strong>Password protected</strong><small>Salted bcrypt hash · TLS 1.3</small></div></div><div class="list-item"><span class="ic tone-teal">' + icon('clock', 'icon-sm') + '</span><div class="grow"><strong>Idle timeout</strong><small>Auto sign-out after ' + O.db.settings.sessionTimeout + ' min</small></div></div><button class="btn btn-block" style="margin-top:12px" id="pf-pass">' + icon('key') + 'Change password</button></div></div></div>';
      $('#pf-pass', el).onclick = changePassword;
      const form = $('#profile-form', el);
      form.onsubmit = e => {
        e.preventDefault(); if (!UI.validate(form)) { toast('Please fix the highlighted fields', '', 'error'); return; }
        p.phone = $('#pf-phone', el).value.trim();
        if (isStu) { p.guardian = $('#pf-guardian', el).value.trim(); p.address = $('#pf-address', el).value.trim(); const s = O.student(p.id); Object.assign(s, { phone: p.phone, guardian: p.guardian, address: p.address }); }
        else Object.assign(O.facultyById(p.id), { phone: p.phone });
        O.save(); O.log('Updated profile', user.ref); toast('Profile updated', 'Your changes have been saved');
      };
      if (!isStu) $$('#pf-phone', el).forEach(i => { if (user.role === 'faculty') i.removeAttribute('readonly'); });
      $$('input:not([readonly]), textarea:not([readonly])', form).forEach(i => i.style.borderColor = 'color-mix(in srgb, var(--primary) 45%, transparent)');
    }
  };

  // boot — app.js is loaded after the role view files
  if (!location.hash) history.replaceState(null, '', '#/dashboard');
  renderSidebar(); renderTopbarBadges(); render();
})();
