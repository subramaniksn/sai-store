const express = require("express");
const pool = require("../db/pool");
const { authenticate, authorize } = require("../middleware/auth");
const logAudit = require("../utils/auditLog");

const router = express.Router();

/* ==========================================
   GET NEXT INTERNAL USE NUMBER
========================================== */

router.get("/next-number", authenticate, async (req, res) => {

    try {

        const result = await pool.query(`
            SELECT COUNT(*) + 1 AS next_no
            FROM internal_use
        `);

        const number =
            "IU-" +
            String(result.rows[0].next_no).padStart(5, "0");

        res.json({
            internal_use_number: number
        });

    }
    catch (err) {

        console.log(err);

        res.status(500).json({
            error: "Unable to generate Internal Use Number."
        });

    }

});

/* ==========================================
   GET MATERIALS
========================================== */

router.get("/materials", authenticate, async (req, res) => {
    const { include_inactive } = req.query;

    try {

        const result = await pool.query(`
            SELECT
                id,
                item_code,
                item_name,
                unit,
                current_stock,
                is_active
            FROM materials
            WHERE ($1::BOOLEAN = TRUE OR COALESCE(is_active, TRUE) = TRUE)
            ORDER BY item_name
        `, [include_inactive === 'true']);

        res.json(result.rows);

    }
    catch (err) {

        console.log(err);

        res.status(500).json({
            error: "Unable to load materials."
        });

    }

});

/* ==========================================
   SAVE INTERNAL USE
========================================== */

router.post(
    "/",
    authenticate,
    authorize("admin", "store_incharge"),
    async (req, res) => {

        const {
            internal_use_number,
            use_date,
            department,
            used_by,
            purpose,
            remarks,
            items
        } = req.body;

        if (!items || items.length === 0) {

            return res.status(400).json({
                error: "No materials selected."
            });

        }

        const materialIds = items.map(item => String(item.material_id));

        if (new Set(materialIds).size !== materialIds.length) {
            return res.status(400).json({
                error: "The same material cannot appear more than once in internal use."
            });
        }

        const sortedItems = [...items].sort(
            (a, b) => Number(a.material_id) - Number(b.material_id)
        );

        const client = await pool.connect();

        try {

            await client.query("BEGIN");

            //--------------------------------------
            // Backend Stock Validation
            //--------------------------------------

            for (const item of sortedItems) {
                const usedQty = Number(item.used_qty);

                if (
                    !item.material_id ||
                    !Number.isFinite(usedQty) ||
                    usedQty <= 0
                ) {
                    await client.query("ROLLBACK");
                    return res.status(400).json({
                        error: "Each internal use item must have a positive quantity."
                    });
                }

                const stockCheck = await client.query(`
                    SELECT
                        item_code,
                        item_name,
                        current_stock,
                        is_active
                    FROM materials
                    WHERE id = $1
                    FOR UPDATE
                `, [item.material_id]);

                if (stockCheck.rows.length === 0) {
                    throw new Error("Material not found.");
                }

                const material = stockCheck.rows[0];

                if (material.is_active === false) {
                    await client.query("ROLLBACK");
                    return res.status(400).json({
                        error:
                            `${material.item_code} - ${material.item_name} is inactive. ` +
                            `Please reactivate it in Material Master before using.`
                    });
                }

                if (usedQty > Number(material.current_stock)) {
                    await client.query("ROLLBACK");
                    return res.status(400).json({
                        error:
                            `Insufficient stock for ${material.item_code} - ${material.item_name}. ` +
                            `Available: ${material.current_stock}, Requested: ${usedQty}`
                    });
                }
            }

            //--------------------------------------
            // Save Header
            //--------------------------------------

            const headerResult = await client.query(

                `
                INSERT INTO internal_use
                (
                    internal_use_number,
                    use_date,
                    department,
                    used_by,
                    purpose,
                    remarks,
                    created_by
                )

                VALUES
                (
                    $1,
                    $2,
                    $3,
                    $4,
                    $5,
                    $6,
                    $7
                )

                RETURNING *
                `,

                [
                    internal_use_number,
                    use_date,
                    department,
                    used_by,
                    purpose,
                    remarks,
                    req.user.id
                ]

            );

            const internalUse = headerResult.rows[0];
            //--------------------------------------
            // Save Internal Use Items
            //--------------------------------------

            for (const item of sortedItems) {

                if (!item.material_id || !item.used_qty)
                    continue;

                await client.query(

                    `
                    INSERT INTO internal_use_items
                    (
                        internal_use_id,
                        material_id,
                        used_qty,
                        remarks
                    )

                    VALUES
                    (
                        $1,
                        $2,
                        $3,
                        $4
                    )
                    `,

                    [
                        internalUse.id,
                        item.material_id,
                        item.used_qty,
                        item.remarks || null
                    ]

                );

            }
            //--------------------------------------
            // Deduct Stock
            //--------------------------------------

            for (const item of sortedItems) {

                if (!item.material_id || !item.used_qty)
                    continue;

                await client.query(

                    `
                    UPDATE materials

                    SET current_stock =
                        COALESCE(current_stock,0) - $1

                    WHERE id = $2
                    `,

                    [
                        item.used_qty,
                        item.material_id
                    ]

                );

            }
            //--------------------------------------
            // Material Transactions
            //--------------------------------------

            for (const item of sortedItems) {

                if (!item.material_id || !item.used_qty)
                    continue;

                await client.query(

                    `
                    INSERT INTO material_transactions
                    (
                        material_id,
                        txn_type,
                        quantity,
                        used_by_dept,
                        used_for,
                        remarks,
                        entered_by,
                        txn_date
                    )

                    VALUES
                    (
                        $1,
                        'internal_use',
                        $2,
                        $3,
                        $4,
                        $5,
                        $6,
                        $7
                    )
                    `,

                    [
                        item.material_id,
                        item.used_qty,
                        department,
                        purpose || used_by,
                        remarks,
                        req.user.id,
                        use_date
                    ]

                );

            }
            //--------------------------------------
            // Commit
            //--------------------------------------

            await client.query("COMMIT");

            await logAudit({
                user: req.user,
                req,
                action: "CREATE",
                entity_type: "INTERNAL_USE",
                entity_id: internalUse.id,
                entity_label: internalUse.internal_use_number,
                details: {
                    internal_use_number: internalUse.internal_use_number,
                    use_date,
                    department,
                    used_by,
                    total_items: sortedItems.length,
                    total_qty: sortedItems.reduce(
                        (sum, item) => sum + Number(item.used_qty || 0),
                        0
                    )
                }
            });

            res.json({

                message: "Internal Use Saved Successfully"

            });
                    }
        catch (err) {

            await client.query("ROLLBACK");

            console.log(err);

            res.status(500).json({

                error: "Unable to save Internal Use."

            });

        }
        finally {

            client.release();

        }

    }

);
module.exports = router;
