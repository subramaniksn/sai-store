-- ==========================================================
-- SAI Store fresh PostgreSQL schema
-- WARNING: This deletes all existing app data.
-- Run in pgAdmin Query Tool on your SAI_Store database.
-- ==========================================================

BEGIN;

DROP TABLE IF EXISTS
    material_return_items,
    material_returns,
    internal_use_items,
    internal_use,
    material_issue_items,
    material_issues,
    goods_receipt_items,
    goods_receipts,
    material_transactions,
    po_items,
    purchase_orders,
    suppliers,
    notifications,
    materials,
    users
CASCADE;

DROP SEQUENCE IF EXISTS
    material_return_number_seq,
    material_issue_number_seq,
    grn_number_seq;

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'manager', 'store_incharge')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE suppliers (
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

CREATE TABLE materials (
    id SERIAL PRIMARY KEY,
    item_code VARCHAR(50) UNIQUE,
    item_name VARCHAR(200) NOT NULL,
    unit VARCHAR(20) NOT NULL DEFAULT 'Nos',
    category VARCHAR(100),
    brand VARCHAR(100),
    minimum_stock NUMERIC(14,2) DEFAULT 0,
    rack_location VARCHAR(100),
    description TEXT,
    barcode_value VARCHAR(100),
    qr_value TEXT,
    maximum_stock NUMERIC(14,2) DEFAULT 0,
    reorder_level NUMERIC(14,2) DEFAULT 0,
    manufacturer VARCHAR(150),
    hsn_code VARCHAR(50),
    current_stock NUMERIC(14,2) DEFAULT 0,
    unit_price NUMERIC(14,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE purchase_orders (
    id SERIAL PRIMARY KEY,
    po_number VARCHAR(50) UNIQUE NOT NULL,
    supplier_id INTEGER REFERENCES suppliers(id),
    po_date DATE,
    expected_delivery_date DATE,
    project_name VARCHAR(200),
    vendor_code VARCHAR(100),
    project_code VARCHAR(100),
    ref_no VARCHAR(100),
    created_by INTEGER REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'partial', 'closed', 'cancelled')),
    remarks TEXT,
    subtotal NUMERIC(14,2) DEFAULT 0,
    gst_percent NUMERIC(5,2) DEFAULT 18,
    freight NUMERIC(14,2) DEFAULT 0,
    grand_total NUMERIC(14,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE po_items (
    id SERIAL PRIMARY KEY,
    po_id INTEGER NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    material_id INTEGER NOT NULL REFERENCES materials(id),
    ordered_qty NUMERIC(14,2) NOT NULL,
    received_qty NUMERIC(14,2) NOT NULL DEFAULT 0,
    unit_price NUMERIC(14,2) DEFAULT 0,
    UNIQUE (po_id, material_id)
);

CREATE TABLE vendor_invoices (
    id SERIAL PRIMARY KEY,
    po_id INTEGER NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    invoice_number VARCHAR(100) NOT NULL,
    invoice_date DATE,
    invoice_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    gst_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    paid_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    payment_date DATE,
    payment_mode VARCHAR(50),
    payment_reference VARCHAR(150),
    remarks TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (po_id, invoice_number)
);

CREATE TABLE goods_receipts (
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

CREATE SEQUENCE grn_number_seq;

CREATE TABLE goods_receipt_items (
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

CREATE TABLE material_issues (
    id SERIAL PRIMARY KEY,
    issue_number VARCHAR(50) UNIQUE NOT NULL,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    project_name VARCHAR(200),
    issued_to VARCHAR(150),
    issued_by INTEGER REFERENCES users(id),
    remarks TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE SEQUENCE material_issue_number_seq;

CREATE TABLE material_issue_items (
    id SERIAL PRIMARY KEY,
    issue_id INTEGER NOT NULL REFERENCES material_issues(id) ON DELETE CASCADE,
    material_id INTEGER NOT NULL REFERENCES materials(id),
    issued_qty NUMERIC(14,2) NOT NULL DEFAULT 0,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE material_returns (
    id SERIAL PRIMARY KEY,
    return_number VARCHAR(50) UNIQUE NOT NULL,
    issue_id INTEGER NOT NULL REFERENCES material_issues(id),
    return_date DATE NOT NULL DEFAULT CURRENT_DATE,
    returned_by VARCHAR(150),
    received_by INTEGER REFERENCES users(id),
    remarks TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE SEQUENCE material_return_number_seq;

CREATE TABLE material_return_items (
    id SERIAL PRIMARY KEY,
    return_id INTEGER NOT NULL REFERENCES material_returns(id) ON DELETE CASCADE,
    material_id INTEGER NOT NULL REFERENCES materials(id),
    returned_qty NUMERIC(14,2) NOT NULL DEFAULT 0,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE internal_use (
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

CREATE TABLE internal_use_items (
    id SERIAL PRIMARY KEY,
    internal_use_id INTEGER NOT NULL REFERENCES internal_use(id) ON DELETE CASCADE,
    material_id INTEGER NOT NULL REFERENCES materials(id),
    used_qty NUMERIC(14,2) NOT NULL DEFAULT 0,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE material_transactions (
    id SERIAL PRIMARY KEY,
    txn_type VARCHAR(20) NOT NULL CHECK (txn_type IN ('incoming', 'outgoing', 'internal_use', 'return')),
    material_id INTEGER NOT NULL REFERENCES materials(id),
    quantity NUMERIC(14,2) NOT NULL,
    po_id INTEGER REFERENCES purchase_orders(id),
    grn_id INTEGER REFERENCES goods_receipts(id),
    issue_id INTEGER REFERENCES material_issues(id),
    return_id INTEGER REFERENCES material_returns(id),
    po_match_status VARCHAR(20) CHECK (
        po_match_status IS NULL
        OR po_match_status IN ('matched', 'as_per_po', 'not_in_po', 'excess_qty', 'short_qty')
    ),
    issued_to VARCHAR(150),
    purpose VARCHAR(255),
    used_by_dept VARCHAR(150),
    used_for VARCHAR(255),
    remarks TEXT,
    entered_by INTEGER REFERENCES users(id),
    txn_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    message TEXT,
    type VARCHAR(30) DEFAULT 'info',
    reference_type VARCHAR(50),
    reference_id INTEGER,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    user_name VARCHAR(150),
    user_role VARCHAR(50),
    action VARCHAR(80) NOT NULL,
    entity_type VARCHAR(80) NOT NULL,
    entity_id INTEGER,
    entity_label VARCHAR(255),
    details JSONB,
    ip_address VARCHAR(80),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_materials_item_code ON materials(item_code);
CREATE INDEX idx_materials_current_stock ON materials(current_stock);
CREATE INDEX idx_materials_active ON materials(is_active);
CREATE INDEX idx_suppliers_active ON suppliers(is_active);
CREATE INDEX idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX idx_po_items_po ON po_items(po_id);
CREATE INDEX idx_po_items_material ON po_items(material_id);
CREATE INDEX idx_vendor_invoices_po ON vendor_invoices(po_id);
CREATE INDEX idx_vendor_invoices_number ON vendor_invoices(invoice_number);
CREATE INDEX idx_vendor_invoices_payment_date ON vendor_invoices(payment_date);
CREATE INDEX idx_goods_receipts_po ON goods_receipts(po_id);
CREATE INDEX idx_goods_receipt_items_grn ON goods_receipt_items(grn_id);
CREATE INDEX idx_material_issues_issue_date ON material_issues(issue_date);
CREATE INDEX idx_material_returns_issue ON material_returns(issue_id);
CREATE INDEX idx_internal_use_date ON internal_use(use_date);
CREATE INDEX idx_txn_type ON material_transactions(txn_type);
CREATE INDEX idx_txn_material ON material_transactions(material_id);
CREATE INDEX idx_txn_po ON material_transactions(po_id);
CREATE INDEX idx_material_transactions_issue ON material_transactions(issue_id);
CREATE INDEX idx_material_transactions_return ON material_transactions(return_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);

COMMIT;
