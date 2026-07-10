const express = require('express');
const pool = require('../db/pool');
const { authenticate, authorize } = require('../middleware/auth');
const createNotification = require("../utils/createNotification");
const logAudit = require("../utils/auditLog");

const router = express.Router();

/* ==========================================
   GET NEXT ISSUE NUMBER
========================================== */

router.get('/next-number', authenticate, async (req, res) => {

    try {

        const result = await pool.query(`
            SELECT
                last_value + CASE WHEN is_called THEN 1 ELSE 0 END AS next_no
            FROM material_issue_number_seq
        `);

        const issueNumber = "ISS-" +
            String(result.rows[0].next_no).padStart(5, "0");

        res.json({
            issue_number: issueNumber
        });

    }
    catch (err) {

        console.log(err);

        res.status(500).json({
            error: "Unable to generate Issue Number."
        });

    }

});

/* ==========================================
   GET ALL MATERIALS
========================================== */

router.get('/materials', authenticate, async (req, res) => {
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
   SAVE MATERIAL ISSUE
========================================== */

router.post(
    '/',
    authenticate,
    authorize('admin', 'store_incharge'),
    async (req, res) => {

        const {
            issue_date,
            project_name,
            issued_to,
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
                error: "The same material cannot appear more than once in an issue."
            });
        }

        const sortedItems = [...items].sort(
            (a, b) => Number(a.material_id) - Number(b.material_id)
        );

        const client = await pool.connect();
        const stockNotifications = [];

        try {

            await client.query("BEGIN");

            //--------------------------------------
            // Backend Stock Validation
            //--------------------------------------

            for (const item of sortedItems) {

                const issueQty = Number(item.issue_qty);

                if (
                    !item.material_id ||
                    !Number.isFinite(issueQty) ||
                    issueQty <= 0
                ) {
                    await client.query("ROLLBACK");
                    return res.status(400).json({
                        error: "Each issue item must have a positive quantity."
                    });
                }

                const stockCheck = await client.query(
                    `
                    SELECT
                        item_code,
                        item_name,
                        current_stock,
                        is_active
                    FROM materials
                    WHERE id = $1
                    FOR UPDATE
                    `,
                    [item.material_id]
                );

                if (stockCheck.rows.length === 0) {
                    throw new Error("Material not found.");
                }

                const material = stockCheck.rows[0];

                if (material.is_active === false) {
                    await client.query("ROLLBACK");

                    return res.status(400).json({
                        error:
                            `${material.item_code} - ${material.item_name} is inactive. ` +
                            `Please reactivate it in Material Master before issuing.`
                    });
                }

                if (issueQty > Number(material.current_stock)) {
                    await client.query("ROLLBACK");

                    return res.status(400).json({
                        error:
                            `Insufficient stock for ${material.item_code} - ${material.item_name}. ` +
                            `Available: ${material.current_stock}, Requested: ${issueQty}`
                    });
                }

            }

            //--------------------------------------
            // Save Issue Header
            //--------------------------------------

            const numberResult = await client.query(`
                SELECT nextval('material_issue_number_seq') AS next_no
            `);

            const issueNumber = "ISS-" +
                String(numberResult.rows[0].next_no).padStart(5, "0");

            const issueResult = await client.query(

                `
                INSERT INTO material_issues
                (
                    issue_number,
                    issue_date,
                    project_name,
                    issued_to,
                    issued_by,
                    remarks
                )

                VALUES
                (
                    $1,
                    $2,
                    $3,
                    $4,
                    $5,
                    $6
                )

                RETURNING *
                `,

                [
                    issueNumber,
                    issue_date,
                    project_name,
                    issued_to,
                    req.user.id,
                    remarks
                ]

            );

            const issue = issueResult.rows[0];

            //--------------------------------------
            // Save Issue Items
            //--------------------------------------

            for (const item of sortedItems) {

                if (!item.material_id || !item.issue_qty)
                    continue;

                await client.query(

                    `
                    INSERT INTO material_issue_items
                    (
                        issue_id,
                        material_id,
                        issued_qty,
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
                        issue.id,
                        item.material_id,
                        item.issue_qty,
                        item.remarks || null
                    ]

                );

            }

            //--------------------------------------
            // Deduct Stock
            //--------------------------------------

            for (const item of sortedItems) {

                if (!item.material_id || !item.issue_qty)
                    continue;

                await client.query(

                    `
                    UPDATE materials
                    SET current_stock =
                        COALESCE(current_stock,0) - $1
                    WHERE id = $2
                    `,

                    [
                        item.issue_qty,
                        item.material_id
                    ]

                );

                //--------------------------------------
                // Check Stock Status
                //--------------------------------------

                const stockResult = await client.query(
                    `
                    SELECT
                        item_name,
                        current_stock,
                        minimum_stock
                    FROM materials
                    WHERE id = $1
                    `,
                    [item.material_id]
                );

                const material = stockResult.rows[0];

                if (Number(material.current_stock) === 0) {

                    stockNotifications.push({
                        title: "Out Of Stock",
                        message: `${material.item_name} is now out of stock.`,
                        type: "danger",
                        referenceType: "STOCK",
                        referenceId: item.material_id
                    });

                }
                else if (
                    Number(material.current_stock) <=
                    Number(material.minimum_stock)
                ) {

                    stockNotifications.push({
                        title: "Low Stock",
                        message: `${material.item_name} has reached low stock level.`,
                        type: "warning",
                        referenceType: "STOCK",
                        referenceId: item.material_id
                    });

                }

            }
            //--------------------------------------
            // Material Transaction
            //--------------------------------------

            for (const item of sortedItems) {

                if (!item.material_id || !item.issue_qty)
                    continue;

                await client.query(

                    `
                    INSERT INTO material_transactions
                    (
                        material_id,
                        txn_type,
                        quantity,
                        issued_to,
                        purpose,
                        issue_id,
                        remarks,
                        entered_by,
                        txn_date
                    )

                    VALUES
                    (
                        $1,
                        'outgoing',
                        $2,
                        $3,
                        $4,
                        $5,
                        $6,
                        $7,
                        $8
                    )
                    `,

                    [
                        item.material_id,
                        item.issue_qty,
                        issued_to,
                        project_name,
                        issue.id,
                        remarks,
                        req.user.id,
                        issue_date
                    ]

                );

            }

            await client.query("COMMIT");

            await logAudit({
                user: req.user,
                req,
                action: "CREATE",
                entity_type: "MATERIAL_ISSUE",
                entity_id: issue.id,
                entity_label: issue.issue_number,
                details: {
                    issue_number: issue.issue_number,
                    issue_date,
                    project_name,
                    issued_to,
                    total_items: sortedItems.length,
                    total_qty: sortedItems.reduce(
                        (sum, item) => sum + Number(item.issue_qty || 0),
                        0
                    )
                }
            });

            for (const notification of stockNotifications) {
                await createNotification(
                    notification.title,
                    notification.message,
                    notification.type,
                    notification.referenceType,
                    notification.referenceId
                );
            }

            await createNotification(
                "Material Issued",
                `Material Issue ${issueNumber} has been created successfully.`,
                "info",
                "ISSUE",
                issue.id
            );

            res.json({
                message: "Material Issued Successfully",
                issue
            });

        }
        catch (err) {

            await client.query("ROLLBACK");

            console.log(err);

            res.status(500).json({
                error: "Unable to save Material Issue"
            });

        }
        finally {

            client.release();

        }

    }
);

/* ==========================================
   GET MATERIAL ISSUE DETAILS
========================================== */

router.get("/:id", authenticate, async (req, res) => {

    try {

        const issueResult = await pool.query(`
            SELECT
                mi.*,
                u.name AS issued_by_name
            FROM material_issues mi
            LEFT JOIN users u
                ON u.id = mi.issued_by
            WHERE mi.id = $1
        `, [req.params.id]);

        if (issueResult.rows.length === 0) {
            return res.status(404).json({
                error: "Material Issue not found"
            });
        }

        const itemsResult = await pool.query(`
            SELECT
                mii.*,
                m.item_code,
                m.item_name,
                m.unit
            FROM material_issue_items mii
            JOIN materials m
                ON m.id = mii.material_id
            WHERE mii.issue_id = $1
            ORDER BY m.item_name
        `, [req.params.id]);

        res.json({
            issue: issueResult.rows[0],
            items: itemsResult.rows
        });

    } catch (err) {

        console.log(err);

        res.status(500).json({
            error: "Unable to load Material Issue details"
        });

    }

});

module.exports = router;
