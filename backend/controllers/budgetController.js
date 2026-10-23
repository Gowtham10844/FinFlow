const pool = require('../config/db');
const { writeAudit } = require('../utils/audit');
const asyncHandler = require('../middleware/asyncHandler');

// Helper: verify the category_id belongs to the requesting user or is global (user_id IS NULL).
async function isCategoryAllowed(categoryId, userId) {
  if (categoryId === null || categoryId === undefined || categoryId === '') return true;
  const numericId = Number(categoryId);
  if (isNaN(numericId) || numericId <= 0) return false;
  const result = await pool.query(
    `SELECT id FROM categories
     WHERE id = $1 AND status = 'active' AND (user_id = $2 OR user_id IS NULL)`,
    [numericId, userId]
  );
  return result.rows.length > 0;
}

exports.list = asyncHandler(async (req, res) => {
  const { month, year } = req.query;
  const now = new Date();
  const m = month || now.getMonth() + 1;
  const y = year || now.getFullYear();

  // Uses the v_budget_utilisation view (real-time % used per category)
  const result = await pool.query(
    `SELECT b.id, b.category_id, c.name AS category_name, c.icon AS category_icon,
            b.limit_amount, b.month, b.year,
            COALESCE(u.spent, 0) AS spent,
            COALESCE(u.pct_used, 0) AS pct_used,
            CASE
              WHEN COALESCE(u.pct_used, 0) >= 100 THEN 'exceeded'
              WHEN COALESCE(u.pct_used, 0) >= 80 THEN 'warning'
              ELSE 'ok'
            END AS alert_level
     FROM budgets b
     JOIN categories c ON c.id = b.category_id
     LEFT JOIN v_budget_utilisation u
        ON u.user_id = b.user_id AND u.category_id = b.category_id
        AND u.month = b.month AND u.year = b.year
     WHERE b.user_id = $1 AND b.month = $2 AND b.year = $3 AND b.status = 'active'
     ORDER BY c.name`,
    [req.user.id, m, y]
  );

  res.json(result.rows);
});

exports.listDeleted = asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT b.id, b.category_id, c.name AS category_name, c.icon AS category_icon,
            b.limit_amount, b.month, b.year, b.deleted_at
     FROM budgets b
     JOIN categories c ON c.id = b.category_id
     WHERE b.user_id = $1 AND b.status = 'inactive'
     ORDER BY b.deleted_at DESC`,
    [req.user.id]
  );

  res.json(result.rows);
});

exports.create = asyncHandler(async (req, res) => {
  const { category_id, limit_amount, month, year } = req.body;
  if (!category_id || !limit_amount || !month || !year) {
    return res.status(400).json({ error: 'category_id, limit_amount, month and year are required' });
  }

  // Issue #2: Prevent cross-user category references
  if (!(await isCategoryAllowed(category_id, req.user.id))) {
    return res.status(403).json({ error: 'category_id does not belong to you or is not a global category' });
  }

  try {
    const existing = await pool.query(
      `SELECT id, status FROM budgets
       WHERE user_id = $1 AND category_id = $2 AND month = $3 AND year = $4`,
      [req.user.id, category_id, month, year]
    );

    if (existing.rows.length) {
      const found = existing.rows[0];
      if (found.status === 'inactive') {
        return res.status(409).json({
          restoreAvailable: true,
          budgetId: found.id,
          message: 'A deleted budget already exists.'
        });
      } else {
        return res.status(409).json({ error: 'A budget already exists for this category and month' });
      }
    }

    const result = await pool.query(
      `INSERT INTO budgets (user_id, category_id, limit_amount, month, year)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.user.id, category_id, limit_amount, month, year]
    );

    await writeAudit({
      actorId: req.user.id, actorName: req.user.name, actorRole: req.user.role,
      action: 'SET_BUDGET', targetTable: 'budgets', targetId: result.rows[0].id,
      detail: `Budget set: ${limit_amount} for category ${category_id} (${month}/${year})`, ip: req.ip,
    });

    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'A budget already exists for this category and month' });
    }
    throw err;
  }
});

exports.update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { limit_amount } = req.body;

  const result = await pool.query(
    `UPDATE budgets SET limit_amount = COALESCE($1, limit_amount)
     WHERE id = $2 AND user_id = $3 AND status = 'active' RETURNING *`,
    [limit_amount, id, req.user.id]
  );

  if (!result.rows.length) return res.status(404).json({ error: 'Budget not found' });
  res.json(result.rows[0]);
});

exports.remove = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await pool.query(
    `UPDATE budgets SET status = 'inactive', deleted_at = NOW(), deleted_by = $1
     WHERE id = $2 AND user_id = $1 AND status = 'active' RETURNING id`,
    [req.user.id, id]
  );

  if (!result.rows.length) return res.status(404).json({ error: 'Budget not found' });

  await writeAudit({
    actorId: req.user.id, actorName: req.user.name, actorRole: req.user.role,
    action: 'SOFT_DELETE_BUDGET', targetTable: 'budgets', targetId: id,
    detail: `Budget ${id} soft-deleted`, ip: req.ip,
  });

  res.json({ message: 'Budget deleted' });
});

exports.restore = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const existing = await pool.query(
    `SELECT id, category_id, month, year FROM budgets
     WHERE id = $1 AND user_id = $2 AND status = 'inactive'`,
    [id, req.user.id]
  );

  if (!existing.rows.length) {
    return res.status(404).json({ error: 'Deleted budget not found' });
  }

  const { category_id, month, year } = existing.rows[0];

  const activeBudget = await pool.query(
    `SELECT id FROM budgets
     WHERE user_id = $1 AND category_id = $2 AND month = $3 AND year = $4 AND status = 'active'`,
    [req.user.id, category_id, month, year]
  );

  if (activeBudget.rows.length) {
    return res.status(409).json({ error: 'An active budget already exists for this category and month.' });
  }

  const result = await pool.query(
    `UPDATE budgets
     SET status = 'active', deleted_at = NULL, deleted_by = NULL
     WHERE id = $1 AND user_id = $2 AND status = 'inactive' RETURNING *`,
    [id, req.user.id]
  );

  await writeAudit({
    actorId: req.user.id, actorName: req.user.name, actorRole: req.user.role,
    action: 'RESTORE_BUDGET', targetTable: 'budgets', targetId: id,
    detail: `Budget ${id} restored to active status`, ip: req.ip,
  });

  res.json(result.rows[0]);
});

exports.permanentRemove = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await pool.query(
    `DELETE FROM budgets
     WHERE id = $1 AND user_id = $2 AND status = 'inactive' RETURNING id`,
    [id, req.user.id]
  );

  if (!result.rows.length) return res.status(404).json({ error: 'Deleted budget not found' });

  await writeAudit({
    actorId: req.user.id, actorName: req.user.name, actorRole: req.user.role,
    action: 'PERMANENT_DELETE_BUDGET', targetTable: 'budgets', targetId: id,
    detail: `Budget ${id} permanently deleted`, ip: req.ip,
  });

  res.json({ message: 'Budget permanently deleted' });
});
