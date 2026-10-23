// seedUserData.js — Seeds sample transaction and budget data for both user@finflow.com and admin@finflow.com
require('dotenv').config();
const pool = require('../config/db');

async function seed() {
  const { rows: users } = await pool.query(`SELECT id, email FROM users WHERE status = 'active'`);
  if (!users.length) {
    console.error('No active users found. Run npm run db:setup first.');
    process.exit(1);
  }

  console.log(`Found ${users.length} user(s) to seed data for.`);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  for (const user of users) {
    console.log(`Seeding data for user ${user.email} (id=${user.id})...`);

    // Get categories allowed for this user
    const { rows: cats } = await pool.query(
      `SELECT id, name FROM categories WHERE (user_id = $1 OR user_id IS NULL) AND status = 'active'`,
      [user.id]
    );
    const catMap = {};
    for (const c of cats) catMap[c.name.toLowerCase()] = c.id;
    const cid = (name) => catMap[name.toLowerCase()] || null;

    // Check if user already has transactions
    const { rows: existingTxns } = await pool.query(
      `SELECT COUNT(*)::int as count FROM transactions WHERE user_id = $1 AND status = 'active'`,
      [user.id]
    );

    if (existingTxns[0].count > 0) {
      console.log(`User ${user.email} already has ${existingTxns[0].count} transactions. Refreshing current month data...`);
    }

    // Generate monthly transactions for Jan 2026 through July 2026 (and current month)
    const monthsToSeed = [
      { y: 2026, m: 1 },
      { y: 2026, m: 2 },
      { y: 2026, m: 3 },
      { y: 2026, m: 4 },
      { y: 2026, m: 5 },
      { y: 2026, m: 6 },
      { y: currentYear, m: currentMonth },
    ];

    // Remove duplicates from monthsToSeed array
    const uniqueMonths = Array.from(new Set(monthsToSeed.map((item) => `${item.y}-${item.m}`)))
      .map((str) => {
        const [y, m] = str.split('-').map(Number);
        return { y, m };
      });

    for (const { y, m } of uniqueMonths) {
      const monthStr = String(m).padStart(2, '0');
      
      const sampleTxns = [
        { date: `${y}-${monthStr}-01`, type: 'income',  cat: 'Salary',        amount: 85000, desc: 'Monthly salary credit' },
        { date: `${y}-${monthStr}-03`, type: 'expense', cat: 'Rent',           amount: 22000, desc: 'House rent payment' },
        { date: `${y}-${monthStr}-05`, type: 'expense', cat: 'Food',           amount: 4500,  desc: 'Supermarket & groceries' },
        { date: `${y}-${monthStr}-08`, type: 'expense', cat: 'Transport',      amount: 2100,  desc: 'Fuel & transit pass' },
        { date: `${y}-${monthStr}-10`, type: 'income',  cat: 'Freelance',      amount: 24000, desc: 'Client project milestone' },
        { date: `${y}-${monthStr}-12`, type: 'expense', cat: 'Utilities',      amount: 3200,  desc: 'Electricity & wifi bill' },
        { date: `${y}-${monthStr}-15`, type: 'expense', cat: 'Shopping',       amount: 5800,  desc: 'Clothing & household items' },
        { date: `${y}-${monthStr}-18`, type: 'expense', cat: 'Entertainment',  amount: 2200,  desc: 'Movies & dining out' },
        { date: `${y}-${monthStr}-22`, type: 'expense', cat: 'Medical',        amount: 1400,  desc: 'Pharmacy & checkup' },
        { date: `${y}-${monthStr}-25`, type: 'income',  cat: 'Investment',     amount: 6500,  desc: 'Dividend & mutual fund returns' },
      ];

      for (const t of sampleTxns) {
        // Prevent exact duplicate transaction inserts
        const exists = await pool.query(
          `SELECT id FROM transactions
           WHERE user_id = $1 AND date = $2 AND type = $3 AND amount = $4 AND description = $5 AND status = 'active'`,
          [user.id, t.date, t.type, t.amount, t.desc]
        );
        if (!exists.rows.length) {
          await pool.query(
            `INSERT INTO transactions (user_id, category_id, type, amount, description, date)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [user.id, cid(t.cat), t.type, t.amount, t.desc, t.date]
          );
        }
      }

      // Seed monthly budgets
      const budgetsToSeed = [
        { cat: 'Food',          limit: 6000 },
        { cat: 'Transport',     limit: 3500 },
        { cat: 'Shopping',      limit: 8000 },
        { cat: 'Utilities',     limit: 4500 },
        { cat: 'Entertainment', limit: 3000 },
        { cat: 'Medical',       limit: 5000 },
        { cat: 'Rent',          limit: 25000 },
      ];

      for (const b of budgetsToSeed) {
        if (!cid(b.cat)) continue;
        const existingBudget = await pool.query(
          `SELECT id FROM budgets WHERE user_id = $1 AND category_id = $2 AND month = $3 AND year = $4`,
          [user.id, cid(b.cat), m, y]
        );
        if (!existingBudget.rows.length) {
          await pool.query(
            `INSERT INTO budgets (user_id, category_id, limit_amount, month, year)
             VALUES ($1, $2, $3, $4, $5)`,
            [user.id, cid(b.cat), b.limit, m, y]
          );
        }
      }
    }

    console.log(`Seeding complete for ${user.email}.`);
  }

  console.log('All user data successfully seeded!');
  await pool.end();
}

seed().catch((err) => {
  console.error('Failed to seed user data:', err);
  process.exit(1);
});
