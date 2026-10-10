/* =========================================================
   Admin views — Dashboard, Users, Courses & Seats, Fees Admin,
   Broadcast Notices, Reports, System Settings
   FR-1.2, FR-2.1, FR-3.1, FR-5.1, FR-5.2, FR-5.3
   ========================================================= */
(function () {
  const { $, $$, esc, toast, modal, confirm, Charts, downloadCSV } = UI;
  const O = OSMS;

  window.APP_VIEWS = window.APP_VIEWS || {};
  window.APP_VIEWS.admin = {
    // ---------------- ADMIN DASHBOARD ----------------
    dashboard(el) {
      const totalStudents = O.db.students.length;
      const activeStudents = O.db.students.filter(s => s.active).length;
      const totalFaculty = O.db.faculty.length;
      const totalCourses = O.db.courses.length;
      const feeSum = O.db.students.reduce((acc, s) => {
        const sum = O.feeSummary(s.id);
        acc.total += sum.total;
        acc.paid += sum.paid;
        acc.due += sum.due;
        return acc;
      }, { total: 0, paid: 0, due: 0 });

      const deptCounts = O.db.departments.map(d => ({
        l: d.id,
        v: O.db.students.filter(s => s.dept === d.id).length
      }));

      el.innerHTML =
        '<div class="hero-card" style="margin-bottom:20px">' +
          '<div class="row-between wrap" style="gap:20px">' +
            '<div>' +
              '<span class="badge badge-primary" style="margin-bottom:12px">' + icon('shield', 'icon-sm') + 'Administrator Control Center</span>' +
              '<h1 style="font-size:28px">System Overview & Operations</h1>' +
              '<p>Institution monitoring: <strong class="mono">' + activeStudents + '</strong> active students, <strong class="mono">' + totalFaculty + '</strong> faculty, <strong class="mono">' + totalCourses + '</strong> active courses.</p>' +
            '</div>' +
            '<div class="row wrap">' +
              '<a class="btn btn-primary" href="#/broadcast">' + icon('megaphone') + 'Broadcast Notice</a>' +
              '<a class="btn" href="#/users">' + icon('userPlus') + 'Manage Users</a>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="grid grid-4" style="margin-bottom:20px">' +
          App.stat('Total Students', activeStudents, activeStudents + ' active of ' + totalStudents, 'users', 'tone-teal', 'data-count="' + activeStudents + '"') +
          App.stat('Fee Collection', O.inr(feeSum.paid), Math.round((feeSum.paid / feeSum.total) * 100) + '% of ₹' + Math.round(feeSum.total / 100000) + 'L target', 'wallet', 'tone-green', 'data-count="' + feeSum.paid + '" data-prefix="₹" data-inr="1"') +
          App.stat('System SLA Uptime', '99.8%', 'Target 99.5% (NFR-3)', 'server', 'tone-violet') +
          App.stat('Add/Drop Period', O.db.settings.addDropOpen ? 'Active' : 'Closed', 'Closes ' + O.fmtDate(O.db.settings.addDropCloses), 'clock', O.db.settings.addDropOpen ? 'tone-amber' : 'tone-teal') +
        '</div>' +
        '<div class="grid grid-main">' +
          '<div class="stack" style="gap:20px">' +
            '<div class="card">' +
              '<div class="card-head">' +
                '<div><h3>Enrollment by Department</h3><div class="sub">Student distribution across branches</div></div>' +
                '<a class="btn btn-ghost btn-sm" href="#/reports">Full Analytics ' + icon('arrowRight', 'icon-sm') + '</a>' +
              '</div>' +
              '<div class="card-body">' +
                Charts.bar(deptCounts, { h: 220, values: true, label: 'Department Enrollment' }) +
              '</div>' +
            '</div>' +
            '<div class="card">' +
              '<div class="card-head">' +
                '<div><h3>Recent System Audits</h3><div class="sub">Traceability logs (FR-1.2, NFR-2)</div></div>' +
                '<button class="btn btn-ghost btn-sm" id="clear-audit">' + icon('trash', 'icon-sm') + 'Clear</button>' +
              '</div>' +
              '<div class="card-body" style="padding-top:4px;padding-bottom:4px" id="audit-list">' +
                (O.db.audit.length ? O.db.audit.slice(0, 6).map(a =>
                  '<div class="list-item">' +
                    '<span class="ic tone-teal">' + icon('activity', 'icon-sm') + '</span>' +
                    '<div class="grow">' +
                      '<strong>' + esc(a.action) + '</strong>' +
                      '<small class="mono">' + esc(a.who) + ' · ' + O.timeAgo(a.at) + '</small>' +
                    '</div>' +
                  '</div>'
                ).join('') : '<div class="empty">No recent activity logs</div>') +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="stack" style="gap:20px">' +
            '<div class="card card-body">' +
              '<div class="row-between">' +
                '<h3 style="font-size:16px">Course Capacity Load</h3>' +
                '<a href="#/courses-admin" class="btn btn-ghost btn-sm">Configure</a>' +
              '</div>' +
              '<div style="margin-top:14px" class="stack">' +
                O.db.courses.slice(0, 5).map(c => {
                  const pct = Math.round((c.filled / c.capacity) * 100);
                  return '<div><div class="seat-row"><span class="mono">' + c.id + '</span><strong>' + c.filled + ' / ' + c.capacity + ' (' + pct + '%)</strong></div><div class="progress ' + (pct >= 100 ? 'bad' : pct >= 90 ? 'warn' : '') + '"><span style="width:' + Math.min(100, pct) + '%"></span></div></div>';
                }).join('') +
              '</div>' +
            '</div>' +
            '<div class="card card-body">' +
              '<h3 style="font-size:16px;margin-bottom:12px">Quick Administrative Tasks</h3>' +
              '<div class="stack">' +
                '<a class="btn btn-block" style="justify-content:flex-start" href="#/users">' + icon('userPlus') + 'Add New Student / Faculty</a>' +
                '<a class="btn btn-block" style="justify-content:flex-start" href="#/broadcast">' + icon('megaphone') + 'Send Institute Emergency Alert</a>' +
                '<a class="btn btn-block" style="justify-content:flex-start" href="#/fees-admin">' + icon('receipt') + 'Generate Fee Defaulters Report</a>' +
                '<a class="btn btn-block" style="justify-content:flex-start" href="#/settings">' + icon('sliders') + 'Configure Add/Drop Window</a>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>';

      const ca = $('#clear-audit', el);
      if (ca) {
        ca.onclick = () => {
          O.db.audit = [];
          O.save();
          toast('Audit logs cleared', 'All recent activity events have been reset', 'info');
          $('#audit-list', el).innerHTML = '<div class="empty">No recent activity logs</div>';
        };
      }
    },

    // ---------------- MANAGE USERS (FR-2.1) ----------------
    users(el) {
      let tab = 'student';
      let deptFilter = '';
      let statusFilter = 'all';

      const draw = () => {
        const q = ($('#user-search', el) || {}).value || '';
        let list = tab === 'student' ? O.db.students : O.db.faculty;

        if (deptFilter) list = list.filter(u => u.dept === deptFilter);
        if (statusFilter !== 'all') {
          const isActive = statusFilter === 'active';
          list = list.filter(u => !!u.active === isActive);
        }
        if (q) {
          const s = q.toLowerCase();
          list = list.filter(u => (u.name + ' ' + u.id + ' ' + (u.email || '')).toLowerCase().includes(s));
        }

        const tableBody = $('#user-table-body', el);
        if (!tableBody) return;

        tableBody.innerHTML = list.length ? list.map(u => {
          const roleBadge = tab === 'student'
            ? '<span class="badge">' + u.year + ' Year · Sec ' + u.section + '</span>'
            : '<span class="badge badge-warning">' + esc(u.designation || 'Faculty') + '</span>';

          const activeBadge = u.active !== false
            ? '<span class="badge badge-success"><span class="dot"></span>Active</span>'
            : '<span class="badge badge-danger"><span class="dot"></span>Deactivated</span>';

          return '<tr class="' + (u.active === false ? 'inactive' : '') + '">' +
            '<td>' +
              '<div class="cell-user">' +
                '<span class="avatar ' + (tab === 'faculty' ? 'amber' : '') + '">' + O.initials(u.name) + '</span>' +
                '<div>' +
                  '<strong>' + esc(u.name) + '</strong>' +
                  '<small class="mono">' + u.id + ' · ' + esc(u.email || '') + '</small>' +
                '</div>' +
              '</div>' +
            '</td>' +
            '<td><span class="badge badge-primary mono">' + u.dept + '</span></td>' +
            '<td>' + roleBadge + '</td>' +
            '<td>' + activeBadge + '</td>' +
            '<td style="text-align:right">' +
              '<div class="row" style="justify-content:flex-end;gap:6px">' +
                '<button class="btn btn-ghost btn-sm" data-edit="' + u.id + '" title="Edit details">' + icon('pencil', 'icon-sm') + '</button>' +
                '<button class="btn btn-ghost btn-sm ' + (u.active !== false ? 'btn-danger' : '') + '" data-toggle-active="' + u.id + '" title="' + (u.active !== false ? 'Deactivate user' : 'Reactivate user') + '">' +
                  icon(u.active !== false ? 'power' : 'checkCircle', 'icon-sm') +
                '</button>' +
              '</div>' +
            '</td>' +
          '</tr>';
        }).join('') : '<tr><td colspan="5"><div class="empty">No ' + tab + ' records match your query</div></td></tr>';

        $('#total-user-count', el).textContent = list.length + ' records';
      };

      el.innerHTML = App.pageHead('User Management', 'Create, update and deactivate student and faculty profiles (FR-2.1). Role-based access control enabled.',
        '<button class="btn btn-primary" id="btn-add-user">' + icon('plus') + 'Create New Profile</button>') +
        '<div class="row-between wrap" style="margin-bottom:18px">' +
          '<div class="segmented" id="user-tabs">' +
            '<button class="active" data-t="student">' + icon('user', 'icon-sm') + 'Students (' + O.db.students.length + ')</button>' +
            '<button data-t="faculty">' + icon('cap', 'icon-sm') + 'Faculty (' + O.db.faculty.length + ')</button>' +
          '</div>' +
          '<div class="row wrap">' +
            '<div class="input-group" style="width:240px">' +
              icon('search') +
              '<input class="input" id="user-search" placeholder="Search name, roll/ID, email">' +
            '</div>' +
            '<select class="select" id="user-dept" style="width:130px">' +
              '<option value="">All Depts</option>' +
              O.db.departments.map(d => '<option value="' + d.id + '">' + d.id + '</option>').join('') +
            '</select>' +
            '<select class="select" id="user-status" style="width:130px">' +
              '<option value="all">All Status</option>' +
              '<option value="active">Active Only</option>' +
              '<option value="inactive">Deactivated</option>' +
            '</select>' +
          '</div>' +
        '</div>' +
        '<div class="card">' +
          '<div class="card-head">' +
            '<h3>Profile Directory</h3>' +
            '<span class="sub" id="total-user-count"></span>' +
          '</div>' +
          '<div class="table-wrap">' +
            '<table class="table">' +
              '<thead>' +
                '<tr><th>User Details</th><th>Department</th><th>Academic / Role</th><th>Status</th><th style="text-align:right">Actions</th></tr>' +
              '</thead>' +
              '<tbody id="user-table-body"></tbody>' +
            '</table>' +
          '</div>' +
        '</div>';

      $('#user-tabs', el).onclick = e => {
        const b = e.target.closest('button');
        if (!b) return;
        tab = b.dataset.t;
        $$('#user-tabs button', el).forEach(x => x.classList.toggle('active', x === b));
        draw();
      };

      $('#user-search', el).oninput = draw;
      $('#user-dept', el).onchange = e => { deptFilter = e.target.value; draw(); };
      $('#user-status', el).onchange = e => { statusFilter = e.target.value; draw(); };

      // Add user modal
      $('#btn-add-user', el).onclick = () => {
        const isStudent = tab === 'student';
        const nextId = isStudent ? '24881A1' + (270 + O.db.students.length) : 'F' + (106 + O.db.faculty.length);
        const m = modal({
          title: 'Create ' + (isStudent ? 'Student' : 'Faculty') + ' Profile',
          body: '<form id="add-user-form" class="form-grid" novalidate>' +
            UI.field({ id: 'nu-id', label: isStudent ? 'Roll Number (PK)' : 'Faculty ID (PK)', value: nextId, rule: 'required' }) +
            UI.field({ id: 'nu-name', label: 'Full Name', rule: 'required|min:3', placeholder: 'e.g. Ramesh Chandra' }) +
            UI.field({ id: 'nu-email', label: 'Institutional Email', rule: 'required|email', placeholder: 'name@osms.edu' }) +
            UI.field({ id: 'nu-dept', label: 'Department', type: 'select', options: O.db.departments.map(d => [d.id, d.name]) }) +
            UI.field({ id: 'nu-phone', label: 'Mobile Number', rule: 'required|phone', value: '+91 98480 99887' }) +
            (isStudent ?
              UI.field({ id: 'nu-year', label: 'Year', type: 'select', options: ['I', 'II', 'III', 'IV'] }) +
              UI.field({ id: 'nu-sem', label: 'Semester', type: 'select', options: ['I', 'II'] }) +
              UI.field({ id: 'nu-sec', label: 'Section', type: 'select', options: ['A', 'B', 'C'] })
              :
              UI.field({ id: 'nu-desig', label: 'Designation', type: 'select', options: ['Assistant Professor', 'Associate Professor', 'Professor', 'HOD'], span: true })
            ) +
            '<div class="span-2 hint" style="margin-top:6px">' +
              icon('shield', 'icon-sm') + ' A secure login credential with default password will be provisioned automatically (FR-1.1, FR-2.1).' +
            '</div>' +
          '</form>',
          foot: '<button class="btn" data-close>Cancel</button><button class="btn btn-primary" id="save-new-user">' + icon('check') + 'Create Profile</button>'
        });

        m.$('#save-new-user').onclick = () => {
          const form = m.$('#add-user-form');
          if (!UI.validate(form)) return;

          const id = m.$('#nu-id').value.trim();
          const name = m.$('#nu-name').value.trim();
          const email = m.$('#nu-email').value.trim();
          const dept = m.$('#nu-dept').value;
          const phone = m.$('#nu-phone').value.trim();

          if (isStudent) {
            const newStudent = {
              id, name, email, dept, phone,
              year: m.$('#nu-year').value,
              sem: m.$('#nu-sem').value,
              section: m.$('#nu-sec').value,
              guardian: 'Parent of ' + name.split(' ')[0],
              address: 'Hyderabad, Telangana',
              active: true,
              joined: O.iso(new Date())
            };
            O.db.students.push(newStudent);
            // Default enrolled mandatory courses for that dept
            const coreCourses = O.db.courses.filter(c => c.dept === dept).slice(0, 3);
            coreCourses.forEach(c => {
              c.filled++;
              O.db.enrollments.push({
                id: 'E' + Date.now() + Math.floor(Math.random() * 99),
                studentId: id,
                courseId: c.id,
                status: 'enrolled',
                marks: {},
                enrolledOn: O.iso(new Date())
              });
            });
          } else {
            const newFac = {
              id, name, email, dept, phone,
              designation: m.$('#nu-desig').value,
              active: true
            };
            O.db.faculty.push(newFac);
          }

          // Register credential in Auth table
          O.db.users.push({
            id, email,
            password: 'Demo@123',
            role: isStudent ? 'student' : 'faculty',
            ref: id
          });

          O.save();
          O.log('Created ' + (isStudent ? 'student' : 'faculty') + ' ' + id, App.user.ref);
          toast('Profile Created', esc(name) + ' (' + id + ') registered in OSMS');
          m.close();
          draw();
        };
      };

      // Edit & toggle handlers
      el.addEventListener('click', async e => {
        const editBtn = e.target.closest('[data-edit]');
        const toggleBtn = e.target.closest('[data-toggle-active]');

        if (editBtn) {
          const uid = editBtn.dataset.edit;
          const isStudent = tab === 'student';
          const u = isStudent ? O.student(uid) : O.facultyById(uid);
          if (!u) return;

          const m = modal({
            title: 'Edit Profile · ' + uid,
            body: '<form id="edit-user-form" class="form-grid" novalidate>' +
              UI.field({ id: 'eu-id', label: 'ID / Roll No', value: u.id, readonly: true }) +
              UI.field({ id: 'eu-name', label: 'Full Name', value: u.name, rule: 'required|min:3' }) +
              UI.field({ id: 'eu-email', label: 'Email', value: u.email, rule: 'required|email' }) +
              UI.field({ id: 'eu-phone', label: 'Phone', value: u.phone, rule: 'required|phone' }) +
              UI.field({ id: 'eu-dept', label: 'Department', type: 'select', value: u.dept, options: O.db.departments.map(d => [d.id, d.name]) }) +
              (isStudent ?
                UI.field({ id: 'eu-sec', label: 'Section', type: 'select', value: u.section, options: ['A', 'B', 'C'] }) +
                UI.field({ id: 'eu-addr', label: 'Address', value: u.address || '', span: true })
                :
                UI.field({ id: 'eu-desig', label: 'Designation', type: 'select', value: u.designation, options: ['Assistant Professor', 'Associate Professor', 'Professor', 'HOD'], span: true })
              ) +
            '</form>',
            foot: '<button class="btn" data-close>Cancel</button><button class="btn btn-primary" id="save-edit-user">' + icon('check') + 'Save Changes</button>'
          });

          m.$('#save-edit-user').onclick = () => {
            if (!UI.validate(m.$('#edit-user-form'))) return;
            u.name = m.$('#eu-name').value.trim();
            u.email = m.$('#eu-email').value.trim();
            u.phone = m.$('#eu-phone').value.trim();
            u.dept = m.$('#eu-dept').value;
            if (isStudent) {
              u.section = m.$('#eu-sec').value;
              u.address = m.$('#eu-addr').value.trim();
            } else {
              u.designation = m.$('#eu-desig').value;
            }
            const authUser = O.db.users.find(x => x.ref === uid);
            if (authUser) authUser.email = u.email;
            O.save();
            O.log('Updated profile ' + uid, App.user.ref);
            toast('Profile Updated', 'Saved changes for ' + esc(u.name));
            m.close();
            draw();
          };
        }

        if (toggleBtn) {
          const uid = toggleBtn.dataset.toggleActive;
          const isStudent = tab === 'student';
          const u = isStudent ? O.student(uid) : O.facultyById(uid);
          if (!u) return;

          const willDeactivate = u.active !== false;
          const ok = await confirm(
            (willDeactivate ? 'Deactivate ' : 'Reactivate ') + u.name + '?',
            willDeactivate
              ? 'The user will be blocked from logging into OSMS and marking enrollments/attendance (FR-2.1).'
              : 'The user account will be re-enabled for immediate access.',
            willDeactivate ? 'Deactivate' : 'Reactivate',
            willDeactivate
          );

          if (!ok) return;
          u.active = !willDeactivate;
          O.save();
          O.log((u.active ? 'Activated ' : 'Deactivated ') + uid, App.user.ref);
          toast(u.active ? 'Account Activated' : 'Account Deactivated', u.name + ' is now ' + (u.active ? 'active' : 'inactive'), u.active ? 'success' : 'warning');
          draw();
        }
      });

      draw();
    },

    // ---------------- COURSES & SEATS (FR-3.1, FR-3.2, FR-3.3) ----------------
    'courses-admin'(el) {
      const draw = () => {
        const q = ($('#c-admin-search', el) || {}).value || '';
        let list = O.db.courses;
        if (q) {
          const s = q.toLowerCase();
          list = list.filter(c => (c.id + ' ' + c.title + ' ' + c.dept).toLowerCase().includes(s));
        }

        const tableBody = $('#courses-table-body', el);
        if (!tableBody) return;

        tableBody.innerHTML = list.map(c => {
          const left = O.seatsLeft(c);
          const wait = O.waitCount(c);
          const facName = O.facultyById(c.faculty) ? O.facultyById(c.faculty).name : 'Unassigned';
          const pct = Math.round((c.filled / c.capacity) * 100);

          return '<tr>' +
            '<td><strong class="mono" style="color:var(--primary)">' + c.id + '</strong></td>' +
            '<td><div><strong>' + esc(c.title) + '</strong><small class="subtle">' + esc(c.desc) + '</small></div></td>' +
            '<td><span class="badge mono">' + c.dept + '</span></td>' +
            '<td><span class="mono">' + c.credits + '</span></td>' +
            '<td>' + esc(facName) + '</td>' +
            '<td>' +
              '<div style="min-width:140px">' +
                '<div class="seat-row"><span class="mono">' + c.filled + '/' + c.capacity + '</span><span class="subtle">' + left + ' left</span></div>' +
                '<div class="progress ' + (pct >= 100 ? 'bad' : pct >= 85 ? 'warn' : '') + '"><span style="width:' + Math.min(100, pct) + '%"></span></div>' +
              '</div>' +
            '</td>' +
            '<td>' + (wait > 0 ? '<span class="badge badge-warning mono">' + wait + ' waiting</span>' : '<span class="badge">0</span>') + '</td>' +
            '<td style="text-align:right">' +
              '<div class="row" style="justify-content:flex-end;gap:6px">' +
                '<button class="btn btn-ghost btn-sm" data-edit-course="' + c.id + '" title="Edit seats/capacity">' + icon('pencil', 'icon-sm') + '</button>' +
                '<button class="btn btn-ghost btn-sm" data-view-waitlist="' + c.id + '" title="View Waitlist Queue">' + icon('hourglass', 'icon-sm') + '</button>' +
              '</div>' +
            '</td>' +
          '</tr>';
        }).join('');
      };

      el.innerHTML = App.pageHead('Courses & Live Seats', 'Catalogue capacity, real-time seat limits and automated waitlist tracking (FR-3.1, FR-3.3).',
        '<button class="btn btn-primary" id="btn-add-course">' + icon('plus') + 'Create New Course</button>') +
        '<div class="row-between wrap" style="margin-bottom:18px">' +
          '<div class="input-group" style="width:280px">' +
            icon('search') +
            '<input class="input" id="c-admin-search" placeholder="Search course code or title">' +
          '</div>' +
          '<div class="row wrap">' +
            '<span class="badge badge-primary">' + icon('sparkle', 'icon-sm') + 'Live seat checks enabled</span>' +
          '</div>' +
        '</div>' +
        '<div class="card">' +
          '<div class="card-head"><h3>Institution Course Catalogue</h3></div>' +
          '<div class="table-wrap">' +
            '<table class="table">' +
              '<thead>' +
                '<tr><th>Code</th><th>Course Title</th><th>Dept</th><th>Credits</th><th>Faculty</th><th>Capacity</th><th>Waitlist</th><th style="text-align:right">Actions</th></tr>' +
              '</thead>' +
              '<tbody id="courses-table-body"></tbody>' +
            '</table>' +
          '</div>' +
        '</div>';

      $('#c-admin-search', el).oninput = draw;

      // Add course modal
      $('#btn-add-course', el).onclick = () => {
        const m = modal({
          title: 'Create Course',
          body: '<form id="add-course-form" class="form-grid" novalidate>' +
            UI.field({ id: 'nc-id', label: 'Course Code (PK)', placeholder: 'e.g. IT308', rule: 'required|min:4' }) +
            UI.field({ id: 'nc-title', label: 'Course Title', placeholder: 'e.g. Mobile Computing', rule: 'required|min:4' }) +
            UI.field({ id: 'nc-dept', label: 'Department', type: 'select', options: O.db.departments.map(d => [d.id, d.name]) }) +
            UI.field({ id: 'nc-faculty', label: 'Assigned Faculty', type: 'select', options: O.db.faculty.map(f => [f.id, f.name + ' (' + f.dept + ')']) }) +
            UI.field({ id: 'nc-credits', label: 'Credits', type: 'number', value: 3, rule: 'num:1,6' }) +
            UI.field({ id: 'nc-capacity', label: 'Seat Capacity', type: 'number', value: 50, rule: 'num:10,120' }) +
            UI.field({ id: 'nc-desc', label: 'Course Description / Syllabus', type: 'textarea', span: true, rule: 'required|min:10', placeholder: 'Summary of course topics...' }) +
          '</form>',
          foot: '<button class="btn" data-close>Cancel</button><button class="btn btn-primary" id="save-new-course">' + icon('check') + 'Create Course</button>'
        });

        m.$('#save-new-course').onclick = () => {
          if (!UI.validate(m.$('#add-course-form'))) return;
          const id = m.$('#nc-id').value.trim().toUpperCase();
          const title = m.$('#nc-title').value.trim();
          const dept = m.$('#nc-dept').value;
          const faculty = m.$('#nc-faculty').value;
          const credits = +m.$('#nc-credits').value;
          const capacity = +m.$('#nc-capacity').value;
          const desc = m.$('#nc-desc').value.trim();

          const course = {
            id, title, dept, faculty, credits, capacity,
            filled: 0, waitlist: [], waitBase: 0,
            desc,
            slots: [[1, '10:00', 'LH-205'], [3, '13:30', 'LH-205']]
          };
          O.db.courses.push(course);
          O.db.attendance[id] = {};
          O.save();
          O.log('Created course ' + id, App.user.ref);
          toast('Course Created', id + ' · ' + esc(title));
          m.close();
          draw();
        };
      };

      // Edit course seats modal
      el.addEventListener('click', e => {
        const editBtn = e.target.closest('[data-edit-course]');
        const waitBtn = e.target.closest('[data-view-waitlist]');

        if (editBtn) {
          const cid = editBtn.dataset.editCourse;
          const c = O.course(cid);
          if (!c) return;

          const m = modal({
            title: 'Manage Seats · ' + c.id,
            body: '<form id="edit-course-form" class="stack" novalidate>' +
              '<div class="card card-pad" style="background:var(--surface-2)">' +
                '<h3>' + esc(c.title) + '</h3>' +
                '<p class="muted" style="font-size:13px;margin-top:4px">' + esc(c.desc) + '</p>' +
              '</div>' +
              '<div class="form-grid">' +
                UI.field({ id: 'ec-cap', label: 'Total Capacity', type: 'number', value: c.capacity, rule: 'num:' + c.filled + ',150', hint: 'Cannot be lower than current enrollment (' + c.filled + ')' }) +
                UI.field({ id: 'ec-filled', label: 'Currently Enrolled', type: 'number', value: c.filled, readonly: true }) +
                UI.field({ id: 'ec-credits', label: 'Credits', type: 'number', value: c.credits, rule: 'num:1,6' }) +
                UI.field({ id: 'ec-faculty', label: 'Instructor', type: 'select', value: c.faculty, options: O.db.faculty.map(f => [f.id, f.name]) }) +
              '</div>' +
            '</form>',
            foot: '<button class="btn" data-close>Cancel</button><button class="btn btn-primary" id="save-edit-course">' + icon('check') + 'Update Capacity</button>'
          });

          m.$('#save-edit-course').onclick = () => {
            if (!UI.validate(m.$('#edit-course-form'))) return;
            const newCap = +m.$('#ec-cap').value;
            c.capacity = newCap;
            c.credits = +m.$('#ec-credits').value;
            c.faculty = m.$('#ec-faculty').value;

            // If capacity increased and waitlist exists, auto enroll from waitlist!
            const seatsOpened = c.capacity - c.filled;
            if (seatsOpened > 0 && c.waitlist.length > 0) {
              const promoted = c.waitlist.splice(0, seatsOpened);
              promoted.forEach(sid => {
                c.filled++;
                O.db.enrollments.push({
                  id: 'E' + Date.now() + Math.floor(Math.random() * 99),
                  studentId: sid,
                  courseId: c.id,
                  status: 'enrolled',
                  marks: {},
                  enrolledOn: O.iso(new Date())
                });
                O.addNotice({
                  title: 'Waitlist cleared: Enrolled in ' + c.id,
                  body: 'A seat opened in ' + c.title + '. You have been enrolled automatically from the waitlist.',
                  category: 'Enrollment',
                  audience: { role: 'student', studentId: sid },
                  channels: ['email', 'sms'],
                  from: 'OSMS Registrar'
                });
              });
              toast('Waitlist Promoted', promoted.length + ' student(s) automatically enrolled from waitlist!', 'success');
            }

            O.save();
            O.log('Updated course seats ' + c.id, App.user.ref);
            toast('Course Updated', 'Capacity for ' + c.id + ' set to ' + c.capacity);
            m.close();
            draw();
          };
        }

        if (waitBtn) {
          const cid = waitBtn.dataset.viewWaitlist;
          const c = O.course(cid);
          if (!c) return;

          const waitList = c.waitlist.map((sid, i) => {
            const s = O.student(sid);
            return '<tr>' +
              '<td class="mono">#' + (i + 1) + '</td>' +
              '<td>' + (s ? esc(s.name) : sid) + '</td>' +
              '<td class="mono">' + sid + '</td>' +
              '<td><span class="badge badge-warning">Waiting</span></td>' +
            '</tr>';
          }).join('');

          modal({
            title: 'Waitlist Queue · ' + c.id,
            body: '<p class="muted" style="margin-bottom:14px">Students on the waitlist are automatically enrolled in FIFO order as seats are dropped (FR-3.3).</p>' +
              '<div class="table-wrap"><table class="table">' +
                '<thead><tr><th>Position</th><th>Student Name</th><th>Roll No</th><th>Status</th></tr></thead>' +
                '<tbody>' +
                  (c.waitlist.length ? waitList : '<tr><td colspan="4"><div class="empty">No students on this waitlist</div></td></tr>') +
                '</tbody>' +
              '</table></div>',
            foot: '<button class="btn btn-primary" data-close>Close</button>'
          });
        }
      });

      draw();
    },

    // ---------------- FEES ADMIN (FR-5.1, FR-5.2) ----------------
    'fees-admin'(el) {
      const draw = () => {
        const feeSum = O.db.students.reduce((acc, s) => {
          const sum = O.feeSummary(s.id);
          acc.total += sum.total;
          acc.paid += sum.paid;
          acc.due += sum.due;
          return acc;
        }, { total: 0, paid: 0, due: 0 });

        const defaulters = O.db.students.map(s => ({
          student: s,
          summary: O.feeSummary(s.id)
        })).filter(x => x.summary.due > 0).sort((a, b) => b.summary.due - a.summary.due);

        el.innerHTML = App.pageHead('Fee Administration', 'Fee structure setup, revenue tracking and collection ledger (FR-5.1, FR-5.2).',
          '<div class="row"><button class="btn" id="btn-export-fees">' + icon('download') + 'Export Defaulters CSV</button><button class="btn btn-primary" id="btn-record-offline">' + icon('receipt') + 'Record Offline Payment</button></div>') +
          '<div class="grid grid-4" style="margin-bottom:20px">' +
            App.stat('Total Billed', O.inr(feeSum.total), 'Academic Term 2026-27', 'file', 'tone-teal', 'data-count="' + feeSum.total + '" data-prefix="₹" data-inr="1"') +
            App.stat('Total Collected', O.inr(feeSum.paid), Math.round((feeSum.paid / feeSum.total) * 100) + '% realized', 'wallet', 'tone-green', 'data-count="' + feeSum.paid + '" data-prefix="₹" data-inr="1"') +
            App.stat('Outstanding Balance', O.inr(feeSum.due), defaulters.length + ' student accounts pending', 'alert', 'tone-amber', 'data-count="' + feeSum.due + '" data-prefix="₹" data-inr="1"') +
            App.stat('Defaulter Rate', Math.round((defaulters.length / O.db.students.length) * 100) + '%', 'Due date ' + O.fmtDate(O.db.settings.feeDue), 'clock', 'tone-violet') +
          '</div>' +
          '<div class="grid grid-main">' +
            '<div class="card">' +
              '<div class="card-head">' +
                '<div><h3>Outstanding Fee Accounts</h3><div class="sub">Students with unpaid term dues</div></div>' +
                '<span class="badge badge-warning">' + defaulters.length + ' Accounts</span>' +
              '</div>' +
              '<div class="table-wrap">' +
                '<table class="table">' +
                  '<thead><tr><th>Student Details</th><th>Dept</th><th class="num">Paid</th><th class="num">Due Amount</th><th style="text-align:right">Action</th></tr></thead>' +
                  '<tbody>' +
                    defaulters.map(d =>
                      '<tr>' +
                        '<td>' +
                          '<div class="cell-user">' +
                            '<span class="avatar">' + O.initials(d.student.name) + '</span>' +
                            '<div><strong>' + esc(d.student.name) + '</strong><small class="mono">' + d.student.id + '</small></div>' +
                          '</div>' +
                        '</td>' +
                        '<td><span class="badge mono">' + d.student.dept + '</span></td>' +
                        '<td class="num">' + O.inr(d.summary.paid) + '</td>' +
                        '<td class="num"><strong style="color:var(--danger)">' + O.inr(d.summary.due) + '</strong></td>' +
                        '<td style="text-align:right">' +
                          '<button class="btn btn-ghost btn-sm" data-remind="' + d.student.id + '" title="Send Email/SMS reminder">' + icon('bell', 'icon-sm') + ' Remind</button>' +
                        '</td>' +
                      '</tr>'
                    ).join('') +
                  '</tbody>' +
                '</table>' +
              '</div>' +
            '</div>' +
            '<div class="stack" style="gap:20px">' +
              '<div class="card card-body">' +
                '<div class="row-between" style="margin-bottom:12px">' +
                  '<h3>Approved Fee Structure</h3>' +
                  '<button class="btn btn-ghost btn-sm" id="btn-edit-structure">' + icon('pencil', 'icon-sm') + 'Edit</button>' +
                '</div>' +
                '<div class="stack">' +
                  O.db.feeStructure.map(item =>
                    '<div class="list-item" style="padding:8px 0">' +
                      '<div class="grow"><strong>' + esc(item.label) + '</strong></div>' +
                      '<span class="mono">' + O.inr(item.amount) + '</span>' +
                    '</div>'
                  ).join('') +
                  '<div class="list-item" style="border-top:1px solid var(--border-strong);padding-top:12px">' +
                    '<div class="grow"><strong>Total Academic Fee</strong></div>' +
                    '<strong class="mono" style="color:var(--primary)">' + O.inr(O.feeTotal()) + '</strong>' +
                  '</div>' +
                '</div>' +
              '</div>' +
              '<div class="card card-body">' +
                '<h3 style="font-size:16px;margin-bottom:10px">Recent Payment Receipts</h3>' +
                '<div class="stack">' +
                  O.db.payments.slice(-4).reverse().map(p =>
                    '<div class="list-item">' +
                      '<span class="ic tone-green">' + icon('receipt', 'icon-sm') + '</span>' +
                      '<div class="grow">' +
                        '<strong>' + p.id + '</strong>' +
                        '<small class="mono">' + p.studentId + ' · ' + p.method + '</small>' +
                      '</div>' +
                      '<strong class="mono">' + O.inr(p.amount) + '</strong>' +
                    '</div>'
                  ).join('') +
                '</div>' +
              '</div>' +
            '</div>' +
          '</div>';

        // Export defaulters
        $('#btn-export-fees', el).onclick = () => {
          downloadCSV('OSMS_Fee_Defaulters.csv', [
            ['Roll No', 'Name', 'Department', 'Total Fee', 'Paid Amount', 'Due Balance', 'Phone', 'Email']
          ].concat(defaulters.map(d => [
            d.student.id,
            d.student.name,
            d.student.dept,
            d.summary.total,
            d.summary.paid,
            d.summary.due,
            d.student.phone,
            d.student.email
          ])));
          toast('CSV Exported', 'Downloaded fee defaulter spreadsheet');
        };

        // Record offline payment
        $('#btn-record-offline', el).onclick = () => {
          const m = modal({
            title: 'Record Offline / Bank Payment',
            body: '<form id="offline-pay-form" class="stack" novalidate>' +
              UI.field({
                id: 'op-student',
                label: 'Student',
                type: 'select',
                options: defaulters.map(d => [d.student.id, d.student.name + ' (' + d.student.id + ' - Due: ' + O.inr(d.summary.due) + ')'])
              }) +
              UI.field({ id: 'op-amount', label: 'Payment Amount (₹)', type: 'number', value: 25000, rule: 'num:100,120000' }) +
              UI.field({ id: 'op-method', label: 'Payment Mode', type: 'select', options: ['Challan / Cash', 'Cheque / DD', 'NEFT / RTGS Transfer'] }) +
              UI.field({ id: 'op-ref', label: 'Bank Transaction Ref / Cheque No.', rule: 'required', value: 'CHQ-' + Math.floor(Math.random() * 899999 + 100000) }) +
            '</form>',
            foot: '<button class="btn" data-close>Cancel</button><button class="btn btn-primary" id="save-offline-pay">' + icon('check') + 'Record Receipt</button>'
          });

          m.$('#save-offline-pay').onclick = () => {
            if (!UI.validate(m.$('#offline-pay-form'))) return;
            const sid = m.$('#op-student').value;
            const amt = +m.$('#op-amount').value;
            const method = m.$('#op-method').value;
            const ref = m.$('#op-ref').value;

            const newRcpt = {
              id: 'RCPT-2026-' + (24100 + O.db.payments.length),
              studentId: sid,
              amount: amt,
              method,
              date: O.iso(new Date()),
              ref
            };
            O.db.payments.push(newRcpt);
            O.save();
            O.log('Recorded offline payment for ' + sid, App.user.ref);
            toast('Payment Recorded', 'Receipt ' + newRcpt.id + ' logged for ' + sid);
            m.close();
            draw();
          };
        };

        // Remind button
        el.addEventListener('click', e => {
          const btn = e.target.closest('[data-remind]');
          if (!btn) return;
          const sid = btn.dataset.remind;
          const s = O.student(sid);
          const f = O.feeSummary(sid);

          O.addNotice({
            title: 'Urgent: Fee Payment Reminder',
            body: 'Dear ' + s.name + ', your balance of ' + O.inr(f.due) + ' for semester III-I is pending. Please clear your dues before ' + O.fmtDate(O.db.settings.feeDue) + ' to avoid exam registration blocks.',
            category: 'Deadline',
            audience: { role: 'student', studentId: sid },
            channels: ['email', 'sms'],
            from: 'Accounts & Finance'
          });

          toast('Notice Sent', 'Payment reminder sent to ' + s.name + ' via Email & SMS', 'info');
        });
      };

      draw();
    },

    // ---------------- BROADCAST NOTICES (FR-5.3) ----------------
    broadcast(el) {
      el.innerHTML = App.pageHead('Broadcast Notifications', 'Send multi-channel Email & SMS alerts for deadlines, announcements and timetable changes (FR-5.3).') +
        '<div class="grid grid-main">' +
          '<div class="card">' +
            '<div class="card-head"><h3>Compose Outbound Broadcast</h3></div>' +
            '<div class="card-body">' +
              '<form id="broadcast-form" class="stack" novalidate>' +
                '<div class="form-grid">' +
                  UI.field({
                    id: 'bc-category',
                    label: 'Notice Category',
                    type: 'select',
                    options: ['Announcement', 'Deadline', 'Result', 'Timetable']
                  }) +
                  UI.field({
                    id: 'bc-role',
                    label: 'Target Audience Role',
                    type: 'select',
                    options: [['all', 'All Users (Campus-wide)'], ['student', 'Students Only'], ['faculty', 'Faculty Only']]
                  }) +
                '</div>' +
                '<div class="form-grid">' +
                  UI.field({
                    id: 'bc-dept',
                    label: 'Filter by Department (Optional)',
                    type: 'select',
                    options: [['', 'All Departments']].concat(O.db.departments.map(d => [d.id, d.name]))
                  }) +
                  UI.field({
                    id: 'bc-course',
                    label: 'Filter by Course (Optional)',
                    type: 'select',
                    options: [['', 'None / Institute-wide']].concat(O.db.courses.map(c => [c.id, c.id + ' · ' + c.title]))
                  }) +
                '</div>' +
                UI.field({
                  id: 'bc-title',
                  label: 'Subject / Alert Title',
                  placeholder: 'e.g. Mid-term examination schedule announced',
                  rule: 'required|min:6'
                }) +
                UI.field({
                  id: 'bc-body',
                  label: 'Message Body',
                  type: 'textarea',
                  placeholder: 'Enter full announcement text or urgent alert instructions...',
                  rule: 'required|min:15'
                }) +
                '<div class="field">' +
                  '<span class="label">Delivery Channels</span>' +
                  '<div class="row" style="gap:20px;margin-top:6px">' +
                    '<label class="check"><input type="checkbox" id="bc-ch-email" checked> ' + icon('mail', 'icon-sm') + ' Institutional Email Gateway</label>' +
                    '<label class="check"><input type="checkbox" id="bc-ch-sms" checked> ' + icon('sms', 'icon-sm') + ' SMS Gateway Gateway</label>' +
                  '</div>' +
                '</div>' +
                '<div class="banner banner-info" style="margin-top:8px">' +
                  icon('users') +
                  '<p>Estimated recipients: <strong id="bc-recipient-count" class="mono">--</strong> users across selected filters.</p>' +
                '</div>' +
                '<div class="row" style="justify-content:flex-end;margin-top:12px">' +
                  '<button class="btn btn-primary btn-lg" type="submit" id="btn-submit-broadcast">' +
                    icon('send') + ' Dispatch Broadcast Alert' +
                  '</button>' +
                '</div>' +
              '</form>' +
            '</div>' +
          '</div>' +
          '<div class="stack" style="gap:20px">' +
            '<div class="card">' +
              '<div class="card-head"><h3>Dispatched Notices</h3><span class="sub">Latest alerts</span></div>' +
              '<div class="card-body" style="padding-top:4px;padding-bottom:4px" id="bc-history">' +
                O.db.notices.slice(0, 6).map(App.noticeItem).join('') +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>';

      const updateCount = () => {
        const aud = {
          role: $('#bc-role', el).value,
          dept: $('#bc-dept', el).value || null,
          course: $('#bc-course', el).value || null
        };
        const count = O.recipients(aud);
        $('#bc-recipient-count', el).textContent = count.toLocaleString('en-IN');
      };

      $('#bc-role', el).onchange = updateCount;
      $('#bc-dept', el).onchange = updateCount;
      $('#bc-course', el).onchange = updateCount;
      updateCount();
      App.bindNotices(el);

      $('#broadcast-form', el).onsubmit = e => {
        e.preventDefault();
        const form = $('#broadcast-form', el);
        if (!UI.validate(form)) return;

        const ch = [];
        if ($('#bc-ch-email', el).checked) ch.push('email');
        if ($('#bc-ch-sms', el).checked) ch.push('sms');

        if (!ch.length) {
          toast('Channel Required', 'Please select at least Email or SMS delivery.', 'error');
          return;
        }

        const btn = $('#btn-submit-broadcast', el);
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span> Dispatching…';

        setTimeout(() => {
          const aud = {
            role: $('#bc-role', el).value,
            dept: $('#bc-dept', el).value || null,
            course: $('#bc-course', el).value || null
          };

          const newNotice = O.addNotice({
            title: $('#bc-title', el).value.trim(),
            body: $('#bc-body', el).value.trim(),
            category: $('#bc-category', el).value,
            audience: aud,
            channels: ch,
            from: 'Academic Administration'
          });

          O.log('Broadcast: ' + newNotice.title, App.user.ref);
          toast('Broadcast Dispatched', 'Sent to ' + $('#bc-recipient-count', el).textContent + ' recipients via ' + ch.join(' & ').toUpperCase());
          btn.disabled = false;
          btn.innerHTML = icon('send') + ' Dispatch Broadcast Alert';

          $('#bc-title', el).value = '';
          $('#bc-body', el).value = '';
          $('#bc-history', el).innerHTML = O.db.notices.slice(0, 6).map(App.noticeItem).join('');
          App.bindNotices(el);
          App.refreshChrome();
        }, 800);
      };
    },

    // ---------------- REPORTS ----------------
    reports(el) {
      const avgAttByDept = O.db.departments.map(d => {
        const students = O.db.students.filter(s => s.dept === d.id);
        const avg = students.length
          ? Math.round(students.reduce((acc, s) => acc + O.overallAtt(s.id), 0) / students.length)
          : 0;
        return { l: d.id, v: avg };
      });

      const courseUtilization = O.db.courses.map(c => ({
        l: c.id,
        v: Math.round((c.filled / c.capacity) * 100)
      }));

      el.innerHTML = App.pageHead('Institutional Analytics & Reports', 'Aggregated metrics on academic compliance, attendance thresholds and seat distribution.') +
        '<div class="grid grid-2" style="margin-bottom:20px">' +
          '<div class="card">' +
            '<div class="card-head"><div><h3>Attendance Compliance by Department</h3><div class="sub">Minimum 75% standard compliance</div></div></div>' +
            '<div class="card-body">' +
              Charts.bar(avgAttByDept, { h: 220, suffix: '%', values: true, label: 'Department Attendance' }) +
            '</div>' +
          '</div>' +
          '<div class="card">' +
            '<div class="card-head"><div><h3>Course Seat Utilization</h3><div class="sub">Enrollment capacity percentage</div></div></div>' +
            '<div class="card-body">' +
              Charts.bar(courseUtilization, { h: 220, suffix: '%', values: true, label: 'Course Utilization' }) +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="card">' +
          '<div class="card-head"><h3>Institution Summary Snapshot</h3></div>' +
          '<div class="table-wrap">' +
            '<table class="table">' +
              '<thead><tr><th>Department</th><th>HOD</th><th class="num">Faculty Count</th><th class="num">Enrolled Students</th><th class="num">Avg CGPA</th></tr></thead>' +
              '<tbody>' +
                O.db.departments.map(d => {
                  const facs = O.db.faculty.filter(f => f.dept === d.id);
                  const stus = O.db.students.filter(s => s.dept === d.id);
                  const cg = stus.length
                    ? (stus.reduce((a, s) => a + O.cgpa(s.id), 0) / stus.length).toFixed(2)
                    : 'N/A';
                  return '<tr>' +
                    '<td><strong>' + esc(d.name) + ' (' + d.id + ')</strong></td>' +
                    '<td>' + esc(d.hod) + '</td>' +
                    '<td class="num">' + facs.length + '</td>' +
                    '<td class="num">' + stus.length + '</td>' +
                    '<td class="num mono">' + cg + '</td>' +
                  '</tr>';
                }).join('') +
              '</tbody>' +
            '</table>' +
          '</div>' +
        '</div>';
    },

    // ---------------- SYSTEM SETTINGS ----------------
    settings(el) {
      const s = O.db.settings;

      el.innerHTML = App.pageHead('System Configuration', 'Configure term rules, security policies, Add/Drop deadlines and maintenance modes.') +
        '<div class="grid grid-main">' +
          '<div class="card">' +
            '<div class="card-head"><h3>Academic Term & Policy Parameters</h3></div>' +
            '<div class="card-body">' +
              '<form id="settings-form" class="stack" novalidate>' +
                '<div class="form-grid">' +
                  UI.field({ id: 'set-term', label: 'Academic Term Name', value: s.term, rule: 'required' }) +
                  UI.field({ id: 'set-max-cr', label: 'Max Student Credit Load', type: 'number', value: s.maxCredits, rule: 'num:12,32' }) +
                '</div>' +
                '<div class="form-grid">' +
                  UI.field({ id: 'set-timeout', label: 'Session Idle Timeout (Minutes)', type: 'number', value: s.sessionTimeout, rule: 'num:5,60', hint: 'NFR Security: idle session expiry' }) +
                  UI.field({ id: 'set-fee-due', label: 'Term Fee Due Date', type: 'date', value: s.feeDue, rule: 'required' }) +
                '</div>' +
                '<div class="divider"></div>' +
                '<h4 style="font-size:15px">Course Add/Drop Window Control (FR-3.2)</h4>' +
                '<div class="form-grid" style="align-items:center">' +
                  '<div class="row">' +
                    '<label class="switch">' +
                      '<input type="checkbox" id="set-ad-open" ' + (s.addDropOpen ? 'checked' : '') + '>' +
                      '<span></span>' +
                    '</label>' +
                    '<div><strong>Allow Course Enrollment Changes</strong><small class="subtle" style="display:block">Toggles Add/Drop for all students</small></div>' +
                  '</div>' +
                  UI.field({ id: 'set-ad-close', label: 'Add/Drop Deadline Date', type: 'date', value: s.addDropCloses, rule: 'required' }) +
                '</div>' +
                '<div class="row" style="justify-content:flex-end;margin-top:16px">' +
                  '<button class="btn btn-primary" type="submit">' + icon('check') + 'Save System Settings</button>' +
                '</div>' +
              '</form>' +
            '</div>' +
          '</div>' +
          '<div class="stack" style="gap:20px">' +
            '<div class="card card-body">' +
              '<h3 style="font-size:16px;margin-bottom:12px">IEEE 830 Architecture & SLA</h3>' +
              '<dl class="kv" style="grid-template-columns:120px 1fr">' +
                '<dt>SRS Standard</dt><dd>IEEE Std 830-1998</dd>' +
                '<dt>Architecture</dt><dd>3-Tier (Client, API, DB)</dd>' +
                '<dt>SLA Target</dt><dd class="mono">99.5% Uptime</dd>' +
                '<dt>Concurrency</dt><dd class="mono">500 users &lt; 2.0s</dd>' +
                '<dt>Encryption</dt><dd>TLS 1.2+ / bcrypt</dd>' +
              '</dl>' +
            '</div>' +
            '<div class="card card-body" style="border-color:color-mix(in srgb, var(--danger) 30%, transparent)">' +
              '<h3 style="color:var(--danger);font-size:16px;margin-bottom:8px">Demo Reset Zone</h3>' +
              '<p class="muted" style="font-size:13px;margin-bottom:14px">Reset database to initial seed values (restores original course rosters, balances and test logs).</p>' +
              '<button class="btn btn-danger btn-block" id="btn-reset-data">' + icon('refresh') + 'Re-initialize Demo Store</button>' +
            '</div>' +
          '</div>' +
        '</div>';

      $('#settings-form', el).onsubmit = e => {
        e.preventDefault();
        const form = $('#settings-form', el);
        if (!UI.validate(form)) return;

        s.term = $('#set-term', el).value.trim();
        s.maxCredits = +$('#set-max-cr', el).value;
        s.sessionTimeout = +$('#set-timeout', el).value;
        s.feeDue = $('#set-fee-due', el).value;
        s.addDropOpen = $('#set-ad-open', el).checked;
        s.addDropCloses = $('#set-ad-close', el).value;

        O.save();
        O.log('Updated system settings', App.user.ref);
        toast('Settings Saved', 'System configuration and Add/Drop rules updated');
        App.refreshChrome();
      };

      $('#btn-reset-data', el).onclick = async () => {
        const ok = await confirm('Reset all demo data?', 'This will wipe any added profiles, marks, payments and restore default IEEE 830 demo records.', 'Reset Store', true);
        if (!ok) return;
        O.reset();
        toast('Store Re-initialized', 'Fresh database seed loaded');
        location.reload();
      };
    }
  };
})();
