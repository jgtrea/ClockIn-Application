# ClockIn — Web Attendance Management System

**ClockIn** is a web-based employee attendance and schedule management system built with **HTML, CSS, and Vanilla JavaScript**, backed by **Supabase (PostgreSQL + Auth)** and deployed on **Vercel**. It provides two role-separated portals — one for administrators and one for employees — to manage and track attendance records across regular and modular (online) class sessions.

---

## Features

* **Secure Authentication:**
    * Email and password login via Supabase Auth.
    * Role-based access control (RBAC) — administrators and employees are automatically redirected to their respective portals on login.
    * Non-admin users who attempt to access the admin dashboard URL are blocked and redirected to the login page.
    * Password reset via email OTP.

* **Admin Portal:**
    * **User Management:** Full create, read, update, and delete (CRUD) on employee accounts. Supports individual entry and bulk import via CSV or JSON.
    * **Schedule Management:** Create and assign class or work schedules to employees by section, subject, and room.
    * **Attendance Monitoring:** View, filter, and search all clock-in records across employees. Drill into per-employee detail with date-range filtering.
    * **DTR Export:** Export individual employee attendance records as CSV or JSON for reporting and archiving.
    * **QR Code Generator:** Generate session-specific QR codes that employees scan on the mobile app to clock in.
    * **Smart Attendance Logic:**
        * **Late Detection:** Attendance is automatically marked "Late" when a clock-in occurs more than 15 minutes after the scheduled start time.
        * **Duplicate Prevention:** Rejects duplicate clock-in entries for the same schedule session.
    * **Dashboard:** Attendance trend charts and summary statistics for a data-at-a-glance overview.
    * **Push Notifications:** Broadcast announcements to all employees or specific individuals.
    * **Feedback:** View and manage feedback submitted by employees.

* **Employee Portal:**
    * **Home:** Personalised overview of today's schedule and attendance status.
    * **Modular Attendance:** For online or modular class sessions, employees select a recording file via the portal; the system logs the attendance entry (time, date, status: present) to the database.
    * **Attendance History:** View personal clock-in and clock-out records filtered by month.
    * **Schedule:** View weekly assigned class or work schedule.
    * **Notifications:** Receive and read announcements from administrators.
    * **Feedback:** Submit feedback or concerns to administrators.
    * **Profile:** View employee details and manage account settings.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | HTML5, CSS3, Vanilla JavaScript |
| **Database & Auth** | Supabase (PostgreSQL + Supabase Auth) |
| **Serverless API** | Vercel Functions (Node.js) |
| **Deployment** | Vercel |
| **Charts** | Chart.js |
| **Spreadsheet I/O** | SheetJS (xlsx) |
| **QR Generation** | QR Server API |

---

## Project Architecture

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
│   │  • Feedback          │  │  • Feedback            │  │
│   │  • Profile           │  │  • Profile             │  │
│   └────────┬─────────────┘  └──────────┬─────────────┘  │
│            │                            │                │
│            └───────────┬────────────────┘               │
│                        │                                 │
│             ┌──────────▼──────────┐                     │
│             │  supabase_config.js │                     │
│             │  auth-guard.js      │                     │
│             │  authentication.js  │                     │
│             └──────────┬──────────┘                     │
└────────────────────────┼────────────────────────────────┘
                         │
           ┌─────────────┼──────────────┐
           │             │              │
           ▼             ▼              ▼
   ┌──────────────┐ ┌─────────┐ ┌──────────────────┐
   │   Supabase   │ │ Vercel  │ │  Vercel Serverless│
   │  (Database   │ │  CDN    │ │    Functions       │
   │   + Auth)    │ │ (Static │ │                    │
   │              │ │  Files) │ │  /api/admin/       │
   │  PostgreSQL  │ │         │ │    create-user     │
   │  Auth Users  │ │         │ │    delete-user     │
   │  RLS Policies│ │         │ │                    │
   └──────────────┘ └─────────┘ └──────────────────┘
```

---

## Folder Structure

```
Capstone/
├── api/                          # Vercel Serverless Functions
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
├── config/
│   ├── routes.js                 # Route definitions and iframe navigation
│   └── app.js                    # Shell app init (sidebar, profile, logout)
│
├── db_config/
│   └── migrations/               # SQL migration files
│
├── helper/
│   ├── asset_helper.css          # Single import for all shared styles
│   └── function_helper.js        # Timestamp utilities and session helpers
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

## Getting Started

### Prerequisites

* A modern web browser (Chrome, Firefox, or Edge recommended).
* A [Supabase](https://supabase.com) project with PostgreSQL and Authentication enabled.
* [Node.js](https://nodejs.org) installed locally (for running a local static server).
* A [Vercel](https://vercel.com) account (for deployment).

### Installation

1. **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/ClockIn.git
    cd ClockIn
    ```

2. **Supabase Setup**
    * Go to the [Supabase Dashboard](https://supabase.com/dashboard) and create a new project.
    * Navigate to **Project Settings → API**.
    * Copy your **Project URL** and **anon public** key.
    * Open `assets/js/scripts/core/supabase_config.js` and replace the placeholder values:
        ```javascript
        const supabaseUrl = 'YOUR_SUPABASE_URL';
        const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';
        ```

3. **Database Setup**
    * In the Supabase Dashboard, go to the **SQL Editor**.
    * Run the migration files in order from `db_config/migrations/`:
        ```
        001_create_attendance_tables.sql
        002_create_qr_table.sql
        003_create_user_devices_table.sql
        ```

4. **Run Locally**
    * Install a static file server if you don't have one:
        ```bash
        npm install -g serve
        ```
    * Start the server from the project root:
        ```bash
        serve .
        ```
    * Open `http://localhost:3000` in your browser.

5. **Deploy to Vercel**
    * Install the Vercel CLI:
        ```bash
        npm install -g vercel
        ```
    * Deploy from the project root:
        ```bash
        vercel
        ```
    * Vercel will detect the `vercel.json` config and deploy the static site with serverless functions automatically. HTTPS is enforced by Vercel on all deployments.

---

## Configuration

### Supabase Credentials

Open `assets/js/scripts/core/supabase_config.js` and set your project URL and anon key:

```javascript
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';
```

The service role key used for privileged admin operations (user creation and deletion) should be set as an environment variable in your Vercel project settings under **Settings → Environment Variables**:

```
SUPABASE_SERVICE_ROLE_KEY = your_service_role_key
```

### Row-Level Security (RLS)

All database tables have RLS enabled. The default policies allow any authenticated user to read and write data. For production deployments, review and tighten these policies in the Supabase Dashboard under **Authentication → Policies** to restrict row access per user role.
