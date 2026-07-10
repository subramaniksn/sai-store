# Changelog

## v1.0.0 - Initial SAI Store ERP

### Added

- Admin, Manager, and Store Incharge role-based access
- Dashboard with stock, returns, and inventory statistics
- Material Master with barcode/QR label support
- Supplier Master with vendor code and active/inactive handling
- Purchase Order creation with backend auto PO numbering and PO print format
- PO page auto-fills supplier vendor code and suggests previous project/ref values
- Vendor Invoice / Payment tracking linked with PO
- Goods Receipt Note against open/partial PO
- Material Issue with stock validation and generated issue numbers
- Material Return with generated return numbers and issue traceability
- Internal Use stock movement
- Stock Register with reconciliation check/repair
- Material Ledger with PO, GRN, Issue, and Return references
- Low Stock and Out of Stock alerts
- Notification navigation for PO, GRN, Issue, Return, Stock, and Material
- Reports for:
  - Current Stock
  - Purchase Orders
  - Incoming Material
  - Outgoing Material
  - Internal Use
  - Material Return
  - Vendor Payment
- Audit Log for important create/update/deactivate/reactivate/repair actions
- Backup page with Excel exports and system snapshot
- Responsive fixed layout with stable sidebar/header and scrollable page body
- PostgreSQL migrations for schema evolution
- Project README and Git line-ending configuration

### Database Migrations

- `2026-07-08-align-current-app-schema.sql`
- `2026-07-09-issue-grn-integrity.sql`
- `2026-07-09-material-movement-traceability.sql`
- `2026-07-10-audit-log.sql`
- `2026-07-10-soft-delete-master-data.sql`
- `2026-07-10-po-number-sequence.sql`
- `2026-07-10-supplier-vendor-code.sql`
- `2026-07-10-vendor-invoice-payments.sql`

### Notes

- `.env` files are intentionally not committed.
- `node_modules` and build output are intentionally ignored.
- PostgreSQL backup is still recommended in addition to Excel exports.

## Future Improvements

- File attachment upload for vendor invoices
- Soft-delete/restore support for transaction documents if needed
- Better print templates for all major documents
- Dashboard charts for payments and stock movement trends
- User activity report based on Audit Log
