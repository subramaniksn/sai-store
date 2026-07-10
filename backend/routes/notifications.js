const express = require("express");
const pool = require("../db/pool");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

/* ============================================
   GET ALL NOTIFICATIONS
============================================ */

router.get(
    "/",
    authenticate,
    authorize("admin", "manager", "store_incharge"),
    async (req, res) => {

        try {

            const result = await pool.query(`
                SELECT
                    *,
                    created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata' AS created_at_ist
                FROM notifications
                ORDER BY created_at DESC
                LIMIT 50
            `);

            res.json(result.rows);

        } catch (err) {

            console.log(err);

            res.status(500).json({
                error: "Unable to load notifications."
            });

        }

    }
);

/* ============================================
   UNREAD COUNT
============================================ */

router.get(
    "/unread-count",
    authenticate,
    authorize("admin", "manager", "store_incharge"),
    async (req, res) => {

        try {

            const result = await pool.query(`
                SELECT COUNT(*) total
                FROM notifications
                WHERE is_read = FALSE
            `);

            res.json({
                unread: Number(result.rows[0].total)
            });

        } catch (err) {

            console.log(err);

            res.status(500).json({
                error: "Unable to load unread count."
            });

        }

    }
);

/* ============================================
   MARK AS READ
============================================ */

router.put(
    "/read/:id",
    authenticate,
    authorize("admin", "manager", "store_incharge"),
    async (req, res) => {

        try {

            await pool.query(`
                UPDATE notifications
                SET is_read = TRUE
                WHERE id = $1
            `, [req.params.id]);

            res.json({
                success: true
            });

        } catch (err) {

            console.log(err);

            res.status(500).json({
                error: "Unable to update notification."
            });

        }

    }
);

/* ============================================
   MARK ALL AS READ
============================================ */

router.put(
    "/read-all",
    authenticate,
    authorize("admin", "manager", "store_incharge"),
    async (req, res) => {

        try {

            await pool.query(`
                UPDATE notifications
                SET is_read = TRUE
            `);

            res.json({
                success: true
            });

        } catch (err) {

            console.log(err);

            res.status(500).json({
                error: "Unable to update notifications."
            });

        }

    }
);

/* ============================================
   DELETE
============================================ */

router.delete(
    "/:id",
    authenticate,
    authorize("admin"),
    async (req, res) => {

        try {

            await pool.query(`
                DELETE
                FROM notifications
                WHERE id = $1
            `, [req.params.id]);

            res.json({
                success: true
            });

        } catch (err) {

            console.log(err);

            res.status(500).json({
                error: "Unable to delete notification."
            });

        }

    }
);

module.exports = router;