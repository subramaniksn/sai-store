const express = require('express');
const pool = require('../db/pool');
const { authenticate, authorize } = require('../middleware/auth');
const createNotification = require("../utils/createNotification");
const logAudit = require("../utils/auditLog");

const router = express.Router();

function formatPoNumber(number) {
    return `SAI/2627/${String(number).padStart(4, '0')}`;
}

/* ==========================================================
   GET NEXT PURCHASE ORDER NUMBER
========================================================== */

router.get('/next-number', authenticate, authorize('admin', 'manager'), async (req, res) => {

    try {

        const result = await pool.query(`
            SELECT
                last_value + CASE WHEN is_called THEN 1 ELSE 0 END AS next_no
            FROM purchase_order_number_seq
        `);

        res.json({
            po_number: formatPoNumber(result.rows[0].next_no)
        });

    } catch (err) {

        console.log(err);

        res.status(500).json({
            error: 'Unable to generate Purchase Order number.'
        });

    }

});

/* ==========================================================
   CREATE PURCHASE ORDER
========================================================== */

router.post('/', authenticate, authorize('admin', 'manager'), async (req, res) => {

    const {
        supplier_id,
        po_date,
        expected_delivery_date,
        project_name,
        vendor_code,
        project_code,
        ref_no,
        remarks,
        subtotal,
        gst_percent,
        freight,
        grand_total,
        items
    } = req.body;

    if (!supplier_id || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
            error: 'Supplier and at least one material are required.'
        });
    }

    const client = await pool.connect();

    try {

        await client.query('BEGIN');

        const numberResult = await client.query(`
            SELECT nextval('purchase_order_number_seq') AS next_no
        `);

        const po_number = formatPoNumber(numberResult.rows[0].next_no);

        const supplierResult = await client.query(
            `
            SELECT supplier_name, is_active
            FROM suppliers
            WHERE id = $1
            `,
            [supplier_id]
        );

        if (supplierResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                error: 'Supplier not found.'
            });
        }

        if (supplierResult.rows[0].is_active === false) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                error: 'Selected supplier is inactive. Please reactivate it before creating a Purchase Order.'
            });
        }

        const materialIds = [
            ...new Set(
                items
                    .map(item => Number(item.material_id))
                    .filter(Number.isInteger)
            )
        ];

        const materialResult = await client.query(
            `
            SELECT id, item_code, item_name, is_active
            FROM materials
            WHERE id = ANY($1::INTEGER[])
            `,
            [materialIds]
        );

        const inactiveMaterial = materialResult.rows.find(
            material => material.is_active === false
        );

        if (inactiveMaterial) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                error:
                    `${inactiveMaterial.item_code} - ${inactiveMaterial.item_name} is inactive. ` +
                    `Please reactivate it before creating a Purchase Order.`
            });
        }

        const poResult = await client.query(

            `INSERT INTO purchase_orders
            (
                po_number,
                supplier_id,
                po_date,
                expected_delivery_date,
                project_name,
                vendor_code,
                project_code,
                ref_no,
                created_by,
                remarks,
                subtotal,
                gst_percent,
                freight,
                grand_total
            )
            VALUES
            ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
            RETURNING *`,

            [
                po_number,
                supplier_id,
                po_date || null,
                expected_delivery_date || null,
                project_name || null,
                vendor_code || null,
                project_code || null,
                ref_no || null,
                req.user.id,
                remarks || null,
                subtotal || 0,
                gst_percent || 18,
                freight || 0,
                grand_total || 0
            ]

        );

        const po = poResult.rows[0];

        for (const item of items) {

            if (!item.material_id || !item.ordered_qty)
                continue;

            await client.query(

                `INSERT INTO po_items
                (
                    po_id,
                    material_id,
                    ordered_qty,
                    unit_price
                )
                VALUES
                ($1,$2,$3,$4)`,

                [
                    po.id,
                    item.material_id,
                    item.ordered_qty,
                    item.unit_price || 0
                ]

            );

        }

        await client.query('COMMIT');

        await logAudit({
            user: req.user,
            req,
            action: "CREATE",
            entity_type: "PURCHASE_ORDER",
            entity_id: po.id,
            entity_label: po.po_number,
            details: {
                po_number: po.po_number,
                supplier_id: po.supplier_id,
                project_name: po.project_name,
                grand_total: po.grand_total,
                total_items: items.length
            }
        });

        await createNotification(

            "Purchase Order Created",

            `Purchase Order ${po_number} has been created successfully.`,

            "success",

            "PO",

            po.id

        );

        res.status(201).json(po);

    }
    catch (err) {

        await client.query('ROLLBACK');

        if (err.code === '23505') {
            return res.status(409).json({
                error: 'PO Number already exists.'
            });
        }

        console.error(err);

        res.status(500).json({
            error: 'Unable to create Purchase Order.'
        });

    }
    finally {

        client.release();

    }

});

/* ==========================================================
   GET ALL PURCHASE ORDERS
========================================================== */

