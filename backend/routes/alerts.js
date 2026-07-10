const express = require('express');
const pool = require('../db/pool');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/low-stock', authenticate, async (req, res) => {

    try {

        const result = await pool.query(`

        SELECT *

        FROM (

            SELECT

                m.id,
                m.item_code,
                m.item_name,
                m.category,
                m.unit,
                m.minimum_stock,

                COALESCE(SUM(
                    CASE
                        WHEN mt.txn_type IN ('incoming','return')
                        THEN mt.quantity
                        WHEN mt.txn_type IN ('outgoing','internal_use')
                        THEN -mt.quantity
                    END
                ),0) stock

            FROM materials m

            LEFT JOIN material_transactions mt
            ON mt.material_id=m.id

            GROUP BY
                m.id,
                m.item_code,
                m.item_name,
                m.category,
                m.unit,
                m.minimum_stock

        ) x

        WHERE stock<=minimum_stock

        ORDER BY stock

        `);

        res.json(result.rows);

    } catch(err){

        console.log(err);

        res.status(500).json({
            error:'Unable to load alerts'
        });

    }

});

module.exports = router;
