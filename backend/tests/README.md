# Lifecycle API test

This test creates real records in this order:

1. Material
2. Supplier
3. Purchase Order
4. GRN for 10 units
5. Material Issue for 4 units
6. Partial Return for 1 unit
7. Final Return for 3 units
8. Ledger, stock, and reconciliation assertions

Use a dedicated test database. Start the backend against that database, then
run this command from the `backend` folder in PowerShell:

```powershell
$env:ALLOW_TEST_DATA_MUTATION="YES"
$env:TEST_API_URL="http://localhost:5001/api"
$env:TEST_ADMIN_EMAIL="your-test-admin@example.com"
$env:TEST_ADMIN_PASSWORD="your-test-password"
npm run test:lifecycle
```

The safety flag is mandatory because the test intentionally leaves its
uniquely named records in the test database for audit and debugging.