router.get('/', authenticate, async (req, res) => {

    try {

        const result = await pool.query(

            `
            SELECT

                po.*,

                s.supplier_name,

                COUNT(pi.id) AS total_items,

                COUNT(pi.id)
                    FILTER
                    (
                        WHERE pi.received_qty >= pi.ordered_qty
                    ) AS fully_received_items,

                COALESCE(invoice_summary.invoice_amount, 0) AS invoice_amount,

                COALESCE(invoice_summary.paid_amount, 0) AS paid_amount,

                GREATEST(
                    COALESCE(invoice_summary.invoice_amount, 0) -
                    COALESCE(invoice_summary.paid_amount, 0),
                    0
                ) AS payment_balance,

                CASE
                    WHEN COALESCE(invoice_summary.invoice_amount, 0) <= 0
                        THEN 'no_invoice'
                    WHEN COALESCE(invoice_summary.paid_amount, 0) <= 0
                        THEN 'unpaid'
                    WHEN COALESCE(invoice_summary.paid_amount, 0) >=
                         COALESCE(invoice_summary.invoice_amount, 0)
                        THEN 'paid'
                    ELSE 'partial'
                END AS payment_status

            FROM purchase_orders po

            LEFT JOIN suppliers s
                ON s.id = po.supplier_id

            LEFT JOIN po_items pi
                ON pi.po_id = po.id

            LEFT JOIN (
                SELECT
                    po_id,
                    SUM(invoice_amount) AS invoice_amount,
                    SUM(paid_amount) AS paid_amount
                FROM vendor_invoices
                GROUP BY po_id
            ) invoice_summary
                ON invoice_summary.po_id = po.id

            GROUP BY
                po.id,
                s.supplier_name,
                invoice_summary.invoice_amount,
                invoice_summary.paid_amount

            ORDER BY
                po.created_at DESC
            `

        );

        res.json(result.rows);

    }
    catch (err) {

        console.error(err);

        res.status(500).json({
            error: "Unable to fetch Purchase Orders"
        });

    }

});

/* ==========================================================
   GET OPEN / PARTIAL PURCHASE ORDERS
   IMPORTANT: KEEP ABOVE /:id
========================================================== */

router.get('/open', authenticate, async (req, res) => {

    try {

        const result = await pool.query(

            `
            SELECT

                po.id,
                po.po_number,
                po.po_date,
                po.status,

                s.id AS supplier_id,
                s.supplier_name

            FROM purchase_orders po

            LEFT JOIN suppliers s
                ON s.id = po.supplier_id

            WHERE po.status IN ('open','partial')

            ORDER BY po.po_date DESC
            `

        );

        res.json(result.rows);

    }
    catch (err) {

        console.log(err);

        res.status(500).json({
            error: 'Unable to load Purchase Orders'
        });

    }

});

/* ==========================================================
   GET PURCHASE ORDER DETAILS
========================================================== */

router.get('/:id', authenticate, async (req, res) => {

    try {

        const po = await pool.query(

            `
            SELECT

                po.*,

                s.supplier_name,
                s.contact_person,
                s.phone AS supplier_phone,
                s.email AS supplier_email,
                s.gst_number AS supplier_gst_number,
                s.state AS supplier_state,
                s.address AS supplier_address,
                COALESCE(invoice_summary.invoice_amount, 0) AS invoice_amount,
                COALESCE(invoice_summary.paid_amount, 0) AS paid_amount,
                GREATEST(
                    COALESCE(invoice_summary.invoice_amount, 0) -
                    COALESCE(invoice_summary.paid_amount, 0),
                    0
                ) AS payment_balance,
                CASE
                    WHEN COALESCE(invoice_summary.invoice_amount, 0) <= 0
                        THEN 'no_invoice'
                    WHEN COALESCE(invoice_summary.paid_amount, 0) <= 0
                        THEN 'unpaid'
                    WHEN COALESCE(invoice_summary.paid_amount, 0) >=
                         COALESCE(invoice_summary.invoice_amount, 0)
                        THEN 'paid'
                    ELSE 'partial'
                END AS payment_status

            FROM purchase_orders po

            LEFT JOIN suppliers s
                ON s.id = po.supplier_id

            LEFT JOIN (
                SELECT
                    po_id,
                    SUM(invoice_amount) AS invoice_amount,
                    SUM(paid_amount) AS paid_amount
                FROM vendor_invoices
                GROUP BY po_id
            ) invoice_summary
                ON invoice_summary.po_id = po.id

            WHERE po.id = $1
            `,

            [req.params.id]

        );

        if (po.rows.length === 0) {

            return res.status(404).json({
                error: 'Purchase Order not found'
            });

        }

        const items = await pool.query(

            `
            SELECT

                pi.id,

                pi.material_id,

                m.item_code,

                m.item_name,

                m.hsn_code,

                m.unit,

                pi.ordered_qty,

                pi.received_qty,

                (pi.ordered_qty - pi.received_qty) AS pending_qty,

                pi.unit_price

            FROM po_items pi

            JOIN materials m
                ON m.id = pi.material_id

            WHERE pi.po_id = $1

            ORDER BY m.item_name
            `,

            [req.params.id]

        );

        res.json({

            po: po.rows[0],

            items: items.rows

        });

    }
    catch (err) {

        console.log(err);

        res.status(500).json({

            error: 'Unable to load Purchase Order'

        });

    }

});

module.exports = router;
