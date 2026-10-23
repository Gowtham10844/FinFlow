// seedAdminData.js — Inserts a realistic 6-month example dataset for admin@finflow.com
// Usage: node utils/seedAdminData.js

require('dotenv').config();
const pool = require('../config/db');

async function seed() {
  // ── 1. Resolve admin user id ──────────────────────────────────────────────
  const { rows: users } = await pool.query(
    `SELECT id FROM users WHERE email = 'admin@finflow.com' LIMIT 1`
  );
  if (!users.length) {
    console.error('admin@finflow.com not found. Run npm run db:setup first.');
    process.exit(1);
  }
  const adminId = users[0].id;
  console.log(`Seeding data for admin id=${adminId}`);

  // ── 2. Resolve category ids ───────────────────────────────────────────────
  const { rows: cats } = await pool.query(
    `SELECT id, name FROM categories WHERE (user_id = $1 OR user_id IS NULL) AND status = 'active'`,
    [adminId]
  );
  const catMap = {};
  for (const c of cats) catMap[c.name.toLowerCase()] = c.id;

  const cid = (name) => catMap[name.toLowerCase()] || null;

  // ── 3. Build transactions ─────────────────────────────────────────────────
  // 6 months of data: Jan–Jun 2026
  const data = [
    // ─ January 2026 ─
    { date: '2026-01-01', type: 'income',  cat: 'Salary',        amount: 85000,  desc: 'Monthly salary' },
    { date: '2026-01-05', type: 'expense', cat: 'Rent',           amount: 20000,  desc: 'January rent' },
    { date: '2026-01-07', type: 'expense', cat: 'Food',           amount: 3200,   desc: 'Grocery shopping' },
    { date: '2026-01-10', type: 'expense', cat: 'Transport',      amount: 1800,   desc: 'Fuel & metro passes' },
    { date: '2026-01-12', type: 'income',  cat: 'Freelance',      amount: 15000,  desc: 'Logo design project' },
    { date: '2026-01-14', type: 'expense', cat: 'Utilities',      amount: 2400,   desc: 'Electricity & internet' },
    { date: '2026-01-18', type: 'expense', cat: 'Entertainment',  amount: 1500,   desc: 'Netflix + weekend movie' },
    { date: '2026-01-20', type: 'expense', cat: 'Shopping',       amount: 4800,   desc: 'Winter clothes' },
    { date: '2026-01-25', type: 'income',  cat: 'Investment',     amount: 5000,   desc: 'Dividend payout' },
    { date: '2026-01-28', type: 'expense', cat: 'Medical',        amount: 1200,   desc: 'Doctor consultation' },

    // ─ February 2026 ─
    { date: '2026-02-01', type: 'income',  cat: 'Salary',        amount: 85000,  desc: 'Monthly salary' },
    { date: '2026-02-03', type: 'expense', cat: 'Rent',           amount: 20000,  desc: 'February rent' },
    { date: '2026-02-06', type: 'expense', cat: 'Food',           amount: 2900,   desc: 'Grocery & dining' },
    { date: '2026-02-09', type: 'expense', cat: 'Transport',      amount: 1600,   desc: 'Cab & train' },
    { date: '2026-02-11', type: 'income',  cat: 'Freelance',      amount: 22000,  desc: 'Website dev project' },
    { date: '2026-02-14', type: 'expense', cat: 'Shopping',       amount: 3500,   desc: 'Valentine gifts' },
    { date: '2026-02-17', type: 'expense', cat: 'Utilities',      amount: 2200,   desc: 'Bills' },
    { date: '2026-02-20', type: 'expense', cat: 'Medical',        amount: 800,    desc: 'Pharmacy' },
    { date: '2026-02-23', type: 'expense', cat: 'Entertainment',  amount: 2000,   desc: 'Concert tickets' },
    { date: '2026-02-26', type: 'income',  cat: 'Investment',     amount: 4200,   desc: 'SIP returns' },

    // ─ March 2026 ─
    { date: '2026-03-01', type: 'income',  cat: 'Salary',        amount: 85000,  desc: 'Monthly salary' },
    { date: '2026-03-03', type: 'expense', cat: 'Rent',           amount: 20000,  desc: 'March rent' },
    { date: '2026-03-05', type: 'expense', cat: 'Food',           amount: 3500,   desc: 'Holi groceries & sweets' },
    { date: '2026-03-08', type: 'income',  cat: 'Freelance',      amount: 18000,  desc: 'Dashboard design' },
    { date: '2026-03-10', type: 'expense', cat: 'Shopping',       amount: 6200,   desc: 'Electronics accessories' },
    { date: '2026-03-13', type: 'expense', cat: 'Transport',      amount: 2100,   desc: 'Road trip fuel' },
    { date: '2026-03-16', type: 'expense', cat: 'Utilities',      amount: 2600,   desc: 'Electricity + water' },
    { date: '2026-03-20', type: 'expense', cat: 'Entertainment',  amount: 1800,   desc: 'OTT subscriptions' },
    { date: '2026-03-24', type: 'expense', cat: 'Medical',        amount: 2500,   desc: 'Annual health checkup' },
    { date: '2026-03-28', type: 'income',  cat: 'Investment',     amount: 6000,   desc: 'Mutual fund withdrawal' },

    // ─ April 2026 ─
    { date: '2026-04-01', type: 'income',  cat: 'Salary',        amount: 85000,  desc: 'Monthly salary' },
    { date: '2026-04-02', type: 'expense', cat: 'Rent',           amount: 20000,  desc: 'April rent' },
    { date: '2026-04-04', type: 'expense', cat: 'Food',           amount: 3100,   desc: 'Grocery run' },
    { date: '2026-04-06', type: 'income',  cat: 'Freelance',      amount: 30000,  desc: 'Mobile app UI project' },
    { date: '2026-04-09', type: 'expense', cat: 'Transport',      amount: 1900,   desc: 'Monthly metro pass + fuel' },
    { date: '2026-04-12', type: 'expense', cat: 'Shopping',       amount: 5500,   desc: 'Summer wardrobe' },
    { date: '2026-04-15', type: 'expense', cat: 'Utilities',      amount: 3000,   desc: 'AC electricity spike' },
    { date: '2026-04-18', type: 'expense', cat: 'Entertainment',  amount: 2200,   desc: 'Gaming + streaming' },
    { date: '2026-04-22', type: 'expense', cat: 'Medical',        amount: 900,    desc: 'Vitamins & supplements' },
    { date: '2026-04-27', type: 'income',  cat: 'Investment',     amount: 4800,   desc: 'Stock dividend' },

    // ─ May 2026 ─
    { date: '2026-05-01', type: 'income',  cat: 'Salary',        amount: 85000,  desc: 'Monthly salary' },
    { date: '2026-05-02', type: 'expense', cat: 'Rent',           amount: 20000,  desc: 'May rent' },
    { date: '2026-05-04', type: 'expense', cat: 'Food',           amount: 2700,   desc: 'Grocery shopping' },
    { date: '2026-05-07', type: 'expense', cat: 'Transport',      amount: 1700,   desc: 'Cab rides' },
    { date: '2026-05-09', type: 'income',  cat: 'Freelance',      amount: 25000,  desc: 'SEO & content project' },
    { date: '2026-05-12', type: 'expense', cat: 'Utilities',      amount: 3200,   desc: 'Summer electric bill' },
    { date: '2026-05-15', type: 'expense', cat: 'Shopping',       amount: 7000,   desc: 'Home decor' },
    { date: '2026-05-18', type: 'expense', cat: 'Medical',        amount: 1500,   desc: 'Dental visit' },
    { date: '2026-05-22', type: 'expense', cat: 'Entertainment',  amount: 3000,   desc: 'Short trip & hotel' },
    { date: '2026-05-27', type: 'income',  cat: 'Investment',     amount: 5500,   desc: 'Bond interest' },

    // ─ June 2026 ─
    { date: '2026-06-01', type: 'income',  cat: 'Salary',        amount: 85000,  desc: 'Monthly salary' },
    { date: '2026-06-02', type: 'expense', cat: 'Rent',           amount: 20000,  desc: 'June rent' },
    { date: '2026-06-04', type: 'expense', cat: 'Food',           amount: 3300,   desc: 'Grocery + dining out' },
    { date: '2026-06-06', type: 'income',  cat: 'Freelance',      amount: 20000,  desc: 'Backend integration' },
    { date: '2026-06-08', type: 'expense', cat: 'Transport',      amount: 2200,   desc: 'Airport cab + metro' },
    { date: '2026-06-10', type: 'expense', cat: 'Shopping',       amount: 4500,   desc: 'Monsoon essentials' },
    { date: '2026-06-13', type: 'expense', cat: 'Utilities',      amount: 2800,   desc: 'Monthly bills' },
    { date: '2026-06-16', type: 'expense', cat: 'Entertainment',  amount: 1600,   desc: 'Spotify + Prime' },
    { date: '2026-06-20', type: 'expense', cat: 'Medical',        amount: 3200,   desc: 'Eye checkup + glasses' },
    { date: '2026-06-25', type: 'income',  cat: 'Investment',     amount: 7000,   desc: 'Equity profit booking' },

    // ─ July 2026 (current month) ─
    { date: '2026-07-01', type: 'income',  cat: 'Salary',        amount: 85000,  desc: 'Monthly salary' },
    { date: '2026-07-02', type: 'expense', cat: 'Rent',           amount: 20000,  desc: 'July rent' },
    { date: '2026-07-04', type: 'expense', cat: 'Food',           amount: 2800,   desc: 'Grocery & veggies' },
    { date: '2026-07-06', type: 'income',  cat: 'Freelance',      amount: 28000,  desc: 'Analytics dashboard' },
    { date: '2026-07-08', type: 'expense', cat: 'Transport',      amount: 1800,   desc: 'Fuel & cab' },
    { date: '2026-07-09', type: 'expense', cat: 'Utilities',      amount: 2500,   desc: 'July bills' },
    { date: '2026-07-10', type: 'expense', cat: 'Shopping',       amount: 3200,   desc: 'Monsoon clothing' },
    { date: '2026-07-11', type: 'expense', cat: 'Entertainment',  amount: 1200,   desc: 'Movie outing' },
    { date: '2026-07-12', type: 'income',  cat: 'Investment',     amount: 5000,   desc: 'FD maturity' },
  ];

  let inserted = 0;
  for (const row of data) {
    await pool.query(
      `INSERT INTO transactions (user_id, category_id, type, amount, description, date)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [adminId, cid(row.cat), row.type, row.amount, row.desc, row.date]
    );
    inserted++;
  }
  console.log(`Inserted ${inserted} transactions for admin.`);

  // ── 4. Add sample budgets (July 2026) ─────────────────────────────────────
  const budgets = [
    { cat: 'Food',          limit: 6000 },
    { cat: 'Transport',     limit: 3000 },
    { cat: 'Shopping',      limit: 8000 },
    { cat: 'Utilities',     limit: 4000 },
    { cat: 'Entertainment', limit: 2500 },
    { cat: 'Medical',       limit: 5000 },
    { cat: 'Rent',          limit: 22000 },
  ];

  for (const b of budgets) {
    if (!cid(b.cat)) { console.warn(`Category "${b.cat}" not found, skipping budget.`); continue; }
    await pool.query(
      `INSERT INTO budgets (user_id, category_id, limit_amount, month, year)
       VALUES ($1, $2, $3, 7, 2026)
       ON CONFLICT (user_id, category_id, month, year) DO NOTHING`,
      [adminId, cid(b.cat), b.limit]
    );
  }
  console.log('Budgets seeded for July 2026.');

  await pool.end();
  console.log('Done!');
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
