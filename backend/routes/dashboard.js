const express = require('express');
const pool = require('../db/pool');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// ======================================================
// Dashboard Summary
// ======================================================
router.get('/', authenticate, authorize('admin', 'manager', 'store_incharge'), async (req, res) => {

    try {

        const totalUsers = await pool.query(
            `SELECT COUNT(*) FROM users WHERE is_active = true`
        );

        const totalMaterials = await pool.query(
            `SELECT COUNT(*) FROM materials`
        );

        const totalSuppliers = await pool.query(
            `SELECT COUNT(*) FROM suppliers WHERE is_active = true`
        );

        const openPO = await pool.query(`
            SELECT COUNT(*)
            FROM purchase_orders
            WHERE status IN ('open','partial')
        `);

        const todayIncoming = await pool.query(`
            SELECT COALESCE(SUM(quantity),0) qty
            FROM material_transactions
            WHERE txn_type='incoming'
            AND txn_date=CURRENT_DATE
        `);

        const todayOutgoing = await pool.query(`
            SELECT COALESCE(SUM(quantity),0) qty
            FROM material_transactions
            WHERE txn_type='outgoing'
            AND txn_date=CURRENT_DATE
        `);

        const todayInternal = await pool.query(`
            SELECT COALESCE(SUM(quantity),0) qty
            FROM material_transactions
            WHERE txn_type='internal_use'
            AND txn_date=CURRENT_DATE
        `);

        const currentStock = await pool.query(`
            SELECT COUNT(*) total
            FROM (
                SELECT
                    material_id,
                    SUM(
                        CASE
                            WHEN txn_type IN ('incoming','return')
                            THEN quantity
                            WHEN txn_type IN ('outgoing','internal_use')
                            THEN -quantity
                        END
                    ) stock
                FROM material_transactions
                GROUP BY material_id
                HAVING SUM(
                    CASE
                        WHEN txn_type IN ('incoming','return')
                        THEN quantity
                        WHEN txn_type IN ('outgoing','internal_use')
                        THEN -quantity
                    END
                ) > 0
            ) s
        `);

        res.json({

            totalUsers:
                parseInt(totalUsers.rows[0].count),

            totalMaterials:
                parseInt(totalMaterials.rows[0].count),

            totalSuppliers:
                parseInt(totalSuppliers.rows[0].count),

            currentStockItems:
                parseInt(currentStock.rows[0].total),

            openPO:
                parseInt(openPO.rows[0].count),

            todayIncoming:
                Number(todayIncoming.rows[0].qty),

            todayOutgoing:
                Number(todayOutgoing.rows[0].qty),

            todayInternalUse:
                Number(todayInternal.rows[0].qty)

        });

    }
    catch (err) {

        console.log(err);

        res.status(500).json({
            error: 'Unable to load dashboard'
        });

    }

});

module.exports = router;
