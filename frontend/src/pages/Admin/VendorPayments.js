import React, { useEffect, useState } from "react";
import api from "../../api/client";
import getApiErrorMessage from "../../api/errorMessage";

const emptyForm = {
    po_id: "",
    invoice_number: "",
    invoice_date: "",
    invoice_amount: "",
    gst_amount: "",
    paid_amount: "",
    payment_date: "",
    payment_mode: "",
    payment_reference: "",
    remarks: ""
};

export default function VendorPayments() {
    const [purchaseOrders, setPurchaseOrders] = useState([]);
    const [invoices, setInvoices] = useState([]);
    const [form, setForm] = useState(emptyForm);
    const [editingId, setEditingId] = useState(null);
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadPurchaseOrders();
        loadInvoices();
    }, []);

    useEffect(() => {
        const selectStoredPO = () => {
            const selectedPO = localStorage.getItem("selectedVendorPaymentPO");

            if (!selectedPO) return;

            setForm(prev => ({
                ...prev,
                po_id: selectedPO
            }));

            localStorage.removeItem("selectedVendorPaymentPO");
        };

        selectStoredPO();

        window.addEventListener("openVendorPayments", selectStoredPO);

        return () => {
            window.removeEventListener("openVendorPayments", selectStoredPO);
        };
    }, []);

    const loadPurchaseOrders = async () => {
        try {
            const res = await api.get("/purchase-orders");
            setPurchaseOrders(res.data || []);
        } catch (err) {
            setError(getApiErrorMessage(err, "Unable to load Purchase Orders."));
        }
    };

    const loadInvoices = async () => {
        try {
            const res = await api.get("/vendor-invoices", {
                params: {
                    search,
                    status
                }
            });

            setInvoices(res.data || []);
        } catch (err) {
            setError(getApiErrorMessage(err, "Unable to load vendor invoices."));
        }
    };

    const selectedPO = purchaseOrders.find(
        po => Number(po.id) === Number(form.po_id)
    );

    const balanceAmount =
        Number(form.invoice_amount || 0) - Number(form.paid_amount || 0);

    const paymentStatus = (() => {
        const invoiceAmount = Number(form.invoice_amount || 0);
        const paidAmount = Number(form.paid_amount || 0);

        if (invoiceAmount <= 0 || paidAmount <= 0) return "Unpaid";
        if (paidAmount >= invoiceAmount) return "Paid";
        return "Partially Paid";
    })();

    const handleChange = (field, value) => {
        setForm(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const resetForm = () => {
        setForm(emptyForm);
        setEditingId(null);
        setError("");
    };

    const saveInvoice = async (e) => {
        e.preventDefault();

        try {
            setLoading(true);
            setMessage("");
            setError("");

            if (editingId) {
                await api.put(`/vendor-invoices/${editingId}`, form);
                setMessage("Vendor invoice/payment updated successfully.");
            } else {
                await api.post("/vendor-invoices", form);
                setMessage("Vendor invoice/payment saved successfully.");
            }

            resetForm();
            loadInvoices();
            loadPurchaseOrders();
        } catch (err) {
            setError(getApiErrorMessage(err, "Unable to save vendor invoice/payment."));
        } finally {
            setLoading(false);
        }
    };

    const editInvoice = (invoice) => {
        setEditingId(invoice.id);
        setForm({
            po_id: invoice.po_id || "",
            invoice_number: invoice.invoice_number || "",
            invoice_date: invoice.invoice_date?.substring(0, 10) || "",
            invoice_amount: invoice.invoice_amount || "",
            gst_amount: invoice.gst_amount || "",
            paid_amount: invoice.paid_amount || "",
            payment_date: invoice.payment_date?.substring(0, 10) || "",
            payment_mode: invoice.payment_mode || "",
            payment_reference: invoice.payment_reference || "",
            remarks: invoice.remarks || ""
        });

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    };

    const formatMoney = (value) =>
        `₹ ${Number(value || 0).toFixed(2)}`;

    const formatStatus = (value) => {
        if (value === "paid") return "Paid";
        if (value === "partial") return "Partially Paid";
        if (value === "unpaid") return "Unpaid";
        return "No Invoice";
    };

    const statusStyle = (value) => {
        if (value === "paid") return styles.paidBadge;
        if (value === "partial") return styles.partialBadge;
        if (value === "unpaid") return styles.unpaidBadge;
        return styles.noInvoiceBadge;
    };

    return (
        <div style={styles.page}>
            <div style={styles.card}>
                <h2 style={styles.title}>
                    Vendor Invoice / Payment
                </h2>

                <p style={styles.subtitle}>
                    Record supplier invoice and payment status against each Purchase Order.
                </p>

                {message && <div style={styles.success}>{message}</div>}
                {error && <div style={styles.error}>{error}</div>}

                <form onSubmit={saveInvoice}>
                    <div style={styles.grid}>
                        <div>
                            <label>Purchase Order *</label>
                            <select
                                value={form.po_id}
                                onChange={(e) => handleChange("po_id", e.target.value)}
                                style={styles.input}
                                required
                            >
                                <option value="">Select PO</option>
                                {purchaseOrders.map(po => (
                                    <option key={po.id} value={po.id}>
                                        {po.po_number} - {po.supplier_name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label>Supplier</label>
                            <input
                                value={selectedPO?.supplier_name || ""}
                                style={styles.input}
                                readOnly
                            />
                        </div>

                        <div>
                            <label>PO Amount</label>
                            <input
                                value={selectedPO ? formatMoney(selectedPO.grand_total) : ""}
                                style={styles.input}
                                readOnly
                            />
                        </div>

                        <div>
                            <label>Invoice Number *</label>
                            <input
                                value={form.invoice_number}
                                onChange={(e) => handleChange("invoice_number", e.target.value)}
                                style={styles.input}
                                required
                            />
                        </div>

                        <div>
                            <label>Invoice Date</label>
                            <input
                                type="date"
                                value={form.invoice_date}
                                onChange={(e) => handleChange("invoice_date", e.target.value)}
                                style={styles.input}
                            />
                        </div>

                        <div>
                            <label>Invoice Amount *</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={form.invoice_amount}
                                onChange={(e) => handleChange("invoice_amount", e.target.value)}
                                style={styles.input}
                                required
                            />
                        </div>

                        <div>
                            <label>GST Amount</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={form.gst_amount}
                                onChange={(e) => handleChange("gst_amount", e.target.value)}
                                style={styles.input}
                            />
                        </div>

                        <div>
                            <label>Paid Amount</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={form.paid_amount}
                                onChange={(e) => handleChange("paid_amount", e.target.value)}
                                style={styles.input}
                            />
                        </div>

                        <div>
                            <label>Balance</label>
                            <input
                                value={formatMoney(Math.max(balanceAmount, 0))}
                                style={styles.input}
                                readOnly
                            />
                        </div>

                        <div>
                            <label>Payment Status</label>
                            <input
                                value={paymentStatus}
                                style={styles.input}
                                readOnly
                            />
                        </div>

                        <div>
                            <label>Payment Date</label>
                            <input
                                type="date"
                                value={form.payment_date}
                                onChange={(e) => handleChange("payment_date", e.target.value)}
                                style={styles.input}
                            />
                        </div>

                        <div>
                            <label>Payment Mode</label>
                            <select
                                value={form.payment_mode}
                                onChange={(e) => handleChange("payment_mode", e.target.value)}
                                style={styles.input}
                            >
                                <option value="">Select Mode</option>
                                <option value="Bank Transfer">Bank Transfer</option>
                                <option value="UPI">UPI</option>
                                <option value="Cheque">Cheque</option>
                                <option value="Cash">Cash</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>

                        <div>
                            <label>Transaction Reference</label>
                            <input
                                value={form.payment_reference}
                                onChange={(e) => handleChange("payment_reference", e.target.value)}
                                style={styles.input}
                            />
                        </div>
                    </div>

                    <div style={{ marginTop: 15 }}>
                        <label>Remarks</label>
                        <textarea
                            rows="3"
                            value={form.remarks}
                            onChange={(e) => handleChange("remarks", e.target.value)}
                            style={styles.textarea}
                        />
                    </div>

                    <div style={styles.buttonRow}>
                        <button
                            type="submit"
                            style={styles.saveButton}
                            disabled={loading}
                        >
                            {loading
                                ? "Saving..."
                                : editingId
                                    ? "Update Invoice / Payment"
                                    : "Save Invoice / Payment"}
                        </button>

                        {editingId && (
                            <button
                                type="button"
                                onClick={resetForm}
                                style={styles.cancelButton}
                            >
                                Cancel
                            </button>
                        )}
                    </div>
                </form>
            </div>

            <div style={styles.card}>
                <div style={styles.listHeader}>
                    <h3 style={{ margin: 0 }}>
                        Vendor Invoice / Payment List
                    </h3>

                    <div style={styles.filters}>
                        <input
                            placeholder="Search PO / Invoice / Supplier..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={styles.searchInput}
                        />

                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            style={styles.searchInput}
                        >
                            <option value="">All Status</option>
                            <option value="unpaid">Unpaid</option>
                            <option value="partial">Partially Paid</option>
                            <option value="paid">Paid</option>
                        </select>

                        <button
                            type="button"
                            onClick={loadInvoices}
                            style={styles.searchButton}
                        >
                            Search
                        </button>
                    </div>
                </div>

                <div style={{ overflowX: "auto" }}>
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                <th style={styles.th}>PO Number</th>
                                <th style={styles.th}>Supplier</th>
                                <th style={styles.th}>Invoice No</th>
                                <th style={styles.th}>Invoice Date</th>
                                <th style={styles.th}>Invoice Amount</th>
                                <th style={styles.th}>Paid</th>
                                <th style={styles.th}>Balance</th>
                                <th style={styles.th}>Status</th>
                                <th style={styles.th}>Payment Ref</th>
                                <th style={styles.th}>Action</th>
                            </tr>
                        </thead>

                        <tbody>
                            {invoices.length === 0 && (
                                <tr>
                                    <td colSpan="10" style={styles.empty}>
                                        No invoice/payment records found.
                                    </td>
                                </tr>
                            )}

                            {invoices.map(invoice => (
                                <tr key={invoice.id}>
                                    <td style={styles.td}>{invoice.po_number}</td>
                                    <td style={styles.td}>{invoice.supplier_name}</td>
                                    <td style={styles.td}>{invoice.invoice_number}</td>
                                    <td style={styles.td}>
                                        {invoice.invoice_date?.substring(0, 10) || "-"}
                                    </td>
                                    <td style={styles.td}>{formatMoney(invoice.invoice_amount)}</td>
                                    <td style={styles.td}>{formatMoney(invoice.paid_amount)}</td>
                                    <td style={styles.td}>{formatMoney(invoice.balance_amount)}</td>
                                    <td style={styles.td}>
                                        <span style={{
                                            ...styles.badge,
                                            ...statusStyle(invoice.payment_status)
                                        }}>
                                            {formatStatus(invoice.payment_status)}
                                        </span>
                                    </td>
                                    <td style={styles.td}>{invoice.payment_reference || "-"}</td>
                                    <td style={styles.td}>
                                        <button
                                            type="button"
                                            onClick={() => editInvoice(invoice)}
                                            style={styles.editButton}
                                        >
                                            Edit
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

const styles = {
    page: {
        display: "flex",
        flexDirection: "column",
        gap: 16
    },
    card: {
        background: "#fff",
        borderRadius: 10,
        padding: 18,
        boxShadow: "0 2px 10px rgba(0,0,0,.08)"
    },
    title: {
        margin: 0
    },
    subtitle: {
        marginTop: 6,
        color: "#64748b"
    },
    success: {
        background: "#dcfce7",
        color: "#166534",
        padding: 10,
        borderRadius: 6,
        marginBottom: 12
    },
    error: {
        background: "#fee2e2",
        color: "#991b1b",
        padding: 10,
        borderRadius: 6,
        marginBottom: 12
    },
    grid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
        gap: 14
    },
    input: {
        width: "100%",
        padding: 9,
        marginTop: 5,
        border: "1px solid #cbd5e1",
        borderRadius: 6
    },
    textarea: {
        width: "100%",
        padding: 9,
        marginTop: 5,
        border: "1px solid #cbd5e1",
        borderRadius: 6,
        resize: "vertical"
    },
    buttonRow: {
        display: "flex",
        gap: 10,
        marginTop: 16
    },
    saveButton: {
        background: "#2563eb",
        color: "#fff",
        border: "none",
        padding: "10px 18px",
        borderRadius: 6,
        cursor: "pointer"
    },
    cancelButton: {
        background: "#6b7280",
        color: "#fff",
        border: "none",
        padding: "10px 18px",
        borderRadius: 6,
        cursor: "pointer"
    },
    listHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        flexWrap: "wrap",
        marginBottom: 12
    },
    filters: {
        display: "flex",
        gap: 8,
        flexWrap: "wrap"
    },
    searchInput: {
        padding: 9,
        border: "1px solid #cbd5e1",
        borderRadius: 6
    },
    searchButton: {
        background: "#16a34a",
        color: "#fff",
        border: "none",
        padding: "9px 14px",
        borderRadius: 6,
        cursor: "pointer"
    },
    table: {
        width: "100%",
        borderCollapse: "collapse"
    },
    th: {
        background: "#2563eb",
        color: "#fff",
        padding: 10,
        textAlign: "left",
        whiteSpace: "nowrap"
    },
    td: {
        padding: 10,
        borderBottom: "1px solid #e5e7eb",
        whiteSpace: "nowrap"
    },
    empty: {
        padding: 20,
        textAlign: "center",
        color: "#64748b"
    },
    badge: {
        padding: "4px 8px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700
    },
    paidBadge: {
        background: "#dcfce7",
        color: "#15803d"
    },
    partialBadge: {
        background: "#fef3c7",
        color: "#b45309"
    },
    unpaidBadge: {
        background: "#fee2e2",
        color: "#b91c1c"
    },
    noInvoiceBadge: {
        background: "#e2e8f0",
        color: "#475569"
    },
    editButton: {
        background: "#f59e0b",
        color: "#fff",
        border: "none",
        padding: "6px 10px",
        borderRadius: 5,
        cursor: "pointer"
    }
};
