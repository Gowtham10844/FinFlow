// Runs schema.sql against the configured database, then seeds
// an admin and a demo user with real bcrypt password hashes.
// Usage: npm run db:setup
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const pool = require('../config/db');

async function setup() {
  const schemaPath = path.join(__dirname, '..', 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  console.log('Running schema.sql ...');
  await pool.query(schemaSql);
  console.log('Schema applied.');

  const adminHash = await bcrypt.hash('Admin@123', 10);
  const userHash = await bcrypt.hash('User@123', 10);

  await pool.query(
    `INSERT INTO users (name, email, password, role)
     VALUES ($1, $2, $3, 'admin'), ($4, $5, $6, 'user')
     ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password, status = 'active'`,
    ['Admin User', 'admin@finflow.com', adminHash, 'Demo User', 'user@finflow.com', userHash]
  );

  console.log('Seeded admin@finflow.com / Admin@123');
  console.log('Seeded user@finflow.com / User@123');
  console.log('Done. Change these passwords before going to production.');

  await pool.end();
}

setup().catch((err) => {
  console.error('DB setup failed:', err);
  process.exit(1);
});
