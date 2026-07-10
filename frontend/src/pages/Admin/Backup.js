import React, { useState } from "react";
import api from "../../api/client";
import getApiErrorMessage from "../../api/errorMessage";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export default function Backup() {
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState("");

    const today = new Date().toISOString().slice(0, 10);

    const downloadExcel = (rows, sheetName, fileName) => {
        const worksheet = XLSX.utils.json_to_sheet(rows);
        const workbook = XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

        const excel = XLSX.write(workbook, {
            bookType: "xlsx",
            type: "array"
        });

        const file = new Blob([excel], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        });

        saveAs(file, fileName);
    };

    const runExport = async (label, loader) => {
        try {
            setLoading(label);
            setMessage("");
            setError("");

            await loader();

            setMessage(`${label} exported successfully.`);
        } catch (err) {
            setError(getApiErrorMessage(err, `Unable to export ${label}.`));
        } finally {
            setLoading("");
        }
    };

    const exportMaterials = () => runExport("Materials", async () => {
        const res = await api.get("/materials", {
            params: {
                include_inactive: true
            }
        });

        const rows = (res.data || []).map(item => ({
            "Item Code": item.item_code,
            "Material Name": item.item_name,
            "Category": item.category,
            "Brand": item.brand,
            "Manufacturer": item.manufacturer,
            "Unit": item.unit,
            "Minimum Stock": item.minimum_stock,
            "Current Stock": item.current_stock,
            "Unit Price": item.unit_price,
            "Rack Location": item.rack_location,
            "HSN Code": item.hsn_code,
            "Status": item.is_active === false ? "Inactive" : "Active"
        }));

        downloadExcel(rows, "Materials", `Materials_Backup_${today}.xlsx`);
    });

    const exportSuppliers = () => runExport("Suppliers", async () => {
        const res = await api.get("/suppliers", {
            params: {
                include_inactive: true
            }
        });

        const rows = (res.data || []).map(item => ({
            "Supplier Name": item.supplier_name,
            "Contact Person": item.contact_person,
            "Phone": item.phone,
            "Email": item.email,
            "GST Number": item.gst_number,
            "State": item.state,
            "Address": item.address,
            "Status": item.is_active === false ? "Inactive" : "Active"
        }));

        downloadExcel(rows, "Suppliers", `Suppliers_Backup_${today}.xlsx`);
    });

    const exportStockRegister = () => runExport("Stock Register", async () => {
        const res = await api.get("/stock");

        const rows = (res.data || []).map(item => ({
            "Item Code": item.item_code,
            "Material Name": item.item_name,
            "Category": item.category,
            "Brand": item.brand,
            "Unit": item.unit,
            "Minimum Stock": item.minimum_stock,
            "Current Stock": item.current_stock,
            "Last Purchase Price": item.last_purchase_price,
            "Stock Value": Number(item.current_stock || 0) * Number(item.last_purchase_price || 0),
            "Rack Location": item.rack_location
        }));

        downloadExcel(rows, "Stock Register", `Stock_Register_Backup_${today}.xlsx`);
    });

    const exportAuditLog = () => runExport("Audit Log", async () => {
        const res = await api.get("/audit-logs");

        const rows = (res.data || []).map(item => ({
            "Date Time": item.created_at,
            "User": item.user_name,
            "Role": item.user_role,
            "Action": item.action,
            "Module": item.entity_type,
            "Reference": item.entity_label,
            "Details": typeof item.details === "object"
                ? JSON.stringify(item.details)
                : item.details,
            "IP Address": item.ip_address
        }));

        downloadExcel(rows, "Audit Log", `Audit_Log_Backup_${today}.xlsx`);
    });

    const exportSystemSnapshot = () => runExport("System Snapshot", async () => {
        const [
            summaryRes,
            stockRes,
            poRes,
            incomingRes,
            outgoingRes,
            internalUseRes,
            returnsRes,
            vendorInvoicesRes,
            auditRes
        ] = await Promise.all([
            api.get("/reports/summary"),
            api.get("/reports/current-stock"),
            api.get("/reports/purchase-orders"),
            api.get("/reports/incoming"),
            api.get("/reports/outgoing"),
            api.get("/reports/internal-use"),
            api.get("/reports/material-returns"),
            api.get("/vendor-invoices"),
            api.get("/audit-logs")
        ]);

        const workbook = XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(
            workbook,
            XLSX.utils.json_to_sheet([{
                "Backup Date": today,
                "Materials": summaryRes.data.materials,
                "Suppliers": summaryRes.data.suppliers,
                "Purchase Orders": summaryRes.data.purchaseOrders,
                "GRNs": summaryRes.data.grns,
                "Issues": summaryRes.data.issues,
                "Current Stock": summaryRes.data.inventoryValue
            }]),
            "Summary"
        );

        XLSX.utils.book_append_sheet(
            workbook,
            XLSX.utils.json_to_sheet(stockRes.data || []),
            "Current Stock"
        );

        XLSX.utils.book_append_sheet(
            workbook,
            XLSX.utils.json_to_sheet(poRes.data || []),
            "Purchase Orders"
        );

        XLSX.utils.book_append_sheet(
            workbook,
            XLSX.utils.json_to_sheet(incomingRes.data || []),
            "GRN Incoming"
        );

        XLSX.utils.book_append_sheet(
            workbook,
            XLSX.utils.json_to_sheet(outgoingRes.data || []),
            "Material Issues"
        );

        XLSX.utils.book_append_sheet(
            workbook,
            XLSX.utils.json_to_sheet(internalUseRes.data || []),
            "Internal Use"
        );

        XLSX.utils.book_append_sheet(
            workbook,
            XLSX.utils.json_to_sheet(returnsRes.data || []),
            "Material Returns"
        );

        XLSX.utils.book_append_sheet(
            workbook,
            XLSX.utils.json_to_sheet(vendorInvoicesRes.data || []),
            "Vendor Payments"
        );

        XLSX.utils.book_append_sheet(
            workbook,
            XLSX.utils.json_to_sheet(auditRes.data || []),
            "Audit Log"
        );

        const excel = XLSX.write(workbook, {
            bookType: "xlsx",
            type: "array"
        });

        const file = new Blob([excel], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        });

        saveAs(file, `SAI_ERP_System_Snapshot_${today}.xlsx`);
    });

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h2 style={styles.title}>Backup</h2>
                <p style={styles.subtitle}>
                    Export important ERP data and keep a regular PostgreSQL database backup.
                </p>
            </div>

            {message && <div style={styles.success}>{message}</div>}
            {error && <div style={styles.error}>{error}</div>}

            <div style={styles.grid}>
                <div style={styles.card}>
                    <h3 style={styles.cardTitle}>Master Data Export</h3>
                    <p style={styles.cardText}>
                        Download master records including inactive items/suppliers.
                    </p>

                    <div style={styles.buttonColumn}>
                        <button
                            type="button"
                            onClick={exportMaterials}
                            style={styles.primaryButton}
                            disabled={!!loading}
                        >
                            {loading === "Materials" ? "Exporting..." : "Export Materials Excel"}
                        </button>

                        <button
                            type="button"
                            onClick={exportSuppliers}
                            style={styles.primaryButton}
                            disabled={!!loading}
                        >
                            {loading === "Suppliers" ? "Exporting..." : "Export Suppliers Excel"}
                        </button>
                    </div>
                </div>

                <div style={styles.card}>
                    <h3 style={styles.cardTitle}>Stock Backup</h3>
                    <p style={styles.cardText}>
                        Download current stock position with value calculation.
                    </p>

                    <button
                        type="button"
                        onClick={exportStockRegister}
                        style={styles.greenButton}
                        disabled={!!loading}
                    >
                        {loading === "Stock Register" ? "Exporting..." : "Export Stock Register Excel"}
                    </button>
                </div>

                <div style={styles.card}>
                    <h3 style={styles.cardTitle}>System Snapshot</h3>
                    <p style={styles.cardText}>
                        One Excel file with summary, stock, PO, GRN, issue, internal use, return, and audit sheets.
                    </p>

                    <button
                        type="button"
                        onClick={exportSystemSnapshot}
                        style={styles.orangeButton}
                        disabled={!!loading}
                    >
                        {loading === "System Snapshot" ? "Exporting..." : "Download System Snapshot"}
                    </button>
                </div>

                <div style={styles.card}>
                    <h3 style={styles.cardTitle}>Audit Log Backup</h3>
                    <p style={styles.cardText}>
                        Download latest audit records for user/action traceability.
                    </p>

                    <button
                        type="button"
                        onClick={exportAuditLog}
                        style={styles.purpleButton}
                        disabled={!!loading}
                    >
                        {loading === "Audit Log" ? "Exporting..." : "Export Audit Log Excel"}
                    </button>
                </div>

                <div style={styles.card}>
                    <h3 style={styles.cardTitle}>Database Backup Reminder</h3>
                    <p style={styles.cardText}>
                        Excel exports are useful, but your full ERP backup should be a PostgreSQL database backup.
                    </p>

                    <div style={styles.note}>
                        Recommended routine:
                        <br />
                        1. Take PostgreSQL backup weekly.
                        <br />
                        2. Store one copy outside this computer.
                        <br />
                        3. Test restore once in a while.
                    </div>
                </div>
            </div>
        </div>
    );
}

