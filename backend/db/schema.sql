-- =====================================================================
-- Material Store Management System - PostgreSQL Schema
-- =====================================================================

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'manager', 'store_incharge')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Master list of materials/items
CREATE TABLE IF NOT EXISTS materials (
    id SERIAL PRIMARY KEY,
    item_code VARCHAR(50) UNIQUE,
    item_name VARCHAR(200) NOT NULL,
    unit VARCHAR(20) NOT NULL DEFAULT 'Nos',  -- Nos, Kg, Mtr, Ltr, Box etc
    category VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Purchase Orders
CREATE TABLE IF NOT EXISTS purchase_orders (
    id SERIAL PRIMARY KEY,
    po_number VARCHAR(50) UNIQUE NOT NULL,
    supplier_name VARCHAR(200),
    po_date DATE,
    created_by INTEGER REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'partial', 'closed', 'cancelled')),
    remarks TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Line items within a PO
CREATE TABLE IF NOT EXISTS po_items (
    id SERIAL PRIMARY KEY,
    po_id INTEGER NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    material_id INTEGER NOT NULL REFERENCES materials(id),
    ordered_qty NUMERIC(14,2) NOT NULL,
    received_qty NUMERIC(14,2) NOT NULL DEFAULT 0,
    unit_price NUMERIC(14,2),
    UNIQUE (po_id, material_id)
);

-- All material movements: incoming / outgoing / internal_use / return
CREATE TABLE IF NOT EXISTS material_transactions (
    id SERIAL PRIMARY KEY,
    txn_type VARCHAR(20) NOT NULL CHECK (txn_type IN ('incoming', 'outgoing', 'internal_use', 'return')),
    material_id INTEGER NOT NULL REFERENCES materials(id),
    quantity NUMERIC(14,2) NOT NULL,

    -- Incoming-specific fields
    po_id INTEGER REFERENCES purchase_orders(id),          -- NULL if not against any PO
    po_match_status VARCHAR(20) CHECK (po_match_status IN ('as_per_po', 'not_in_po', 'excess_qty', 'short_qty', NULL)),

    -- Outgoing-specific
    issued_to VARCHAR(150),       -- person/site/department material is going out to
    purpose VARCHAR(255),

    -- Internal use specific
    used_by_dept VARCHAR(150),
    used_for VARCHAR(255),

    remarks TEXT,
    entered_by INTEGER REFERENCES users(id),
    txn_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_txn_type ON material_transactions(txn_type);
CREATE INDEX IF NOT EXISTS idx_txn_material ON material_transactions(material_id);
CREATE INDEX IF NOT EXISTS idx_txn_po ON material_transactions(po_id);
CREATE INDEX IF NOT EXISTS idx_po_items_po ON po_items(po_id);

-- Seed an initial admin user (password: Admin@123 -- CHANGE AFTER FIRST LOGIN)
-- Hash generated with bcrypt, see backend/scripts/seedAdmin.js to regenerate
