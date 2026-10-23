const pool = require('../config/db');
const asyncHandler = require('../middleware/asyncHandler');

// Total income vs expense by month
exports.monthlySummary = asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT
        DATE_TRUNC('month', date) AS month,
        SUM(CASE WHEN type='income' THEN amount ELSE 0 END) AS total_income,
        SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) AS total_expense,
        SUM(CASE WHEN type='income' THEN amount ELSE -amount END) AS net,
        COUNT(*) AS txn_count
     FROM transactions
     WHERE user_id = $1 AND status = 'active'
     GROUP BY month ORDER BY month DESC`,
    [req.user.id]
  );
  res.json(result.rows);
});

// Category-wise spending for a given month (defaults to current month)
exports.categoryBreakdown = asyncHandler(async (req, res) => {
  const now = new Date();
  const month = req.query.month || now.getMonth() + 1;
  const year = req.query.year || now.getFullYear();

  const result = await pool.query(
    `SELECT c.name, c.icon, SUM(t.amount) AS total_spent
     FROM transactions t
     JOIN categories c ON t.category_id = c.id
     WHERE t.user_id = $1 AND t.type = 'expense'
       AND t.status = 'active' AND c.status = 'active'
       AND EXTRACT(MONTH FROM t.date) = $2
       AND EXTRACT(YEAR FROM t.date) = $3
     GROUP BY c.name, c.icon ORDER BY total_spent DESC`,
    [req.user.id, month, year]
  );
  res.json(result.rows);
});

// Top 5 spending categories (all time or within optional date range)
exports.topCategories = asyncHandler(async (req, res) => {
  const { from, to, limit = 5 } = req.query;
  const params = [req.user.id];
  let where = `t.user_id = $1 AND t.type = 'expense' AND t.status = 'active'`;

  if (from) { params.push(from); where += ` AND t.date >= $${params.length}`; }
  if (to) { params.push(to); where += ` AND t.date <= $${params.length}`; }
  params.push(limit);

  const result = await pool.query(
    `SELECT c.name, c.icon, SUM(t.amount) AS total_spent
     FROM transactions t
     JOIN categories c ON c.id = t.category_id
     WHERE ${where}
     GROUP BY c.name, c.icon
     ORDER BY total_spent DESC
     LIMIT $${params.length}`,
    params
  );
  res.json(result.rows);
});

// Budget vs actual for a given month/year
exports.budgetVsActual = asyncHandler(async (req, res) => {
  const { month, year } = req.query;
  const now = new Date();
  const m = month || now.getMonth() + 1;
  const y = year || now.getFullYear();

  const result = await pool.query(
    `SELECT b.limit_amount, c.name,
        COALESCE(SUM(t.amount), 0) AS spent,
        b.limit_amount - COALESCE(SUM(t.amount), 0) AS remaining
     FROM budgets b
     JOIN categories c ON b.category_id = c.id
     LEFT JOIN transactions t
        ON t.category_id = b.category_id AND t.user_id = b.user_id
        AND t.type = 'expense' AND t.status = 'active'
        AND EXTRACT(MONTH FROM t.date) = b.month
        AND EXTRACT(YEAR FROM t.date) = b.year
     WHERE b.user_id = $1 AND b.month = $2 AND b.year = $3 AND b.status = 'active'
     GROUP BY b.limit_amount, c.name`,
    [req.user.id, m, y]
  );
  res.json(result.rows);
});

// Year-over-year comparison (income/expense per year)
exports.yearOverYear = asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT EXTRACT(YEAR FROM date)::INT AS year,
        SUM(CASE WHEN type='income' THEN amount ELSE 0 END) AS total_income,
        SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) AS total_expense
     FROM transactions
     WHERE user_id = $1 AND status = 'active'
     GROUP BY year ORDER BY year`,
    [req.user.id]
  );
  res.json(result.rows);
});
