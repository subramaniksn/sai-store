import React, { useEffect, useState } from "react";
import api from "../../api/client";
import getApiErrorMessage from "../../api/errorMessage";

export default function MaterialReturn() {

    const [returnNumber, setReturnNumber] = useState("");
    const [issues, setIssues] = useState([]);
    const [selectedIssue, setSelectedIssue] = useState("");
    const [issueDetails, setIssueDetails] = useState(null);
    const [items, setItems] = useState([]);
    const [returnHistory, setReturnHistory] = useState([]);
    const [selectedReturn, setSelectedReturn] = useState(null);
    const [returnItems, setReturnItems] = useState([]);

    const [form, setForm] = useState({
        return_date: new Date().toISOString().substring(0, 10),
        returned_by: "",
        remarks: ""
    });

    useEffect(() => {
        loadReturnNumber();
        loadIssues();
        loadReturnHistory();

        const returnId = localStorage.getItem("selectedReturn");

        if (returnId) {
            viewReturn(returnId);
            localStorage.removeItem("selectedReturn");
        }
    }, []);

    useEffect(() => {
        const openSelectedReturn = (event) => {
            const returnId =
                event.detail?.returnId ||
                localStorage.getItem("selectedReturn");

            if (returnId) {
                viewReturn(returnId);
                localStorage.removeItem("selectedReturn");
            }
        };

        window.addEventListener("openMaterialReturn", openSelectedReturn);

        return () => {
            window.removeEventListener("openMaterialReturn", openSelectedReturn);
        };
    }, []);

    const loadReturnNumber = async () => {
        const res = await api.get("/material-return/next-number");
        setReturnNumber(res.data.return_number);
    };

    const loadIssues = async () => {
        const res = await api.get("/material-return/issues");
        setIssues(res.data);
    };

    const loadIssueDetails = async (id) => {
        if (!id) {
            setIssueDetails(null);
            setItems([]);
            return;
        }

        try {
            const res = await api.get(`/material-return/issue/${id}`);

            setIssueDetails(res.data.issue);

            setItems(
                res.data.items.map(i => ({
                    ...i,
                    return_qty: 0,
                    remarks: ""
                }))
            );
        } catch (err) {
            setIssueDetails(null);
            setItems([]);
            alert(getApiErrorMessage(
                err,
                "Unable to load Material Issue details."
            ));
        }
    };

    const updateItem = (index, value) => {
        const arr = [...items];

        const issued = Number(arr[index].issued_qty || 0);
        const returned = Number(arr[index].already_returned_qty || 0);
        const balance = issued - returned;

        let qty = Number(value || 0);

        if (qty > balance) qty = balance;
        if (qty < 0) qty = 0;

        arr[index].return_qty = qty;

        setItems(arr);
    };

    const loadReturnHistory = async () => {
        const res = await api.get("/material-return");
        setReturnHistory(res.data);
    };

    const viewReturn = async (id) => {
        try {
            const res = await api.get(`/material-return/${id}`);
            setSelectedReturn(res.data.return);
            setReturnItems(res.data.items);
        } catch (err) {
            alert(getApiErrorMessage(
                err,
                "Unable to load Material Return details."
            ));
        }
    };

    const printReturnSlip = () => {
        if (!selectedReturn) return;

        const totalQty = returnItems.reduce(
            (sum, item) => sum + Number(item.returned_qty || 0),
            0
        );

        const itemRows = returnItems.map((item, index) => `
            <tr>
                <td class="center">${index + 1}</td>
                <td>${escapeHtml(item.item_code)}</td>
                <td>${escapeHtml(item.item_name)}</td>
                <td class="center">${escapeHtml(item.unit)}</td>
                <td class="right">${Number(item.returned_qty || 0)}</td>
                <td>${escapeHtml(item.remarks || "-")}</td>
            </tr>
        `).join("");

        const printWindow = window.open("", "_blank");

        if (!printWindow) {
            alert("Unable to open print window. Please allow popups.");
            return;
        }

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Material Return ${escapeHtml(selectedReturn.return_number)}</title>
                <style>
                    @page { size: A4; margin: 14mm; }
                    * { box-sizing: border-box; }
                    body {
                        font-family: Arial, sans-serif;
                        color: #111827;
                        margin: 0;
                        font-size: 12px;
                    }
                    .header {
                        text-align: center;
                        border-bottom: 2px solid #111827;
                        padding-bottom: 12px;
                        margin-bottom: 18px;
                    }
                    .header h1 { margin: 0 0 5px; font-size: 24px; }
                    .header h2 { margin: 0; font-size: 17px; }
                    .details {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 8px 24px;
                        margin-bottom: 18px;
                    }
                    .detail {
                        border-bottom: 1px solid #d1d5db;
                        padding: 5px 0;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 12px;
                    }
                    th, td {
                        border: 1px solid #9ca3af;
                        padding: 7px;
                        vertical-align: top;
                    }
                    th { background: #e5e7eb; text-align: left; }
                    .center { text-align: center; }
                    .right { text-align: right; }
                    .totals {
                        margin-top: 12px;
                        text-align: right;
                        font-weight: bold;
                    }
                    .remarks {
                        margin-top: 18px;
                        border: 1px solid #9ca3af;
                        padding: 10px;
                        min-height: 55px;
                    }
                    .signatures {
                        display: grid;
                        grid-template-columns: repeat(3, 1fr);
                        gap: 30px;
                        margin-top: 70px;
                        text-align: center;
                    }
                    .signature {
                        border-top: 1px solid #111827;
                        padding-top: 7px;
                    }
                    .no-print { margin-bottom: 15px; text-align: right; }
                    @media print { .no-print { display: none; } }
                </style>
            </head>
            <body>
                <div class="no-print">
                    <button onclick="window.print()">Print</button>
                </div>

                <div class="header">
                    <h1>SAI Automation</h1>
                    <h2>Material Return Slip</h2>
                </div>

                <div class="details">
                    <div class="detail"><b>Return Number:</b> ${escapeHtml(selectedReturn.return_number)}</div>
                    <div class="detail"><b>Return Date:</b> ${escapeHtml(selectedReturn.return_date?.substring(0, 10))}</div>
                    <div class="detail"><b>Issue Number:</b> ${escapeHtml(selectedReturn.issue_number)}</div>
                    <div class="detail"><b>Project:</b> ${escapeHtml(selectedReturn.project_name || "-")}</div>
                    <div class="detail"><b>Originally Issued To:</b> ${escapeHtml(selectedReturn.issued_to || "-")}</div>
                    <div class="detail"><b>Returned By:</b> ${escapeHtml(selectedReturn.returned_by || "-")}</div>
                    <div class="detail"><b>Received By:</b> ${escapeHtml(selectedReturn.received_by_name || "-")}</div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Item Code</th>
                            <th>Material</th>
                            <th>Unit</th>
                            <th>Returned Qty</th>
                            <th>Remarks</th>
                        </tr>
                    </thead>
                    <tbody>${itemRows}</tbody>
                </table>

                <div class="totals">
                    Total Items: ${returnItems.length}
                    &nbsp;&nbsp;|&nbsp;&nbsp;
                    Total Quantity: ${totalQty}
                </div>

                <div class="remarks">
                    <b>Return Remarks:</b><br><br>
                    ${escapeHtml(selectedReturn.remarks || "-")}
                </div>

                <div class="signatures">
                    <div class="signature">Returned By</div>
                    <div class="signature">Store Received By</div>
                    <div class="signature">Authorized By</div>
                </div>
            </body>
            </html>
        `);

        printWindow.document.close();
    };

    const saveReturn = async () => {
        const returnItems = items.filter(i => Number(i.return_qty) > 0);

        if (!selectedIssue) {
            alert("Please select Material Issue.");
            return;
        }

        if (returnItems.length === 0) {
            alert("Please enter return quantity.");
            return;
        }

        try {
            const res = await api.post("/material-return", {
                issue_id: Number(selectedIssue),
                return_date: form.return_date,
                returned_by: form.returned_by,
                remarks: form.remarks,
                items: returnItems.map(i => ({
                    material_id: i.material_id,
                    returned_qty: Number(i.return_qty),
                    remarks: i.remarks || null
                }))
            });

            alert(
                `Material Return ${res.data.return.return_number} Saved Successfully.`
            );

            setSelectedIssue("");
            setIssueDetails(null);
            setItems([]);
            setForm({
                return_date: new Date().toISOString().substring(0, 10),
                returned_by: "",
                remarks: ""
            });

            loadReturnNumber();
            loadIssues();
            loadReturnHistory();
        } catch (err) {
            alert(getApiErrorMessage(err, "Unable to save Material Return."));
        }
    };

    const totalItems = items.filter(i => Number(i.return_qty) > 0).length;

    const totalQty = items.reduce(
        (sum, i) => sum + Number(i.return_qty || 0),
        0
    );

    return (
        <div style={styles.card}>

            <h2>Material Return</h2>

            <div style={styles.grid}>

                <div>
                    <label>Return Number</label>
                    <input value={returnNumber} readOnly />
                </div>

                <div>
                    <label>Return Date</label>
                    <input
                        type="date"
                        value={form.return_date}
                        onChange={(e) =>
                            setForm({
                                ...form,
                                return_date: e.target.value
                            })
                        }
                    />
                </div>

                <div>
                    <label>Material Issue</label>
                    <select
                        value={selectedIssue}
                        onChange={(e) => {
                            setSelectedIssue(e.target.value);
                            loadIssueDetails(e.target.value);
                        }}
                    >
                        <option value="">Select Issue</option>

                        {issues.map(issue => (
                            <option key={issue.id} value={issue.id}>
                                {issue.issue_number} - {issue.issued_to || "-"}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label>Returned By</label>
                    <input
                        value={form.returned_by}
                        onChange={(e) =>
                            setForm({
                                ...form,
                                returned_by: e.target.value
                            })
                        }
                    />
                </div>

                <div style={{ gridColumn: "1 / span 2" }}>
                    <label>Remarks</label>
                    <textarea
                        rows={3}
                        value={form.remarks}
                        onChange={(e) =>
                            setForm({
                                ...form,
                                remarks: e.target.value
                            })
                        }
                    />
                </div>

            </div>

            {issueDetails && (
                <div style={styles.issueBox}>
                    <h3>Issue Details</h3>
                    <p><b>Issue No:</b> {issueDetails.issue_number}</p>
                    <p><b>Project:</b> {issueDetails.project_name || "-"}</p>
                    <p><b>Issued To:</b> {issueDetails.issued_to || "-"}</p>
                    <p><b>Issue Date:</b> {issueDetails.issue_date?.substring(0, 10)}</p>
                </div>
            )}

            <hr style={{ margin: "30px 0" }} />

            <h3>Return Materials</h3>

            <table style={styles.table}>
                <thead>
                    <tr>
                        <th>Item Code</th>
                        <th>Material</th>
                        <th>Unit</th>
                        <th>Issued Qty</th>
                        <th>Already Returned</th>
                        <th>Balance</th>
                        <th>Return Qty</th>
                    </tr>
                </thead>

                <tbody>
                    {items.map((item, index) => {
                        const issued = Number(item.issued_qty || 0);
                        const returned = Number(item.already_returned_qty || 0);
                        const balance = issued - returned;

                        return (
                            <tr key={item.id}>
                                <td>{item.item_code}</td>
                                <td>{item.item_name}</td>
                                <td>{item.unit}</td>
                                <td>{issued}</td>
                                <td>{returned}</td>
                                <td>{balance}</td>
                                <td>
                                    <input
                                        type="number"
                                        min="0"
                                        max={balance}
                                        value={item.return_qty}
                                        onChange={(e) =>
                                            updateItem(index, e.target.value)
                                        }
                                        style={{ width: 100 }}
                                    />
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            <hr style={{ marginTop: 30 }} />

            <div style={styles.footer}>
                <div>
                    <h3>Total Items : {totalItems}</h3>
                    <h3>Total Qty : {totalQty}</h3>
                </div>

                <button
                    onClick={saveReturn}
                    style={styles.saveButton}
                >
                    Save Return
                </button>
            </div>

            <hr style={{ margin: "40px 0" }} />

                <h2>Material Return History</h2>

                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th>Return No</th>
                            <th>Date</th>
                            <th>Issue No</th>
                            <th>Returned By</th>
                            <th>Total Items</th>
                            <th>Total Qty</th>
                            <th>Action</th>
                        </tr>
                    </thead>

                    <tbody>
                        {returnHistory.map(r => (
                            <tr key={r.id}>
                                <td>{r.return_number}</td>
                                <td>{r.return_date?.substring(0,10)}</td>
                                <td>{r.issue_number}</td>
                                <td>{r.returned_by}</td>
                                <td>{r.total_items}</td>
                                <td>{r.total_qty}</td>
                                <td>
                                    <button onClick={() => viewReturn(r.id)}>
                                        View
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {selectedReturn && (
                    <div style={styles.issueBox}>
                        <div style={styles.detailsHeader}>
                            <h3 style={{ margin: 0 }}>Return Details</h3>
                            <button
                                onClick={printReturnSlip}
                                style={styles.printButton}
                            >
                                Print Return Slip
                            </button>
                        </div>

                        <p><b>Return No:</b> {selectedReturn.return_number}</p>
                        <p><b>Issue No:</b> {selectedReturn.issue_number}</p>
                        <p><b>Returned By:</b> {selectedReturn.returned_by}</p>
                        <p><b>Received By:</b> {selectedReturn.received_by_name}</p>

                        <table style={styles.table}>
                            <thead>
                                <tr>
                                    <th>Item Code</th>
                                    <th>Material</th>
                                    <th>Unit</th>
                                    <th>Returned Qty</th>
                                    <th>Remarks</th>
                                </tr>
                            </thead>

                            <tbody>
                                {returnItems.map(item => (
                                    <tr key={item.id}>
                                        <td>{item.item_code}</td>
                                        <td>{item.item_name}</td>
                                        <td>{item.unit}</td>
                                        <td>{item.returned_qty}</td>
                                        <td>{item.remarks || "-"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

        </div>
    );
}

const styles = {
    card: {
        background: "#fff",
        padding: 25,
        borderRadius: 10,
        boxShadow: "0 2px 10px rgba(0,0,0,.08)"
    },

    grid: {
        display: "grid",
        gridTemplateColumns: "repeat(2,minmax(300px,1fr))",
        gap: 20,
        marginTop: 20
    },

    issueBox: {
        marginTop: 25,
        padding: 15,
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        borderRadius: 8
    },

    detailsHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 15
    },

    printButton: {
        background: "#2563eb",
        color: "#fff",
        border: "none",
        padding: "9px 16px",
        borderRadius: 6,
        cursor: "pointer",
        fontWeight: "bold"
    },

    table: {
        width: "100%",
        borderCollapse: "collapse",
        marginTop: 15
    },

    footer: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
    },

    saveButton: {
        background: "#16a34a",
        color: "#fff",
        border: "none",
        padding: "12px 30px",
        borderRadius: 6,
        cursor: "pointer",
        fontSize: 16
    }
};

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
