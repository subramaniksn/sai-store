const express = require('express');
const pool = require('../db/pool');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

/* ============================================================
   CURRENT STOCK REPORT
   GET /reports/current-stock
============================================================ */

router.get('/current-stock', authenticate, authorize('admin', 'manager'), async (req, res) => {

    try {

        const result = await pool.query(`
            SELECT
                m.id,
                m.item_code,
                m.item_name,
                m.category,
                m.unit,

                COALESCE(SUM(
                    CASE
                        WHEN mt.txn_type IN ('incoming','return')
                        THEN mt.quantity
                        ELSE 0
                    END
                ),0)

                -

                COALESCE(SUM(
                    CASE
                        WHEN mt.txn_type='outgoing'
                        THEN mt.quantity
                        ELSE 0
                    END
                ),0)

                -

                COALESCE(SUM(
                    CASE
                        WHEN mt.txn_type='internal_use'
                        THEN mt.quantity
                        ELSE 0
                    END
                ),0)

                AS current_stock

            FROM materials m

            LEFT JOIN material_transactions mt
            ON mt.material_id=m.id

            GROUP BY
                m.id,
                m.item_code,
                m.item_name,
                m.category,
                m.unit

            ORDER BY m.item_name
        `);

        res.json(result.rows);

    } catch (err) {

        console.log(err);

        res.status(500).json({
            error: 'Unable to generate current stock report'
        });

    }

});


/* ============================================================
   MATERIAL LEDGER
   GET /reports/material-ledger?material_id=1
============================================================ */

router.get('/material-ledger', authenticate, authorize('admin', 'manager'), async (req, res) => {

    const { material_id } = req.query;

    if (!material_id) {
        return res.status(400).json({
            error: 'material_id is required'
        });
    }

    try {

        const result = await pool.query(`
            SELECT

                mt.id,

                mt.txn_date,

                mt.txn_type,

                mt.quantity,

                mt.po_id,

                mt.grn_id,

                mt.issue_id,

                mt.return_id,

                CASE

                    WHEN mt.txn_type IN ('incoming','return')

                    THEN mt.quantity

                    ELSE 0

                END AS in_qty,

                CASE

                    WHEN mt.txn_type IN ('outgoing','internal_use')

                    THEN mt.quantity

                    ELSE 0

                END AS out_qty,

                mt.issued_to,

                mt.purpose,

                mt.remarks,

                m.item_code,

                m.item_name,

                m.unit,

                po.po_number,

                gr.grn_number,

                mi.issue_number,

                mr.return_number,

                u.name AS entered_by

            FROM material_transactions mt

            JOIN materials m
            ON m.id = mt.material_id

            LEFT JOIN purchase_orders po
            ON po.id = mt.po_id

            LEFT JOIN goods_receipts gr
            ON gr.id = mt.grn_id

            LEFT JOIN material_issues mi
            ON mi.id = mt.issue_id

            LEFT JOIN material_returns mr
            ON mr.id = mt.return_id

            LEFT JOIN users u
            ON u.id = mt.entered_by

            WHERE mt.material_id = $1

            ORDER BY

                mt.txn_date,

                mt.id;

        `,[material_id]);

        res.json(result.rows);

    } catch(err){

        console.log(err);

        res.status(500).json({
            error:'Unable to generate material ledger'
        });

    }

});


/* ============================================================
   INCOMING REPORT
============================================================ */

router.get('/incoming', authenticate, authorize('admin','manager'), async(req,res)=>{

    try{

        const result=await pool.query(`

        SELECT

            mt.id,
            mt.txn_date,
            mt.quantity,
            mt.po_match_status,

            m.item_code,
            m.item_name,
            m.unit,

            po.po_number,

            u.name entered_by

        FROM material_transactions mt

        JOIN materials m
        ON m.id=mt.material_id

        LEFT JOIN purchase_orders po
        ON po.id=mt.po_id

        LEFT JOIN users u
        ON u.id=mt.entered_by

        WHERE mt.txn_type='incoming'

        ORDER BY mt.txn_date DESC

        `);

        res.json(result.rows);

    }
    catch(err){

        console.log(err);

        res.status(500).json({
            error:'Unable to load incoming report'
        });

    }

});


/* ============================================================
   OUTGOING REPORT
============================================================ */

