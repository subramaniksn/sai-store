const express = require('express');
const pool = require('../db/pool');
const { authenticate, authorize } = require('../middleware/auth');
const createNotification = require("../utils/createNotification");
const logAudit = require("../utils/auditLog");

const router = express.Router();

/* ==========================================
   GET ALL GRNs
========================================== */

router.get('/', authenticate, async (req, res) => {

    try {

        const result = await pool.query(`

            SELECT
                gr.id,
                gr.grn_number,
                gr.received_date,
                gr.invoice_number,
                gr.vehicle_number,
                po.po_number,
                s.supplier_name

            FROM goods_receipts gr

            LEFT JOIN purchase_orders po
                ON po.id = gr.po_id

            LEFT JOIN suppliers s
                ON s.id = gr.supplier_id

            ORDER BY gr.id DESC

        `);

        res.json(result.rows);

    } catch (err) {

        console.log(err);

        res.status(500).json({
            error: 'Unable to load GRN'
        });

    }

});

/* ==========================================
   CREATE GRN
========================================== */

router.post('/', authenticate, authorize('admin', 'store_incharge'), async (req, res) => {

    const {
        po_id,
        supplier_id,
        invoice_number,
        invoice_date,
        vehicle_number,
        dc_number,
        received_date,
        remarks,
        items
    } = req.body;

    if (!po_id || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
            error: 'PO and Items are required'
        });
    }

    const poItemIds = items.map(item => String(item.po_item_id));

    if (new Set(poItemIds).size !== poItemIds.length) {
        return res.status(400).json({
            error: 'The same PO item cannot appear more than once in a GRN.'
        });
    }

    const sortedItems = [...items].sort(
        (a, b) => Number(a.po_item_id) - Number(b.po_item_id)
    );

    const client = await pool.connect();

    try {

        await client.query('BEGIN');

        //----------------------------------------
        // Lock and validate PO pending quantities
        //----------------------------------------

        for (const item of sortedItems) {
            const receivedQty = Number(item.received_qty);

            if (
                !item.po_item_id ||
                !item.material_id ||
                !Number.isFinite(receivedQty) ||
                receivedQty <= 0
            ) {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    error: 'Each GRN item must have a positive received quantity.'
                });
            }

            const poItemResult = await client.query(`
                SELECT
                    id,
                    po_id,
                    material_id,
                    ordered_qty,
                    received_qty
                FROM po_items
                WHERE id = $1
                  AND po_id = $2
                FOR UPDATE
            `, [item.po_item_id, po_id]);

            if (poItemResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    error: 'PO item not found in the selected Purchase Order.'
                });
            }

            const poItem = poItemResult.rows[0];

            if (Number(poItem.material_id) !== Number(item.material_id)) {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    error: 'GRN material does not match the selected PO item.'
                });
            }

            const pendingQty =
                Number(poItem.ordered_qty || 0) -
                Number(poItem.received_qty || 0);

            if (receivedQty > pendingQty) {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    error:
                        `Received quantity exceeds the PO balance. ` +
                        `Pending: ${pendingQty}, Received: ${receivedQty}`
                });
            }
        }

        //----------------------------------------
        // Auto-generate GRN Number
        //----------------------------------------

        const seqResult = await client.query(
            `SELECT nextval('grn_number_seq') AS next_id`
        );
        const nextId = seqResult.rows[0].next_id;
        const grn_number = `GRN-${String(nextId).padStart(5, '0')}`;

        //----------------------------------------
        // Create GRN Header
        //----------------------------------------

        const grnResult = await client.query(

            `INSERT INTO goods_receipts
            (
                grn_number,
                po_id,
                supplier_id,
                invoice_number,
                invoice_date,
                vehicle_number,
                dc_number,
                received_by,
                received_date,
                remarks
            )

            VALUES
            ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)

            RETURNING *`,

            [
                grn_number,
                po_id,
                supplier_id || null,
                invoice_number,
                invoice_date || received_date,
                vehicle_number,
                dc_number,
                req.user.id,
                received_date,
                remarks
            ]

        );

        const grn = grnResult.rows[0];

        //----------------------------------------
        // Save Items
        //----------------------------------------

        for (const item of sortedItems) {

            const accepted_qty = item.received_qty; // no separate rejection step in current UI
            const rejected_qty = item.rejected_qty || 0;

            // Fetch ordered_qty from po_items since frontend doesn't send it
            const poItemResult = await client.query(
                `SELECT ordered_qty, unit_price FROM po_items WHERE id = $1`,
                [item.po_item_id]
            );
            const ordered_qty = poItemResult.rows[0]?.ordered_qty || 0;
            const unitPrice =
                Number(item.unit_price) > 0
                    ? Number(item.unit_price)
                    : Number(poItemResult.rows[0]?.unit_price || 0);

            await client.query(

                `INSERT INTO goods_receipt_items
                (
                    grn_id,
                    material_id,
                    ordered_qty,
                    received_qty,
                    accepted_qty,
                    rejected_qty,
                    unit_price,
                    remarks
                )

                VALUES
                ($1,$2,$3,$4,$5,$6,$7,$8)`,

                [
                    grn.id,
                    item.material_id,
                    ordered_qty,
                    item.received_qty,
                    accepted_qty,
                    rejected_qty,
                    unitPrice,
                    item.remarks || null
                ]

            );

            //----------------------------------------
            // Update PO Received Qty
            //----------------------------------------

            await client.query(

                `UPDATE po_items

                 SET received_qty =
                     COALESCE(received_qty,0)+$1

                 WHERE
                    po_id=$2
                 AND
                    material_id=$3`,

                [
                    accepted_qty,
                    po_id,
                    item.material_id
                ]

            );

            //----------------------------------------
            // Material Transaction
            //----------------------------------------

            await client.query(

                `INSERT INTO material_transactions
                (
                    material_id,
                    txn_type,
                    quantity,
                    po_id,
                    grn_id,
                    entered_by,
                    txn_date,
                    remarks,
                    po_match_status
                )

                VALUES
                ($1,'incoming',$2,$3,$4,$5,$6,$7,$8)`,

                [
                    item.material_id,
                    accepted_qty,
                    po_id,
                    grn.id,
                    req.user.id,
                    received_date,
                    remarks,
                    'matched'
                ]

            );

            //----------------------------------------
            // Update Current Stock
            //----------------------------------------

            await client.query(

                `UPDATE materials
                SET current_stock =
                        COALESCE(current_stock,0) + $1,
                    unit_price =
                        CASE
                            WHEN $3::NUMERIC > 0 THEN $3
                            ELSE COALESCE(unit_price, 0)
                        END
                WHERE id = $2`,

                [
                    accepted_qty,
                    item.material_id,
                    unitPrice
                ]

            );

        }
        //----------------------------------------
        // Update Purchase Order Status
        //----------------------------------------

        const statusResult = await client.query(

            `
            SELECT
                COUNT(*) AS total_items,

                COUNT(*) FILTER
                (
                    WHERE received_qty >= ordered_qty
                ) AS completed_items

            FROM po_items

            WHERE po_id = $1
            `,
            [po_id]

        );

        const total = Number(statusResult.rows[0].total_items);
        const completed = Number(statusResult.rows[0].completed_items);

        let status = "open";

        if (completed === total) {
            status = "closed";
        }
        else if (completed > 0) {
            status = "partial";
        }

        await client.query(

            `UPDATE purchase_orders
            SET status = $1
            WHERE id = $2`,

            [status, po_id]

        );

        await client.query('COMMIT');

        await logAudit({
            user: req.user,
            req,
            action: "CREATE",
            entity_type: "GRN",
            entity_id: grn.id,
            entity_label: grn.grn_number,
            details: {
                grn_number: grn.grn_number,
                po_id,
                supplier_id: supplier_id || null,
                received_date,
                total_items: sortedItems.length,
                total_qty: sortedItems.reduce(
                    (sum, item) => sum + Number(item.received_qty || 0),
                    0
                )
            }
        });

        await createNotification(
            "Material Received",
            `Goods Receipt ${grn_number} has been received successfully.`,
            "success",
            "GRN",
            grn.id
        );

        res.status(201).json(grn);

    }
    catch (err) {

        await client.query('ROLLBACK');

        console.log(err);

        res.status(500).json({
            error: 'Unable to create GRN'
        });

    }
    finally {

        client.release();

    }

});

router.get('/:id', authenticate, async (req, res) => {
    try {
        const grn = await pool.query(`
            SELECT
                gr.*,
                po.po_number,
                s.supplier_name
            FROM goods_receipts gr
            LEFT JOIN purchase_orders po ON po.id = gr.po_id
            LEFT JOIN suppliers s ON s.id = gr.supplier_id
            WHERE gr.id = $1
        `, [req.params.id]);

        if (grn.rows.length === 0) {
            return res.status(404).json({
                error: 'GRN not found'
            });
        }

        const items = await pool.query(`
            SELECT
                gri.*,
                m.item_code,
                m.item_name,
                m.unit
            FROM goods_receipt_items gri
            JOIN materials m ON m.id = gri.material_id
            WHERE gri.grn_id = $1
            ORDER BY m.item_name
        `, [req.params.id]);

        res.json({
            grn: grn.rows[0],
            items: items.rows
        });

    } catch (err) {
        console.log(err);
        res.status(500).json({
            error: 'Unable to load GRN details'
        });
    }
});

/* ==========================================
   EXPORT ROUTER
========================================== */

module.exports = router;
