const pool = require('../config/db');
const { writeAudit } = require('../utils/audit');
const asyncHandler = require('../middleware/asyncHandler');

// Global categories (user_id IS NULL) + this user's own categories
exports.list = asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT * FROM categories
     WHERE status = 'active' AND (user_id = $1 OR user_id IS NULL)
     ORDER BY user_id NULLS FIRST, name`,
    [req.user.id]
  );
  res.json(result.rows);
});

exports.create = asyncHandler(async (req, res) => {
  const { name, type } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  const finalType = ['income', 'expense'].includes(type) ? type : 'expense';

  const result = await pool.query(
    `INSERT INTO categories (name, icon, type, user_id)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [name, null, finalType, req.user.id]
  );

  await writeAudit({
    actorId: req.user.id, actorName: req.user.name, actorRole: req.user.role,
    action: 'ADD_CATEGORY', targetTable: 'categories', targetId: result.rows[0].id,
    detail: `Category '${name}' created`, ip: req.ip,
  });

  res.status(201).json(result.rows[0]);
});

exports.update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, type } = req.body;
  
  const finalType = ['income', 'expense'].includes(type) ? type : null;

  const result = await pool.query(
    `UPDATE categories SET name = COALESCE($1, name), 
        type = COALESCE($2, type)
     WHERE id = $3 AND user_id = $4 AND status = 'active' RETURNING *`,
    [name, finalType, id, req.user.id]
  );

  if (!result.rows.length) {
    return res.status(404).json({ error: 'Category not found or not editable (global categories are read-only for users)' });
  }
  res.json(result.rows[0]);
});

// Soft delete only — never a physical DELETE
exports.remove = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await pool.query(
    `UPDATE categories SET status = 'inactive', deleted_at = NOW(), deleted_by = $1
     WHERE id = $2 AND user_id = $1 AND status = 'active' RETURNING id, name`,
    [req.user.id, id]
  );

  if (!result.rows.length) {
    return res.status(404).json({ error: 'Category not found or not deletable' });
  }

  await writeAudit({
    actorId: req.user.id, actorName: req.user.name, actorRole: req.user.role,
    action: 'SOFT_DELETE_CATEGORY', targetTable: 'categories', targetId: id,
    detail: `Category '${result.rows[0].name}' soft-deleted`, ip: req.ip,
  });

  res.json({ message: 'Category deleted' });
});
