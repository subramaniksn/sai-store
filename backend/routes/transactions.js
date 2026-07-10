const express = require('express');
const pool = require('../db/pool');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// ---------------------------------------------------------------------
// CREATE a transaction (incoming / outgoing / internal_use)
// Store Incharge is the primary entry role; Admin can also enter.
// ---------------------------------------------------------------------
router.post('/', authenticate, authorize('admin', 'store_incharge'), async (req, res) => {
    const {
        txn_type, material_id, quantity, txn_date, remarks,
        po_id,                          // incoming only (nullable -> "not in PO")
        issued_to, purpose,             // outgoing only
        used_by_dept, used_for          // internal_use only
    } = req.body;

    if (!['incoming', 'outgoing', 'internal_use'].includes(txn_type)) {
        return res.status(400).json({ error: 'txn_type must be incoming, outgoing or internal_use' });
    }
    if (!material_id || !quantity || quantity <= 0) {
        return res.status(400).json({ error: 'material_id and a positive quantity are required' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        let po_match_status = null;

        if (txn_type === 'incoming') {
            if (po_id) {
                // Check whether this material is part of the PO
                const poItem = await client.query(
                    'SELECT * FROM po_items WHERE po_id = $1 AND material_id = $2',
                    [po_id, material_id]
                );
                if (poItem.rows.length === 0) {
                    po_match_status = 'not_in_po';
                } else {
                    const item = poItem.rows[0];
                    const newReceived = parseFloat(item.received_qty) + parseFloat(quantity);
                    po_match_status = newReceived > parseFloat(item.ordered_qty) ? 'excess_qty'
                                     : newReceived < parseFloat(item.ordered_qty) ? 'short_qty'
                                     : 'as_per_po';
                    await client.query(
                        'UPDATE po_items SET received_qty = $1 WHERE id = $2',
                        [newReceived, item.id]
                    );
                }
            } else {
                po_match_status = 'not_in_po'; // received without referencing any PO at all
            }
        }

        const result = await client.query(
            `INSERT INTO material_transactions
                (txn_type, material_id, quantity, po_id, po_match_status,
                 issued_to, purpose, used_by_dept, used_for, remarks, entered_by, txn_date)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, COALESCE($12, CURRENT_DATE))
             RETURNING *`,
            [txn_type, material_id, quantity, po_id || null, po_match_status,
             issued_to || null, purpose || null, used_by_dept || null, used_for || null,
             remarks || null, req.user.id, txn_date || null]
        );

        // Auto-update PO status if all items fully received
        if (po_id) {
            const remaining = await client.query(
                `SELECT COUNT(*) FROM po_items WHERE po_id = $1 AND received_qty < ordered_qty`,
                [po_id]
            );
            const status = parseInt(remaining.rows[0].count) === 0 ? 'closed' : 'partial';
            await client.query('UPDATE purchase_orders SET status = $1 WHERE id = $2', [status, po_id]);
        }

        await client.query('COMMIT');
        res.status(201).json(result.rows[0]);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Server error recording transaction' });
    } finally {
        client.release();
    }
});

// ---------------------------------------------------------------------
// LIST transactions with filters (used by both Store Incharge & Manager)
// query params: txn_type, material_id, po_id, from, to, match_status
// ---------------------------------------------------------------------
router.get('/', authenticate, async (req, res) => {
    const { txn_type, material_id, po_id, from, to, match_status } = req.query;
    const conditions = [];
    const values = [];
    let i = 1;

    if (txn_type) { conditions.push(`mt.txn_type = $${i++}`); values.push(txn_type); }
    if (material_id) { conditions.push(`mt.material_id = $${i++}`); values.push(material_id); }
    if (po_id) { conditions.push(`mt.po_id = $${i++}`); values.push(po_id); }
    if (match_status) { conditions.push(`mt.po_match_status = $${i++}`); values.push(match_status); }
    if (from) { conditions.push(`mt.txn_date >= $${i++}`); values.push(from); }
    if (to) { conditions.push(`mt.txn_date <= $${i++}`); values.push(to); }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query(`
        SELECT mt.*, m.item_name, m.item_code, m.unit, u.name AS entered_by_name,
               po.po_number
        FROM material_transactions mt
        JOIN materials m ON m.id = mt.material_id
        LEFT JOIN users u ON u.id = mt.entered_by
        LEFT JOIN purchase_orders po ON po.id = mt.po_id
        ${whereClause}
        ORDER BY mt.txn_date DESC, mt.created_at DESC
        LIMIT 500
    `, values);

    res.json(result.rows);
});

// ---------------------------------------------------------------------
// DASHBOARD SUMMARY (Manager page)
// ---------------------------------------------------------------------
router.get('/summary', authenticate, authorize('admin', 'manager'), async (req, res) => {
    const totals = await pool.query(`
        SELECT txn_type, COUNT(*) AS txn_count, SUM(quantity) AS total_qty
        FROM material_transactions
        GROUP BY txn_type
    `);

    const poMatch = await pool.query(`
        SELECT po_match_status, COUNT(*) AS count
        FROM material_transactions
        WHERE txn_type = 'incoming'
        GROUP BY po_match_status
    `);

    const openPOs = await pool.query(`
        SELECT COUNT(*) FROM purchase_orders WHERE status IN ('open','partial')
    `);

    const recentNotInPO = await pool.query(`
        SELECT mt.*, m.item_name, m.item_code
        FROM material_transactions mt
        JOIN materials m ON m.id = mt.material_id
        WHERE mt.po_match_status = 'not_in_po'
        ORDER BY mt.created_at DESC
        LIMIT 20
    `);

    res.json({
        totals: totals.rows,
        po_match_breakdown: poMatch.rows,
        open_or_partial_pos: parseInt(openPOs.rows[0].count),
        recent_not_in_po: recentNotInPO.rows
    });
});

module.exports = router;
