const test = require("node:test");
const assert = require("node:assert/strict");

const allowMutation = process.env.ALLOW_TEST_DATA_MUTATION === "YES";
const apiBase = (process.env.TEST_API_URL || "http://localhost:5001/api")
    .replace(/\/$/, "");
const adminEmail = process.env.TEST_ADMIN_EMAIL;
const adminPassword = process.env.TEST_ADMIN_PASSWORD;

if (!allowMutation) {
    throw new Error(
        "Lifecycle tests create database records. " +
        "Set ALLOW_TEST_DATA_MUTATION=YES only for a test database."
    );
}

if (!adminEmail || !adminPassword) {
    throw new Error(
        "TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD are required."
    );
}

async function request(path, options = {}) {
    const response = await fetch(`${apiBase}${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(options.token
                ? { Authorization: `Bearer ${options.token}` }
                : {}),
            ...options.headers
        },
        body: options.body ? JSON.stringify(options.body) : undefined
    });

    const text = await response.text();
    let data = null;

    if (text) {
        try {
            data = JSON.parse(text);
        } catch {
            data = text;
        }
    }

    if (!response.ok) {
        const message =
            data?.error ||
            data?.message ||
            `${response.status} ${response.statusText}`;

        throw new Error(`${options.method || "GET"} ${path}: ${message}`);
    }

    return data;
}

test(
    "complete material lifecycle keeps stock and ledger consistent",
    { timeout: 60000 },
    async () => {
        const stamp = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        const today = new Date().toISOString().substring(0, 10);

        const login = await request("/auth/login", {
            method: "POST",
            body: {
                email: adminEmail,
                password: adminPassword
            }
        });

        assert.ok(login.token, "Admin login must return a token");
        assert.equal(login.user.role, "admin");

        const token = login.token;

        const material = await request("/materials", {
            method: "POST",
            token,
            body: {
                item_code: `E2E-MAT-${stamp}`,
                item_name: `Lifecycle Material ${stamp}`,
                category: "Automated Test",
                brand: "Test",
                unit: "Nos",
                minimum_stock: 2,
                current_stock: 0,
                unit_price: 100
            }
        });

        assert.ok(material.id);
        assert.equal(Number(material.current_stock), 0);

        const supplier = await request("/suppliers", {
            method: "POST",
            token,
            body: {
                supplier_name: `Lifecycle Supplier ${stamp}`,
                contact_person: "Automated Test",
                email: `supplier-${stamp}@example.test`,
                state: "Test"
            }
        });

        assert.ok(supplier.id);

        const purchaseOrder = await request("/purchase-orders", {
            method: "POST",
            token,
            body: {
                po_number: `E2E-PO-${stamp}`,
                supplier_id: supplier.id,
                po_date: today,
                expected_delivery_date: today,
                project_name: "Lifecycle Test",
                subtotal: 1000,
                gst_percent: 0,
                freight: 0,
                grand_total: 1000,
                items: [{
                    material_id: material.id,
                    ordered_qty: 10,
                    unit_price: 100
                }]
            }
        });

        assert.ok(purchaseOrder.id);

        const poDetails = await request(
            `/purchase-orders/${purchaseOrder.id}`,
            { token }
        );

        assert.equal(poDetails.items.length, 1);
        assert.equal(Number(poDetails.items[0].pending_qty), 10);

        const grn = await request("/grn", {
            method: "POST",
            token,
            body: {
                po_id: purchaseOrder.id,
                supplier_id: supplier.id,
                invoice_number: `E2E-INV-${stamp}`,
                invoice_date: today,
                received_date: today,
                remarks: "Automated lifecycle receipt",
                items: [{
                    po_item_id: poDetails.items[0].id,
                    material_id: material.id,
                    received_qty: 10,
                    rejected_qty: 0,
                    unit_price: 100
                }]
            }
        });

        assert.ok(grn.id);
        assert.match(grn.grn_number, /^GRN-/);

        const materialIssue = await request("/material-issue", {
            method: "POST",
            token,
            body: {
                issue_number: `E2E-ISS-${stamp}`,
                issue_date: today,
                project_name: "Lifecycle Test",
                issued_to: "Automated Test",
                remarks: "Automated lifecycle issue",
                items: [{
                    material_id: material.id,
                    issue_qty: 4,
                    remarks: "Issue four"
                }]
            }
        });

        assert.ok(materialIssue.issue?.id);

        const partialReturn = await request("/material-return", {
            method: "POST",
            token,
            body: {
                issue_id: materialIssue.issue.id,
                return_date: today,
                returned_by: "Automated Test",
                remarks: "Automated partial return",
                items: [{
                    material_id: material.id,
                    returned_qty: 1
                }]
            }
        });

        assert.ok(partialReturn.return?.id);
        assert.match(partialReturn.return.return_number, /^RET-/);

        const fullReturn = await request("/material-return", {
            method: "POST",
            token,
            body: {
                issue_id: materialIssue.issue.id,
                return_date: today,
                returned_by: "Automated Test",
                remarks: "Automated final return",
                items: [{
                    material_id: material.id,
                    returned_qty: 3
                }]
            }
        });

        assert.ok(fullReturn.return?.id);

        const stockRows = await request(
            `/stock?search=${encodeURIComponent(material.item_code)}`,
            { token }
        );

        const stock = stockRows.find(
            row => Number(row.id) === Number(material.id)
        );

        assert.ok(stock, "Created material must appear in Stock Register");
        assert.equal(Number(stock.current_stock), 10);

        const ledger = await request(
            `/reports/material-ledger?material_id=${material.id}`,
            { token }
        );

        assert.equal(ledger.length, 4);
        assert.deepEqual(
            ledger.map(row => row.txn_type),
            ["incoming", "outgoing", "return", "return"]
        );
        assert.equal(
            ledger.reduce(
                (balance, row) =>
                    balance +
                    Number(row.in_qty) -
                    Number(row.out_qty),
                0
            ),
            10
        );
        assert.equal(ledger[0].po_number, purchaseOrder.po_number);
        assert.equal(ledger[0].grn_number, grn.grn_number);
        assert.equal(ledger[1].issue_number, materialIssue.issue.issue_number);
        assert.equal(
            ledger[2].return_number,
            partialReturn.return.return_number
        );
        assert.equal(
            ledger[3].return_number,
            fullReturn.return.return_number
        );

        const reconciliation = await request("/stock/reconciliation", {
            token
        });

        assert.equal(
            reconciliation.discrepancies.some(
                row => Number(row.id) === Number(material.id)
            ),
            false,
            "Created material must have no stock discrepancy"
        );
    }
);
