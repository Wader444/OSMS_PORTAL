/* =========================================================
   OSMS Store — seeded demo data + localStorage persistence
   Mirrors the SRS data model (Fig. 6): Department, Faculty, Course,
   Student, Enrollment, Attendance, Fee  (+ Notice, Settings)
   ========================================================= */
(function () {
  const KEY = 'osms_db_v1';
  const pad = n => String(n).padStart(2, '0');
  const iso = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

  // deterministic PRNG so demo data is stable
  function rng(seedStr) {
    let h = 1779033703 ^ seedStr.length;
    for (let i = 0; i < seedStr.length; i++) { h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353); h = h << 13 | h >>> 19; }
    return function () { h = Math.imul(h ^ h >>> 16, 2246822507); h = Math.imul(h ^ h >>> 13, 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
  }

  const SLOTS = ['09:00', '10:00', '11:15', '13:30', '14:30'];
  const SLOT_END = { '09:00': '09:55', '10:00': '10:55', '11:15': '12:10', '13:30': '14:25', '14:30': '15:25' };
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const COMPONENTS = [
    { key: 'mid1', label: 'Mid-I', max: 20 },
    { key: 'mid2', label: 'Mid-II', max: 20 },
    { key: 'assign', label: 'Assignment', max: 10 },
    { key: 'lab', label: 'Lab', max: 10 },
    { key: 'end', label: 'End-Sem', max: 40 }
  ];
  const GRADE_SCALE = [[90, 'O', 10], [80, 'A+', 9], [70, 'A', 8], [60, 'B+', 7], [50, 'B', 6], [40, 'C', 5], [0, 'F', 0]];

  function seed() {
    const departments = [
      { id: 'IT', name: 'Information Technology', hod: 'Dr. Ravi Kumar' },
      { id: 'CSE', name: 'Computer Science & Engg.', hod: 'Dr. Anitha Rao' },
      { id: 'ECE', name: 'Electronics & Communication', hod: 'Prof. Suresh Reddy' },
      { id: 'MECH', name: 'Mechanical Engineering', hod: 'Dr. P. Srinivas' }
    ];
    const faculty = [
      { id: 'F101', name: 'Dr. Ravi Kumar', email: 'ravi.kumar@osms.edu', dept: 'IT', designation: 'Professor & HOD', phone: '+91 98480 11223', active: true },
      { id: 'F102', name: 'Dr. Anitha Rao', email: 'anitha.rao@osms.edu', dept: 'CSE', designation: 'Associate Professor', phone: '+91 98480 22334', active: true },
      { id: 'F103', name: 'Prof. Suresh Reddy', email: 'suresh.reddy@osms.edu', dept: 'ECE', designation: 'Professor', phone: '+91 98480 33445', active: true },
      { id: 'F104', name: 'Dr. Meera Iyer', email: 'meera.iyer@osms.edu', dept: 'IT', designation: 'Assistant Professor', phone: '+91 98480 44556', active: true },
      { id: 'F105', name: 'Prof. Kiran Varma', email: 'kiran.varma@osms.edu', dept: 'CSE', designation: 'Assistant Professor', phone: '+91 98480 55667', active: true }
    ];
    const courses = [
      { id: 'IT301', title: 'Software Engineering', credits: 4, capacity: 60, filled: 52, waitlist: [], waitBase: 0, faculty: 'F101', dept: 'IT', slots: [[0, '09:00', 'LH-201'], [2, '10:00', 'LH-201'], [4, '11:15', 'LH-201']], desc: 'SDLC models, requirements engineering (IEEE 830), UML design, testing and project management.' },
      { id: 'IT302', title: 'Database Management Systems', credits: 4, capacity: 60, filled: 57, waitlist: [], waitBase: 0, faculty: 'F104', dept: 'IT', slots: [[0, '10:00', 'LH-203'], [1, '11:15', 'LH-203'], [3, '09:00', 'Lab-2']], desc: 'ER modelling, normalization, SQL, transactions, indexing and query optimization.' },
      { id: 'IT303', title: 'Computer Networks', credits: 3, capacity: 55, filled: 48, waitlist: [], waitBase: 0, faculty: 'F101', dept: 'IT', slots: [[1, '09:00', 'LH-105'], [3, '11:15', 'LH-105']], desc: 'OSI/TCP-IP stack, routing, congestion control, TLS and network security fundamentals.' },
      { id: 'CS305', title: 'Machine Learning', credits: 4, capacity: 50, filled: 50, waitlist: [], waitBase: 6, faculty: 'F102', dept: 'CSE', slots: [[1, '13:30', 'LH-301'], [3, '14:30', 'LH-301']], desc: 'Supervised & unsupervised learning, model evaluation, neural networks with hands-on labs.' },
      { id: 'CS306', title: 'Web Technologies', credits: 3, capacity: 45, filled: 40, waitlist: [], waitBase: 0, faculty: 'F105', dept: 'CSE', slots: [[2, '13:30', 'Lab-4'], [4, '09:00', 'Lab-4']], desc: 'HTML/CSS/JS, REST APIs, responsive design and modern front-end frameworks.' },
      { id: 'IT304', title: 'Cloud Computing', credits: 3, capacity: 40, filled: 40, waitlist: [], waitBase: 3, faculty: 'F104', dept: 'IT', slots: [[0, '13:30', 'LH-204'], [2, '14:30', 'LH-204']], desc: 'Virtualization, IaaS/PaaS/SaaS, containers, horizontal scaling and cloud-native design.' },
      { id: 'CS307', title: 'Cyber Security Essentials', credits: 3, capacity: 50, filled: 31, waitlist: [], waitBase: 0, faculty: 'F102', dept: 'CSE', slots: [[4, '13:30', 'LH-302'], [1, '14:30', 'LH-302']], desc: 'Threat modelling, cryptography basics, secure coding, authentication and hashing.' },
      { id: 'EC310', title: 'IoT Systems', credits: 3, capacity: 40, filled: 37, waitlist: [], waitBase: 0, faculty: 'F103', dept: 'ECE', slots: [[0, '14:30', 'ECE-Lab'], [3, '13:30', 'ECE-Lab']], desc: 'Sensors, microcontrollers, MQTT, edge computing and IoT security.' },
      { id: 'IT306', title: 'Data Visualization', credits: 2, capacity: 35, filled: 33, waitlist: [], waitBase: 0, faculty: 'F101', dept: 'IT', slots: [[2, '09:00', 'Lab-1']], desc: 'Visual encoding, dashboards, chart selection and storytelling with data.' },
      { id: 'IT307', title: 'Compiler Design', credits: 3, capacity: 50, filled: 22, waitlist: [], waitBase: 0, faculty: 'F105', dept: 'IT', slots: [[0, '09:00', 'LH-106'], [3, '09:00', 'LH-106']], desc: 'Lexical analysis, parsing, semantic analysis, intermediate code and optimization.' }
    ];
    const S = (id, name, dept, extra) => Object.assign({ id, name, dept, email: name.split(' ')[0].toLowerCase() + '.' + name.split(' ')[1][0].toLowerCase() + '@osms.edu', year: 'III', sem: 'I', section: 'A', phone: '+91 9' + id.slice(-4) + '0 ' + id.slice(-5), address: 'Hyderabad, Telangana', guardian: 'Parent of ' + name.split(' ')[0], active: true, joined: '2024-08-01' }, extra || {});
    const students = [
      S('24881A1264', 'Cherish Yepuru', 'IT', { email: 'cherish.y@osms.edu', phone: '+91 98765 43210', address: 'Plot 42, Madhapur, Hyderabad, Telangana 500081', guardian: 'Y. Srinivas · +91 98490 12345', dob: '2006-03-14', blood: 'O+' }),
      S('24881A1253', 'Pavani Rangineni', 'IT'),
      S('24881A1229', 'Varun Sandesh', 'IT'),
      S('24881A1201', 'Aarav Sharma', 'IT'),
      S('24881A1207', 'Diya Patel', 'IT'),
      S('24881A1212', 'Rohan Verma', 'IT'),
      S('24881A1218', 'Sneha Reddy', 'IT'),
      S('24881A1222', 'Karthik Naidu', 'IT'),
      S('24881A1235', 'Ananya Gupta', 'IT'),
      S('24881A1241', 'Vikram Singh', 'IT'),
      S('24881A1247', 'Meghana Rao', 'IT'),
      S('24881A0510', 'Ishaan Kapoor', 'CSE'),
      S('24881A0523', 'Priya Nair', 'CSE'),
      S('24881A0431', 'Arjun Menon', 'ECE'),
      S('24881A1258', 'Lakshmi Prasad', 'IT', { active: false })
    ];

    // enrollments: { id, studentId, courseId, status: 'enrolled', marks:{}, enrolledOn }
    const enrollments = [];
    let eid = 1000;
    const enroll = (sid, cid) => enrollments.push({ id: 'E' + (eid++), studentId: sid, courseId: cid, status: 'enrolled', marks: {}, enrolledOn: iso(addDays(today, -70)) });
    students.forEach((s, i) => {
      if (s.dept === 'IT') { ['IT301', 'IT302', 'IT303'].forEach(c => enroll(s.id, c)); }
      if (s.id === '24881A1264') enroll(s.id, 'CS306');
      else if (s.dept === 'IT') enroll(s.id, i % 3 === 0 ? 'CS306' : i % 3 === 1 ? 'IT304' : 'IT306');
      if (s.dept === 'CSE') ['CS305', 'CS306', 'CS307', 'IT301'].forEach(c => enroll(s.id, c));
      if (s.dept === 'ECE') ['EC310', 'IT303', 'CS307'].forEach(c => enroll(s.id, c));
    });
    // marks for current term (Mid-I, Assignment, Lab entered; Mid-II partly; End-Sem pending)
    enrollments.forEach(e => {
      const r = rng(e.studentId + e.courseId);
      const ability = e.studentId === '24881A1264' ? 0.86 : 0.55 + r() * 0.4;
      const m = v => Math.round(Math.min(1, ability + (r() - 0.5) * 0.18) * v * 2) / 2;
      e.marks = { mid1: m(20), assign: m(10), lab: m(10) };
      if (['IT302', 'CS306', 'IT304', 'CS305'].includes(e.courseId)) e.marks.mid2 = m(20);
    });

    // attendance: { [courseId]: { [date]: { [studentId]: 'P'|'A'|'L' } } }
    const attendance = {};
    courses.forEach(c => {
      attendance[c.id] = {};
      const roster = enrollments.filter(e => e.courseId === c.id).map(e => e.studentId);
      for (let d = 63; d >= 1; d--) {
        const day = addDays(today, -d); const wd = day.getDay() - 1;
        if (wd < 0 || wd > 4) continue;
        if (!c.slots.some(s => s[0] === wd)) continue;
        const date = iso(day); attendance[c.id][date] = {};
        roster.forEach(sid => {
          const r = rng(sid + c.id + date)();
          let pPresent = 0.88;
          if (sid === '24881A1264') pPresent = c.id === 'IT303' ? 0.70 : 0.93;
          if (sid === '24881A1241') pPresent = 0.66;
          attendance[c.id][date][sid] = r < pPresent ? 'P' : r < pPresent + 0.04 ? 'L' : 'A';
        });
      }
    });

    // academic history (FR-2.3) for demo student
    const history = {
      '24881A1264': [
        { term: 'I Year · Sem I', year: '2024-25', courses: [['MA101', 'Engineering Mathematics I', 4, 'A+'], ['PH101', 'Engineering Physics', 3, 'A'], ['CS101', 'Programming for Problem Solving', 4, 'O'], ['EE101', 'Basic Electrical Engg.', 3, 'A'], ['EN101', 'English Communication', 2, 'A+']] },
        { term: 'I Year · Sem II', year: '2024-25', courses: [['MA102', 'Engineering Mathematics II', 4, 'A'], ['CH101', 'Engineering Chemistry', 3, 'A+'], ['CS102', 'Data Structures', 4, 'O'], ['ME101', 'Engineering Graphics', 3, 'B+'], ['CS103', 'IT Workshop', 2, 'O']] },
        { term: 'II Year · Sem I', year: '2025-26', courses: [['MA201', 'Discrete Mathematics', 4, 'A+'], ['IT201', 'Object Oriented Programming', 4, 'O'], ['IT202', 'Digital Logic Design', 3, 'A'], ['IT203', 'Computer Organization', 3, 'A+'], ['HS201', 'Economics for Engineers', 2, 'A']] },
        { term: 'II Year · Sem II', year: '2025-26', courses: [['IT204', 'Design & Analysis of Algorithms', 4, 'O'], ['IT205', 'Operating Systems', 4, 'A+'], ['MA202', 'Probability & Statistics', 3, 'A'], ['IT206', 'Java Programming Lab', 2, 'O'], ['IT207', 'Formal Languages & Automata', 3, 'A+']] }
      ]
    };

    const feeStructure = [
      { id: 'tuition', label: 'Tuition Fee', amount: 95000 },
      { id: 'lab', label: 'Lab & Infrastructure', amount: 8000 },
      { id: 'exam', label: 'Examination Fee', amount: 3500 },
      { id: 'library', label: 'Library & Digital Resources', amount: 2000 },
      { id: 'dev', label: 'Development Fee', amount: 6500 }
    ];
    // payments (Fee entity): { id, studentId, amount, method, date, ref }
    const payments = [];
    let rc = 24051;
    students.forEach((s, i) => {
      const r = rng('fee' + s.id)();
      const add = (amt, daysAgo, method) => payments.push({ id: 'RCPT-2026-' + (rc++), studentId: s.id, amount: amt, method, date: iso(addDays(today, -daysAgo)), ref: 'TXN' + Math.floor(r * 1e9) + i });
      if (s.id === '24881A1264') add(60000, 87, 'UPI');
      else if (r < 0.55) add(115000, 60 + i, i % 2 ? 'Net Banking' : 'Card');
      else if (r < 0.85) add(50000 + (i % 3) * 10000, 45 + i, 'UPI');
    });

    const notices = [
      { id: 'N1', title: 'Add/Drop window closes soon', body: 'Course add/drop for Semester III-I closes on ' + fmtDate(iso(addDays(today, 4))) + '. Finalise your enrollments before the deadline.', category: 'Deadline', audience: { role: 'student' }, channels: ['email', 'sms'], from: 'Academic Office', date: iso(addDays(today, -1)) + 'T09:30', readBy: [] },
      { id: 'N2', title: 'Fee payment due — ' + fmtDate(iso(addDays(today, 21))), body: 'Second instalment of the 2026-27 academic fee is due. Pay online via the Fees module to avoid a late fine of ₹500.', category: 'Deadline', audience: { role: 'student' }, channels: ['email', 'sms'], from: 'Accounts Section', date: iso(addDays(today, -2)) + 'T11:00', readBy: [] },
      { id: 'N3', title: 'Mid-II results published for DBMS', body: 'Mid-II marks for IT302 Database Management Systems are now available under Grades.', category: 'Result', audience: { role: 'student', course: 'IT302' }, channels: ['email'], from: 'Dr. Meera Iyer', date: iso(addDays(today, -3)) + 'T16:45', readBy: [] },
      { id: 'N4', title: 'Timetable change: Computer Networks', body: 'IT303 Thursday lecture moves to LH-105 at 11:15 from next week due to lab maintenance.', category: 'Timetable', audience: { role: 'all', course: 'IT303' }, channels: ['email', 'sms'], from: 'Dr. Ravi Kumar', date: iso(addDays(today, -4)) + 'T10:15', readBy: [] },
      { id: 'N5', title: 'Tech Fest "Innovate 2026" registrations open', body: 'Register teams of up to 4 for hackathon, project expo and paper presentation tracks.', category: 'Announcement', audience: { role: 'all' }, channels: ['email'], from: 'Student Affairs', date: iso(addDays(today, -6)) + 'T14:00', readBy: [] },
      { id: 'N6', title: 'Faculty: submit Mid-II marks', body: 'All faculty are requested to upload Mid-II marks for their courses within this week.', category: 'Deadline', audience: { role: 'faculty' }, channels: ['email'], from: 'Examination Cell', date: iso(addDays(today, -2)) + 'T08:00', readBy: [] },
      { id: 'N7', title: 'Scheduled maintenance this Sunday', body: 'OSMS will be unavailable 02:00–04:00 IST on Sunday for planned maintenance (excluded from 99.5% uptime SLA).', category: 'Announcement', audience: { role: 'all' }, channels: ['email'], from: 'IT Services', date: iso(addDays(today, -7)) + 'T18:30', readBy: [] }
    ];

    const users = [
      { email: 'cherish.y@osms.edu', id: '24881A1264', password: 'Demo@123', role: 'student', ref: '24881A1264' },
      { email: 'ravi.kumar@osms.edu', id: 'F101', password: 'Demo@123', role: 'faculty', ref: 'F101' },
      { email: 'admin@osms.edu', id: 'ADM01', password: 'Demo@123', role: 'admin', ref: 'ADM01' }
    ];
    const admins = [{ id: 'ADM01', name: 'Priya Sharma', email: 'admin@osms.edu', designation: 'System Administrator' }];

    return {
      version: 1, departments, faculty, courses, students, enrollments, attendance, history, feeStructure, payments, notices, users, admins,
      timetableChanges: {},
      settings: { addDropOpen: true, addDropCloses: iso(addDays(today, 4)), sessionTimeout: 15, term: '2026-27 · Semester III-I', maxCredits: 24, feeDue: iso(addDays(today, 21)) },
      audit: []
    };
  }

  function fmtDate(s, opts) {
    const d = new Date(s.length <= 10 ? s + 'T00:00' : s);
    return d.toLocaleDateString('en-IN', opts || { day: 'numeric', month: 'short', year: 'numeric' });
  }

  let db;
  function load() {
    try { db = JSON.parse(localStorage.getItem(KEY)); } catch (e) { db = null; }
    if (!db || db.version !== 1) { db = seed(); save(); }
    return db;
  }
  function save() { localStorage.setItem(KEY, JSON.stringify(db)); }
  function reset() { localStorage.removeItem(KEY); load(); }

  load();

  // ---------- helpers ----------
  const H = {
    SLOTS, SLOT_END, DAYS, COMPONENTS, GRADE_SCALE, iso, today, addDays, fmtDate,
    get db() { return db; }, save, reset,
    inr: n => '₹' + Math.round(n).toLocaleString('en-IN'),
    initials: n => n.replace(/^(Dr\.|Prof\.)\s*/, '').split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase(),
    course: id => db.courses.find(c => c.id === id),
    student: id => db.students.find(s => s.id === id),
    facultyById: id => db.faculty.find(f => f.id === id),
    dept: id => db.departments.find(d => d.id === id),
    enrollmentsOf: sid => db.enrollments.filter(e => e.studentId === sid && e.status === 'enrolled'),
    rosterOf: cid => db.enrollments.filter(e => e.courseId === cid && e.status === 'enrolled').map(e => H.student(e.studentId)).filter(Boolean),
    seatsLeft: c => Math.max(0, c.capacity - c.filled),
    waitCount: c => c.waitBase + c.waitlist.length,
    waitPos: (c, sid) => { const i = c.waitlist.indexOf(sid); return i < 0 ? 0 : c.waitBase + i + 1; },
    creditsOf: sid => H.enrollmentsOf(sid).reduce((a, e) => a + H.course(e.courseId).credits, 0),

    clashes(sid, course) {
      const mine = H.enrollmentsOf(sid).map(e => H.course(e.courseId)).filter(c => c.id !== course.id);
      const out = [];
      course.slots.forEach(s => mine.forEach(c => c.slots.forEach(t => { if (t[0] === s[0] && t[1] === s[1]) out.push({ course: c, day: DAYS[s[0]], time: s[1] }); })));
      return out;
    },

    attStats(sid, cid) {
      const sessions = db.attendance[cid] || {};
      let held = 0, present = 0, late = 0, log = [];
      Object.keys(sessions).sort().forEach(d => { const v = sessions[d][sid]; if (!v) return; held++; if (v === 'P') present++; if (v === 'L') { late++; present += 0.5; } log.push([d, v]); });
      return { held, present, late, pct: held ? Math.round(present / held * 1000) / 10 : 0, log };
    },
    overallAtt(sid) {
      let h = 0, p = 0; H.enrollmentsOf(sid).forEach(e => { const s = H.attStats(sid, e.courseId); h += s.held; p += s.present; });
      return h ? Math.round(p / h * 1000) / 10 : 0;
    },
    courseAttAvg(cid) {
      const sessions = db.attendance[cid] || {}; let t = 0, p = 0;
      Object.values(sessions).forEach(m => Object.values(m).forEach(v => { t++; if (v === 'P') p++; if (v === 'L') p += .5; }));
      return t ? Math.round(p / t * 1000) / 10 : 0;
    },

    gradeFrom(total) { const g = GRADE_SCALE.find(x => total >= x[0]); return { letter: g[1], point: g[2] }; },
    markSummary(marks) {
      let total = 0, maxSoFar = 0, complete = true;
      COMPONENTS.forEach(c => { const v = marks[c.key]; if (v === undefined || v === null || v === '') complete = false; else { total += +v; maxSoFar += c.max; } });
      const projected = maxSoFar ? total / maxSoFar * 100 : 0;
      const g = complete ? H.gradeFrom(total) : null;
      return { total, maxSoFar, complete, projected: Math.round(projected), letter: g ? g.letter : null, point: g ? g.point : null };
    },
    gp: letter => (GRADE_SCALE.find(g => g[1] === letter) || [0, 0, 0])[2],
    sgpa(courses) { let c = 0, p = 0; courses.forEach(x => { c += x[2]; p += x[2] * H.gp(x[3]); }); return c ? Math.round(p / c * 100) / 100 : 0; },
    cgpa(sid) {
      const hist = db.history[sid];
      if (!hist) { const r = rng('cg' + sid)(); return Math.round((6.6 + r * 3) * 100) / 100; }
      let c = 0, p = 0; hist.forEach(t => t.courses.forEach(x => { c += x[2]; p += x[2] * H.gp(x[3]); }));
      return Math.round(p / c * 100) / 100;
    },

    feeTotal: () => db.feeStructure.reduce((a, f) => a + f.amount, 0),
    paidBy: sid => db.payments.filter(p => p.studentId === sid).reduce((a, p) => a + p.amount, 0),
    feeSummary(sid) { const total = H.feeTotal(), paid = H.paidBy(sid); const due = Math.max(0, total - paid); return { total, paid, due, status: due === 0 ? 'Paid' : paid > 0 ? 'Partial' : 'Due' }; },

    noticesFor(user) {
      return db.notices.filter(n => {
        const a = n.audience;
        if (a.role !== 'all' && a.role !== user.role && user.role !== 'admin') return false;
        if (user.role === 'student') {
          if (a.course && !H.enrollmentsOf(user.ref).some(e => e.courseId === a.course)) return false;
          if (a.dept && H.student(user.ref).dept !== a.dept) return false;
          if (a.studentId && a.studentId !== user.ref) return false;
        }
        if (user.role === 'faculty') {
          if (a.course && H.course(a.course).faculty !== user.ref) return false;
          if (a.studentId) return false;
        }
        return true;
      }).sort((a, b) => b.date.localeCompare(a.date));
    },
    unreadFor(user) { return H.noticesFor(user).filter(n => !n.readBy.includes(user.ref)).length; },
    addNotice(n) {
      const d = new Date(); const stamp = iso(d) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
      const notice = Object.assign({ id: 'N' + Date.now() + Math.floor(Math.random() * 99), date: stamp, readBy: [], channels: ['email'], category: 'Announcement' }, n);
      db.notices.unshift(notice); save(); return notice;
    },
    recipients(aud) {
      let s = db.students.filter(x => x.active), f = db.faculty.filter(x => x.active);
      if (aud.dept) { s = s.filter(x => x.dept === aud.dept); f = f.filter(x => x.dept === aud.dept); }
      if (aud.course) { s = H.rosterOf(aud.course); f = f.filter(x => x.id === H.course(aud.course).faculty); }
      // scale to realistic institution size for display (named records are a sample)
      const scale = aud.course ? H.course(aud.course).filled / Math.max(1, s.length) : 96;
      const ns = Math.round(s.length * scale), nf = f.length * (aud.dept || aud.course ? 1 : 24);
      if (aud.role === 'student') return ns; if (aud.role === 'faculty') return nf; return ns + nf;
    },
    log(action, who) { db.audit.unshift({ action, who, at: new Date().toISOString() }); db.audit = db.audit.slice(0, 50); save(); },

    timeAgo(s) {
      const d = new Date(s); const diff = (Date.now() - d.getTime()) / 1000;
      if (diff < 60) return 'just now'; if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
      if (diff < 86400) return Math.floor(diff / 3600) + 'h ago'; if (diff < 86400 * 7) return Math.floor(diff / 86400) + 'd ago';
      return fmtDate(s.slice(0, 10));
    },
    findUser(login) {
      const l = login.trim().toLowerCase();
      return db.users.find(u => u.email.toLowerCase() === l || u.id.toLowerCase() === l);
    },
    profileOf(user) {
      if (user.role === 'student') return Object.assign({ designation: 'B.Tech · ' + H.student(user.ref).dept + ' · Year III' }, H.student(user.ref));
      if (user.role === 'faculty') return H.facultyById(user.ref);
      return db.admins.find(a => a.id === user.ref);
    }
  };

  window.OSMS = H;
})();
