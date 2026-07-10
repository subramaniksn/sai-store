const express = require("express");
const pool = require("../db/pool");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

router.get("/", authenticate, authorize("admin"), async (req, res) => {
    const {
        from_date,
        to_date,
        action,
        entity_type,
        user,
        search
    } = req.query;

    const conditions = [];
    const params = [];
    let index = 1;

    if (from_date) {
        conditions.push(`created_at::DATE >= $${index}`);
        params.push(from_date);
        index++;
    }

    if (to_date) {
        conditions.push(`created_at::DATE <= $${index}`);
        params.push(to_date);
        index++;
    }

    if (action) {
        conditions.push(`action = $${index}`);
        params.push(action);
        index++;
    }

    if (entity_type) {
        conditions.push(`entity_type = $${index}`);
        params.push(entity_type);
        index++;
    }

    if (user) {
        conditions.push(`user_name ILIKE $${index}`);
        params.push(`%${user}%`);
        index++;
    }

    if (search) {
        conditions.push(`
            (
                entity_label ILIKE $${index}
                OR action ILIKE $${index}
                OR entity_type ILIKE $${index}
                OR user_name ILIKE $${index}
            )
        `);
        params.push(`%${search}%`);
        index++;
    }

    const whereClause = conditions.length
        ? `WHERE ${conditions.join(" AND ")}`
        : "";

    try {
        const result = await pool.query(
            `
            SELECT
                id,
                user_id,
                user_name,
                user_role,
                action,
                entity_type,
                entity_id,
                entity_label,
                details,
                ip_address,
                created_at
            FROM audit_logs
            ${whereClause}
            ORDER BY created_at DESC, id DESC
            LIMIT 500
            `,
            params
        );

        res.json(result.rows);
    } catch (err) {
        console.log(err);
        res.status(500).json({
            error: "Unable to load Audit Log."
        });
    }
});

module.exports = router;
