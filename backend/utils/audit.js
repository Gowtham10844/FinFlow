const pool = require('../config/db');

// Writes one append-only row to audit_logs. Never call UPDATE/DELETE on this table.
async function writeAudit({ actorId, actorName, actorRole, action, targetTable, targetId, detail, ip }) {
  await pool.query(
    `INSERT INTO audit_logs
      (actor_id, actor_name, actor_role, action, target_table, target_id, detail, ip_address)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [actorId, actorName, actorRole, action, targetTable, targetId, detail, ip]
  );
}

module.exports = { writeAudit };
