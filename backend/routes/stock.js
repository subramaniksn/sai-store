const express = require("express");
const pool = require("../db/pool");
const { authenticate, authorize } = require("../middleware/auth");
const logAudit = require("../utils/auditLog");

const router = express.Router();

/* ==========================================================
   STOCK RECONCILIATION
========================================================== */

router.get(
    "/reconciliation",
    authenticate,
    authorize("admin"),
    async (req, res) => {
        try {
            const result = await pool.query(`
                SELECT
                    m.id,
                    m.item_code,
                    m.item_name,
                    m.unit,
                    COALESCE(m.current_stock, 0) AS stored_stock,
                    COALESCE(SUM(
                        CASE
                            WHEN mt.txn_type IN ('incoming', 'return')
                                THEN mt.quantity
                            WHEN mt.txn_type IN ('outgoing', 'internal_use')
                                THEN -mt.quantity
                            ELSE 0
                        END
                    ), 0) AS calculated_stock
                FROM materials m
                LEFT JOIN material_transactions mt
                    ON mt.material_id = m.id
                GROUP BY
                    m.id,
                    m.item_code,
                    m.item_name,
                    m.unit,
                    m.current_stock
                ORDER BY m.item_name
            `);

            const discrepancies = result.rows
                .map(row => ({
                    ...row,
                    difference:
                        Number(row.calculated_stock) -
                        Number(row.stored_stock)
                }))
                .filter(row => Math.abs(row.difference) > 0.000001);

            res.json({
                checked_at: new Date().toISOString(),
                total_materials: result.rows.length,
                discrepancies
            });
        } catch (err) {
            console.log(err);
            res.status(500).json({
                error: "Unable to reconcile stock."
            });
        }
    }
);

router.post(
    "/reconciliation/repair",
    authenticate,
    authorize("admin"),
    async (req, res) => {
        const materialIds = Array.isArray(req.body.material_ids)
            ? [...new Set(
                req.body.material_ids
                    .map(Number)
                    .filter(Number.isInteger)
            )]
            : [];

        if (materialIds.length === 0) {
            return res.status(400).json({
                error: "At least one valid material is required."
            });
        }

        const client = await pool.connect();

        try {
            await client.query("BEGIN");

            await client.query(`
                SELECT id
                FROM materials
                WHERE id = ANY($1::INTEGER[])
                ORDER BY id
                FOR UPDATE
            `, [materialIds]);

            const result = await client.query(`
                WITH calculated AS (
                    SELECT
                        m.id,
                        COALESCE(SUM(
                            CASE
                                WHEN mt.txn_type IN ('incoming', 'return')
                                    THEN mt.quantity
                                WHEN mt.txn_type IN ('outgoing', 'internal_use')
                                    THEN -mt.quantity
                                ELSE 0
                            END
                        ), 0) AS calculated_stock
                    FROM materials m
                    LEFT JOIN material_transactions mt
                        ON mt.material_id = m.id
                    WHERE m.id = ANY($1::INTEGER[])
                    GROUP BY m.id
                )
                UPDATE materials m
                SET current_stock = calculated.calculated_stock
                FROM calculated
                WHERE m.id = calculated.id
                  AND COALESCE(m.current_stock, 0)
                      IS DISTINCT FROM calculated.calculated_stock
                RETURNING
                    m.id,
                    m.item_code,
                    m.item_name,
                    m.current_stock
            `, [materialIds]);

            await client.query("COMMIT");

            await logAudit({
                user: req.user,
                req,
                action: "REPAIR",
                entity_type: "STOCK_RECONCILIATION",
                entity_label: "Stock reconciliation repair",
                details: {
                    requested_material_ids: materialIds,
                    repaired_count: result.rows.length,
                    repaired_materials: result.rows
                }
            });

            res.json({
                message: "Stock reconciliation completed.",
                repaired_count: result.rows.length,
                repaired_materials: result.rows
            });
        } catch (err) {
            await client.query("ROLLBACK");
            console.log(err);
            res.status(500).json({
                error: "Unable to repair stock."
            });
        } finally {
            client.release();
        }
    }
);

/* ==========================================================
   GET STOCK REGISTER
========================================================== */

router.get("/", authenticate, async (req, res) => {

    const { search, category, status } = req.query;

    let query = `
        SELECT
            id,
            item_code,
            item_name,
            category,
            brand,
            unit,
            current_stock,
            minimum_stock,
            rack_location,
            COALESCE(
                latest_receipt.unit_price,
                latest_order.unit_price,
                materials.unit_price,
                0
            ) AS last_purchase_price
        FROM materials
        LEFT JOIN LATERAL (
            SELECT gri.unit_price
            FROM goods_receipt_items gri
            JOIN goods_receipts gr
                ON gr.id = gri.grn_id
            WHERE gri.material_id = materials.id
              AND gri.unit_price > 0
            ORDER BY
                gr.received_date DESC,
                gr.id DESC,
                gri.id DESC
            LIMIT 1
        ) latest_receipt ON TRUE
        LEFT JOIN LATERAL (
            SELECT pi.unit_price
            FROM po_items pi
            JOIN purchase_orders po
                ON po.id = pi.po_id
            WHERE pi.material_id = materials.id
              AND pi.unit_price > 0
            ORDER BY
                po.po_date DESC,
                po.id DESC,
                pi.id DESC
            LIMIT 1
        ) latest_order ON TRUE
        WHERE 1 = 1
    `;

    const params = [];
    let index = 1;

    // Search
    if (search) {

        query += `
            AND (
                item_code ILIKE $${index}
                OR item_name ILIKE $${index}
                OR category ILIKE $${index}
                OR brand ILIKE $${index}
            )
        `;

        params.push(`%${search}%`);
        index++;

    }

    // Category
    if (category) {

        query += ` AND category = $${index}`;
        params.push(category);
        index++;

    }

    // Stock Status
    if (status === "low") {

        query += `
            AND current_stock <= minimum_stock
            AND current_stock > 0
        `;

    }

    if (status === "out") {

        query += `
            AND current_stock <= 0
        `;

    }

    if (status === "normal") {

        query += `
            AND current_stock > minimum_stock
        `;

    }

    query += `
        ORDER BY item_name
    `;

    try {

        const result = await pool.query(query, params);

        res.json(result.rows);

    }
    catch (err) {

        console.log(err);

        res.status(500).json({
            error: "Unable to load Stock Register"
        });

    }

});

module.exports = router;
