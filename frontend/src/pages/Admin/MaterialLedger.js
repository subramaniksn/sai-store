import React, { useEffect, useMemo, useState } from "react";
import api from "../../api/client";
import getApiErrorMessage from "../../api/errorMessage";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export default function MaterialLedger() {

    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const isAdmin = user.role === "admin";

    //-------------------------------------------------------
    // States
    //-------------------------------------------------------

    const [materials, setMaterials] = useState([]);

    const [materialId, setMaterialId] = useState("");

    const [ledger, setLedger] = useState([]);

    const [loading, setLoading] = useState(false);

    const [search, setSearch] = useState("");

    const [fromDate, setFromDate] = useState("");

    const [toDate, setToDate] = useState("");

    const openSourceDocument = (storageKey, id, eventName) => {

        if (!id) return;

        localStorage.setItem(storageKey, id);

        window.dispatchEvent(
            new CustomEvent(eventName, {
                detail: {
                    poId: storageKey === "selectedPO" ? id : undefined,
                    grnId: storageKey === "selectedGRN" ? id : undefined,
                    issueId: storageKey === "selectedIssue" ? id : undefined,
                    returnId: storageKey === "selectedReturn" ? id : undefined
                }
            })
        );

    };

    //-------------------------------------------------------
    // Load Materials
    //-------------------------------------------------------

    useEffect(() => {

        loadMaterials();

        const selectedId = localStorage.getItem("selectedLedgerMaterial");

        if (selectedId) {

            setMaterialId(selectedId);

            loadLedger(selectedId);

            localStorage.removeItem("selectedLedgerMaterial");

        }

    }, []);

    useEffect(() => {

        const openSelectedLedger = (event) => {

            const selectedId =
                event.detail?.materialId ||
                localStorage.getItem("selectedLedgerMaterial");

            if (selectedId) {

                setMaterialId(String(selectedId));

                loadLedger(selectedId);

                localStorage.removeItem("selectedLedgerMaterial");

            }

        };

        window.addEventListener("openMaterialLedger", openSelectedLedger);

        return () => {
            window.removeEventListener("openMaterialLedger", openSelectedLedger);
        };

    }, []);

    const loadMaterials = async () => {

        try {

            const res = await api.get("/material-issue/materials", {
                params: {
                    include_inactive: true
                }
            });

            setMaterials(res.data);

        }
        catch (err) {

            console.log(err);

        }

    };

    //-------------------------------------------------------
    // Load Ledger
    //-------------------------------------------------------

    const loadLedger = async (selectedId = materialId) => {

        if (!selectedId) {

            alert("Please select a material.");

            return;

        }

        try {

            setLoading(true);

            const res = await api.get(

                `/reports/material-ledger?material_id=${selectedId}`

            );

            setLedger(res.data);

        }
        catch (err) {

            console.log(err);

            alert(getApiErrorMessage(err, "Unable to load ledger."));

        }
        finally {

            setLoading(false);

        }

    };

    //-------------------------------------------------------
    // Current Material
    //-------------------------------------------------------

    const selectedMaterial = useMemo(() => {

        return materials.find(

            m => Number(m.id) === Number(materialId)

        );

    }, [materials, materialId]);

    //-------------------------------------------------------
    // Running Balance
    //-------------------------------------------------------

    const ledgerWithBalance = useMemo(() => {

        let runningBalance = 0;

        return ledger.map(row => {

            runningBalance += Number(row.in_qty || 0);

            runningBalance -= Number(row.out_qty || 0);

            return {

                ...row,

                balance: runningBalance

            };

        });

    }, [ledger]);

    //-------------------------------------------------------
    // Filter
    //-------------------------------------------------------

    const ledgerData = useMemo(() => {

        return ledgerWithBalance.filter(row => {

            const searchText = search.toLowerCase();

            const matchSearch =

                row.txn_type?.toLowerCase().includes(searchText)

                ||

                row.po_number?.toLowerCase().includes(searchText)

                ||

                row.grn_number?.toLowerCase().includes(searchText)

                ||

                row.issue_number?.toLowerCase().includes(searchText)

                ||

                row.return_number?.toLowerCase().includes(searchText)

                ||

                row.entered_by?.toLowerCase().includes(searchText)

                ||

                row.remarks?.toLowerCase().includes(searchText);

            let matchDate = true;

            if (fromDate) {

                matchDate = row.txn_date >= fromDate;

            }

            if (toDate && matchDate) {

                matchDate = row.txn_date <= toDate;

            }

            return matchSearch && matchDate;

        });

    }, [ledgerWithBalance, search, fromDate, toDate]);

    //-------------------------------------------------------
    // Summary
    //-------------------------------------------------------

    const totalIncoming = ledgerData.reduce(

        (sum, row) =>

            row.txn_type === "incoming"

                ? sum + Number(row.in_qty || 0)

                : sum,

        0

    );

    const totalOutgoing = ledgerData.reduce(

        (sum, row) =>

            sum + Number(row.out_qty || 0),

        0

    );

    const currentBalance = ledgerData.length

        ? ledgerData[ledgerData.length - 1].balance

        : 0;

    const totalTransactions = ledgerData.length;

    //-------------------------------------------------------
    // Export Excel
    //-------------------------------------------------------

    const exportExcel = () => {

        const ws = XLSX.utils.json_to_sheet(

            ledgerData.map((row, index) => ({

                "Sl No": index + 1,

                Date: row.txn_date,

                Type: row.txn_type,

                "PO No": row.po_number,

                "GRN No": row.grn_number,

                "Issue No": row.issue_number,

                "Return No": row.return_number,

                "In Qty": row.in_qty,

                "Out Qty": row.out_qty,

                Balance: row.balance,

                "Entered By": row.entered_by,

                Remarks: row.remarks

            }))

        );

        const wb = XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(

            wb,

            ws,

            "Material Ledger"

        );

        const excel = XLSX.write(

            wb,

            {

                bookType: "xlsx",

                type: "array"

            }

        );

        saveAs(

            new Blob([excel]),

            "Material_Ledger.xlsx"

        );

    };

    //-------------------------------------------------------
    // Print
    //-------------------------------------------------------

    const printLedger = () => {

        window.print();

    };

    return (

    <div style={styles.card}>

        <h2 style={{ marginBottom: 20 }}>

            Material Ledger

        </h2>

        {/* =========================================================
            Material Selection
        ========================================================= */}

        <div
            style={{
                display: "flex",
                gap: 15,
                alignItems: "center",
                flexWrap: "wrap",
                marginBottom: 20
            }}
        >

            <select
                value={materialId}
                onChange={(e) =>
                    setMaterialId(e.target.value)
                }
                style={{
                    width: 350,
                    padding: 10
                }}
            >

                <option value="">
                    Select Material
                </option>

                {

                    materials.map(mat => (

                        <option
                            key={mat.id}
                            value={mat.id}
                        >

                            {mat.item_code} - {mat.item_name}

                        </option>

                    ))

                }

            </select>

            <button

                style={styles.button}

                onClick={() => loadLedger()}

            >

                Load Ledger

            </button>

        </div>

        {/* =========================================================
            Material Information
        ========================================================= */}

        {

            selectedMaterial && (

                <div
                    style={{
                        display: "flex",
                        gap: 20,
                        flexWrap: "wrap",
                        marginBottom: 25
                    }}
                >

                    <div style={styles.infoCard}>

                        <h4>Item Code</h4>

                        <h2>

                            {selectedMaterial.item_code}

                        </h2>

                    </div>

                    <div style={styles.infoCard}>

                        <h4>Material</h4>

                        <h2>

                            {selectedMaterial.item_name}

                        </h2>

                    </div>

                    <div style={styles.infoCard}>

                        <h4>Current Stock</h4>

                        <h2>

                            {selectedMaterial.current_stock}

                            {" "}

                            {selectedMaterial.unit}

                        </h2>

                    </div>

                </div>

            )

        }

        {/* =========================================================
            Filters
        ========================================================= */}

        <div
            style={{
                display: "flex",
                gap: 15,
                flexWrap: "wrap",
                marginBottom: 20
            }}
        >

            <input

                type="text"

                placeholder="Search..."

                value={search}

                onChange={(e) =>
                    setSearch(e.target.value)
                }

                style={{
                    width: 250,
                    padding: 10
                }}

            />

            <input

                type="date"

                value={fromDate}

                onChange={(e) =>
                    setFromDate(e.target.value)
                }

                style={{
                    padding: 10
                }}

            />

            <input

                type="date"

                value={toDate}

                onChange={(e) =>
                    setToDate(e.target.value)
                }

                style={{
                    padding: 10
                }}

            />

            <button

                style={styles.button}

                onClick={exportExcel}

            >

                Export Excel

            </button>

            <button

                style={styles.button}

                onClick={printLedger}

            >

                Print

            </button>

        </div>

        <hr style={{ marginBottom: 25 }} />

        {

            loading && (

                <div
                    style={{
                        textAlign: "center",
                        fontSize: 18,
                        padding: 20
                    }}
                >

                    Loading Ledger...

                </div>

            )

        }

        {

            !loading && ledgerData.length === 0 && (

                <div
                    style={{
                        textAlign: "center",
                        padding: 50,
                        color: "#6b7280",
                        fontWeight: "bold"
                    }}
                >

                    No ledger records found.

                </div>

            )

        }

        {

            !loading && ledgerData.length > 0 && (
                <>
                <div
                    style={{
                        overflowX: "auto",
                        maxHeight: "600px",
                        border: "1px solid #e5e7eb",
                        borderRadius: 8
                    }}
                >

                    <table
                        width="100%"
                        cellPadding="10"
                        style={{
                            borderCollapse: "collapse",
                            minWidth: 1500
                        }}
                    >

                        <thead>

                            <tr
                                style={{
                                    background: "#1e3a8a",
                                    color: "#080808",
                                    position: "sticky",
                                    top: 0,
                                    zIndex: 10
                                }}
                            >

                                <th style={styles.th}>#</th>

                                <th style={styles.th}>Date</th>

                                <th style={styles.th}>Transaction</th>

                                <th style={styles.th}>PO Number</th>

                                <th style={styles.th}>GRN Number</th>

                                <th style={styles.th}>Issue Number</th>

                                <th style={styles.th}>Return Number</th>

                                <th style={styles.th}>In Qty</th>

                                <th style={styles.th}>Out Qty</th>

                                <th style={styles.th}>Balance</th>

                                <th style={styles.th}>Entered By</th>

                                <th style={styles.th}>Remarks</th>

                            </tr>

                        </thead>

                        <tbody>

                            {

                                ledgerData.map((row, index) => (

                                    <tr

                                        key={row.id}

                                        style={{

                                            background:

                                                index % 2 === 0

                                                    ? "#ffffff"

                                                    : "#f8fafc",

                                            transition: ".2s"

                                        }}

                                        onMouseEnter={(e) =>

                                            e.currentTarget.style.background = "#dbeafe"

                                        }

                                        onMouseLeave={(e) =>

                                            e.currentTarget.style.background =

                                                index % 2 === 0

                                                    ? "#ffffff"

                                                    : "#f8fafc"

                                        }

                                    >

                                        <td style={styles.td}>

                                            {index + 1}

                                        </td>

                                        <td style={styles.td}>

                                            {row.txn_date?.substring(0, 10)}

                                        </td>

                                        <td style={styles.td}>

                                            <span

                                                style={{

                                                    background:

                                                        row.txn_type === "incoming"

                                                            ? "#dcfce7"

                                                            : row.txn_type === "outgoing"

                                                            ? "#fee2e2"

                                                            : "#fef3c7",

                                                    color:

                                                        row.txn_type === "incoming"

                                                            ? "#15803d"

                                                            : row.txn_type === "outgoing"

                                                            ? "#dc2626"

                                                            : "#b45309",

                                                    padding: "5px 12px",

                                                    borderRadius: 20,

                                                    fontWeight: "bold",

                                                    fontSize: 12

                                                }}

                                            >

                                                {row.txn_type.toUpperCase()}

                                            </span>

                                        </td>

                                        <td style={styles.td}>

                                            <DocumentLink
                                                label={row.po_number}
                                                enabled={true}
                                                onClick={() => openSourceDocument(
                                                    "selectedPO",
                                                    row.po_id,
                                                    "openPurchaseOrders"
                                                )}
                                            />

                                        </td>

                                        <td style={styles.td}>

                                            <DocumentLink
                                                label={row.grn_number}
                                                enabled={isAdmin}
                                                onClick={() => openSourceDocument(
                                                    "selectedGRN",
                                                    row.grn_id,
                                                    "openIncomingMaterial"
                                                )}
                                            />

                                        </td>

                                        <td style={styles.td}>

                                            <DocumentLink
                                                label={row.issue_number}
                                                enabled={isAdmin}
                                                onClick={() => openSourceDocument(
                                                    "selectedIssue",
                                                    row.issue_id,
                                                    "openMaterialIssue"
                                                )}
                                            />

                                        </td>

                                        <td style={styles.td}>

                                            <DocumentLink
                                                label={row.return_number}
                                                enabled={isAdmin}
                                                onClick={() => openSourceDocument(
                                                    "selectedReturn",
                                                    row.return_id,
                                                    "openMaterialReturn"
                                                )}
                                            />

                                        </td>

                                        <td
                                            style={{
                                                ...styles.td,
                                                textAlign: "right",
                                                color: "#15803d",
                                                fontWeight: "bold"
                                            }}
                                        >

                                            {Number(row.in_qty)}

                                        </td>

                                        <td
                                            style={{
                                                ...styles.td,
                                                textAlign: "right",
                                                color: "#dc2626",
                                                fontWeight: "bold"
                                            }}
                                        >

                                            {Number(row.out_qty)}

                                        </td>

                                        <td
                                            style={{
                                                ...styles.td,
                                                textAlign: "right",
                                                fontWeight: "bold"
                                            }}
                                        >

                                            {row.balance}

                                        </td>

                                        <td style={styles.td}>

                                            {row.entered_by}

                                        </td>

                                        <td style={styles.td}>

                                            {row.remarks || "-"}

                                        </td>

                                    </tr>

                                ))

                            }

                        </tbody>

                    </table>

                </div>
                {/* =========================================================
                    Summary Cards
                ========================================================= */}

                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))",
                        gap: 20,
                        marginTop: 25
                    }}
                >

                    <div style={styles.summaryCard}>

                        <div style={styles.summaryTitle}>
                            Total Incoming
                        </div>

                        <div
                            style={{
                                ...styles.summaryValue,
                                color: "#16a34a"
                            }}
                        >
                            {totalIncoming}
                        </div>

                    </div>

                    <div style={styles.summaryCard}>

                        <div style={styles.summaryTitle}>
                            Total Outgoing
                        </div>

                        <div
                            style={{
                                ...styles.summaryValue,
                                color: "#dc2626"
                            }}
                        >
                            {totalOutgoing}
                        </div>

                    </div>

                    <div style={styles.summaryCard}>

                        <div style={styles.summaryTitle}>
                            Current Balance
                        </div>

                        <div
                            style={{
                                ...styles.summaryValue,
                                color: "#2563eb"
                            }}
                        >
                            {currentBalance}
                        </div>

                    </div>

                    <div style={styles.summaryCard}>

                        <div style={styles.summaryTitle}>
                            Transactions
                        </div>

                        <div
                            style={{
                                ...styles.summaryValue,
                                color: "#111827"
                            }}
                        >
                            {totalTransactions}
                        </div>

                    </div>

                </div>

                        </>

                        )}

                    </div>

                );

}

