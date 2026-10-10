/* =========================================================
   Student views — Dashboard, Enrollment, Attendance, Grades, Fees
   FR-2.2, FR-3.1–3.3, FR-4.3, FR-5.1–5.2
   ========================================================= */
(function () {
  const { $, $$, esc, toast, modal, Charts } = UI;
  const O = OSMS;
  const me = () => O.student(App.user.ref);
  const myCourses = () => O.enrollmentsOf(App.user.ref).map(e => O.course(e.courseId));
  const greet = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };

  function addDropBanner() {
    const s = O.db.settings; const days = Math.ceil((new Date(s.addDropCloses + 'T23:59') - new Date()) / 86400000);
    return s.addDropOpen
      ? '<div class="banner banner-info">' + icon('clock') + '<p><strong>Add/Drop window is open</strong> — closes ' + O.fmtDate(s.addDropCloses) + ' (' + Math.max(0, days) + ' day' + (days === 1 ? '' : 's') + ' left). Changes after this date need Admin approval.</p></div>'
      : '<div class="banner banner-warn">' + icon('lock') + '<p><strong>Add/Drop window is closed.</strong> Enrollment changes are locked by the Academic Office.</p></div>';
  }

  // ---------- enrollment actions ----------
  function enroll(c, done) {
    const sid = App.user.ref; const s = O.db.settings;
    if (!s.addDropOpen) return toast('Add/Drop window closed', 'Enrollment changes are currently locked.', 'error');
    const clashes = O.clashes(sid, c); const credits = O.creditsOf(sid) + c.credits; const full = O.seatsLeft(c) === 0;
    const over = credits > s.maxCredits;
    const m = modal({
      title: (full ? 'Join waitlist · ' : 'Enroll in ') + c.id,
      body: '<div class="stack"><div><div class="mono subtle" style="font-size:12.5px">' + c.id + ' · ' + c.credits + ' credits</div><h3 style="font-size:20px;margin-top:4px">' + esc(c.title) + '</h3><p class="muted" style="margin-top:6px;font-size:14px">' + esc(c.desc) + '</p></div>' +
        '<dl class="kv" style="grid-template-columns:130px 1fr"><dt>Instructor</dt><dd>' + esc(O.facultyById(c.faculty).name) + '</dd><dt>Schedule</dt><dd>' + c.slots.map(x => O.DAYS[x[0]] + ' ' + x[1] + ' · ' + x[2]).join('<br>') + '</dd><dt>Seats</dt><dd class="mono">' + O.seatsLeft(c) + ' / ' + c.capacity + ' available' + (full ? ' · ' + O.waitCount(c) + ' waitlisted' : '') + '</dd><dt>Credit load</dt><dd class="mono">' + O.creditsOf(sid) + ' → ' + credits + ' / ' + s.maxCredits + '</dd></dl>' +
        (full ? '<div class="banner banner-warn" style="margin:0">' + icon('hourglass') + '<p>This course is at capacity. You will be placed at <strong>position #' + (O.waitCount(c) + 1) + '</strong> on the waitlist and notified automatically when a seat opens (FR-3.3).</p></div>' : '') +
        (clashes.length ? '<div class="banner banner-danger" style="margin:0">' + icon('alert') + '<p><strong>Timetable clash:</strong> ' + clashes.map(x => x.day + ' ' + x.time + ' with ' + x.course.id).join(', ') + '. Drop the conflicting course first.</p></div>' : '') +
        (over ? '<div class="banner banner-danger" style="margin:0">' + icon('alert') + '<p>Exceeds the maximum credit load of ' + s.maxCredits + '.</p></div>' : '') + '</div>',
      foot: '<button class="btn" data-close>Cancel</button><button class="btn ' + (full ? 'btn-accent' : 'btn-primary') + '" id="do-enroll" ' + (clashes.length || over ? 'disabled' : '') + '>' + icon(full ? 'hourglass' : 'check') + (full ? 'Join waitlist' : 'Confirm enrollment') + '</button>'
    });
    m.$('#do-enroll').onclick = () => {
      const btn = m.$('#do-enroll'); btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Processing…';
      setTimeout(() => {
        if (full) {
          c.waitlist.push(sid); O.save();
          O.addNotice({ title: 'Waitlisted for ' + c.id + ' · position #' + O.waitPos(c, sid), body: 'You have been added to the waitlist for ' + c.title + '. We will enroll you automatically and notify you by email/SMS when a seat opens.', category: 'Enrollment', audience: { role: 'student', studentId: sid }, channels: ['email', 'sms'], from: 'OSMS Enrollment' });
          toast('Added to waitlist', c.id + ' · you are #' + O.waitPos(c, sid) + ' in line', 'warning');
        } else {
          c.filled++; O.db.enrollments.push({ id: 'E' + Date.now(), studentId: sid, courseId: c.id, status: 'enrolled', marks: {}, enrolledOn: O.iso(new Date()) }); O.save();
          O.addNotice({ title: 'Enrollment confirmed: ' + c.id, body: 'You are now enrolled in ' + c.title + ' (' + c.credits + ' credits). It has been added to your timetable.', category: 'Enrollment', audience: { role: 'student', studentId: sid }, channels: ['email'], from: 'OSMS Enrollment' });
          toast('Enrolled in ' + c.id, esc(c.title) + ' added to your timetable');
        }
        O.log((full ? 'Waitlisted ' : 'Enrolled ') + c.id, sid);
        m.close(); App.refreshChrome(); done && done();
      }, 700);
    };
  }
  async function drop(c, done) {
    const sid = App.user.ref;
    if (!O.db.settings.addDropOpen) return toast('Add/Drop window closed', 'Contact the Academic Office to drop a course.', 'error');
    const ok = await UI.confirm('Drop ' + c.id + '?', 'You will be removed from <strong>' + esc(c.title) + '</strong>. ' + (O.waitCount(c) ? 'Your seat will be offered to the next student on the waitlist.' : 'Your seat will be released.'), 'Drop course', true);
    if (!ok) return;
    const e = O.db.enrollments.find(x => x.studentId === sid && x.courseId === c.id && x.status === 'enrolled'); e.status = 'dropped';
    if (c.waitBase > 0) c.waitBase--; else if (c.waitlist.length) { /* promote other named student */ c.waitlist.shift(); } else c.filled--;
    O.save(); O.log('Dropped ' + c.id, sid);
    toast('Dropped ' + c.id, O.waitCount(c) >= 0 && c.filled === c.capacity ? 'Seat released to the next waitlisted student' : 'Seat released', 'info');
    done && done();
  }
  function leaveWaitlist(c, done) { c.waitlist = c.waitlist.filter(x => x !== App.user.ref); O.save(); toast('Left waitlist', c.id, 'info'); done && done(); }

  function courseCard(c) {
    const sid = App.user.ref; const enrolled = O.enrollmentsOf(sid).some(e => e.courseId === c.id); const pos = O.waitPos(c, sid);
    const left = O.seatsLeft(c); const pct = Math.round(c.filled / c.capacity * 100); const clash = !enrolled && O.clashes(sid, c).length;
    const status = enrolled ? '<span class="badge badge-success">' + icon('check', 'icon-sm') + 'Enrolled</span>' : pos ? '<span class="badge badge-warning">' + icon('hourglass', 'icon-sm') + 'Waitlist #' + pos + '</span>' : left === 0 ? '<span class="badge badge-danger">Full</span>' : left <= 5 ? '<span class="badge badge-warning">Few seats</span>' : '<span class="badge badge-primary">Open</span>';
    const action = enrolled ? '<button class="btn btn-danger btn-sm" data-drop="' + c.id + '">' + icon('x', 'icon-sm') + 'Drop</button>'
      : pos ? '<button class="btn btn-sm" data-leave="' + c.id + '">Leave waitlist</button>'
        : left === 0 ? '<button class="btn btn-accent btn-sm" data-enroll="' + c.id + '">' + icon('hourglass', 'icon-sm') + 'Join waitlist</button>'
          : '<button class="btn btn-primary btn-sm" data-enroll="' + c.id + '">' + icon('plus', 'icon-sm') + 'Enroll</button>';
    return '<article class="card card-hover course-card" data-course="' + c.id + '"><div class="row-between" style="align-items:flex-start"><div><div class="code">' + c.id + ' · ' + c.dept + '</div><h3>' + esc(c.title) + '</h3></div>' + status + '</div>' +
      '<div class="meta"><span>' + icon('user') + esc(O.facultyById(c.faculty).name) + '</span><span>' + icon('layers') + c.credits + ' credits</span><span>' + icon('clock') + c.slots.map(s => O.DAYS[s[0]]).join(' · ') + '</span></div>' +
      '<div><div class="seat-row"><span class="muted">Seats</span><strong class="seats-num">' + (left === 0 ? 'Full · ' + O.waitCount(c) + ' waiting' : left + ' of ' + c.capacity + ' left') + '</strong></div><div class="progress ' + (pct >= 100 ? 'bad' : pct >= 90 ? 'warn' : '') + '"><span style="width:' + Math.min(100, pct) + '%"></span></div></div>' +
      (clash ? '<div class="hint" style="color:var(--warning);display:flex;gap:6px;align-items:center">' + icon('alert', 'icon-sm') + 'Clashes with your timetable</div>' : '') +
      '<div class="foot"><button class="btn btn-ghost btn-sm" data-info="' + c.id + '">' + icon('info', 'icon-sm') + 'Details</button><span style="flex:1"></span>' + action + '</div></article>';
  }

  window.APP_VIEWS = window.APP_VIEWS || {};
  window.APP_VIEWS.student = {
    // ---------------- DASHBOARD ----------------
    dashboard(el) {
      const s = me(); const courses = myCourses(); const att = O.overallAtt(s.id); const fee = O.feeSummary(s.id); const cg = O.cgpa(s.id); const cr = O.creditsOf(s.id);
      const low = courses.map(c => [c, O.attStats(s.id, c.id)]).filter(x => x[1].pct < 75);
      const next = App.nextClassDay(courses); const notices = O.noticesFor(App.user).slice(0, 4);
      el.innerHTML =
        '<div class="hero-card" style="margin-bottom:20px"><div class="row-between wrap" style="gap:20px"><div><span class="badge badge-primary" style="margin-bottom:12px">' + icon('sparkle', 'icon-sm') + esc(O.db.settings.term) + '</span><h1 style="font-size:28px">' + greet() + ', ' + esc(s.name.split(' ')[0]) + '</h1><p>You have <strong>' + (next && next.isToday ? next.list.length + ' class' + (next.list.length > 1 ? 'es' : '') + ' today' : 'no classes today') + '</strong>, ' + O.unreadFor(App.user) + ' unread notices and ' + (fee.due ? O.inr(fee.due) + ' in pending fees.' : 'no pending fees.') + '</p></div>' +
        '<div class="row wrap"><a class="btn btn-primary" href="#/courses" id="q-enroll">' + icon('book') + 'Browse courses</a>' + (fee.due ? '<a class="btn btn-accent" href="#/fees" id="q-pay">' + icon('card') + 'Pay fees</a>' : '') + '</div></div></div>' +
        (low.length ? '<div class="banner banner-danger">' + icon('alert') + '<p><strong>Attendance shortage:</strong> ' + low.map(x => x[0].id + ' (' + x[1].pct + '%)').join(', ') + ' is below the 75% requirement. Attend upcoming sessions to stay eligible for exams.</p><a class="btn btn-sm" href="#/attendance">View details</a></div>' : '') +
        '<div class="grid grid-4" style="margin-bottom:20px">' +
        App.stat('Cumulative GPA', cg.toFixed(2), '<span class="up">' + icon('trend', 'icon-sm') + '</span> Top 10% of batch', 'award', 'tone-teal', 'data-count="' + cg.toFixed(2) + '"') +
        App.stat('Overall attendance', att + '%', att >= 75 ? 'Eligible · min 75%' : '<span class="down">Below 75% threshold</span>', 'calendarCheck', att >= 85 ? 'tone-green' : 'tone-amber', 'data-count="' + att + '" data-suffix="%"') +
        App.stat('Credits enrolled', cr + '<span class="subtle" style="font-size:16px"> / ' + O.db.settings.maxCredits + '</span>', courses.length + ' courses this semester', 'book', 'tone-violet') +
        App.stat('Fee outstanding', O.inr(fee.due), fee.due ? 'Due ' + O.fmtDate(O.db.settings.feeDue) : '<span class="up">Fully paid</span>', 'wallet', fee.due ? 'tone-amber' : 'tone-green', 'data-count="' + fee.due + '" data-prefix="₹" data-inr="1"') + '</div>' +
        '<div class="grid grid-main"><div class="stack" style="gap:20px">' +
        '<div class="card"><div class="card-head"><div><h3>' + (next ? (next.isToday ? 'Today’s classes' : 'Next classes · ' + O.fmtDate(O.iso(next.date), { weekday: 'long', day: 'numeric', month: 'short' })) : 'Classes') + '</h3><div class="sub">From your enrolled courses</div></div><a href="#/timetable" class="btn btn-ghost btn-sm">Full timetable ' + icon('arrowRight', 'icon-sm') + '</a></div><div class="card-body" style="padding-top:6px;padding-bottom:6px">' +
        (next ? next.list.map(x => '<div class="list-item"><span class="ic tone-teal mono" style="font-size:12px;font-weight:600;width:56px">' + x.time + '</span><div class="grow"><strong>' + esc(x.c.title) + '</strong><small><span class="mono">' + x.c.id + '</span> · ' + x.room + ' · ' + esc(O.facultyById(x.c.faculty).name) + '</small></div><span class="badge">' + x.time + '–' + O.SLOT_END[x.time] + '</span></div>').join('') : '<div class="empty">No classes scheduled</div>') + '</div></div>' +
        '<div class="card"><div class="card-head"><div><h3>Attendance by course</h3><div class="sub">Minimum 75% required for exam eligibility</div></div><a href="#/attendance" class="btn btn-ghost btn-sm">Details ' + icon('arrowRight', 'icon-sm') + '</a></div><div class="card-body"><div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:16px">' +
        courses.map(c => { const a = O.attStats(s.id, c.id); return '<div style="text-align:center">' + Charts.ring(a.pct, { size: 96 }) + '<div style="margin-top:8px;font-weight:600;font-size:13.5px" class="mono">' + c.id + '</div><div class="subtle" style="font-size:12px">' + a.present + '/' + a.held + ' sessions</div></div>'; }).join('') + '</div></div></div></div>' +
        '<div class="stack" style="gap:20px"><div class="card"><div class="card-head"><h3>Recent notices</h3><a href="#/notices" class="btn btn-ghost btn-sm">All</a></div><div class="card-body" style="padding-top:4px;padding-bottom:4px">' + notices.map(App.noticeItem).join('') + '</div></div>' +
        '<div class="card card-body"><div class="row-between"><h3 style="font-size:16px">Fee status</h3><span class="badge ' + (fee.due ? 'badge-warning' : 'badge-success') + '">' + fee.status + '</span></div><div class="stat-value mono" style="font-size:26px;margin:12px 0 4px">' + O.inr(fee.paid) + '<span class="subtle" style="font-size:14px"> / ' + O.inr(fee.total) + '</span></div><div class="progress" style="margin:10px 0 16px"><span style="width:' + Math.round(fee.paid / fee.total * 100) + '%"></span></div>' + (fee.due ? '<a class="btn btn-accent btn-block" href="#/fees">' + icon('card') + 'Pay ' + O.inr(fee.due) + '</a>' : '<a class="btn btn-block" href="#/fees">' + icon('receipt') + 'View receipts</a>') + '</div></div></div>';
      App.bindNotices(el);
    },

    // ---------------- COURSES ----------------
    courses(el) {
      let tab = 'catalogue';
      const draw = () => {
        const sid = App.user.ref; const q = ($('#course-search', el) || {}).value || ''; const dept = ($('#dept-filter', el) || {}).value || ''; const avail = ($('#avail-only', el) || {}).checked;
        let list = O.db.courses;
        if (tab === 'mine') list = myCourses();
        if (tab === 'waitlist') list = O.db.courses.filter(c => c.waitlist.includes(sid));
        list = list.filter(c => (!q || (c.id + c.title + O.facultyById(c.faculty).name).toLowerCase().includes(q.toLowerCase())) && (!dept || c.dept === dept) && (!avail || O.seatsLeft(c) > 0));
        $('#course-grid', el).innerHTML = list.length ? list.map(courseCard).join('') : '<div class="card empty" style="grid-column:1/-1">' + icon('book') + '<strong>' + (tab === 'waitlist' ? 'You are not on any waitlist' : 'No courses found') + '</strong><span>' + (tab === 'catalogue' ? 'Try clearing filters.' : 'Browse the catalogue to add courses.') + '</span></div>';
        $('#tab-mine-count', el).textContent = myCourses().length;
        $('#tab-wait-count', el).textContent = O.db.courses.filter(c => c.waitlist.includes(sid)).length;
        $('#credit-meter', el).innerHTML = '<span class="mono">' + O.creditsOf(sid) + '</span> / ' + O.db.settings.maxCredits + ' credits';
      };
      el.innerHTML = App.pageHead('Course Enrollment', 'Live seat availability, enroll / drop within the add/drop window, and automatic waitlisting (FR-3.1 – 3.3).', '<span class="badge badge-success" style="padding:8px 12px"><span class="live-dot"></span>&nbsp;Live seat count</span><span class="badge" id="credit-meter" style="padding:8px 12px"></span>') +
        addDropBanner() +
        '<div class="row-between wrap" style="margin-bottom:18px"><div class="segmented" id="course-tabs"><button class="active" data-t="catalogue">' + icon('book', 'icon-sm') + 'Catalogue</button><button data-t="mine">My courses <span class="badge" id="tab-mine-count" style="padding:0 7px"></span></button><button data-t="waitlist">Waitlists <span class="badge" id="tab-wait-count" style="padding:0 7px"></span></button></div>' +
        '<div class="row wrap"><div class="input-group" style="width:260px">' + icon('search') + '<input class="input" id="course-search" placeholder="Search code, title, faculty" aria-label="Search courses"></div><select class="select" id="dept-filter" style="width:150px" aria-label="Department"><option value="">All depts</option>' + O.db.departments.map(d => '<option value="' + d.id + '">' + d.id + '</option>').join('') + '</select><label class="check"><input type="checkbox" id="avail-only">Available only</label></div></div>' +
        '<div class="grid grid-3" id="course-grid"></div>';
      $('#course-tabs', el).onclick = e => { const b = e.target.closest('button'); if (!b) return; tab = b.dataset.t; $$('#course-tabs button', el).forEach(x => x.classList.toggle('active', x === b)); draw(); };
      ['#course-search', '#dept-filter', '#avail-only'].forEach(s => $(s, el).addEventListener('input', draw));
      $('#course-grid', el).addEventListener('click', e => {
        const b = e.target.closest('button'); if (!b) return;
        if (b.dataset.enroll) enroll(O.course(b.dataset.enroll), draw);
        if (b.dataset.drop) drop(O.course(b.dataset.drop), draw);
        if (b.dataset.leave) leaveWaitlist(O.course(b.dataset.leave), draw);
        if (b.dataset.info) { const c = O.course(b.dataset.info); modal({ title: c.id + ' · ' + esc(c.title), body: '<p class="muted" style="margin-bottom:16px">' + esc(c.desc) + '</p><dl class="kv"><dt>Instructor</dt><dd>' + esc(O.facultyById(c.faculty).name) + '</dd><dt>Department</dt><dd>' + esc(O.dept(c.dept).name) + '</dd><dt>Credits</dt><dd>' + c.credits + '</dd><dt>Schedule</dt><dd>' + c.slots.map(x => O.DAYS[x[0]] + ' ' + x[1] + '–' + O.SLOT_END[x[1]] + ' · ' + x[2]).join('<br>') + '</dd><dt>Capacity</dt><dd class="mono">' + c.filled + ' / ' + c.capacity + '</dd><dt>Waitlist</dt><dd class="mono">' + O.waitCount(c) + '</dd><dt>Assessment</dt><dd>' + O.COMPONENTS.map(x => x.label + ' (' + x.max + ')').join(', ') + '</dd></dl>', foot: '<button class="btn btn-primary" data-close>Close</button>' }); }
      });
      draw();
      // simulate real-time seat changes from other students (FR-3.1)
      const timer = setInterval(() => {
        if (!document.body.contains(el)) return clearInterval(timer);
        const pool = O.db.courses.filter(c => O.seatsLeft(c) > 1 && !myCourses().includes(c));
        const c = pool[Math.floor(Math.random() * pool.length)]; if (!c) return;
        c.filled = Math.min(c.capacity - 1, Math.max(5, c.filled + (Math.random() < 0.7 ? 1 : -1))); O.save();
        const card = $('[data-course="' + c.id + '"]', el); if (!card) return;
        const pct = Math.round(c.filled / c.capacity * 100); const n = $('.seats-num', card);
        n.textContent = O.seatsLeft(c) + ' of ' + c.capacity + ' left'; n.classList.remove('seat-flash'); void n.offsetWidth; n.classList.add('seat-flash');
        const bar = $('.progress', card); bar.className = 'progress ' + (pct >= 90 ? 'warn' : ''); $('.progress span', card).style.width = pct + '%';
      }, 3500);
    },

    // ---------------- ATTENDANCE ----------------
    attendance(el) {
      const s = me(); const courses = myCourses(); const overall = O.overallAtt(s.id);
      el.innerHTML = App.pageHead('My Attendance', 'Per-session attendance recorded by faculty (FR-4.1). Minimum 75% required in each course.', '<div class="legend"><span><i style="background:var(--success)"></i>Present</span><span><i style="background:var(--warning)"></i>Late (½)</span><span><i style="background:var(--danger)"></i>Absent</span></div>') +
        '<div class="grid grid-4" style="margin-bottom:20px">' + App.stat('Overall', overall + '%', 'Across ' + courses.length + ' courses', 'activity', overall >= 75 ? 'tone-green' : 'tone-red', 'data-count="' + overall + '" data-suffix="%"') +
        App.stat('Sessions attended', courses.reduce((a, c) => a + O.attStats(s.id, c.id).present, 0), 'of ' + courses.reduce((a, c) => a + O.attStats(s.id, c.id).held, 0) + ' held', 'checkCircle', 'tone-teal') +
        App.stat('Courses at risk', courses.filter(c => O.attStats(s.id, c.id).pct < 75).length, 'Below 75%', 'alert', 'tone-amber') +
        App.stat('Late marks', courses.reduce((a, c) => a + O.attStats(s.id, c.id).late, 0), 'Counted as half', 'clock', 'tone-violet') + '</div>' +
        '<div class="grid grid-2">' + courses.map(c => {
          const a = O.attStats(s.id, c.id); const need = a.pct < 75 ? Math.ceil((0.75 * a.held - a.present) / 0.25) : 0;
          const canMiss = a.pct >= 75 ? Math.floor((a.present - 0.75 * a.held) / 0.75) : 0;
          return '<div class="card card-hover"><div class="card-body"><div class="row" style="gap:20px;align-items:flex-start">' + Charts.ring(a.pct, { size: 104 }) + '<div class="grow" style="min-width:0"><div class="mono" style="color:var(--primary);font-size:12.5px;font-weight:600">' + c.id + '</div><h3 style="font-size:17px;margin:2px 0 6px">' + esc(c.title) + '</h3><div class="row wrap" style="gap:6px;margin-bottom:10px"><span class="badge">' + a.present + ' / ' + a.held + ' attended</span>' + (a.pct < 75 ? '<span class="badge badge-danger">Attend next ' + need + ' to reach 75%</span>' : '<span class="badge badge-success">Can miss ' + canMiss + ' safely</span>') + '</div><div class="heat" aria-label="Session history">' + a.log.map(l => '<i class="' + l[1] + '" title="' + O.fmtDate(l[0]) + ' · ' + ({ P: 'Present', A: 'Absent', L: 'Late' })[l[1]] + '"></i>').join('') + '</div></div></div></div>' +
            '<div style="padding:0 24px 18px"><button class="btn btn-ghost btn-sm" data-log="' + c.id + '">' + icon('listCheck', 'icon-sm') + 'Session log</button></div></div>';
        }).join('') + '</div>';
      el.addEventListener('click', e => {
        const b = e.target.closest('[data-log]'); if (!b) return; const c = O.course(b.dataset.log); const a = O.attStats(s.id, c.id);
        modal({ title: c.id + ' · Session log', size: 'lg', body: '<div class="table-wrap" style="max-height:60vh"><table class="table"><thead><tr><th>#</th><th>Date</th><th>Day</th><th>Status</th></tr></thead><tbody>' + a.log.slice().reverse().map((l, i) => '<tr><td class="mono subtle">' + (a.log.length - i) + '</td><td>' + O.fmtDate(l[0]) + '</td><td>' + new Date(l[0] + 'T00:00').toLocaleDateString('en-IN', { weekday: 'long' }) + '</td><td>' + ({ P: '<span class="badge badge-success">Present</span>', A: '<span class="badge badge-danger">Absent</span>', L: '<span class="badge badge-warning">Late</span>' })[l[1]] + '</td></tr>').join('') + '</tbody></table></div>', foot: '<button class="btn btn-primary" data-close>Close</button>' });
      });
    },

    // ---------------- GRADES ----------------
    grades(el) {
      const s = me(); const hist = O.db.history[s.id] || []; const ens = O.enrollmentsOf(s.id);
      const sg = hist.map(t => O.sgpa(t.courses)); const cg = O.cgpa(s.id);
      el.innerHTML = App.pageHead('Grades & Transcript', 'Component-wise marks, automatically calculated final grades and a downloadable transcript (FR-4.2, FR-4.3).', '<button class="btn btn-primary" id="dl-transcript">' + icon('download') + 'Download transcript PDF</button>') +
        '<div class="grid grid-4" style="margin-bottom:20px">' + App.stat('CGPA', cg.toFixed(2), 'Out of 10.00', 'award', 'tone-teal', 'data-count="' + cg.toFixed(2) + '"') + App.stat('Last SGPA', (sg[sg.length - 1] || 0).toFixed(2), hist.length ? esc(hist[hist.length - 1].term) : '', 'trend', 'tone-green', 'data-count="' + (sg[sg.length - 1] || 0).toFixed(2) + '"') + App.stat('Credits earned', hist.reduce((a, t) => a + t.courses.reduce((b, c) => b + c[2], 0), 0), hist.length + ' semesters completed', 'layers', 'tone-violet') + App.stat('Backlogs', '0', 'All courses cleared', 'checkCircle', 'tone-sky') + '</div>' +
        '<div class="card" style="margin-bottom:20px"><div class="card-head"><div><h3>Current semester · ' + esc(O.db.settings.term) + '</h3><div class="sub">Final grade is computed automatically once all components are entered</div></div><span class="badge badge-warning">In progress</span></div><div class="table-wrap"><table class="table"><thead><tr><th>Course</th>' + O.COMPONENTS.map(c => '<th class="num">' + c.label + '<div class="subtle" style="text-transform:none;letter-spacing:0">/' + c.max + '</div></th>').join('') + '<th class="num">Total</th><th>Grade</th></tr></thead><tbody>' +
        ens.map(e => { const c = O.course(e.courseId); const m = O.markSummary(e.marks); return '<tr><td><div class="cell-user"><div><strong>' + esc(c.title) + '</strong><small>' + c.id + ' · ' + c.credits + ' cr</small></div></div></td>' + O.COMPONENTS.map(k => '<td class="num">' + (e.marks[k.key] != null && e.marks[k.key] !== '' ? e.marks[k.key] : '<span class="subtle">—</span>') + '</td>').join('') + '<td class="num"><strong>' + m.total + '</strong><span class="subtle">/' + m.maxSoFar + '</span></td><td>' + (m.complete ? '<span class="badge badge-success">' + m.letter + ' · ' + m.point + '</span>' : '<span class="badge" title="Projected from entered components">~' + O.gradeFrom(m.projected).letter + ' projected</span>') + '</td></tr>'; }).join('') + '</tbody></table></div></div>' +
        '<div class="grid grid-main"><div class="card"><div class="card-head"><h3>Academic history</h3><span class="sub">FR-2.3 · historical record</span></div><div class="card-body stack">' +
        hist.map((t, i) => '<details class="card" style="background:var(--surface-2)" ' + (i === hist.length - 1 ? 'open' : '') + '><summary style="padding:14px 18px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;list-style:none"><span><strong>' + esc(t.term) + '</strong> <span class="subtle" style="font-size:13px">· ' + t.year + '</span></span><span class="badge badge-primary mono">SGPA ' + sg[i].toFixed(2) + '</span></summary><div class="table-wrap"><table class="table"><thead><tr><th>Code</th><th>Course</th><th class="num">Credits</th><th>Grade</th></tr></thead><tbody>' + t.courses.map(c => '<tr><td class="mono">' + c[0] + '</td><td>' + esc(c[1]) + '</td><td class="num">' + c[2] + '</td><td><span class="badge ' + (O.gp(c[3]) >= 9 ? 'badge-success' : 'badge-primary') + '">' + c[3] + '</span></td></tr>').join('') + '</tbody></table></div></details>').join('') + '</div></div>' +
        '<div class="stack" style="gap:20px"><div class="card"><div class="card-head"><h3>SGPA trend</h3></div><div class="card-body">' + Charts.line([{ data: sg, c: '#2DD4BF' }], hist.map((t, i) => 'S' + (i + 1)), { min: 7, max: 10, label: 'SGPA trend' }) + '</div></div>' +
        '<div class="card card-body"><h3 style="font-size:15px;margin-bottom:12px">Grading scale</h3><div class="table-wrap"><table class="table"><tbody>' + O.GRADE_SCALE.map(g => '<tr><td><span class="badge badge-primary">' + g[1] + '</span></td><td class="mono">≥ ' + g[0] + '%</td><td class="num">' + g[2] + ' pts</td></tr>').join('') + '</tbody></table></div></div></div></div>';
      $('#dl-transcript', el).onclick = () => {
        const b = $('#dl-transcript', el); b.innerHTML = '<span class="spinner"></span> Generating…'; b.disabled = true;
        setTimeout(() => {
          b.innerHTML = icon('download') + 'Download transcript PDF'; b.disabled = false;
          const code = 'OSMS-' + s.id.slice(-4) + '-' + Math.random().toString(36).slice(2, 8).toUpperCase();
          UI.printDoc('<div class="doc"><div class="doc-head"><div><h2>Official Academic Transcript</h2><div class="muted">Department of ' + esc(O.dept(s.dept).name) + ' · Online Student Management System</div></div><div style="text-align:right"><strong>OSMS</strong><div class="muted" style="font-size:12px">Verification: ' + code + '</div></div></div>' +
            '<table><tr><td><strong>Name</strong></td><td>' + esc(s.name) + '</td><td><strong>Roll No.</strong></td><td>' + s.id + '</td></tr><tr><td><strong>Program</strong></td><td>B.Tech · ' + s.dept + '</td><td><strong>CGPA</strong></td><td><strong>' + cg.toFixed(2) + '</strong></td></tr></table>' +
            hist.map((t, i) => '<h3 style="margin-top:18px;font-size:14px;color:#0F766E">' + esc(t.term) + ' (' + t.year + ') — SGPA ' + sg[i].toFixed(2) + '</h3><table><tr><th>Code</th><th>Course</th><th class="r">Credits</th><th class="r">Grade</th></tr>' + t.courses.map(c => '<tr><td>' + c[0] + '</td><td>' + esc(c[1]) + '</td><td class="r">' + c[2] + '</td><td class="r">' + c[3] + '</td></tr>').join('') + '</table>').join('') +
            '<p class="muted" style="margin-top:24px;font-size:12px">Generated on ' + O.fmtDate(O.iso(new Date()), { day: 'numeric', month: 'long', year: 'numeric' }) + '. This is a system-generated document (FR-4.3).</p></div>');
          toast('Transcript ready', 'Choose “Save as PDF” in the print dialog');
        }, 900);
      };
    },

    // ---------------- FEES ----------------
    fees(el) {
      const draw = () => {
        const s = me(); const f = O.feeSummary(s.id); const pays = O.db.payments.filter(p => p.studentId === s.id).sort((a, b) => b.date.localeCompare(a.date));
        el.innerHTML = App.pageHead('Fees & Payments', 'Fee structure, outstanding balance, secure online payment and digital receipts (FR-5.1, FR-5.2).', f.due ? '<button class="btn btn-accent btn-lg" id="pay-now">' + icon('card') + 'Pay ' + O.inr(f.due) + '</button>' : '<span class="badge badge-success" style="padding:10px 14px">' + icon('checkCircle', 'icon-sm') + 'All dues cleared</span>') +
          (f.due ? '<div class="banner banner-warn">' + icon('clock') + '<p>Balance of <strong>' + O.inr(f.due) + '</strong> is due by <strong>' + O.fmtDate(O.db.settings.feeDue) + '</strong>. A late fine of ₹500 applies after the due date.</p></div>' : '') +
          '<div class="grid grid-4" style="margin-bottom:20px">' + App.stat('Total fee (2026-27)', O.inr(f.total), 'B.Tech · ' + s.dept, 'file', 'tone-teal', 'data-count="' + f.total + '" data-prefix="₹" data-inr="1"') + App.stat('Paid', O.inr(f.paid), pays.length + ' payment' + (pays.length !== 1 ? 's' : ''), 'checkCircle', 'tone-green', 'data-count="' + f.paid + '" data-prefix="₹" data-inr="1"') + App.stat('Outstanding', O.inr(f.due), f.due ? 'Due ' + O.fmtDate(O.db.settings.feeDue) : 'Nothing due', 'wallet', f.due ? 'tone-amber' : 'tone-green', 'data-count="' + f.due + '" data-prefix="₹" data-inr="1"') + App.stat('Status', f.status, Math.round(f.paid / f.total * 100) + '% cleared', 'receipt', 'tone-violet') + '</div>' +
          '<div class="grid grid-main"><div class="card"><div class="card-head"><h3>Payment history</h3><span class="sub">Digital receipts</span></div><div class="table-wrap"><table class="table"><thead><tr><th>Receipt</th><th>Date</th><th>Method</th><th class="num">Amount</th><th></th></tr></thead><tbody>' +
          (pays.length ? pays.map(p => '<tr><td class="mono">' + p.id + '</td><td>' + O.fmtDate(p.date) + '</td><td><span class="badge">' + p.method + '</span></td><td class="num">' + O.inr(p.amount) + '</td><td style="text-align:right"><button class="btn btn-ghost btn-sm" data-receipt="' + p.id + '">' + icon('receipt', 'icon-sm') + 'Receipt</button></td></tr>').join('') : '<tr><td colspan="5"><div class="empty">No payments yet</div></td></tr>') + '</tbody></table></div></div>' +
          '<div class="card"><div class="card-head"><h3>Fee structure</h3><span class="sub">Set by Admin</span></div><div class="card-body" style="padding-top:8px">' + O.db.feeStructure.map(x => '<div class="list-item"><div class="grow"><strong>' + esc(x.label) + '</strong></div><span class="mono">' + O.inr(x.amount) + '</span></div>').join('') + '<div class="list-item" style="border-top:1px solid var(--border-strong)"><div class="grow"><strong>Total</strong></div><strong class="mono" style="color:var(--primary)">' + O.inr(f.total) + '</strong></div><div style="margin-top:16px">' + Charts.donut([{ v: f.paid, c: '#2DD4BF', l: 'Paid' }, { v: f.due, c: '#F59E0B', l: 'Outstanding' }], { size: 160, center: '<strong>' + Math.round(f.paid / f.total * 100) + '%</strong><small>paid</small>' }) + '</div></div></div></div>';
        const pb = $('#pay-now', el); if (pb) pb.onclick = () => payFlow(f.due, draw);
        $$('[data-receipt]', el).forEach(b => b.onclick = () => showReceipt(O.db.payments.find(p => p.id === b.dataset.receipt)));
        UI.countUp(el);
      };
      draw();
    }
  };

  // ---------- payment gateway simulation ----------
  function payFlow(due, done) {
    let method = 'UPI';
    const methodFields = {
      UPI: UI.field({ id: 'p-upi', label: 'UPI ID', value: 'cherish@okaxis', rule: 'required', placeholder: 'name@bank' }),
      Card: '<div class="form-grid">' + UI.field({ id: 'p-card', label: 'Card number', value: '4111 1111 1111 1111', rule: 'required|min:19', span: true, attrs: ' inputmode="numeric" maxlength="19"' }) + UI.field({ id: 'p-exp', label: 'Expiry', value: '08/29', rule: 'required', placeholder: 'MM/YY' }) + UI.field({ id: 'p-cvv', label: 'CVV', type: 'password', value: '123', rule: 'required|min:3', attrs: ' maxlength="3"' }) + '</div>',
      'Net Banking': UI.field({ id: 'p-bank', label: 'Select bank', type: 'select', options: ['State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Kotak Mahindra Bank'] })
    };
    const m = modal({
      title: 'Secure fee payment',
      body: '<div class="stack" id="pay-form"><div class="row-between card" style="padding:16px;background:var(--surface-2)"><div><div class="subtle" style="font-size:12.5px">Amount payable</div><div class="mono" style="font-size:26px;font-weight:700" id="pay-amt-label">' + O.inr(due) + '</div></div><span class="badge badge-success">' + icon('lock', 'icon-sm') + 'TLS 1.3 · PCI-DSS gateway</span></div>' +
        '<div class="field"><span class="label">Amount</span><div class="segmented" id="amt-opt"><button class="active" data-a="full">Full balance</button><button data-a="custom">Part payment</button></div></div>' +
        '<div id="custom-amt" hidden>' + UI.field({ id: 'p-amount', label: 'Enter amount (₹)', type: 'number', value: Math.min(due, 25000), rule: 'num:1000,' + due, hint: 'Minimum ₹1,000' }) + '</div>' +
        '<div class="field"><span class="label">Payment method</span><div class="grid" style="grid-template-columns:repeat(3,1fr);gap:10px" id="methods">' + [['UPI', 'phone'], ['Card', 'card'], ['Net Banking', 'building']].map(([k, ic], i) => '<label class="pay-method ' + (i === 0 ? 'active' : '') + '"><input type="radio" name="pm" value="' + k + '" ' + (i === 0 ? 'checked' : '') + ' class="sr-only">' + icon(ic) + '<strong style="font-size:13.5px">' + k + '</strong></label>').join('') + '</div></div>' +
        '<div id="method-fields">' + methodFields.UPI + '</div></div>',
      foot: '<button class="btn" data-close>Cancel</button><button class="btn btn-primary" id="pay-go">' + icon('lock', 'icon-sm') + 'Pay ' + O.inr(due) + '</button>'
    });
    let amtMode = 'full';
    const amount = () => amtMode === 'full' ? due : +m.$('#p-amount').value || 0;
    const sync = () => { m.$('#pay-go').innerHTML = icon('lock', 'icon-sm') + 'Pay ' + O.inr(amount()); m.$('#pay-amt-label').textContent = O.inr(amount()); };
    m.$('#amt-opt').onclick = e => { const b = e.target.closest('button'); if (!b) return; amtMode = b.dataset.a; m.$$('#amt-opt button').forEach(x => x.classList.toggle('active', x === b)); m.$('#custom-amt').hidden = amtMode === 'full'; sync(); };
    m.$('#p-amount').oninput = sync;
    m.$('#methods').onchange = e => { method = e.target.value; m.$$('.pay-method').forEach(l => l.classList.toggle('active', l.querySelector('input').checked)); m.$('#method-fields').innerHTML = methodFields[method]; };
    m.$('#pay-go').onclick = () => {
      const scope = m.$('#pay-form'); if (amtMode === 'full') m.$('#p-amount').removeAttribute('data-rule'); else m.$('#p-amount').setAttribute('data-rule', 'num:1000,' + due);
      if (!UI.validate(scope)) return;
      const amt = amount();
      m.$('.modal-body').innerHTML = '<div style="text-align:center;padding:30px 0"><div class="spinner" style="width:48px;height:48px;margin:0 auto 20px;color:var(--primary);border-width:4px"></div><h3>Processing payment…</h3><p class="muted" style="margin-top:6px">Contacting payment gateway · do not close this window</p></div>';
      m.$('.modal-foot').hidden = true;
      setTimeout(() => {
        const p = { id: 'RCPT-2026-' + (24100 + O.db.payments.length), studentId: App.user.ref, amount: amt, method, date: O.iso(new Date()), ref: 'TXN' + Date.now().toString().slice(-10) };
        O.db.payments.push(p); O.save(); O.log('Paid ' + O.inr(amt), App.user.ref);
        O.addNotice({ title: 'Payment received · ' + O.inr(amt), body: 'Thank you! Receipt ' + p.id + ' has been emailed to you. Transaction ref ' + p.ref + '.', category: 'Payment', audience: { role: 'student', studentId: App.user.ref }, channels: ['email', 'sms'], from: 'Accounts Section' });
        App.refreshChrome();
        m.$('.modal-body').innerHTML = '<div style="text-align:center;padding:16px 0"><div class="success-burst">' + icon('check') + '</div><h3 style="margin-top:18px;font-size:22px">Payment successful</h3><p class="muted" style="margin-top:6px">' + O.inr(amt) + ' paid via ' + method + '</p><div class="card" style="padding:14px;margin-top:20px;background:var(--surface-2);text-align:left"><dl class="kv" style="grid-template-columns:120px 1fr"><dt>Receipt no.</dt><dd class="mono">' + p.id + '</dd><dt>Transaction</dt><dd class="mono">' + p.ref + '</dd><dt>Date</dt><dd>' + O.fmtDate(p.date) + '</dd></dl></div><p class="subtle" style="font-size:12.5px;margin-top:12px">' + icon('mail', 'icon-sm') + ' Receipt sent by email & SMS</p></div>';
        const foot = m.$('.modal-foot'); foot.hidden = false; foot.innerHTML = '<button class="btn" id="rc-view">' + icon('receipt') + 'View receipt</button><button class="btn btn-primary" data-close>Done</button>';
        m.$('#rc-view').onclick = () => { m.close(); showReceipt(p); };
        done && done();
      }, 1800);
    };
  }

  function receiptDoc(p) {
    const s = O.student(p.studentId);
    return '<div class="doc"><div class="doc-head"><div><h2>Fee Payment Receipt</h2><div class="muted">Online Student Management System · Accounts Section</div></div><div style="text-align:right"><span class="stamp">PAID</span></div></div>' +
      '<table><tr><td><strong>Receipt No.</strong></td><td>' + p.id + '</td><td><strong>Date</strong></td><td>' + O.fmtDate(p.date) + '</td></tr><tr><td><strong>Student</strong></td><td>' + esc(s.name) + '</td><td><strong>Roll No.</strong></td><td>' + s.id + '</td></tr><tr><td><strong>Method</strong></td><td>' + p.method + '</td><td><strong>Txn Ref</strong></td><td>' + p.ref + '</td></tr></table>' +
      '<table><tr><th>Description</th><th class="r">Amount</th></tr><tr><td>Academic fee 2026-27 · B.Tech ' + s.dept + '</td><td class="r">' + O.inr(p.amount) + '</td></tr><tr><td><strong>Total paid</strong></td><td class="r"><strong>' + O.inr(p.amount) + '</strong></td></tr></table>' +
      '<p class="muted" style="margin-top:20px;font-size:12px">Balance after this payment: ' + O.inr(O.feeSummary(s.id).due) + '. This is a computer-generated receipt and does not require a signature.</p></div>';
  }
  function showReceipt(p) {
    const m = modal({ title: 'Receipt ' + p.id, size: 'lg', body: receiptDoc(p), foot: '<button class="btn" data-close>Close</button><button class="btn btn-primary" id="rc-print">' + icon('printer') + 'Print / Save PDF</button>' });
    m.$('#rc-print').onclick = () => UI.printDoc(receiptDoc(p));
  }
  window.showReceipt = showReceipt;
})();
