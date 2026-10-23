const { format, parse } = require('fast-csv');
const { Readable } = require('stream');
const pool = require('../config/db');
const { writeAudit } = require('../utils/audit');
const asyncHandler = require('../middleware/asyncHandler');

// GET /api/csv/export -> streams all active transactions as a CSV download
exports.exportCsv = asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT t.date, t.type, c.name AS category, t.amount, t.description
     FROM transactions t
     LEFT JOIN categories c ON c.id = t.category_id
     WHERE t.user_id = $1 AND t.status = 'active'
     ORDER BY t.date DESC`,
    [req.user.id]
  );

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="finflow_transactions.csv"');

  const csvStream = format({ headers: true });
  csvStream.pipe(res);
  result.rows.forEach((row) => {
    // Format date as YYYY-MM-DD (local parts) so it round-trips through import
    const d = row.date instanceof Date ? row.date : new Date(row.date);
    const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    csvStream.write({ ...row, date: ymd });
  });
  csvStream.end();

  await writeAudit({
    actorId: req.user.id, actorName: req.user.name, actorRole: req.user.role,
    action: 'EXPORT_CSV', targetTable: 'transactions', targetId: null,
    detail: `Exported ${result.rows.length} transactions`, ip: req.ip,
  });
});

// POST /api/csv/import -> bulk-adds transactions from an uploaded CSV
// Expected columns: date, type, category, amount, description
// Issue #8 Fix: All rows are inserted inside a single DB transaction (atomic).
// If any DB error occurs, ALL inserts are rolled back.
// Also adds proper numeric validation (parseFloat + isNaN) before hitting the DB.
exports.importCsv = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No CSV file uploaded' });

  const categoryResult = await pool.query(
    `SELECT id, name FROM categories WHERE (user_id = $1 OR user_id IS NULL) AND status = 'active'`,
    [req.user.id]
  );
  const categoryMap = new Map(categoryResult.rows.map((c) => [c.name.toLowerCase(), c.id]));

  const rows = [];
  const errors = [];

  // Parse all CSV rows into memory first
  await new Promise((resolve, reject) => {
    Readable.from(req.file.buffer.toString('utf8'))
      .pipe(parse({ headers: true, trim: true }))
      .on('data', (row) => rows.push(row))
      .on('end', resolve)
      .on('error', reject);
  });

  // Validate all rows before touching the database
  const validRows = [];
  for (const [i, row] of rows.entries()) {
    const { date, type, category, amount, description } = row;
    const parsedAmount = parseFloat(amount);

    if (
      !date ||
      !type ||
      !amount ||
      isNaN(parsedAmount) ||         // catches non-numeric strings like "abc"
      parsedAmount <= 0 ||
      !['income', 'expense'].includes(type)
    ) {
      errors.push({ row: i + 2, reason: 'Missing or invalid date/type/amount' });
      continue;
    }

    // Bug Fix #1: Validate that date is a real calendar date
    // Expected format: YYYY-MM-DD
    const dateParts = date.split('-');
    if (dateParts.length !== 3) {
      errors.push({ row: i + 2, reason: `Invalid date format "${date}" — expected YYYY-MM-DD` });
      continue;
    }
    const [year, month, day] = dateParts.map(Number);
    if (isNaN(year) || isNaN(month) || isNaN(day) || month < 1 || month > 12 || day < 1 || day > 31) {
      errors.push({ row: i + 2, reason: `Invalid date "${date}" — month must be 1-12 and day must be 1-31` });
      continue;
    }
    // Use JS Date to catch impossible dates like Feb 30
    const jsDate = new Date(`${date}T00:00:00`);
    if (isNaN(jsDate.getTime()) || jsDate.getMonth() + 1 !== month || jsDate.getDate() !== day) {
      errors.push({ row: i + 2, reason: `Invalid date "${date}" — this date does not exist in the calendar` });
      continue;
    }

    const categoryId = category ? categoryMap.get(category.toLowerCase()) || null : null;
    validRows.push({ date, type, parsedAmount, categoryId, description: description || null });
  }

  // Insert all valid rows inside a single DB transaction (atomic)
  // Duplicate check: a row is a duplicate if (user_id, date, type, category_id, amount, description)
  // already exists for this user. category_id is included so the same date/amount with a different
  // category is correctly treated as a NEW transaction, not a duplicate.
  let inserted = 0;
  let duplicates = 0;
  if (validRows.length > 0) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const row of validRows) {
        // Check for an existing active transaction with identical key fields (including category_id)
        const dupCheck = await client.query(
          `SELECT id FROM transactions
           WHERE user_id = $1 AND date = $2 AND type = $3
             AND amount = $4 AND description IS NOT DISTINCT FROM $5
             AND category_id IS NOT DISTINCT FROM $6
             AND status = 'active'
           LIMIT 1`,
          [req.user.id, row.date, row.type, row.parsedAmount, row.description, row.categoryId]
        );
        if (dupCheck.rows.length > 0) {
          duplicates++;
          continue; // skip — this exact transaction already exists
        }

        await client.query(
          `INSERT INTO transactions (user_id, category_id, type, amount, description, date)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [req.user.id, row.categoryId, row.type, row.parsedAmount, row.description, row.date]
        );
        inserted++;
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      inserted = 0;
      // Re-throw so asyncHandler forwards to the central error handler
      throw err;
    } finally {
      client.release();
    }
  }

  await writeAudit({
    actorId: req.user.id, actorName: req.user.name, actorRole: req.user.role,
    action: 'IMPORT_CSV', targetTable: 'transactions', targetId: null,
    detail: `Imported ${inserted} transactions (${errors.length} invalid, ${duplicates} duplicate)`, ip: req.ip,
  });

  res.json({ inserted, skipped: errors.length, duplicates, errors });
});
