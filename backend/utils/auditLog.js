const pool = require("../db/pool");

function getUserSnapshot(user = {}) {
    return {
        id: user.id || null,
        name: user.name || user.email || "System",
        role: user.role || null,
        email: user.email || null
    };
}

async function logAudit({
    client,
    user,
    action,
    entity_type,
    entity_id = null,
    entity_label = null,
    details = null,
    req = null
}) {
    try {
        const db = client || pool;
        const userSnapshot = getUserSnapshot(user);

        await db.query(
            `
            INSERT INTO audit_logs
            (
                user_id,
                user_name,
                user_role,
                action,
                entity_type,
                entity_id,
                entity_label,
                details,
                ip_address,
                user_agent
            )
            VALUES
            ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
            `,
            [
                userSnapshot.id,
                userSnapshot.name,
                userSnapshot.role,
                action,
                entity_type,
                entity_id,
                entity_label,
                details ? JSON.stringify(details) : null,
                req?.ip || null,
                req?.headers?.["user-agent"] || null
            ]
        );
    } catch (err) {
        console.warn("Audit log skipped:", err.message);
    }
}

module.exports = logAudit;
