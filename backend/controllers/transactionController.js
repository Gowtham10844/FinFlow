const pool = require('../config/db');
const { writeAudit } = require('../utils/audit');
const asyncHandler = require('../middleware/asyncHandler');

// Helper: verify the category_id belongs to the requesting user or is global (user_id IS NULL).
// Returns true if valid, false otherwise.
async function isCategoryAllowed(categoryId, userId) {
  if (categoryId === null || categoryId === undefined || categoryId === '') return true; // null / undefined = no category, always allowed
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
  const { type, category_id, from, to, page = 1, limit = 25 } = req.query;
  const params = [req.user.id];
  let where = `t.user_id = $1 AND t.status = 'active'`;

  if (type) { params.push(type); where += ` AND t.type = $${params.length}`; }
  if (category_id) { params.push(category_id); where += ` AND t.category_id = $${params.length}`; }
  if (from) { params.push(from); where += ` AND t.date >= $${params.length}`; }
  if (to) { params.push(to); where += ` AND t.date <= $${params.length}`; }

  const offset = (Number(page) - 1) * Number(limit);
  params.push(limit, offset);

  const result = await pool.query(
    `SELECT t.*, c.name AS category_name, c.icon AS category_icon
     FROM transactions t
     LEFT JOIN categories c ON c.id = t.category_id
     WHERE ${where}
     ORDER BY t.date DESC, t.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM transactions t WHERE ${where}`,
    params.slice(0, params.length - 2)
  );

  res.json({
    data: result.rows,
    total: Number(countResult.rows[0].count),
    page: Number(page),
    limit: Number(limit),
  });
});

exports.create = asyncHandler(async (req, res) => {
  const { category_id, type, amount, description, date } = req.body;
  if (!type || !amount || !date) {
    return res.status(400).json({ error: 'type, amount and date are required' });
  }
  if (!['income', 'expense'].includes(type)) {
    return res.status(400).json({ error: "type must be 'income' or 'expense'" });
  }
  if (Number(amount) <= 0) {
    return res.status(400).json({ error: 'amount must be greater than 0' });
  }

  // Validate that `date` is a real calendar date (YYYY-MM-DD)
  const dateParts = String(date).split('-');
  if (dateParts.length !== 3) {
    return res.status(400).json({ error: 'date must be in YYYY-MM-DD format' });
  }
  const [dYear, dMonth, dDay] = dateParts.map(Number);
  if (isNaN(dYear) || isNaN(dMonth) || isNaN(dDay) || dMonth < 1 || dMonth > 12 || dDay < 1 || dDay > 31) {
    return res.status(400).json({ error: 'Invalid date — month must be 1-12 and day must be 1-31' });
  }
  const jsDate = new Date(`${date}T00:00:00`);
  if (isNaN(jsDate.getTime()) || jsDate.getMonth() + 1 !== dMonth || jsDate.getDate() !== dDay) {
    return res.status(400).json({ error: `Invalid date "${date}" — this date does not exist in the calendar` });
  }

  // Issue #2: Prevent cross-user category references
  if (!(await isCategoryAllowed(category_id, req.user.id))) {
    return res.status(403).json({ error: 'category_id does not belong to you or is not a global category' });
  }

  const result = await pool.query(
    `INSERT INTO transactions (user_id, category_id, type, amount, description, date)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [req.user.id, category_id || null, type, amount, description || null, date]
  );

  await writeAudit({
    actorId: req.user.id, actorName: req.user.name, actorRole: req.user.role,
    action: 'ADD_TRANSACTION', targetTable: 'transactions', targetId: result.rows[0].id,
    detail: `${type} of ${amount} added`, ip: req.ip,
  });

  res.status(201).json(result.rows[0]);
});

exports.update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  // category_id may be explicitly null (to clear it) or undefined (not sent, keep existing)
  const { type, amount, description, date } = req.body;
  const categoryProvided = Object.prototype.hasOwnProperty.call(req.body, 'category_id');
  const category_id = req.body.category_id;

  if (amount !== undefined && Number(amount) <= 0) {
    return res.status(400).json({ error: 'amount must be greater than 0' });
  }

  // Issue #2: Prevent cross-user category references on update
  if (categoryProvided && category_id !== null) {
    if (!(await isCategoryAllowed(category_id, req.user.id))) {
      return res.status(403).json({ error: 'category_id does not belong to you or is not a global category' });
    }
  }

  // Issue #7: Fix COALESCE preventing category from being cleared.
  // Build a dynamic SET clause: if category_id is explicitly provided (even as null), set it directly.
  // If not provided, keep the existing value.
  let setClauses = [];
  const params = [];

  if (categoryProvided) {
    params.push(category_id); // can be null — intentionally clears the category
    setClauses.push(`category_id = $${params.length}`);
  }
  if (type !== undefined) { params.push(type); setClauses.push(`type = $${params.length}`); }
  if (amount !== undefined) { params.push(amount); setClauses.push(`amount = $${params.length}`); }
  if (description !== undefined) { params.push(description); setClauses.push(`description = $${params.length}`); }
  if (date !== undefined) { params.push(date); setClauses.push(`date = $${params.length}`); }

  if (!setClauses.length) {
    return res.status(400).json({ error: 'No fields provided to update' });
  }

  setClauses.push(`updated_at = NOW()`);
  params.push(id, req.user.id);

  const result = await pool.query(
    `UPDATE transactions SET ${setClauses.join(', ')}
     WHERE id = $${params.length - 1} AND user_id = $${params.length} AND status = 'active' RETURNING *`,
    params
  );

  if (!result.rows.length) return res.status(404).json({ error: 'Transaction not found' });

  await writeAudit({
    actorId: req.user.id, actorName: req.user.name, actorRole: req.user.role,
    action: 'EDIT_TRANSACTION', targetTable: 'transactions', targetId: id,
    detail: `Transaction ${id} edited`, ip: req.ip,
  });

  res.json(result.rows[0]);
});

// Soft delete only — never a physical DELETE
exports.remove = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await pool.query(
    `UPDATE transactions SET status = 'inactive', deleted_at = NOW(), deleted_by = $1
     WHERE id = $2 AND user_id = $1 AND status = 'active' RETURNING id`,
    [req.user.id, id]
  );

  if (!result.rows.length) return res.status(404).json({ error: 'Transaction not found' });

  await writeAudit({
    actorId: req.user.id, actorName: req.user.name, actorRole: req.user.role,
    action: 'SOFT_DELETE_TRANSACTION', targetTable: 'transactions', targetId: id,
    detail: `Transaction ${id} soft-deleted`, ip: req.ip,
  });

  res.json({ message: 'Transaction deleted' });
});
