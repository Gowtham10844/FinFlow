const pool = require('../config/db');
const { writeAudit } = require('../utils/audit');
const asyncHandler = require('../middleware/asyncHandler');

// GET /api/admin/dashboard
exports.getDashboard = asyncHandler(async (req, res) => {
  const [
    totalUsersRes,
    activeUsersRes,
    inactiveUsersRes,
    totalTxnsRes,
    totalBudgetsRes,
    totalCatsRes,
    newUsersMonthRes,
    recentUsersRes,
    recentTxnsRes,
    monthlyTxnsRes,
    userGrowthRes,
    catUsageRes
  ] = await Promise.all([
    pool.query(`SELECT COUNT(*)::int AS count FROM users`),
    pool.query(`SELECT COUNT(*)::int AS count FROM users WHERE status = 'active'`),
    pool.query(`SELECT COUNT(*)::int AS count FROM users WHERE status = 'inactive'`),
    pool.query(`SELECT COUNT(*)::int AS count FROM transactions WHERE status = 'active'`),
    pool.query(`SELECT COUNT(*)::int AS count FROM budgets WHERE status = 'active'`),
    pool.query(`SELECT COUNT(*)::int AS count FROM categories WHERE status = 'active'`),
    pool.query(`SELECT COUNT(*)::int AS count FROM users WHERE created_at >= date_trunc('month', NOW())`),
    pool.query(`SELECT id, name, email, role, status, created_at FROM users ORDER BY created_at DESC LIMIT 5`),
    pool.query(`
      SELECT t.id, t.user_id, u.name as user_name, u.email as user_email,
             t.type, t.amount, t.description, t.date, t.created_at,
             c.name as category_name
      FROM transactions t
      JOIN users u ON t.user_id = u.id
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.status = 'active'
      ORDER BY t.created_at DESC
      LIMIT 6
    `),
    pool.query(`
      SELECT TO_CHAR(date, 'Mon YYYY') as month,
             TO_CHAR(date, 'YYYY-MM') as month_key,
             COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0)::numeric as total_income,
             COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0)::numeric as total_expense,
             COUNT(*)::int as txn_count
      FROM transactions
      WHERE status = 'active'
      GROUP BY month, month_key
      ORDER BY month_key ASC
      LIMIT 12
    `),
    pool.query(`
      SELECT TO_CHAR(created_at, 'Mon YYYY') as month,
             TO_CHAR(created_at, 'YYYY-MM') as month_key,
             COUNT(*)::int as new_users
      FROM users
      GROUP BY month, month_key
      ORDER BY month_key ASC
      LIMIT 12
    `),
    pool.query(`
      SELECT COALESCE(c.name, 'Uncategorized') as category_name,
             COUNT(t.id)::int as transaction_count,
             COALESCE(SUM(t.amount), 0)::numeric as total_amount
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.status = 'active'
      GROUP BY c.name
      ORDER BY total_amount DESC
      LIMIT 8
    `)
  ]);

  res.json({
    totalUsers: totalUsersRes.rows[0].count,
    activeUsers: activeUsersRes.rows[0].count,
    inactiveUsers: inactiveUsersRes.rows[0].count,
    totalTransactions: totalTxnsRes.rows[0].count,
    totalBudgets: totalBudgetsRes.rows[0].count,
    totalCategories: totalCatsRes.rows[0].count,
    newUsersThisMonth: newUsersMonthRes.rows[0].count,
    recentUsers: recentUsersRes.rows,
    recentTransactions: recentTxnsRes.rows,
    monthlyTransactions: monthlyTxnsRes.rows,
    userGrowth: userGrowthRes.rows,
    categoryUsage: catUsageRes.rows
  });
});

// GET /api/admin/users
exports.getUsers = asyncHandler(async (req, res) => {
  const { search = '', status = '' } = req.query;
  const searchPattern = search.trim() ? `%${search.trim()}%` : null;
  const statusFilter = (status && status !== 'all') ? status : null;

  const result = await pool.query(
    `SELECT u.id, u.name, u.email, u.role, u.status, u.created_at, u.updated_at, u.deleted_at, u.deleted_by,
            d.name as deleted_by_name,
            COUNT(t.id)::int as transaction_count,
            COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0)::numeric as total_spent,
            COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0)::numeric as total_income
     FROM users u
     LEFT JOIN users d ON d.id = u.deleted_by
     LEFT JOIN transactions t ON t.user_id = u.id AND t.status = 'active'
     WHERE ($1::text IS NULL OR u.name ILIKE $1 OR u.email ILIKE $1)
       AND ($2::text IS NULL OR u.status = $2::account_status)
     GROUP BY u.id, d.name
     ORDER BY u.created_at DESC`,
    [searchPattern, statusFilter]
  );

  res.json(result.rows);
});

