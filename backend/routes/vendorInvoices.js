const express = require("express");
const pool = require("../db/pool");
const { authenticate, authorize } = require("../middleware/auth");
const logAudit = require("../utils/auditLog");

const router = express.Router();

function getPaymentStatus(invoiceAmount, paidAmount) {
    const total = Number(invoiceAmount || 0);
    const paid = Number(paidAmount || 0);

    if (total <= 0 || paid <= 0) return "unpaid";
    if (paid >= total) return "paid";
    return "partial";
}

router.get("/", authenticate, authorize("admin", "manager"), async (req, res) => {
    const { po_id, status, search } = req.query;

    const conditions = [];
    const params = [];
    let index = 1;

    if (po_id) {
        conditions.push(`vi.po_id = $${index}`);
        params.push(po_id);
        index++;
    }

    if (search) {
        conditions.push(`
            (
                vi.invoice_number ILIKE $${index}
                OR po.po_number ILIKE $${index}
                OR s.supplier_name ILIKE $${index}
                OR vi.payment_reference ILIKE $${index}
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
                vi.*,
                po.po_number,
                po.po_date,
                po.project_name,
                po.grand_total,
                s.supplier_name,
                CASE
                    WHEN COALESCE(vi.invoice_amount, 0) <= 0
                        OR COALESCE(vi.paid_amount, 0) <= 0
                        THEN 'unpaid'
                    WHEN COALESCE(vi.paid_amount, 0) >= COALESCE(vi.invoice_amount, 0)
                        THEN 'paid'
                    ELSE 'partial'
                END AS payment_status,
                GREATEST(
                    COALESCE(vi.invoice_amount, 0) - COALESCE(vi.paid_amount, 0),
                    0
                ) AS balance_amount
            FROM vendor_invoices vi
            JOIN purchase_orders po
                ON po.id = vi.po_id
            LEFT JOIN suppliers s
                ON s.id = po.supplier_id
            ${whereClause}
            ORDER BY vi.created_at DESC, vi.id DESC
            `,
            params
        );

        const rows = status
            ? result.rows.filter(row => row.payment_status === status)
            : result.rows;

        res.json(rows);
    } catch (err) {
        console.log(err);
        res.status(500).json({
            error: "Unable to load vendor invoices."
        });
    }
});

router.post("/", authenticate, authorize("admin", "manager"), async (req, res) => {
    const {
        po_id,
        invoice_number,
        invoice_date,
        invoice_amount,
        gst_amount,
        paid_amount,
        payment_date,
        payment_mode,
        payment_reference,
        remarks
    } = req.body;

    if (!po_id || !invoice_number) {
        return res.status(400).json({
            error: "PO and invoice number are required."
        });
    }

    const invoiceAmount = Number(invoice_amount || 0);
    const paidAmount = Number(paid_amount || 0);

    if (!Number.isFinite(invoiceAmount) || invoiceAmount <= 0) {
        return res.status(400).json({
            error: "Invoice amount must be greater than zero."
        });
    }

    if (!Number.isFinite(paidAmount) || paidAmount < 0) {
        return res.status(400).json({
            error: "Paid amount cannot be negative."
        });
    }

    if (paidAmount > invoiceAmount) {
        return res.status(400).json({
            error: "Paid amount cannot be greater than invoice amount."
        });
    }

    try {
        const poResult = await pool.query(
            `
            SELECT po.id, po.po_number, po.grand_total, s.supplier_name
            FROM purchase_orders po
            LEFT JOIN suppliers s ON s.id = po.supplier_id
            WHERE po.id = $1
            `,
            [po_id]
        );

        if (poResult.rows.length === 0) {
            return res.status(404).json({
                error: "Purchase Order not found."
            });
        }

        const result = await pool.query(
            `
            INSERT INTO vendor_invoices
            (
                po_id,
                invoice_number,
                invoice_date,
                invoice_amount,
                gst_amount,
                paid_amount,
                payment_date,
                payment_mode,
                payment_reference,
                remarks,
                created_by
            )
            VALUES
            ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
            RETURNING *
            `,
            [
                po_id,
                invoice_number,
                invoice_date || null,
                invoiceAmount,
                Number(gst_amount || 0),
                paidAmount,
                payment_date || null,
                payment_mode || null,
                payment_reference || null,
                remarks || null,
                req.user.id
            ]
        );

        const invoice = result.rows[0];
        const po = poResult.rows[0];

        await logAudit({
            user: req.user,
            req,
            action: "CREATE",
            entity_type: "VENDOR_INVOICE",
            entity_id: invoice.id,
            entity_label: `${po.po_number} / ${invoice.invoice_number}`,
            details: {
                po_number: po.po_number,
                supplier_name: po.supplier_name,
                invoice_amount: invoice.invoice_amount,
                paid_amount: invoice.paid_amount,
                payment_status: getPaymentStatus(
                    invoice.invoice_amount,
                    invoice.paid_amount
                )
            }
        });

        res.status(201).json(invoice);
    } catch (err) {
        if (err.code === "23505") {
            return res.status(409).json({
                error: "This invoice number is already recorded for the selected PO."
            });
        }

        console.log(err);
        res.status(500).json({
            error: "Unable to save vendor invoice."
        });
    }
});

