BEGIN;

CREATE TABLE IF NOT EXISTS vendor_invoices (
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

CREATE INDEX IF NOT EXISTS idx_vendor_invoices_po
    ON vendor_invoices(po_id);

CREATE INDEX IF NOT EXISTS idx_vendor_invoices_number
    ON vendor_invoices(invoice_number);

CREATE INDEX IF NOT EXISTS idx_vendor_invoices_payment_date
    ON vendor_invoices(payment_date);

COMMIT;