// GET /api/admin/users/:id
exports.getUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await pool.query(
    `SELECT u.id, u.name, u.email, u.role, u.status, u.created_at, u.updated_at, u.deleted_at, u.deleted_by,
            d.name as deleted_by_name,
            (SELECT COUNT(*)::int FROM transactions WHERE user_id = u.id AND status = 'active') as transaction_count,
            (SELECT COUNT(*)::int FROM budgets WHERE user_id = u.id AND status = 'active') as budget_count,
            (SELECT COUNT(*)::int FROM categories WHERE user_id = u.id AND status = 'active') as custom_category_count,
            (SELECT COALESCE(SUM(amount), 0)::numeric FROM transactions WHERE user_id = u.id AND type = 'income' AND status = 'active') as total_income,
            (SELECT COALESCE(SUM(amount), 0)::numeric FROM transactions WHERE user_id = u.id AND type = 'expense' AND status = 'active') as total_expense
     FROM users u
     LEFT JOIN users d ON d.id = u.deleted_by
     WHERE u.id = $1`,
    [id]
  );

  if (!result.rows.length) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json(result.rows[0]);
});

// GET /api/admin/users/:id/transactions
exports.getUserTransactions = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await pool.query(
    `SELECT t.id, t.user_id, t.category_id, c.name as category_name, c.icon as category_icon,
            t.type, t.amount, t.description, t.date, t.status, t.created_at, t.updated_at
     FROM transactions t
     LEFT JOIN categories c ON t.category_id = c.id
     WHERE t.user_id = $1
     ORDER BY t.date DESC, t.created_at DESC`,
    [id]
  );

  res.json(result.rows);
});

// GET /api/admin/users/:id/categories
exports.getUserCategories = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await pool.query(
    `SELECT c.id, c.name, c.icon, c.type, c.user_id, c.status, c.created_at,
            (SELECT COUNT(*)::int FROM transactions WHERE category_id = c.id AND user_id = $1 AND status = 'active') as txn_count,
            (SELECT COALESCE(SUM(amount), 0)::numeric FROM transactions WHERE category_id = c.id AND user_id = $1 AND status = 'active') as total_spent
     FROM categories c
     WHERE (c.user_id = $1 OR c.user_id IS NULL) AND c.status = 'active'
     ORDER BY c.user_id DESC NULLS LAST, c.name ASC`,
    [id]
  );

  res.json(result.rows);
});

// GET /api/admin/users/:id/budgets
exports.getUserBudgets = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await pool.query(
    `SELECT b.id, b.user_id, b.category_id, c.name as category_name, c.icon as category_icon,
            b.limit_amount, b.month, b.year, b.status, b.created_at,
            COALESCE(SUM(t.amount), 0)::numeric as spent,
            ROUND(COALESCE(SUM(t.amount), 0) / b.limit_amount * 100, 2)::numeric as pct_used
     FROM budgets b
     JOIN categories c ON b.category_id = c.id
     LEFT JOIN transactions t ON t.user_id = b.user_id AND t.category_id = b.category_id
          AND t.type = 'expense' AND t.status = 'active'
          AND EXTRACT(MONTH FROM t.date) = b.month
          AND EXTRACT(YEAR FROM t.date) = b.year
     WHERE b.user_id = $1 AND b.status = 'active'
     GROUP BY b.id, c.name, c.icon
     ORDER BY b.year DESC, b.month DESC, c.name ASC`,
    [id]
  );

  res.json(result.rows);
});

// GET /api/admin/users/:id/reports
exports.getUserReports = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await pool.query(
    `SELECT EXTRACT(YEAR FROM date)::INT AS year,
            EXTRACT(MONTH FROM date)::INT AS month,
            TO_CHAR(date, 'Mon YYYY') AS month_label,
            SUM(CASE WHEN type='income' THEN amount ELSE 0 END)::numeric AS income,
            SUM(CASE WHEN type='expense' THEN amount ELSE 0 END)::numeric AS expense,
            (SUM(CASE WHEN type='income' THEN amount ELSE 0 END) - SUM(CASE WHEN type='expense' THEN amount ELSE 0 END))::numeric AS net_savings,
            COUNT(*)::int AS txn_count
     FROM transactions
     WHERE user_id = $1 AND status = 'active'
     GROUP BY year, month, month_label
     ORDER BY year DESC, month DESC`,
    [id]
  );

  res.json(result.rows);
});

// GET /api/admin/users/:id/audit-logs
exports.getUserAuditLogs = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await pool.query(
    `SELECT * FROM audit_logs 
     WHERE actor_id = $1 OR (target_table = 'users' AND target_id = $1)
     ORDER BY created_at DESC LIMIT 50`,
    [id]
  );

  res.json(result.rows);
});