router.get('/outgoing', authenticate, authorize('admin','manager'), async(req,res)=>{

    try{

        const result=await pool.query(`

        SELECT

            mt.id,
            mt.txn_date,
            mt.quantity,
            mt.issued_to,
            mt.purpose,

            m.item_code,
            m.item_name,
            m.unit,

            u.name entered_by

        FROM material_transactions mt

        JOIN materials m
        ON m.id=mt.material_id

        LEFT JOIN users u
        ON u.id=mt.entered_by

        WHERE mt.txn_type='outgoing'

        ORDER BY mt.txn_date DESC

        `);

        res.json(result.rows);

    }
    catch(err){

        console.log(err);

        res.status(500).json({
            error:'Unable to load outgoing report'
        });

    }

});


/* ============================================================
   INTERNAL USE REPORT
============================================================ */

router.get('/internal-use', authenticate, authorize('admin','manager'), async(req,res)=>{

    try{

        const result=await pool.query(`

        SELECT

            mt.id,
            mt.txn_date,
            mt.quantity,
            mt.used_by_dept,
            mt.used_for,

            m.item_code,
            m.item_name,
            m.unit,

            u.name entered_by

        FROM material_transactions mt

        JOIN materials m
        ON m.id=mt.material_id

        LEFT JOIN users u
        ON u.id=mt.entered_by

        WHERE mt.txn_type='internal_use'

        ORDER BY mt.txn_date DESC

        `);

        res.json(result.rows);

    }
    catch(err){

        console.log(err);

        res.status(500).json({
            error:'Unable to load internal use report'
        });

    }

});

/* ============================================================
   MATERIAL RETURN REPORT
============================================================ */

router.get(
    '/material-returns',
    authenticate,
    authorize('admin', 'manager'),
    async (req, res) => {
        const {
            from_date,
            to_date,
            issue_number,
            returned_by,
            material
        } = req.query;

        const conditions = [];
        const values = [];

        if (from_date && to_date && from_date > to_date) {
            return res.status(400).json({
                error: 'From Date cannot be later than To Date'
            });
        }

        const addCondition = (condition, value) => {
            values.push(value);
            conditions.push(condition.replace('?', `$${values.length}`));
        };

        if (from_date) {
            addCondition('mr.return_date >= ?', from_date);
        }

        if (to_date) {
            addCondition('mr.return_date <= ?', to_date);
        }

        if (issue_number) {
            addCondition('mi.issue_number ILIKE ?', `%${issue_number}%`);
        }

        if (returned_by) {
            addCondition('mr.returned_by ILIKE ?', `%${returned_by}%`);
        }

        if (material) {
            addCondition(
                `(m.item_code ILIKE ? OR m.item_name ILIKE $${values.length + 1})`,
                `%${material}%`
            );
        }

        const whereClause = conditions.length
            ? `WHERE ${conditions.join(' AND ')}`
            : '';

        try {
            const result = await pool.query(`
                SELECT
                    mri.id,
                    mr.id AS return_id,
                    mr.return_number,
                    mr.return_date,
                    mr.returned_by,
                    mr.remarks AS return_remarks,
                    mi.id AS issue_id,
                    mi.issue_number,
                    mi.project_name,
                    m.id AS material_id,
                    m.item_code,
                    m.item_name,
                    m.unit,
                    mri.returned_qty,
                    mri.remarks AS item_remarks,
                    u.name AS received_by
                FROM material_returns mr
                JOIN material_return_items mri
                    ON mri.return_id = mr.id
                JOIN materials m
                    ON m.id = mri.material_id
                LEFT JOIN material_issues mi
                    ON mi.id = mr.issue_id
                LEFT JOIN users u
                    ON u.id = mr.received_by
                ${whereClause}
                ORDER BY
                    mr.return_date DESC,
                    mr.id DESC,
                    m.item_name
            `, values);

            res.json(result.rows);
        } catch (err) {
            console.log(err);
            res.status(500).json({
                error: 'Unable to load Material Return report'
            });
        }
    }
);

/* ============================================================
   VENDOR PAYMENT REPORT
============================================================ */

