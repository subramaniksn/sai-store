const express = require('express');
const pool = require('../db/pool');
const { authenticate, authorize } = require('../middleware/auth');
const createNotification = require("../utils/createNotification");
const logAudit = require("../utils/auditLog");

const router = express.Router();

/* ============================================================
   GET ALL MATERIALS
============================================================ */

router.get('/', authenticate, async (req, res) => {

    const { search, include_inactive } = req.query;

    let query = `
        SELECT *
        FROM materials
        WHERE 1 = 1
    `;

    let params = [];
    let index = 1;

    if (include_inactive !== 'true') {
        query += ` AND COALESCE(is_active, TRUE) = TRUE`;
    }

    if (search) {

        query += `
            AND (
                item_name ILIKE $${index}
                OR item_code ILIKE $${index}
                OR category ILIKE $${index}
                OR brand ILIKE $${index}
            )
        `;

        params.push(`%${search}%`);
        index++;

    }

    query += ` ORDER BY item_name`;

    try {

        const result = await pool.query(query, params);

        res.json(result.rows);

    } catch (err) {

        console.log(err);

        res.status(500).json({
            error: 'Unable to load materials'
        });

    }

});

router.get('/barcode/:code', authenticate, async (req, res) => {

    try {

        const result = await pool.query(
            `
            SELECT *
            FROM materials
            WHERE (barcode_value = $1 OR item_code = $1)
              AND COALESCE(is_active, TRUE) = TRUE
            LIMIT 1
            `,
            [req.params.code]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "Material not found for this barcode."
            });
        }

        res.json(result.rows[0]);

    } catch (err) {

        console.log(err);

        res.status(500).json({
            error: "Unable to scan barcode."
        });

    }

});

/* ============================================================
   GET MATERIAL BY ID
============================================================ */

router.get('/:id', authenticate, async (req, res) => {

    try {

        const result = await pool.query(
            'SELECT * FROM materials WHERE id = $1',
            [req.params.id]
        );

        if (result.rows.length === 0) {

            return res.status(404).json({
                error: 'Material not found'
            });

        }

        res.json(result.rows[0]);

    } catch (err) {

        console.log(err);

        res.status(500).json({
            error: 'Unable to load material'
        });

    }

});


/* ============================================================
   CREATE MATERIAL
============================================================ */

router.post('/', authenticate, authorize('admin', 'manager'), async (req, res) => {

    const {
        item_code,
        item_name,
        category,
        brand,
        unit,
        minimum_stock,
        rack_location,
        description,
        maximum_stock,
        reorder_level,
        manufacturer,
        hsn_code,
        current_stock,
        unit_price,
        is_active
    } = req.body;

    if (!item_name) {
        return res.status(400).json({
            error: 'Item Name is required'
        });
    }

    try {

        const finalUnit = unit || "Nos";
        const finalItemCode = item_code || `MAT-${Date.now()}`;

        const barcode_value = finalItemCode;

        const qr_value =
            `ITEM:${finalItemCode}|NAME:${item_name}|UNIT:${finalUnit}|RACK:${rack_location || ""}`;

        const result = await pool.query(

            `INSERT INTO materials
            (
                item_code,
                item_name,
                category,
                brand,
                unit,
                minimum_stock,
                rack_location,
                description,
                barcode_value,
                qr_value,
                maximum_stock,
                reorder_level,
                manufacturer,
                hsn_code,
                current_stock,
                unit_price,
                is_active
            )
            VALUES
            ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
            RETURNING *`,
            [
                finalItemCode,
                item_name,
                category || null,
                brand || null,
                finalUnit,
                minimum_stock || 0,
                rack_location || null,
                description || null,
                barcode_value,
                qr_value,
                maximum_stock || 0,
                reorder_level || 0,
                manufacturer || null,
                hsn_code || null,
                current_stock || 0,
                unit_price || 0,
                is_active === false ? false : true
            ]

        );

        const material = result.rows[0];

        await createNotification(
            "New Material Added",
            `Material ${material.item_code || ""} - ${material.item_name} has been added.`,
            "success",
            "MATERIAL",
            material.id
        );

        await logAudit({
            user: req.user,
            req,
            action: "CREATE",
            entity_type: "MATERIAL",
            entity_id: material.id,
            entity_label: `${material.item_code || ""} - ${material.item_name}`,
            details: {
                item_code: material.item_code,
                item_name: material.item_name,
                current_stock: material.current_stock,
                unit_price: material.unit_price
            }
        });

        res.status(201).json(material);

    }
    catch (err) {

        if (err.code === '23505') {
            return res.status(409).json({
                error: 'Item Code already exists'
            });
        }

        console.log(err);

        res.status(500).json({
            error: 'Unable to create material'
        });

    }

});