// GET /api/admin/statistics
exports.getStatistics = asyncHandler(async (req, res) => {
  const [
    userStats,
    txnTypeStats,
    topSpenders,
    topCategories
  ] = await Promise.all([
    pool.query(`
      SELECT 
        COUNT(*)::int as total_users,
        COUNT(CASE WHEN status = 'active' THEN 1 END)::int as active_users,
        COUNT(CASE WHEN status = 'inactive' THEN 1 END)::int as inactive_users,
        COUNT(CASE WHEN role = 'admin' THEN 1 END)::int as admin_count,
        COUNT(CASE WHEN role = 'user' THEN 1 END)::int as user_count
      FROM users
    `),
    pool.query(`
      SELECT type, COUNT(*)::int as count, COALESCE(SUM(amount), 0)::numeric as volume
      FROM transactions
      WHERE status = 'active'
      GROUP BY type
    `),
    pool.query(`
      SELECT u.id, u.name, u.email,
             COUNT(t.id)::int as txn_count,
             COALESCE(SUM(t.amount), 0)::numeric as total_volume
      FROM users u
      JOIN transactions t ON u.id = t.user_id AND t.status = 'active'
      GROUP BY u.id
      ORDER BY total_volume DESC
      LIMIT 5
    `),
    pool.query(`
      SELECT COALESCE(c.name, 'Uncategorized') as category,
             COUNT(t.id)::int as count,
             COALESCE(SUM(t.amount), 0)::numeric as volume
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.status = 'active'
      GROUP BY c.name
      ORDER BY volume DESC
      LIMIT 10
    `)
  ]);

  res.json({
    users: userStats.rows[0],
    transactionsByType: txnTypeStats.rows,
    topSpenders: topSpenders.rows,
    topCategories: topCategories.rows
  });
});

// PUT /api/admin/users/:id/status
exports.toggleUserStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['active', 'inactive'].includes(status)) {
    return res.status(400).json({ error: 'Status must be active or inactive' });
  }

  const isInactive = status === 'inactive';
  const result = await pool.query(
    `UPDATE users 
     SET status = $1, 
         deleted_at = ${isInactive ? 'NOW()' : 'NULL'}, 
         deleted_by = ${isInactive ? '$2' : 'NULL'},
         updated_at = NOW()
     WHERE id = ${isInactive ? '$3' : '$2'}
     RETURNING id, name, email, role, status, updated_at`,
    isInactive ? [status, req.user.id, id] : [status, id]
  );

  if (!result.rows.length) {
    return res.status(404).json({ error: 'User not found' });
  }

  const updatedUser = result.rows[0];

  await writeAudit({
    actorId: req.user.id,
    actorName: req.user.name,
    actorRole: req.user.role,
    action: isInactive ? 'DEACTIVATE_USER' : 'ACTIVATE_USER',
    targetTable: 'users',
    targetId: id,
    detail: `User ${updatedUser.name} status updated to ${status} by admin`,
    ip: req.ip
  });

  res.json(updatedUser);
});

// POST /api/admin/users/:id/restore
exports.restoreUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await pool.query(
    `UPDATE users SET status = 'active', deleted_at = NULL, deleted_by = NULL, updated_at = NOW()
     WHERE id = $1 RETURNING id, name, email, role, status`,
    [id]
  );
  if (!result.rows.length) return res.status(404).json({ error: 'User not found' });

  await writeAudit({
    actorId: req.user.id,
    actorName: req.user.name,
    actorRole: req.user.role,
    action: 'RESTORE_USER',
    targetTable: 'users',
    targetId: id,
    detail: `User ${result.rows[0].name} restored by admin`,
    ip: req.ip
  });

  res.json(result.rows[0]);
});

// DELETE /api/admin/users/:id
exports.deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await pool.query(
    `UPDATE users SET status = 'inactive', deleted_at = NOW(), deleted_by = $1, updated_at = NOW()
     WHERE id = $2 AND status = 'active' RETURNING id, name`,
    [req.user.id, id]
  );
  if (!result.rows.length) return res.status(404).json({ error: 'User not found' });

  await writeAudit({
    actorId: req.user.id,
    actorName: req.user.name,
    actorRole: req.user.role,
    action: 'SOFT_DELETE_USER',
    targetTable: 'users',
    targetId: id,
    detail: `User ${result.rows[0].name} marked inactive by admin`,
    ip: req.ip
  });

  res.json({ message: 'User deactivated successfully' });
});

// GET /api/admin/audit-logs
exports.auditLogs = asyncHandler(async (req, res) => {
  const { limit = 100 } = req.query;
  const result = await pool.query(
    `SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT $1`,
    [limit]
  );
  res.json(result.rows);
});

// GET /api/admin/deleted-users
exports.deletedUsers = asyncHandler(async (req, res) => {
  const result = await pool.query(`SELECT * FROM v_deleted_users`);
  res.json(result.rows);
});
