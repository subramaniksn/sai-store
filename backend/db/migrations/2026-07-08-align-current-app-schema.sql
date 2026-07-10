-- Align database schema with the current backend/frontend code.
-- Run this once on an existing SAI_Store PostgreSQL database.

BEGIN;

CREATE TABLE IF NOT EXISTS suppliers (
    id SERIAL PRIMARY KEY,
    supplier_name VARCHAR(200) NOT NULL,
    contact_person VARCHAR(150),
    phone VARCHAR(50),
    email VARCHAR(150),
    gst_number VARCHAR(50),
    state VARCHAR(100),
    address TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE suppliers
    ADD COLUMN IF NOT EXISTS contact_person VARCHAR(150),
    ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
    ADD COLUMN IF NOT EXISTS email VARCHAR(150),
    ADD COLUMN IF NOT EXISTS gst_number VARCHAR(50),
    ADD COLUMN IF NOT EXISTS state VARCHAR(100),
    ADD COLUMN IF NOT EXISTS address TEXT,
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

ALTER TABLE materials
    ADD COLUMN IF NOT EXISTS brand VARCHAR(100),
    ADD COLUMN IF NOT EXISTS minimum_stock NUMERIC(14,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS rack_location VARCHAR(100),
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS barcode_value VARCHAR(100),
    ADD COLUMN IF NOT EXISTS qr_value TEXT,
    ADD COLUMN IF NOT EXISTS maximum_stock NUMERIC(14,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS reorder_level NUMERIC(14,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS manufacturer VARCHAR(150),
    ADD COLUMN IF NOT EXISTS hsn_code VARCHAR(50),
    ADD COLUMN IF NOT EXISTS current_stock NUMERIC(14,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS unit_price NUMERIC(14,2) DEFAULT 0;

ALTER TABLE purchase_orders
    ADD COLUMN IF NOT EXISTS supplier_id INTEGER REFERENCES suppliers(id),
    ADD COLUMN IF NOT EXISTS expected_delivery_date DATE,
    ADD COLUMN IF NOT EXISTS project_name VARCHAR(200),
    ADD COLUMN IF NOT EXISTS vendor_code VARCHAR(100),
    ADD COLUMN IF NOT EXISTS project_code VARCHAR(100),
    ADD COLUMN IF NOT EXISTS ref_no VARCHAR(100),
    ADD COLUMN IF NOT EXISTS subtotal NUMERIC(14,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS gst_percent NUMERIC(5,2) DEFAULT 18,
    ADD COLUMN IF NOT EXISTS freight NUMERIC(14,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS grand_total NUMERIC(14,2) DEFAULT 0;

CREATE TABLE IF NOT EXISTS goods_receipts (
    id SERIAL PRIMARY KEY,
    grn_number VARCHAR(50) UNIQUE NOT NULL,
    po_id INTEGER REFERENCES purchase_orders(id),
    supplier_id INTEGER REFERENCES suppliers(id),
    invoice_number VARCHAR(100),
    invoice_date DATE,
    vehicle_number VARCHAR(100),
    dc_number VARCHAR(100),
    received_by INTEGER REFERENCES users(id),
    received_date DATE NOT NULL DEFAULT CURRENT_DATE,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE goods_receipts
    ADD COLUMN IF NOT EXISTS po_id INTEGER REFERENCES purchase_orders(id),
    ADD COLUMN IF NOT EXISTS supplier_id INTEGER REFERENCES suppliers(id),
    ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(100),
    ADD COLUMN IF NOT EXISTS invoice_date DATE,
    ADD COLUMN IF NOT EXISTS vehicle_number VARCHAR(100),
    ADD COLUMN IF NOT EXISTS dc_number VARCHAR(100),
    ADD COLUMN IF NOT EXISTS received_by INTEGER REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS received_date DATE DEFAULT CURRENT_DATE,
    ADD COLUMN IF NOT EXISTS remarks TEXT,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

CREATE TABLE IF NOT EXISTS goods_receipt_items (
    id SERIAL PRIMARY KEY,
    grn_id INTEGER NOT NULL REFERENCES goods_receipts(id) ON DELETE CASCADE,
    material_id INTEGER NOT NULL REFERENCES materials(id),
    ordered_qty NUMERIC(14,2) DEFAULT 0,
    received_qty NUMERIC(14,2) NOT NULL DEFAULT 0,
    accepted_qty NUMERIC(14,2) NOT NULL DEFAULT 0,
    rejected_qty NUMERIC(14,2) NOT NULL DEFAULT 0,
    unit_price NUMERIC(14,2) DEFAULT 0,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE goods_receipt_items
    ADD COLUMN IF NOT EXISTS grn_id INTEGER REFERENCES goods_receipts(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS material_id INTEGER REFERENCES materials(id),
    ADD COLUMN IF NOT EXISTS ordered_qty NUMERIC(14,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS received_qty NUMERIC(14,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS accepted_qty NUMERIC(14,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS rejected_qty NUMERIC(14,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS unit_price NUMERIC(14,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS remarks TEXT,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

CREATE TABLE IF NOT EXISTS material_issues (
    id SERIAL PRIMARY KEY,
    issue_number VARCHAR(50) UNIQUE NOT NULL,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    project_name VARCHAR(200),
    issued_to VARCHAR(150),
    issued_by INTEGER REFERENCES users(id),
    remarks TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE material_issues
    ADD COLUMN IF NOT EXISTS issue_date DATE DEFAULT CURRENT_DATE,
    ADD COLUMN IF NOT EXISTS project_name VARCHAR(200),
    ADD COLUMN IF NOT EXISTS issued_to VARCHAR(150),
    ADD COLUMN IF NOT EXISTS issued_by INTEGER REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS remarks TEXT,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

CREATE TABLE IF NOT EXISTS material_issue_items (
    id SERIAL PRIMARY KEY,
    issue_id INTEGER NOT NULL REFERENCES material_issues(id) ON DELETE CASCADE,
    material_id INTEGER NOT NULL REFERENCES materials(id),
    issued_qty NUMERIC(14,2) NOT NULL DEFAULT 0,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE material_issue_items
    ADD COLUMN IF NOT EXISTS issue_id INTEGER REFERENCES material_issues(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS material_id INTEGER REFERENCES materials(id),
    ADD COLUMN IF NOT EXISTS issued_qty NUMERIC(14,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS remarks TEXT,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

CREATE TABLE IF NOT EXISTS material_returns (
    id SERIAL PRIMARY KEY,
    return_number VARCHAR(50) UNIQUE NOT NULL,
    issue_id INTEGER NOT NULL REFERENCES material_issues(id),
    return_date DATE NOT NULL DEFAULT CURRENT_DATE,
    returned_by VARCHAR(150),
    received_by INTEGER REFERENCES users(id),
    remarks TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE material_returns
    ADD COLUMN IF NOT EXISTS issue_id INTEGER REFERENCES material_issues(id),
    ADD COLUMN IF NOT EXISTS return_date DATE DEFAULT CURRENT_DATE,
    ADD COLUMN IF NOT EXISTS returned_by VARCHAR(150),
    ADD COLUMN IF NOT EXISTS received_by INTEGER REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS remarks TEXT,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

CREATE TABLE IF NOT EXISTS material_return_items (
    id SERIAL PRIMARY KEY,
    return_id INTEGER NOT NULL REFERENCES material_returns(id) ON DELETE CASCADE,
    material_id INTEGER NOT NULL REFERENCES materials(id),
    returned_qty NUMERIC(14,2) NOT NULL DEFAULT 0,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE material_return_items
    ADD COLUMN IF NOT EXISTS return_id INTEGER REFERENCES material_returns(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS material_id INTEGER REFERENCES materials(id),
    ADD COLUMN IF NOT EXISTS returned_qty NUMERIC(14,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS remarks TEXT,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

CREATE TABLE IF NOT EXISTS internal_use (
    id SERIAL PRIMARY KEY,
    internal_use_number VARCHAR(50) UNIQUE NOT NULL,
    use_date DATE NOT NULL DEFAULT CURRENT_DATE,
    department VARCHAR(150),
    used_by VARCHAR(150),
    purpose VARCHAR(255),
    remarks TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE internal_use
    ADD COLUMN IF NOT EXISTS use_date DATE DEFAULT CURRENT_DATE,
    ADD COLUMN IF NOT EXISTS department VARCHAR(150),
    ADD COLUMN IF NOT EXISTS used_by VARCHAR(150),
    ADD COLUMN IF NOT EXISTS purpose VARCHAR(255),
    ADD COLUMN IF NOT EXISTS remarks TEXT,
    ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

CREATE TABLE IF NOT EXISTS internal_use_items (
    id SERIAL PRIMARY KEY,
    internal_use_id INTEGER NOT NULL REFERENCES internal_use(id) ON DELETE CASCADE,
    material_id INTEGER NOT NULL REFERENCES materials(id),
    used_qty NUMERIC(14,2) NOT NULL DEFAULT 0,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE internal_use_items
    ADD COLUMN IF NOT EXISTS internal_use_id INTEGER REFERENCES internal_use(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS material_id INTEGER REFERENCES materials(id),
    ADD COLUMN IF NOT EXISTS used_qty NUMERIC(14,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS remarks TEXT,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    message TEXT,
    type VARCHAR(30) DEFAULT 'info',
    reference_type VARCHAR(50),
    reference_id INTEGER,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE notifications
    ADD COLUMN IF NOT EXISTS message TEXT,
    ADD COLUMN IF NOT EXISTS type VARCHAR(30) DEFAULT 'info',
    ADD COLUMN IF NOT EXISTS reference_type VARCHAR(50),
    ADD COLUMN IF NOT EXISTS reference_id INTEGER,
    ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

ALTER TABLE material_transactions
    ADD COLUMN IF NOT EXISTS grn_id INTEGER REFERENCES goods_receipts(id);

DO $$
BEGIN
    ALTER TABLE material_transactions
        DROP CONSTRAINT IF EXISTS material_transactions_txn_type_check;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'material_transactions_txn_type_current_check'
    ) THEN
        ALTER TABLE material_transactions
            ADD CONSTRAINT material_transactions_txn_type_current_check
            CHECK (txn_type IN ('incoming', 'outgoing', 'internal_use', 'return'));
    END IF;

    ALTER TABLE material_transactions
        DROP CONSTRAINT IF EXISTS material_transactions_po_match_status_check;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'material_transactions_po_match_status_current_check'
    ) THEN
        ALTER TABLE material_transactions
            ADD CONSTRAINT material_transactions_po_match_status_current_check
            CHECK (
                po_match_status IS NULL
                OR po_match_status IN ('matched', 'as_per_po', 'not_in_po', 'excess_qty', 'short_qty')
            );
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_goods_receipts_po ON goods_receipts(po_id);
CREATE INDEX IF NOT EXISTS idx_goods_receipt_items_grn ON goods_receipt_items(grn_id);
CREATE INDEX IF NOT EXISTS idx_material_issues_issue_date ON material_issues(issue_date);
CREATE INDEX IF NOT EXISTS idx_material_returns_issue ON material_returns(issue_id);
CREATE INDEX IF NOT EXISTS idx_internal_use_date ON internal_use(use_date);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);

COMMIT;
