# FinFlow — Expense & Personal Finance Management Platform (v2.0)

Full-stack implementation matching the project documentation and v2.0 database
schema reference: React + Tailwind frontend, Node/Express backend, PostgreSQL
database with ENUM types, TIMESTAMPTZ timestamps, soft-delete + audit trail.

```
finflow/
├── backend/    Node.js + Express API, PostgreSQL schema.sql, JWT auth
└── frontend/   React + Vite + Tailwind CSS, Recharts, dark navy/indigo UI
```

## Quick start

```bash
# 1. Backend
cd backend
npm install
cp .env.example .env        # fill in your PostgreSQL credentials + JWT secret
npm run db:setup            # creates tables, views, seeds admin/demo users
npm run dev                 # http://localhost:5000

# 2. Frontend (in a second terminal)
cd frontend
npm install
npm run dev                 # http://localhost:5173
```

Log in with `user@finflow.com` / `User@123` or `admin@finflow.com` / `Admin@123`.

## Tech stack (as specified)

| Layer | Technology |
|---|---|
| Frontend | React.js + Tailwind CSS |
| Charts | Recharts |
| Backend | Node.js + Express |
| Database | PostgreSQL 14+ |
| Auth | JWT + bcrypt |
| CSV | fast-csv |
| Hosting (suggested) | Vercel / Railway / Render |

## What's implemented
- Income & expense transaction tracking (CRUD, filters, pagination)
- User-defined + global categories
- Monthly budget limits with 80%-warning and exceeded alerts (`v_budget_utilisation` view)
- SQL aggregation reports: monthly summary, category breakdown, top 5 categories, budget vs actual, year-over-year
- Bar / pie / line charts on the dashboard
- CSV import & export
- Secure accounts: bcrypt-hashed passwords, JWT sessions, per-user data isolation
- Soft delete everywhere (`status` + `deleted_at` + `deleted_by`) with an append-only `audit_logs` trail
- Mobile-first responsive UI (sidebar on desktop, bottom nav on mobile)

See `backend/README.md` and `frontend/README.md` for details on each half.