function DocumentLink({ label, enabled, onClick }) {

    if (!label) return "-";

    if (!enabled) return label;

    return (
        <button
            type="button"
            onClick={onClick}
            style={styles.documentLink}
            title={`Open ${label}`}
        >
            {label}
        </button>
    );

}

const styles = {

    card: {

        background: "#ffffff",

        borderRadius: 12,

        padding: 25,

        boxShadow: "0 2px 12px rgba(0,0,0,0.08)"

    },

    button: {

        background: "#2563eb",

        color: "#fff",

        border: "none",

        padding: "10px 22px",

        borderRadius: 8,

        cursor: "pointer",

        fontSize: 14,

        fontWeight: "bold",

        transition: ".2s"

    },

    infoCard: {

        flex: 1,

        minWidth: 220,

        background: "#f8fafc",

        border: "1px solid #e5e7eb",

        borderRadius: 10,

        padding: 18,

        boxShadow: "0 1px 3px rgba(0,0,0,.05)"

    },

    summaryCard: {

        background: "#ffffff",

        border: "1px solid #e5e7eb",

        borderRadius: 10,

        padding: 20,

        textAlign: "center",

        boxShadow: "0 2px 8px rgba(0,0,0,.08)"

    },

    summaryTitle: {

        color: "#6b7280",

        fontSize: 14,

        marginBottom: 10,

        fontWeight: 600

    },

    summaryValue: {

        fontSize: 32,

        fontWeight: "bold"

    },

    th: {

        padding: 12,

        textAlign: "left",

        whiteSpace: "nowrap",

        borderBottom: "1px solid #1e40af",

        fontSize: 14

    },

    td: {

        padding: 12,

        borderBottom: "1px solid #e5e7eb",

        fontSize: 14,

        whiteSpace: "nowrap"

    },

    documentLink: {

        border: "none",

        background: "transparent",

        color: "#2563eb",

        padding: 0,

        cursor: "pointer",

        fontWeight: 700,

        textDecoration: "underline"

    }

};