router.get(
    '/vendor-payments',
    authenticate,
    authorize('admin', 'manager'),
    async (req, res) => {
        const {
            from_date,
            to_date,
            supplier,
            po_number,
            invoice_number,
            payment_status
        } = req.query;

        if (from_date && to_date && from_date > to_date) {
            return res.status(400).json({
                error: 'From Date cannot be later than To Date'
            });
        }

        const conditions = [];
        const values = [];

        const addCondition = (condition, value) => {
            values.push(value);
            conditions.push(condition.replace('?', `$${values.length}`));
        };

        if (from_date) {
            addCondition('COALESCE(vi.payment_date, vi.invoice_date) >= ?', from_date);
        }

        if (to_date) {
            addCondition('COALESCE(vi.payment_date, vi.invoice_date) <= ?', to_date);
        }

        if (supplier) {
            addCondition('s.supplier_name ILIKE ?', `%${supplier}%`);
        }

        if (po_number) {
            addCondition('po.po_number ILIKE ?', `%${po_number}%`);
        }

        if (invoice_number) {
            addCondition('vi.invoice_number ILIKE ?', `%${invoice_number}%`);
        }

        const statusExpression = `
            CASE
                WHEN COALESCE(vi.invoice_amount, 0) <= 0
                    OR COALESCE(vi.paid_amount, 0) <= 0
                    THEN 'unpaid'
                WHEN COALESCE(vi.paid_amount, 0) >= COALESCE(vi.invoice_amount, 0)
                    THEN 'paid'
                ELSE 'partial'
            END
        `;

        if (payment_status) {
            addCondition(`${statusExpression} = ?`, payment_status);
        }

        const whereClause = conditions.length
            ? `WHERE ${conditions.join(' AND ')}`
            : '';

        try {
            const result = await pool.query(`
                SELECT
                    vi.id,
                    vi.invoice_number,
                    vi.invoice_date,
                    vi.invoice_amount,
                    vi.gst_amount,
                    vi.paid_amount,
                    GREATEST(
                        COALESCE(vi.invoice_amount, 0) - COALESCE(vi.paid_amount, 0),
                        0
                    ) AS balance_amount,
                    vi.payment_date,
                    vi.payment_mode,
                    vi.payment_reference,
                    vi.remarks,
                    po.id AS po_id,
                    po.po_number,
                    po.po_date,
                    po.project_name,
                    po.grand_total AS po_total,
                    s.supplier_name,
                    ${statusExpression} AS payment_status
                FROM vendor_invoices vi
                JOIN purchase_orders po
                    ON po.id = vi.po_id
                LEFT JOIN suppliers s
                    ON s.id = po.supplier_id
                ${whereClause}
                ORDER BY
                    COALESCE(vi.payment_date, vi.invoice_date) DESC,
                    vi.id DESC
            `, values);

            res.json(result.rows);
        } catch (err) {
            console.log(err);
            res.status(500).json({
                error: 'Unable to load vendor payment report'
            });
        }
    }
);


/* ============================================================
   PURCHASE ORDER REPORT
============================================================ */

router.get('/purchase-orders', authenticate, authorize('admin','manager'), async(req,res)=>{

    try{

        const result=await pool.query(`

        SELECT
            po.id,
            po.po_number,
            s.supplier_name,
            po.po_date,
            po.status,
            po.created_at,

            COUNT(pi.id) AS total_items,

            COALESCE(SUM(pi.ordered_qty),0) AS ordered_qty,

            COALESCE(SUM(pi.received_qty),0) AS received_qty

        FROM purchase_orders po

        LEFT JOIN suppliers s
        ON s.id = po.supplier_id

        LEFT JOIN po_items pi
        ON pi.po_id = po.id

        GROUP BY

            po.id,
            po.po_number,
            s.supplier_name,
            po.po_date,
            po.status,
            po.created_at

        ORDER BY po.created_at DESC

        `);

        res.json(result.rows);

    }
    catch(err){

        console.log(err);

        res.status(500).json({
            error:'Unable to load PO report'
        });

    }

});

/* ============================================================
   DASHBOARD SUMMARY
============================================================ */

router.get(
    '/summary',
    authenticate,
    authorize('admin', 'manager'),
    async (req, res) => {

        try {

            const materials = await pool.query(
                "SELECT COUNT(*) FROM materials"
            );

            const suppliers = await pool.query(
                "SELECT COUNT(*) FROM suppliers"
            );

            const purchaseOrders = await pool.query(
                "SELECT COUNT(*) FROM purchase_orders"
            );

            const grns = await pool.query(
                "SELECT COUNT(*) FROM goods_receipts"
            );

            const issues = await pool.query(
                "SELECT COUNT(*) FROM material_issues"
            );

            const currentStock = await pool.query(`
                SELECT COALESCE(SUM(current_stock), 0) AS total
                FROM materials
            `);

            res.json({

                materials: Number(materials.rows[0].count),

                suppliers: Number(suppliers.rows[0].count),

                purchaseOrders: Number(purchaseOrders.rows[0].count),

                grns: Number(grns.rows[0].count),

                issues: Number(issues.rows[0].count),

                inventoryValue: Number(currentStock.rows[0].total)

            });

        }
        catch (err) {

            console.log(err);

            res.status(500).json({
                error: "Unable to load dashboard summary."
            });

        }

    }
);

