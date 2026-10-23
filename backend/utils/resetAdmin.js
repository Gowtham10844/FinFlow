// backend/utils/resetAdmin.js
// Script to create or reset the default admin user account.
// Idempotent: updates existing admin password/role/status or creates it if missing.

const bcrypt = require('bcrypt');
const pool = require('../config/db');

async function resetAdmin() {
  const email = 'admin@finflow.com';
  const password = 'Admin@123';
  const name = 'Admin User';
  const role = 'admin';
  const status = 'active';

  console.log(`Starting admin account creation/reset for: ${email}...`);

  try {
    // 1. Hash the password using bcrypt with 10 rounds (standard for the app)
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    console.log('Password successfully hashed.');

    // 2. Insert or update the admin user in the database
    const query = `
      INSERT INTO users (name, email, password, role, status, deleted_at, deleted_by)
      VALUES ($1, $2, $3, $4, $5, NULL, NULL)
      ON CONFLICT (email)
      DO UPDATE SET
        password = EXCLUDED.password,
        role = EXCLUDED.role,
        status = EXCLUDED.status,
        deleted_at = NULL,
        deleted_by = NULL,
        updated_at = NOW()
      RETURNING id, name, email, role, status;
    `;

    const values = [name, email, passwordHash, role, status];
    const result = await pool.query(query, values);

    const seededUser = result.rows[0];
    console.log('Admin user successfully seeded/updated:');
    console.log(`- ID: ${seededUser.id}`);
    console.log(`- Name: ${seededUser.name}`);
    console.log(`- Email: ${seededUser.email}`);
    console.log(`- Role: ${seededUser.role}`);
    console.log(`- Status: ${seededUser.status}`);

  } catch (error) {
    console.error('Error seeding/updating admin user:', error);
    process.exit(1);
  } finally {
    // 3. Close the DB connection pool
    await pool.end();
    console.log('Database connection closed.');
  }
}

resetAdmin();