/* ============================================================
   UPDATE MATERIAL
============================================================ */

router.put('/:id', authenticate, authorize('admin', 'manager'), async (req, res) => {

    const {

        item_code,
        item_name,
        category,
        brand,
        unit,
        minimum_stock,
        rack_location,
        description,
        maximum_stock,
        reorder_level,
        manufacturer,
        hsn_code,
        current_stock,
        unit_price,
        is_active

    } = req.body;

    try {

        const result = await pool.query(

            `UPDATE materials
            SET
                item_code=$1,
                item_name=$2,
                category=$3,
                brand=$4,
                unit=$5,
                minimum_stock=$6,
                rack_location=$7,
                description=$8,
                maximum_stock=$9,
                reorder_level=$10,
                manufacturer=$11,
                hsn_code=$12,
                current_stock=COALESCE($13, current_stock),
                unit_price=$14,
                is_active=COALESCE($15, is_active)
            WHERE id=$16
            RETURNING *`,

           [
                item_code,
                item_name,
                category,
                brand,
                unit,
                minimum_stock,
                rack_location,
                description,
                maximum_stock || 0,
                reorder_level || 0,
                manufacturer || null,
                hsn_code || null,
                current_stock === undefined || current_stock === null
                    ? null
                    : current_stock,
                unit_price || 0,
                is_active === undefined || is_active === null
                    ? null
                    : is_active,
                req.params.id
            ]

        );

        if (result.rows.length === 0) {

            return res.status(404).json({
                error: 'Material not found'
            });

        }

        const material = result.rows[0];

        await logAudit({
            user: req.user,
            req,
            action: "UPDATE",
            entity_type: "MATERIAL",
            entity_id: material.id,
            entity_label: `${material.item_code || ""} - ${material.item_name}`,
            details: {
                item_code: material.item_code,
                item_name: material.item_name,
                current_stock: material.current_stock,
                unit_price: material.unit_price
            }
        });

        res.json(material);

    }
    catch (err) {

        console.log(err);

        res.status(500).json({
            error: 'Unable to update material'
        });

    }

});


/* ============================================================
   DELETE MATERIAL
============================================================ */

router.delete('/:id', authenticate, authorize('admin', 'manager'), async (req, res) => {

    try {

        const result = await pool.query(
            `
            UPDATE materials
            SET is_active = FALSE
            WHERE id = $1
            RETURNING *
            `,
            [req.params.id]
        );

        if (result.rows.length === 0) {

            return res.status(404).json({
                error: 'Material not found'
            });

        }

        const material = result.rows[0];

        await logAudit({
            user: req.user,
            req,
            action: "DEACTIVATE",
            entity_type: "MATERIAL",
            entity_id: material.id,
            entity_label: `${material.item_code || ""} - ${material.item_name}`
        });

        res.json({
            message: 'Material deactivated successfully'
        });

    } catch (err) {

        if (err.code === '23503') {

            return res.status(400).json({
                error: 'Cannot delete material because it is used in Purchase Orders or Stock Transactions.'
            });

        }

        console.log(err);

        res.status(500).json({
            error: 'Unable to delete material'
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
            UPDATE materials
            SET is_active = $1
            WHERE id = $2
            RETURNING *
            `,
            [isActive, req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'Material not found'
            });
        }

        const material = result.rows[0];

        await logAudit({
            user: req.user,
            req,
            action: isActive ? "REACTIVATE" : "DEACTIVATE",
            entity_type: "MATERIAL",
            entity_id: material.id,
            entity_label: `${material.item_code || ""} - ${material.item_name}`,
            details: {
                is_active: material.is_active
            }
        });

        res.json(material);
    } catch (err) {
        console.log(err);
        res.status(500).json({
            error: 'Unable to update material status'
        });
    }
});

module.exports = router;
