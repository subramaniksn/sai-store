// Run with: npm run seed-admin
// Edit the values below before running, or set via env vars.
require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('../db/pool');

async function seed() {
    const name = process.env.SEED_ADMIN_NAME || 'Admin';
    const email = process.env.SEED_ADMIN_EMAIL || 'admin@saiautomation.co.in';
    const password = process.env.SEED_ADMIN_PASSWORD || 'Admin@123';

    const hash = await bcrypt.hash(password, 10);
    try {
        const result = await pool.query(
            `INSERT INTO users (name, email, password_hash, role)
             VALUES ($1,$2,$3,'admin')
             ON CONFLICT (email) DO NOTHING
             RETURNING id, email`,
            [name, email, hash]
        );
        if (result.rows.length) {
            console.log(`Admin created: ${email} / password: ${password} (CHANGE THIS AFTER FIRST LOGIN)`);
        } else {
            console.log('Admin user already exists, skipped.');
        }
    } catch (err) {
        console.error('Error seeding admin:', err.message);
    } finally {
        pool.end();
    }
}

seed();
