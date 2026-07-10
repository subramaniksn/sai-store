const express = require('express');
const pool = require('../db/pool');
const { authenticate, authorize } = require('../middleware/auth');
const logAudit = require("../utils/auditLog");

const router = express.Router();

//
// Get All Suppliers
//
router.get('/', authenticate, async (req, res) => {
    const { include_inactive } = req.query;

    try {
        const result = await pool.query(`
            SELECT *
            FROM suppliers
            WHERE ($1::BOOLEAN = TRUE OR COALESCE(is_active, TRUE) = TRUE)
            ORDER BY supplier_name
        `, [include_inactive === 'true']);

        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Unable to fetch suppliers' });
    }
});

//
// Get Single Supplier
//
router.get('/:id', authenticate, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM suppliers WHERE id=$1',
            [req.params.id]
        );

        if (result.rows.length === 0)
            return res.status(404).json({ error: 'Supplier not found' });

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error' });
    }
});

//
// Create Supplier
//
router.post('/', authenticate, authorize('admin', 'manager'), async (req, res) => {

    const {
        supplier_name,
        vendor_code,
        contact_person,
        phone,
        email,
        gst_number,
        state,
        address
    } = req.body;

    if (!supplier_name)
        return res.status(400).json({
            error: 'Supplier name required'
        });

    try {

        const result = await pool.query(
            `INSERT INTO suppliers
            (
                supplier_name,
                vendor_code,
                contact_person,
                phone,
                email,
                gst_number,
                state,
                address,
                is_active
            )
            VALUES
            ($1,$2,$3,$4,$5,$6,$7,$8,$9)
            RETURNING *`,
            [
                supplier_name,
                vendor_code || null,
                contact_person,
                phone,
                email,
                gst_number,
                state,
                address,
                true
            ]
        );

        const supplier = result.rows[0];

        await logAudit({
            user: req.user,
            req,
            action: "CREATE",
            entity_type: "SUPPLIER",
            entity_id: supplier.id,
            entity_label: supplier.supplier_name,
            details: {
                supplier_name: supplier.supplier_name,
                vendor_code: supplier.vendor_code,
                phone: supplier.phone,
                email: supplier.email,
                gst_number: supplier.gst_number
            }
        });

        res.status(201).json(supplier);

    } catch (err) {

        console.error(err);

        res.status(500).json({
            error: 'Unable to create supplier'
        });

    }

});

//
// Update Supplier
//
router.put('/:id', authenticate, authorize('admin', 'manager'), async (req, res) => {

    const {
        supplier_name,
        vendor_code,
        contact_person,
        phone,
        email,
        gst_number,
        state,
        address,
        is_active
    } = req.body;

    try {

        const result = await pool.query(
            `UPDATE suppliers
             SET supplier_name=$1,
                 vendor_code=$2,
                 contact_person=$3,
                 phone=$4,
                 email=$5,
                 gst_number=$6,
                 state=$7,
                 address=$8,
                 is_active=$9
             WHERE id=$10
             RETURNING *`,
            [
                supplier_name,
                vendor_code || null,
                contact_person,
                phone,
                email,
                gst_number,
                state,
                address,
                is_active,
                req.params.id
            ]
        );

        if (result.rows.length === 0)
            return res.status(404).json({
                error: 'Supplier not found'
            });

        const supplier = result.rows[0];

        await logAudit({
            user: req.user,
            req,
            action: "UPDATE",
            entity_type: "SUPPLIER",
            entity_id: supplier.id,
            entity_label: supplier.supplier_name,
            details: {
                supplier_name: supplier.supplier_name,
                vendor_code: supplier.vendor_code,
                phone: supplier.phone,
                email: supplier.email,
                is_active: supplier.is_active
            }
        });

        res.json(supplier);

    } catch (err) {

        console.error(err);

        res.status(500).json({
            error: 'Unable to update supplier'
        });

    }

});

//
// Delete Supplier
//
router.delete('/:id', authenticate, authorize('admin', 'manager'), async (req, res) => {

    try {

        const result = await pool.query(
            `
            UPDATE suppliers
            SET is_active = FALSE
            WHERE id=$1
            RETURNING *
            `,
            [req.params.id]
        );

        const supplier = result.rows[0];

        await logAudit({
            user: req.user,
            req,
            action: "DEACTIVATE",
            entity_type: "SUPPLIER",
            entity_id: supplier?.id || Number(req.params.id),
            entity_label: supplier?.supplier_name || `Supplier ID ${req.params.id}`
        });

        res.json({
            message: 'Supplier deactivated successfully'
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            error: 'Unable to delete supplier'
        });

    }

});

router.patch('/:id/status', authenticate, authorize('admin', 'manager'), async (req, res) => {
    const isActive = req.body.is_active;

    if (typeof isActive !== 'boolean') {
        return res.status(400).json({
            error: 'Status is required.'
        });
    }

    try {
        const result = await pool.query(
            `
            UPDATE suppliers
            SET is_active = $1
            WHERE id = $2
            RETURNING *
            `,
            [isActive, req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'Supplier not found'
            });
        }

        const supplier = result.rows[0];

        await logAudit({
            user: req.user,
            req,
            action: isActive ? "REACTIVATE" : "DEACTIVATE",
            entity_type: "SUPPLIER",
            entity_id: supplier.id,
            entity_label: supplier.supplier_name,
            details: {
                is_active: supplier.is_active
            }
        });

        res.json(supplier);
    } catch (err) {
        console.error(err);
        res.status(500).json({
            error: 'Unable to update supplier status'
        });
    }
});

module.exports = router;
