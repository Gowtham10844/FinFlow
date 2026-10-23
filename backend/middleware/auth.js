const jwt = require('jsonwebtoken');
const pool = require('../config/db');

// Verifies the JWT and confirms the user is still active in the database.
// Attaches { id, role, name } to req.user on success.
async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  // Live status check — ensures deactivated/deleted users cannot use old tokens.
  try {
    const result = await pool.query(
      `SELECT id, name, role FROM users WHERE id = $1 AND status = 'active'`,
      [payload.id]
    );
    if (!result.rows.length) {
      return res.status(401).json({ error: 'Account is inactive or has been deleted' });
    }
    req.user = result.rows[0]; // always fresh from DB
    next();
  } catch (err) {
    next(err);
  }
}

// Restricts a route to admin role only.
// requireAuth must run first so req.user is already verified from the DB.
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