/* ============================================================
   LOW STOCK ALERT REPORT
============================================================ */

router.get(
    "/low-stock",
    authenticate,
    authorize("admin", "manager", "store_incharge"),
    async (req, res) => {

        try {

            const result = await pool.query(`

                SELECT

                    id,
                    item_code,
                    item_name,
                    category,
                    brand,
                    rack_location,
                    manufacturer,
                    description,
                    unit,

                    COALESCE(current_stock,0) AS current_stock,

                    COALESCE(minimum_stock,0) AS minimum_stock,

                    COALESCE(maximum_stock,0) AS maximum_stock,

                    COALESCE(reorder_level,0) AS reorder_level,

                    CASE

                        WHEN COALESCE(current_stock,0) <= COALESCE(minimum_stock,0)
                        THEN COALESCE(minimum_stock,0) - COALESCE(current_stock,0)

                        ELSE 0

                    END AS shortage,

                    CASE

                        WHEN COALESCE(current_stock,0) = 0
                            THEN 'OUT OF STOCK'

                        WHEN COALESCE(reorder_level,0) > 0
                            AND COALESCE(current_stock,0) <= COALESCE(reorder_level,0)
                            AND COALESCE(current_stock,0) > COALESCE(minimum_stock,0)
                            THEN 'REORDER'

                        WHEN COALESCE(current_stock,0) <= COALESCE(minimum_stock,0)
                            THEN 'LOW STOCK'

                        ELSE 'AVAILABLE'

                    END AS status

                FROM materials

                ORDER BY

                    CASE

                        WHEN COALESCE(current_stock,0)=0 THEN 1

                        WHEN COALESCE(current_stock,0)<=COALESCE(minimum_stock,0) THEN 2

                        WHEN COALESCE(reorder_level,0)>0
                            AND COALESCE(current_stock,0)<=COALESCE(reorder_level,0) THEN 3

                        ELSE 4

                    END,

                    item_name;

            `);

            res.json(result.rows);

        }

        catch(err){

            console.log(err);

            res.status(500).json({
                error:"Unable to load Low Stock Report"
            });

        }

    }
);

/* ============================================================
   DASHBOARD
============================================================ */

