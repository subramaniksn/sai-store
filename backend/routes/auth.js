const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const { authenticate, authorize, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// LOGIN  (used by the single Login Page for all roles)
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
    }
    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1 AND is_active = TRUE', [email]);
        const user = result.rows[0];
        if (!user) return res.status(401).json({ error: 'Invalid email or password' });

        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) return res.status(401).json({ error: 'Invalid email or password' });

        const token = jwt.sign(
            { id: user.id, name: user.name, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '12h' }
        );

        res.json({
            token,
            user: { id: user.id, name: user.name, email: user.email, role: user.role }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error during login' });
    }
});

// GET current logged in user
router.get('/me', authenticate, (req, res) => {
    res.json({ user: req.user });
});

// ADMIN ONLY: create a new user (store_incharge / manager / admin)
router.post('/users', authenticate, authorize('admin'), async (req, res) => {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) {
        return res.status(400).json({ error: 'name, email, password, role are required' });
    }
    if (!['admin', 'manager', 'store_incharge'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
    }
    try {
        const hash = await bcrypt.hash(password, 10);
        const result = await pool.query(
            `INSERT INTO users (name, email, password_hash, role) VALUES ($1,$2,$3,$4)
             RETURNING id, name, email, role, is_active, created_at`,
            [name, email, hash, role]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') return res.status(409).json({ error: 'Email already exists' });
        console.error(err);
        res.status(500).json({ error: 'Server error creating user' });
    }
});

// ADMIN ONLY: list all users
router.get('/users', authenticate, authorize('admin'), async (req, res) => {
    const result = await pool.query('SELECT id, name, email, role, is_active, created_at FROM users ORDER BY id');
    res.json(result.rows);
});

// ADMIN ONLY: activate/deactivate a user
router.patch('/users/:id', authenticate, authorize('admin'), async (req, res) => {
    const { is_active, role } = req.body;
    const fields = [];
    const values = [];
    let i = 1;
    if (is_active !== undefined) { fields.push(`is_active = $${i++}`); values.push(is_active); }
    if (role !== undefined) { fields.push(`role = $${i++}`); values.push(role); }
    if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });
    values.push(req.params.id);
    const result = await pool.query(
        `UPDATE users SET ${fields.join(', ')} WHERE id = $${i} RETURNING id, name, email, role, is_active`,
        values
    );
    res.json(result.rows[0]);
});

module.exports = router;