const styles = {
    container: {
        padding: 20
    },
    header: {
        marginBottom: 20
    },
    title: {
        margin: 0,
        fontSize: 28
    },
    subtitle: {
        marginTop: 6,
        color: "#64748b"
    },
    success: {
        background: "#dcfce7",
        color: "#166534",
        padding: 12,
        borderRadius: 8,
        marginBottom: 15,
        fontWeight: 600
    },
    error: {
        background: "#fee2e2",
        color: "#991b1b",
        padding: 12,
        borderRadius: 8,
        marginBottom: 15,
        fontWeight: 600
    },
    grid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: 18
    },
    card: {
        background: "#fff",
        borderRadius: 12,
        padding: 20,
        boxShadow: "0 2px 10px rgba(15,23,42,0.08)"
    },
    cardTitle: {
        margin: "0 0 8px",
        fontSize: 20
    },
    cardText: {
        color: "#64748b",
        minHeight: 48
    },
    buttonColumn: {
        display: "flex",
        flexDirection: "column",
        gap: 10
    },
    primaryButton: {
        background: "#2563eb",
        color: "#fff",
        border: "none",
        borderRadius: 8,
        padding: "11px 14px",
        cursor: "pointer",
        fontWeight: 700
    },
    greenButton: {
        background: "#16a34a",
        color: "#fff",
        border: "none",
        borderRadius: 8,
        padding: "11px 14px",
        cursor: "pointer",
        fontWeight: 700
    },
    orangeButton: {
        background: "#f97316",
        color: "#fff",
        border: "none",
        borderRadius: 8,
        padding: "11px 14px",
        cursor: "pointer",
        fontWeight: 700
    },
    purpleButton: {
        background: "#7c3aed",
        color: "#fff",
        border: "none",
        borderRadius: 8,
        padding: "11px 14px",
        cursor: "pointer",
        fontWeight: 700
    },
    note: {
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        borderRadius: 8,
        padding: 12,
        lineHeight: 1.7,
        color: "#334155"
    }
};
