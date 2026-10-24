# FinFlow Frontend

React + Vite + Tailwind CSS UI for the FinFlow personal finance platform, matching the project spec's tech stack (React.js + Tailwind, Recharts for charts).

## Setup

1. Install dependencies:
   ```
   npm install
   ```
2. Make sure the backend is running at `http://localhost:5000` (the dev server proxies `/api` there — see `vite.config.js`).
3. Start the dev server:
   ```
   npm run dev
   ```
   App runs at `http://localhost:5173`.

## Pages
- **Login / Register** — JWT auth against the backend
- **Dashboard** — income/expense stat cards, bar chart (income vs expense), pie chart (spending by category), line chart (balance trend), recent transactions
- **Transactions** — add/edit/delete, filter by type, CSV import & export
- **Budgets** — set monthly limits per category, progress bars with 80% warning and exceeded alert (uses `v_budget_utilisation`)
- **Categories** — global (admin) + personal custom categories
- **Reports** — top 5 spending categories, year-over-year comparison

## Demo login
After running the backend's `npm run db:setup`:
- `user@finflow.com` / `User@123`
- `admin@finflow.com` / `Admin@123`

## Build for production
```
npm run build
```
Outputs to `dist/`, deployable to Vercel / Netlify / Render (per the platform's suggested hosting).
