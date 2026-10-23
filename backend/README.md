# FinFlow API (Backend)

Node.js + Express + PostgreSQL backend for the FinFlow personal finance platform.

## Tech stack
- Node.js + Express — REST API
- PostgreSQL 14+ — database
- JWT + bcrypt — auth
- fast-csv + multer — CSV import/export

## Setup

1. Install dependencies:
   ```
   npm install
   ```
2. Copy `.env.example` to `.env` and fill in your PostgreSQL credentials and a JWT secret.
3. Create the database (if it doesn't exist):
   ```
   createdb finflow
   ```
4. Run the schema + seed script:
   ```
   npm run db:setup
   ```
   This creates all tables/views from `schema.sql` and seeds two accounts:
   - `admin@finflow.com` / `Admin@123` (role: admin)
   - `user@finflow.com` / `User@123` (role: user)

   Change these passwords before using in production.

5. Start the server:
   ```
   npm run dev
   ```
   API runs at `http://localhost:5000/api`.

## Endpoints

| Area | Routes |
|---|---|
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` |
| Categories | `GET/POST /api/categories`, `PUT/DELETE /api/categories/:id` |
| Transactions | `GET/POST /api/transactions`, `PUT/DELETE /api/transactions/:id` |
| Budgets | `GET/POST /api/budgets`, `PUT/DELETE /api/budgets/:id` |
| Reports | `GET /api/reports/monthly-summary`, `/category-breakdown`, `/top-categories`, `/budget-vs-actual`, `/year-over-year` |
| CSV | `GET /api/csv/export`, `POST /api/csv/import` (multipart field: `file`) |
| Admin | `GET /api/admin/audit-logs`, `/deleted-users`, `POST /:id/restore`, `DELETE /:id` |

All routes except `/auth/register` and `/auth/login` require `Authorization: Bearer <token>`.

## Notes
- All deletes are soft deletes (`status`, `deleted_at`, `deleted_by`) — nothing is physically removed except via the database directly.
- `audit_logs` is append-only and records every login, transaction, budget, and admin action.
- Money fields use `DECIMAL(14,2)` — never floats.
