# SAI Store ERP

SAI Store ERP is a full-stack store management system for material master, supplier master, purchase orders, vendor invoice/payment tracking, GRN, material issue, material return, stock register, ledger, reports, audit log, and backup exports.

## Tech Stack

- Frontend: React
- Backend: Node.js, Express
- Database: PostgreSQL
- Auth: JWT

## Project Structure

```text
backend/     Express API, PostgreSQL routes, migrations
frontend/    React app
```

## Prerequisites

- Node.js 20+
- PostgreSQL
- Git

## Backend Setup

```powershell
cd backend
npm install
copy env.example .env
```

Update `backend/.env` with your PostgreSQL details:

```text
PORT=5001
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_db_password
DB_NAME=store_app
JWT_SECRET=replace_with_a_long_random_string
```

Start backend:

```powershell
npm start
```

If your backend package uses a dev script, you can use that instead:

```powershell
npm run dev
```

## Frontend Setup

```powershell
cd frontend
npm install
copy env.example .env
```

Default frontend API URL:

```text
REACT_APP_API_URL=http://localhost:5001/api
```

Start frontend:

```powershell
npm start
```

## Database Setup

For a fresh database, use:

```text
backend/db/fresh_schema.sql
```

For an existing database, run migrations in this order:

```text
backend/db/migrations/2026-07-08-align-current-app-schema.sql
backend/db/migrations/2026-07-09-issue-grn-integrity.sql
backend/db/migrations/2026-07-09-material-movement-traceability.sql
backend/db/migrations/2026-07-10-audit-log.sql
backend/db/migrations/2026-07-10-soft-delete-master-data.sql
backend/db/migrations/2026-07-10-vendor-invoice-payments.sql
```

Run migrations manually in pgAdmin or PostgreSQL query tool.

## Main Modules

- Dashboard
- User Management
- Material Master
- Supplier Master
- Purchase Orders
- Vendor Invoice / Payment
- Goods Receipt Note
- Stock Register
- Material Ledger
- Material Issue
- Material Return
- Internal Use
- Reports
- Audit Log
- Backup
- Low Stock Alert

## Recommended Test Flow

After setup, test in this order:

1. Create supplier
2. Create material
3. Create purchase order
4. Add vendor invoice/payment against PO
5. Create GRN against PO
6. Create material issue
7. Create material return
8. Check material ledger
9. Check stock register
10. Check reports and audit log

## Backup

The app has an Admin-only Backup page for Excel exports. Still, for real recovery, take PostgreSQL backups regularly.

Recommended:

- Weekly PostgreSQL backup
- Keep one backup outside the system
- Test restore occasionally

## Git Notes

Do not commit:

- `.env`
- `node_modules`
- build output

These are already ignored by `.gitignore`.
