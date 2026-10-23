const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { writeAudit } = require('../utils/audit');
const asyncHandler = require('../middleware/asyncHandler');

function signToken(user) {
  return jwt.sign(
    { id: user.id, name: user.name, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

exports.register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email and password are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  const hash = await bcrypt.hash(password, 10);
  const result = await pool.query(
    `INSERT INTO users (name, email, password, role)
     VALUES ($1, $2, $3, 'user')
     RETURNING id, name, email, role, created_at`,
    [name, email, hash]
  );

  const user = result.rows[0];
  const token = signToken(user);

  await writeAudit({
    actorId: user.id, actorName: user.name, actorRole: user.role,
    action: 'REGISTER', targetTable: 'users', targetId: user.id,
    detail: `New user ${user.name} registered`, ip: req.ip,
  });

  res.status(201).json({ token, user });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  const result = await pool.query(
    `SELECT id, name, email, password, role FROM users
     WHERE email = $1 AND status = 'active'`,
    [email]
  );

  if (!result.rows.length) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const user = result.rows[0];
  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = signToken(user);

  await writeAudit({
    actorId: user.id, actorName: user.name, actorRole: user.role,
    action: 'LOGIN', targetTable: 'users', targetId: user.id,
    detail: `${user.name} logged in`, ip: req.ip,
  });

  delete user.password;
  res.json({ token, user });
});

exports.logout = asyncHandler(async (req, res) => {
  // JWT is stateless — logout is a client-side token discard.
  // We still record it for the audit trail.
  await writeAudit({
    actorId: req.user.id, actorName: req.user.name, actorRole: req.user.role,
    action: 'LOGOUT', targetTable: 'users', targetId: req.user.id,
    detail: `${req.user.name} logged out`, ip: req.ip,
  });
  res.json({ message: 'Logged out' });
});

exports.me = asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT id, name, email, role, created_at FROM users WHERE id = $1 AND status = 'active'`,
    [req.user.id]
  );
  if (!result.rows.length) return res.status(404).json({ error: 'User not found' });
  res.json(result.rows[0]);
});