router.put("/:id", authenticate, authorize("admin", "manager"), async (req, res) => {
    const {
        invoice_number,
        invoice_date,
        invoice_amount,
        gst_amount,
        paid_amount,
        payment_date,
        payment_mode,
        payment_reference,
        remarks
    } = req.body;

    const invoiceAmount = Number(invoice_amount || 0);
    const paidAmount = Number(paid_amount || 0);

    if (!invoice_number) {
        return res.status(400).json({
            error: "Invoice number is required."
        });
    }

    if (!Number.isFinite(invoiceAmount) || invoiceAmount <= 0) {
        return res.status(400).json({
            error: "Invoice amount must be greater than zero."
        });
    }

    if (!Number.isFinite(paidAmount) || paidAmount < 0) {
        return res.status(400).json({
            error: "Paid amount cannot be negative."
        });
    }

    if (paidAmount > invoiceAmount) {
        return res.status(400).json({
            error: "Paid amount cannot be greater than invoice amount."
        });
    }

    try {
        const result = await pool.query(
            `
            UPDATE vendor_invoices
            SET
                invoice_number = $1,
                invoice_date = $2,
                invoice_amount = $3,
                gst_amount = $4,
                paid_amount = $5,
                payment_date = $6,
                payment_mode = $7,
                payment_reference = $8,
                remarks = $9,
                updated_at = NOW()
            WHERE id = $10
            RETURNING *
            `,
            [
                invoice_number,
                invoice_date || null,
                invoiceAmount,
                Number(gst_amount || 0),
                paidAmount,
                payment_date || null,
                payment_mode || null,
                payment_reference || null,
                remarks || null,
                req.params.id
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "Vendor invoice not found."
            });
        }

        const invoice = result.rows[0];

        await logAudit({
            user: req.user,
            req,
            action: "UPDATE",
            entity_type: "VENDOR_INVOICE",
            entity_id: invoice.id,
            entity_label: invoice.invoice_number,
            details: {
                invoice_amount: invoice.invoice_amount,
                paid_amount: invoice.paid_amount,
                payment_status: getPaymentStatus(
                    invoice.invoice_amount,
                    invoice.paid_amount
                )
            }
        });

        res.json(invoice);
    } catch (err) {
        if (err.code === "23505") {
            return res.status(409).json({
                error: "This invoice number is already recorded for the selected PO."
            });
        }

        console.log(err);
        res.status(500).json({
            error: "Unable to update vendor invoice."
        });
    }
});

module.exports = router;
