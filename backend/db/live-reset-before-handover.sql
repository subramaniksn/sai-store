BEGIN;

TRUNCATE TABLE
    notifications,
    audit_logs,
    vendor_invoices,
    goods_receipt_items,
    goods_receipts,
    material_return_items,
    material_returns,
    material_issue_items,
    material_issues,
    internal_use_items,
    internal_use,
    material_transactions,
    po_items,
    purchase_orders
RESTART IDENTITY CASCADE;

UPDATE materials
SET current_stock = 0;

ALTER SEQUENCE purchase_order_number_seq RESTART WITH 1;
ALTER SEQUENCE grn_number_seq RESTART WITH 1;
ALTER SEQUENCE material_issue_number_seq RESTART WITH 1;
ALTER SEQUENCE material_return_number_seq RESTART WITH 1;

COMMIT;
