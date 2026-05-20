# ClockIn

A web-based attendance and schedule management system built for schools and workplaces. ClockIn allows administrators to manage users, schedules, and attendance records, while employees can clock in via QR code and view their own data in real time.

---

## What is ClockIn?

ClockIn is a full-featured clock-in and workforce management platform. It provides two separate portals — one for administrators and one for employees — connected to a shared Supabase (PostgreSQL) backend.

Administrators can create and manage user accounts, define class or work schedules, monitor attendance trends through charts, generate QR codes for clock-in sessions, send push notifications, and export records as CSV or JSON. Employees can scan QR codes to clock in, view their personal attendance history and schedule, receive notifications, and submit feedback — all from a mobile-friendly interface.

The application is deployed on Vercel as a static site with serverless API routes handling privileged backend operations.

---

## Project Architecture

### Description

ClockIn follows a client-side architecture where HTML/CSS/JS pages communicate directly with Supabase for standard data operations. Privileged operations (user creation and deletion) are routed through Vercel Serverless Functions to keep the service role key off the browser.

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Database & Auth | Supabase (PostgreSQL + Supabase Auth) |
| Serverless API | Vercel Functions (Node.js) |
| Deployment | Vercel |
| Charts | Chart.js |
| Spreadsheet I/O | SheetJS (xlsx) |
| QR Generation | QR Server API |

### Visual Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        Browser                          │
│                                                         │
│   ┌─────────────────────┐  ┌────────────────────────┐  │
│   │    Admin Portal      │  │    Employee Portal     │  │
│   │  /admin_clockin/     │  │   /user_clockin/       │  │
│   │                      │  │                        │  │
│   │  • Dashboard         │  │  • Home                │  │
│   │  • Users             │  │  • Clock-in (QR)       │  │
│   │  • Attendance        │  │  • Attendance          │  │
│   │  • Schedules         │  │  • Schedule            │  │
│   │  • Notifications     │  │  • Notifications       │  │
│   │  • Recent Clock-ins  │  │  • Feedback            │  │
│   │  • Feedback          │  │  • Profile             │  │
│   │  • Profile           │  │                        │  │
│   └────────┬────────────┘  └──────────┬─────────────┘  │
│            │                           │                 │
│            └──────────┬────────────────┘                │
│                       │                                  │
│            ┌──────────▼──────────┐                      │
│            │   supabase_config.js│                      │
│            │   auth-guard.js     │                      │
│            │   authentication.js │                      │
│            └──────────┬──────────┘                      │
└───────────────────────┼─────────────────────────────────┘
                        │
          ┌─────────────┼──────────────┐
          │             │              │
          ▼             ▼              ▼
  ┌──────────────┐ ┌─────────┐ ┌──────────────────┐
  │   Supabase   │ │ Vercel  │ │  Vercel Serverless│
  │  (Database   │ │  CDN    │ │    Functions       │
  │   + Auth)    │ │ (Static │ │                    │
  │              │ │  Files) │ │  POST /api/config  │
  │  PostgreSQL  │ │         │ │  POST /api/admin/  │
  │  Auth Users  │ │         │ │    create-user     │
  │  RLS Policies│ │         │ │    delete-user     │
  └──────────────┘ └─────────┘ └──────────────────┘
```

### Folder Structure

```
Capstone/
├── api/                          # Vercel Serverless Functions
│   ├── config.js                 # Serves Supabase URL + anon key
│   └── admin/
│       ├── create-user.js        # Admin user creation (service role)
│       └── delete-user.js        # Admin user deletion (service role)
│
├── assets/
│   ├── css/
│   │   ├── pages/                # Page-specific stylesheets
│   │   └── styles/               # Shared/global styles
│   ├── img/                      # Images and static resources
│   └── js/scripts/
│       ├── core/                 # Supabase config, auth guard, auth logic
│       ├── admin/                # Admin feature scripts
│       │   ├── managers/         # Pagination, filter, sort managers
│       │   ├── user_management/  # Per-page admin data scripts
│       │   └── utils/            # Shared utilities
│       └── user/                 # Employee feature scripts
│
├── helper/
│   └── asset_helper.css          # Single import for all shared styles
│
├── views/
│   ├── index.html                # Entry point (redirects by role)
│   ├── login_path/               # Login, reset password, policies
│   ├── admin_clockin/            # Admin portal pages
│   └── user_clockin/             # Employee portal pages
│
├── vercel.json                   # Vercel routing config
└── package.json
```

---

## Features

### Admin Portal

| Feature | Description |
|---|---|
| **Dashboard** | Attendance trend charts, summary statistics, and per-user attendance breakdown |
| **User Management** | Create, edit, and delete employee accounts; import/export via CSV or JSON |
| **Attendance Monitoring** | View and filter all clock-in records; drill into per-employee detail |
| **Schedule Management** | Create and manage section schedules and subject assignments |
| **QR Code Generator** | Generate session QR codes employees scan to clock in |
| **Push Notifications** | Broadcast announcements to all users or specific individuals |
| **Recent Clock-ins** | Live feed of the latest clock-in activity |
| **Feedback** | View and manage feedback submitted by employees |
| **Profile** | Admin account settings and profile management |

### Employee Portal

| Feature | Description |
|---|---|
| **Home** | Personalised overview of today's schedule and attendance status |
| **Clock-in** | Scan a QR code to record a clock-in entry |
| **Attendance** | View personal attendance history and records |
| **Schedule** | View assigned class or work schedule |
| **Notifications** | Receive and read announcements from administrators |
| **Feedback** | Submit feedback or concerns to administrators |
| **Profile** | Employee profile and account settings |

### Authentication

- Email/password login via Supabase Auth
- Role-based access control (admin vs. employee) enforced on page load via `auth-guard.js`
- Password reset via email OTP
- Session managed by Supabase JS client
