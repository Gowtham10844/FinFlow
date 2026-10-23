const pool = require('../config/db');

async function cleanup() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log('Finding and deduplicating active categories...');

    const dupes = await client.query(`
      SELECT id, name, user_id,
             MIN(id) OVER (PARTITION BY COALESCE(user_id, 0), LOWER(name)) as canonical_id
      FROM categories
      WHERE status = 'active'
    `);

    let deduplicatedCount = 0;
    for (const row of dupes.rows) {
      if (row.id !== row.canonical_id) {
        console.log(`Migrating duplicate category ID ${row.id} ('${row.name}') -> canonical ID ${row.canonical_id}`);
        // 1. Update transactions to canonical category ID
        await client.query('UPDATE transactions SET category_id = $1 WHERE category_id = $2', [row.canonical_id, row.id]);
        
        // 2. Handle budgets: delete duplicate budgets that would conflict with an existing budget for canonical_id
        await client.query(`
          DELETE FROM budgets b1
          WHERE b1.category_id = $2
            AND EXISTS (
              SELECT 1 FROM budgets b2 
              WHERE b2.user_id = b1.user_id 
                AND b2.category_id = $1 
                AND b2.month = b1.month 
                AND b2.year = b1.year
            )
        `, [row.canonical_id, row.id]);

        // 3. Update remaining budgets to canonical category ID
        await client.query('UPDATE budgets SET category_id = $1 WHERE category_id = $2', [row.canonical_id, row.id]);

        // 4. Delete duplicate category
        await client.query('DELETE FROM categories WHERE id = $1', [row.id]);
        deduplicatedCount++;
      }
    }

    console.log(`Deduplicated ${deduplicatedCount} category records.`);

    console.log('Ensuring unique index idx_cat_unique_user_name exists...');
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_cat_unique_user_name 
      ON categories (COALESCE(user_id, 0), LOWER(name)) 
      WHERE status = 'active'
    `);

    await client.query('COMMIT');
    console.log('Category cleanup completed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Cleanup failed:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    pool.end();
  }
}

cleanup();