router.get(
    "/dashboard",
    authenticate,
    authorize("admin", "manager", "store_incharge"),
    async (req, res) => {

        try {

            //---------------------------------------
            // Total Materials
            //---------------------------------------

            const totalMaterials = await pool.query(`
                SELECT COUNT(*) total
                FROM materials
            `);

            //---------------------------------------
            // Available Stock
            //---------------------------------------

            const availableStock = await pool.query(`
                SELECT COUNT(*) total
                FROM materials
                WHERE current_stock > minimum_stock
            `);

            //---------------------------------------
            // Low Stock
            //---------------------------------------

            const lowStock = await pool.query(`
                SELECT COUNT(*) total
                FROM materials
                WHERE current_stock > 0
                AND current_stock <= minimum_stock
            `);

            //---------------------------------------
            // Out Of Stock
            //---------------------------------------

            const outOfStock = await pool.query(`
                SELECT COUNT(*) total
                FROM materials
                WHERE current_stock = 0
            `);

            //---------------------------------------
            // Recent Transactions
            //---------------------------------------

            const recentTransactions = await pool.query(`

                SELECT

                    mt.id,

                    mt.txn_date,

                    mt.txn_type,

                    m.item_code,

                    m.item_name,

                    mt.quantity,

                    m.unit

                FROM material_transactions mt

                JOIN materials m
                    ON mt.material_id = m.id

                ORDER BY mt.created_at DESC

                LIMIT 10

            `);

            //---------------------------------------
            // Low Stock Items
            //---------------------------------------

            const lowStockItems = await pool.query(`

                SELECT

                    id,

                    item_code,

                    item_name,

                    current_stock,

                    minimum_stock,

                    unit

                FROM materials

                WHERE current_stock <= minimum_stock

                ORDER BY current_stock ASC

                LIMIT 10

            `);

            /* ============================================
                CATEGORY SUMMARY
                ============================================ */

                const categoryResult = await pool.query(`

                    SELECT

                        category,

                        COUNT(*)::int AS count

                    FROM materials

                    GROUP BY category

                    ORDER BY category

                `);

                const inventoryValue = await pool.query(`
                    SELECT
                        COALESCE(
                            SUM(current_stock),
                            0
                        ) AS value
                    FROM materials
                `);

                const todayIncoming = await pool.query(`
                    SELECT COALESCE(SUM(quantity),0) total
                    FROM material_transactions
                    WHERE txn_type='incoming'
                    AND DATE(txn_date)=CURRENT_DATE
                `);

                const todayOutgoing = await pool.query(`
                    SELECT COALESCE(SUM(quantity),0) total
                    FROM material_transactions
                    WHERE txn_type='outgoing'
                    AND DATE(txn_date)=CURRENT_DATE
                `);

                const todayInternal = await pool.query(`
                    SELECT COALESCE(SUM(quantity),0) total
                    FROM material_transactions
                    WHERE txn_type='internal_use'
                    AND DATE(txn_date)=CURRENT_DATE
                `);

                const todayPO = await pool.query(`
                    SELECT COUNT(*) total
                    FROM purchase_orders
                    WHERE DATE(po_date)=CURRENT_DATE
                `);

                const returnStatistics = await pool.query(`
                    SELECT
                        COUNT(*) FILTER (
                            WHERE return_date = CURRENT_DATE
                        ) AS today,
                        COUNT(*) FILTER (
                            WHERE DATE_TRUNC('month', return_date) =
                                  DATE_TRUNC('month', CURRENT_DATE)
                        ) AS this_month
                    FROM material_returns
                `);

                const inventoryValueResult  = await pool.query(`
                    SELECT
                        COALESCE(
                            SUM(
                                m.current_stock *
                                COALESCE(
                                    latest_receipt.unit_price,
                                    latest_order.unit_price,
                                    m.unit_price,
                                    0
                                )
                            ),
                            0
                        ) AS total
                    FROM materials m
                    LEFT JOIN LATERAL (
                        SELECT gri.unit_price
                        FROM goods_receipt_items gri
                        JOIN goods_receipts gr
                            ON gr.id = gri.grn_id
                        WHERE gri.material_id = m.id
                          AND gri.unit_price > 0
                        ORDER BY
                            gr.received_date DESC,
                            gr.id DESC,
                            gri.id DESC
                        LIMIT 1
                    ) latest_receipt ON TRUE
                    LEFT JOIN LATERAL (
                        SELECT pi.unit_price
                        FROM po_items pi
                        JOIN purchase_orders po
                            ON po.id = pi.po_id
                        WHERE pi.material_id = m.id
                          AND pi.unit_price > 0
                        ORDER BY
                            po.po_date DESC,
                            po.id DESC,
                            pi.id DESC
                        LIMIT 1
                    ) latest_order ON TRUE
                `);

            //---------------------------------------
            // Response
            //---------------------------------------

            res.json({

                total_materials:
                    Number(totalMaterials.rows[0].total),

                available:
                    Number(availableStock.rows[0].total),

                low_stock:
                    Number(lowStock.rows[0].total),

                out_of_stock:
                    Number(outOfStock.rows[0].total),

                recent_transactions:
                    recentTransactions.rows,

                low_stock_items:
                    lowStockItems.rows,

                // NEW
                category_chart:
                    categoryResult.rows,

                // NEW
                inventory_chart: {

                    available:
                        Number(availableStock.rows[0].total),

                    low_stock:
                        Number(lowStock.rows[0].total),

                    out_of_stock:
                        Number(outOfStock.rows[0].total)

                },
                
                inventoryValue: Number(inventoryValue.rows[0].value),

                today_statistics: {

                    incoming:
                        Number(todayIncoming.rows[0].total),

                    outgoing:
                        Number(todayOutgoing.rows[0].total),

                    internal:
                        Number(todayInternal.rows[0].total),

                    purchase_orders:
                        Number(todayPO.rows[0].total)

                },

                return_statistics: {
                    today:
                        Number(returnStatistics.rows[0].today),

                    this_month:
                        Number(returnStatistics.rows[0].this_month)
                },

                inventory_value:
                    Number(inventoryValueResult.rows[0].total)

            });

        }

        catch (err) {

            console.log(err);

            res.status(500).json({

                error: "Unable to load dashboard."

            });

        }

    }
);

module.exports = router;
