# OSMS - Online Student Management System

A web-based Student Management System built to **IEEE Std 830-1998** standards for the Software Engineering Course (A8520), Department of Information Technology.

## 🎯 Features & Requirements Traceability

- **Authentication & RBAC (FR-1.1, FR-1.2, FR-1.3)**
  - Role-Based Access Control for **Student**, **Faculty**, and **Administrator** views.
  - Interactive login with 1-click quick persona switcher.
  - Email verification password reset flow.
  - Configurable idle session expiry (NFR Security).

- **Student & Academic Records (FR-2.1, FR-2.2, FR-2.3)**
  - Student profile viewing and permitted details updating.
  - Administrator creation, editing, and activation/deactivation of student records.
  - Complete 4-semester historical record with course grades, SGPA trends, and CGPA tracking.

- **Course Enrollment & Live Seats (FR-3.1, FR-3.2, FR-3.3)**
  - Real-time seat counts and visual capacity indicators.
  - Add/Drop enrollment window management.
  - Timetable schedule conflict/clash detection.
  - Automated FIFO waitlist queue with instant seat promotion when drops occur.

- **Attendance & Grading (FR-4.1, FR-4.2, FR-4.3)**
  - Per-session attendance recording and editing (`Present`, `Late`, `Absent`).
  - Attendance risk advisories and session heatmaps (75% minimum threshold).
  - Component-wise gradebook entry with real-time total and letter grade calculations.
  - Print-ready and downloadable official academic transcripts (PDF).

- **Fee Management (FR-5.1, FR-5.2)**
  - Fee structure breakdown and outstanding balance monitoring.
  - Multi-method online payment simulation (UPI, Credit/Debit Card, Net Banking).
  - Automated digital receipt generation with verification codes.

- **Notices & Timetable (FR-5.3)**
  - Automated schedule compilation by enrolled courses.
  - Multi-channel notification broadcasting across Email and SMS gateways.

---

## 🚀 Quick Start

1. Clone or open this repository:
   ```bash
   git clone https://github.com/Wader444/OSMS_PORTAL.git
   cd OSMS_PORTAL
   ```

2. Run any static HTTP server (e.g. Python):
   ```bash
   python -m http.server 3000
   ```

3. Open your browser:
   - **Dashboard**: `http://localhost:3000/index.html`
   - **Login & Persona Selector**: `http://localhost:3000/login.html`

---

## 👥 Demo Personas

| Role | Name | Email / ID | Password | Key Capabilities |
|---|---|---|---|---|
| **Student** | Cherish Yepuru | `cherish.y@osms.edu` / `24881A1264` | `Demo@123` | Course enrollment, attendance rings, transcript download, fee payments |
| **Faculty** | Dr. Ravi Kumar | `ravi.kumar@osms.edu` / `F101` | `Demo@123` | Mark/edit attendance, gradebook entry, results publishing |
| **Administrator** | Priya Sharma | `admin@osms.edu` / `ADM01` | `Demo@123` | User directory, course capacity adjustments, fee defaulters, broadcast alerts |

---

## 🛠️ Technology Stack & Standards

- **Architecture**: 3-Tier Web Application (Presentation, Business Rules, Client Store).
- **Design System**: `.agents` / `ui-ux-pro-max` design system with CSS custom properties, responsive grid layout, and dark/light modes.
- **Standards**: IEEE Std 830-1998 SRS Specification.
