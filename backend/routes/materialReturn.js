const express = require("express");
const pool = require("../db/pool");
const { authenticate, authorize } = require("../middleware/auth");
const createNotification = require("../utils/createNotification");
const logAudit = require("../utils/auditLog");

const router = express.Router();

/* ==========================================
   GET NEXT RETURN NUMBER
========================================== */
router.get("/next-number", authenticate, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                last_value + CASE WHEN is_called THEN 1 ELSE 0 END AS next_no
            FROM material_return_number_seq
        `);

        const returnNumber =
            "RET-" + String(result.rows[0].next_no).padStart(5, "0");

        res.json({
            return_number: returnNumber
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({
            error: "Unable to generate Return Number."
        });
    }
});

/* ==========================================
   GET MATERIAL ISSUES LIST
========================================== */
router.get("/issues", authenticate, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                mi.id,
                mi.issue_number,
                mi.issue_date,
                mi.project_name,
                mi.issued_to
            FROM material_issues mi
            ORDER BY mi.id DESC
        `);

        res.json(result.rows);
    } catch (err) {
        console.log(err);
        res.status(500).json({
            error: "Unable to load Material Issues."
        });
    }
});

/* ==========================================
   GET ISSUE DETAILS WITH ITEMS
========================================== */
router.get("/issue/:id", authenticate, async (req, res) => {
    try {
        const issueResult = await pool.query(`
            SELECT *
            FROM material_issues
            WHERE id = $1
        `, [req.params.id]);

        if (issueResult.rows.length === 0) {
            return res.status(404).json({
                error: "Material Issue not found"
            });
        }

        const itemsResult = await pool.query(`
            SELECT
                mii.id,
                mii.material_id,
                mii.issued_qty,
                COALESCE((
                    SELECT SUM(mri.returned_qty)
                    FROM material_return_items mri
                    JOIN material_returns mr
                        ON mr.id = mri.return_id
                    WHERE mr.issue_id = mii.issue_id
                      AND mri.material_id = mii.material_id
                ), 0) AS already_returned_qty,
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
            error: "Unable to load Material Issue details."
        });
    }
});

/* ==========================================
   SAVE MATERIAL RETURN
========================================== */
router.post(
    "/",
    authenticate,
    authorize("admin", "store_incharge"),
    async (req, res) => {
        const {
            issue_id,
            return_date,
            returned_by,
            remarks,
            items
        } = req.body;

        if (!issue_id || !items || items.length === 0) {
            return res.status(400).json({
                error: "Issue and return items are required."
            });
        }

        const materialIds = items.map(item => String(item.material_id));

        if (new Set(materialIds).size !== materialIds.length) {
            return res.status(400).json({
                error: "The same material cannot appear more than once in a return."
            });
        }

        const sortedItems = [...items].sort(
            (a, b) => Number(a.material_id) - Number(b.material_id)
        );

        const client = await pool.connect();

        try {
            await client.query("BEGIN");

            //--------------------------------------
            // Validate return qty
            //--------------------------------------
            for (const item of sortedItems) {
                const returnedQty = Number(item.returned_qty);

                if (
                    !item.material_id ||
                    !Number.isFinite(returnedQty) ||
                    returnedQty <= 0
                ) {
                    await client.query("ROLLBACK");
                    return res.status(400).json({
                        error: "Each return item must have a positive return quantity."
                    });
                }

                const checkResult = await client.query(`
                    SELECT
                        mii.id,
                        mii.issued_qty
                    FROM material_issue_items mii
                    WHERE mii.issue_id = $1
                      AND mii.material_id = $2
                    ORDER BY mii.id
                    FOR UPDATE OF mii
                `, [issue_id, item.material_id]);

                if (checkResult.rows.length === 0) {
                    throw new Error("Material not found in selected issue.");
                }

                const issuedQty = checkResult.rows.reduce(
                    (sum, row) => sum + Number(row.issued_qty || 0),
                    0
                );

                const returnedResult = await client.query(`
                    SELECT COALESCE(SUM(mri.returned_qty), 0) AS already_returned_qty
                    FROM material_return_items mri
                    JOIN material_returns mr
                        ON mr.id = mri.return_id
                    WHERE mr.issue_id = $1
                      AND mri.material_id = $2
                `, [issue_id, item.material_id]);

                const alreadyReturned = Number(
                    returnedResult.rows[0].already_returned_qty || 0
                );
                const balanceReturnable = issuedQty - alreadyReturned;

                if (returnedQty > balanceReturnable) {
                    await client.query("ROLLBACK");
                    return res.status(400).json({
                        error: `Return qty exceeds balance for material ID ${item.material_id}. Returnable qty: ${balanceReturnable}`
                    });
                }
            }

            //--------------------------------------
            // Save Return Header
            //--------------------------------------
            const numberResult = await client.query(`
                SELECT nextval('material_return_number_seq') AS next_no
            `);

            const returnNumber =
                "RET-" + String(numberResult.rows[0].next_no).padStart(5, "0");

            const returnResult = await client.query(`
                INSERT INTO material_returns
                (
                    return_number,
                    issue_id,
                    return_date,
                    returned_by,
                    received_by,
                    remarks
                )
                VALUES
                ($1,$2,$3,$4,$5,$6)
                RETURNING *
            `, [
                returnNumber,
                issue_id,
                return_date,
                returned_by,
                req.user.id,
                remarks
            ]);

            const materialReturn = returnResult.rows[0];

            //--------------------------------------
            // Save Return Items + Add Stock + Transaction
            //--------------------------------------
            for (const item of sortedItems) {
                if (!item.material_id || !item.returned_qty) continue;

                await client.query(`
                    INSERT INTO material_return_items
                    (
                        return_id,
                        material_id,
                        returned_qty,
                        remarks
                    )
                    VALUES
                    ($1,$2,$3,$4)
                `, [
                    materialReturn.id,
                    item.material_id,
                    item.returned_qty,
                    item.remarks || null
                ]);

                // Add stock back
                await client.query(`
                    UPDATE materials
                    SET current_stock = COALESCE(current_stock,0) + $1
                    WHERE id = $2
                `, [
                    item.returned_qty,
                    item.material_id
                ]);

                // Transaction
                await client.query(`
                    INSERT INTO material_transactions
                    (
                        material_id,
                        txn_type,
                        quantity,
                        issued_to,
                        purpose,
                        issue_id,
                        return_id,
                        remarks,
                        entered_by,
                        txn_date
                    )
                    VALUES
                    (
                        $1,
                        'return',
                        $2,
                        $3,
                        'Material Return',
                        $4,
                        $5,
                        $6,
                        $7,
                        $8
                    )
                `, [
                    item.material_id,
                    item.returned_qty,
                    returned_by,
                    issue_id,
                    materialReturn.id,
                    remarks,
                    req.user.id,
                    return_date
                ]);
            }

            await client.query("COMMIT");

            await logAudit({
                user: req.user,
                req,
                action: "CREATE",
                entity_type: "MATERIAL_RETURN",
                entity_id: materialReturn.id,
                entity_label: materialReturn.return_number,
                details: {
                    return_number: materialReturn.return_number,
                    issue_id,
                    return_date,
                    returned_by,
                    total_items: sortedItems.length,
                    total_qty: sortedItems.reduce(
                        (sum, item) => sum + Number(item.returned_qty || 0),
                        0
                    )
                }
            });

            await createNotification(
                "Material Returned",
                `Material Return ${returnNumber} has been created successfully.`,
                "success",
                "RETURN",
                materialReturn.id
            );

            res.status(201).json({
                message: "Material Return saved successfully",
                return: materialReturn
            });

        } catch (err) {
            await client.query("ROLLBACK");
            console.log(err);
            res.status(500).json({
                error: err.message || "Unable to save Material Return"
            });
        } finally {
            client.release();
        }
    }
);

/* ==========================================
   GET ALL MATERIAL RETURNS
========================================== */

router.get("/", authenticate, async (req, res) => {

    try {

        const result = await pool.query(`
            SELECT
                mr.id,
                mr.return_number,
                mr.return_date,
                mr.returned_by,
                mr.created_at,
                mi.issue_number,
                COUNT(mri.id) AS total_items,
                COALESCE(SUM(mri.returned_qty),0) AS total_qty
            FROM material_returns mr
            LEFT JOIN material_issues mi
                ON mi.id = mr.issue_id
            LEFT JOIN material_return_items mri
                ON mri.return_id = mr.id
            GROUP BY
                mr.id,
                mi.issue_number
            ORDER BY mr.id DESC
        `);

        res.json(result.rows);

    } catch (err) {

        console.log(err);

        res.status(500).json({
            error: "Unable to load Material Returns"
        });

    }

});

/* ==========================================
   GET MATERIAL RETURN DETAILS
========================================== */

router.get("/:id", authenticate, async (req, res) => {

    try {

        const returnResult = await pool.query(`
            SELECT
                mr.*,
                mi.issue_number,
                mi.project_name,
                mi.issued_to,
                u.name AS received_by_name
            FROM material_returns mr
            LEFT JOIN material_issues mi
                ON mi.id = mr.issue_id
            LEFT JOIN users u
                ON u.id = mr.received_by
            WHERE mr.id = $1
        `, [req.params.id]);

        if (returnResult.rows.length === 0) {
            return res.status(404).json({
                error: "Material Return not found"
            });
        }

        const itemsResult = await pool.query(`
            SELECT
                mri.*,
                m.item_code,
                m.item_name,
                m.unit
            FROM material_return_items mri
            JOIN materials m
                ON m.id = mri.material_id
            WHERE mri.return_id = $1
            ORDER BY m.item_name
        `, [req.params.id]);

        res.json({
            return: returnResult.rows[0],
            items: itemsResult.rows
        });

    } catch (err) {

        console.log(err);

        res.status(500).json({
            error: "Unable to load Material Return details"
        });

    }

});

module.exports = router;
