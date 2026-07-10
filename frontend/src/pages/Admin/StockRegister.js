import React, { useEffect, useState } from "react";
import api from "../../api/client";
import getApiErrorMessage from "../../api/errorMessage";

export default function StockRegister() {

    const [stock, setStock] = useState([]);
    const [search, setSearch] = useState("");
    const [category, setCategory] = useState("");
    const [status, setStatus] = useState("");
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [sortField, setSortField] = useState("item_name");
    const [sortDirection, setSortDirection] = useState("asc");
    const [reconciliation, setReconciliation] = useState(null);
    const [checkingStock, setCheckingStock] = useState(false);
    const [repairingStock, setRepairingStock] = useState(false);

    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const isAdmin = user.role === "admin";
    const canViewLedger = ["admin", "manager"].includes(user.role);

    const viewLedger = (materialId) => {

        localStorage.setItem("selectedLedgerMaterial", materialId);

        window.dispatchEvent(
            new CustomEvent("openMaterialLedger", {
                detail: { materialId }
            })
        );

    };

    useEffect(() => {
        loadStock();
    }, []);

    const loadStock = async () => {

        try {

            setLoading(true);

            const res = await api.get("/stock", {

                params: {

                    search,

                    category,

                    status

                }

            });

            setStock(res.data);

        }
        catch (err) {

            console.log(err);

            alert(getApiErrorMessage(err, "Unable to load stock."));

        }
        finally {

            setLoading(false);

        }

    };

    const checkStockConsistency = async () => {

        try {

            setCheckingStock(true);

            const res = await api.get("/stock/reconciliation");

            setReconciliation(res.data);

        }
        catch (err) {

            alert(getApiErrorMessage(
                err,
                "Unable to check stock consistency."
            ));

        }
        finally {

            setCheckingStock(false);

        }

    };

    const repairStock = async () => {

        const discrepancies = reconciliation?.discrepancies || [];

        if (discrepancies.length === 0) return;

        const confirmed = window.confirm(
            `Repair stored stock for ${discrepancies.length} material(s) ` +
            "using the transaction ledger?"
        );

        if (!confirmed) return;

        try {

            setRepairingStock(true);

            const res = await api.post("/stock/reconciliation/repair", {
                material_ids: discrepancies.map(item => item.id)
            });

            alert(
                `${res.data.repaired_count} material(s) repaired successfully.`
            );

            await loadStock();
            await checkStockConsistency();

        }
        catch (err) {

            alert(getApiErrorMessage(err, "Unable to repair stock."));

        }
        finally {

            setRepairingStock(false);

        }

    };

    //----------------------------------
    // Summary
    //----------------------------------

    const totalItems = stock.length;

    const totalStock = stock.reduce(
        (sum, item) => sum + Number(item.current_stock || 0),
        0
    );

    const lowStock = stock.filter(
        item =>
            Number(item.current_stock) > 0 &&
            Number(item.current_stock) <= Number(item.minimum_stock)
    ).length;

    const outStock = stock.filter(
        item => Number(item.current_stock) <= 0
    ).length;

    const sortedStock = [...stock].sort((a, b) => {

        const valueA = a[sortField];
        const valueB = b[sortField];

        if (valueA < valueB)
            return sortDirection === "asc" ? -1 : 1;

        if (valueA > valueB)
            return sortDirection === "asc" ? 1 : -1;

        return 0;

    });

    const totalPages = Math.ceil(sortedStock.length / pageSize);

    const displayStock = sortedStock.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
    );

    const inventoryValue = stock.reduce(

        (sum, item) =>

            sum +

            Number(item.current_stock || 0) *

            Number(item.last_purchase_price || 0),

        0

    );

    return (

        <div style={styles.page}>

            <h2>📦 Stock Register</h2>

            {/* Summary */}

            <div style={styles.summaryGrid}>

                <SummaryCard
                    title="Total Items"
                    value={totalItems}
                    color="#2563eb"
                />

                <SummaryCard
                    title="Current Stock"
                    value={totalStock}
                    color="#16a34a"
                />

                <SummaryCard
                    title="Low Stock"
                    value={lowStock}
                    color="#f59e0b"
                />

                <SummaryCard
                    title="Out Of Stock"
                    value={outStock}
                    color="#dc2626"
                />

                <SummaryCard

                    title="Inventory Value"

                    value={`₹ ${inventoryValue.toLocaleString()}`}

                    color="#9333ea"

                />

            </div>
            <div style={styles.filterRow}>

                <input
                    type="text"
                    placeholder="Search Material..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={styles.input}
                />

                <input
                    type="text"
                    placeholder="Category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    style={styles.input}
                />

                <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    style={styles.input}
                >

                    <option value="">
                        All Status
                    </option>

                    <option value="normal">
                        Normal
                    </option>

                    <option value="low">
                        Low Stock
                    </option>

                    <option value="out">
                        Out Of Stock
                    </option>

                </select>

                <button
                    onClick={loadStock}
                    style={styles.searchButton}
                >
                    🔍 Search
                </button>

                <button
                    onClick={() => {

                        setSearch("");

                        setCategory("");

                        setStatus("");

                        setTimeout(loadStock, 100);

                    }}
                    style={styles.resetButton}
                >
                    Reset
                </button>

            </div>

            <div style={styles.toolbar}>

                {
                    isAdmin && (
                        <button
                            onClick={checkStockConsistency}
                            disabled={checkingStock}
                            style={styles.reconcileButton}
                        >
                            {checkingStock ? "Checking..." : "Check Stock"}
                        </button>
                    )
                }

                <button
                    onClick={loadStock}
                    style={styles.refreshButton}
                >
                    🔄 Refresh
                </button>

            </div>

            {
                reconciliation && (
                    <div style={styles.reconciliationPanel}>

                        <div style={styles.reconciliationHeader}>
                            <div>
                                <h3 style={{ margin: 0 }}>
                                    Stock Reconciliation
                                </h3>
                                <small>
                                    Checked {reconciliation.total_materials} material(s)
                                </small>
                            </div>

                            <button
                                onClick={() => setReconciliation(null)}
                                style={styles.closeButton}
                            >
                                Close
                            </button>
                        </div>

                        {
                            reconciliation.discrepancies.length === 0 ? (
                                <div style={styles.successMessage}>
                                    Stored stock matches the transaction ledger.
                                </div>
                            ) : (
                                <>
                                    <div style={styles.warningMessage}>
                                        Found {reconciliation.discrepancies.length}
                                        {" "}stock mismatch(es).
                                    </div>

                                    <div style={{ overflowX: "auto" }}>
                                        <table style={styles.table}>
                                            <thead>
                                                <tr>
                                                    <th style={styles.th}>Item Code</th>
                                                    <th style={styles.th}>Material</th>
                                                    <th style={styles.th}>Stored</th>
                                                    <th style={styles.th}>Ledger</th>
                                                    <th style={styles.th}>Difference</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {reconciliation.discrepancies.map(item => (
                                                    <tr key={item.id}>
                                                        <td style={styles.td}>{item.item_code}</td>
                                                        <td style={styles.td}>{item.item_name}</td>
                                                        <td style={styles.td}>
                                                            {Number(item.stored_stock)} {item.unit}
                                                        </td>
                                                        <td style={styles.td}>
                                                            {Number(item.calculated_stock)} {item.unit}
                                                        </td>
                                                        <td style={styles.td}>
                                                            {Number(item.difference)} {item.unit}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    <button
                                        onClick={repairStock}
                                        disabled={repairingStock}
                                        style={styles.repairButton}
                                    >
                                        {repairingStock
                                            ? "Repairing..."
                                            : "Repair All Mismatches"}
                                    </button>
                                </>
                            )
                        }

                    </div>
                )
            }

            {
                loading ? (

                    <h3>Loading...</h3>

                ) : (

                    <>

                        <h3>

                            Total Records : {stock.length}

                        </h3>
                        <div style={styles.paginationBar}>

                            <div>

                                Show

                                <select
                                    value={pageSize}
                                    onChange={(e) => {

                                        setPageSize(Number(e.target.value));

                                        setCurrentPage(1);

                                    }}
                                >

                                    <option>10</option>
                                    <option>25</option>
                                    <option>50</option>
                                    <option>100</option>

                                </select>

                                Records

                            </div>

                        </div>

                        <table style={styles.table}>

                            <thead>

                                <tr>

                                    <th style={styles.th}>Item Code</th>

                                    <th style={styles.th}>Material Name</th>

                                    <th style={styles.th}>Category</th>

                                    <th style={styles.th}>Brand</th>

                                    <th style={styles.th}>Unit</th>

                                    <th style={styles.th}>Minimum</th>

                                    <th style={styles.th}>Current Stock</th>

                                    <th style={styles.th}>Status</th>

                                    {
                                        canViewLedger && (
                                            <th style={styles.th}>Action</th>
                                        )
                                    }

                                </tr>

                            </thead>

                            <tbody>

                                {

                                    displayStock.length === 0 ?

                                        <tr>

                                            <td
                                                colSpan={canViewLedger ? 9 : 8}
                                                style={{
                                                    textAlign: "center",
                                                    padding: 30
                                                }}
                                            >

                                                No Materials Found

                                            </td>

                                        </tr>

                                        :

                                        displayStock.map((item, index) => (

                                            <tr key={item.id}>

                                                <td style={styles.td}>{item.item_code}</td>

                                                <td style={styles.td}>{item.item_name}</td>

                                                <td style={styles.td}>{item.category}</td>

                                                <td style={styles.td}>{item.brand}</td>

                                                <td style={styles.td}>{item.unit}</td>

                                                <td style={styles.td}>{item.minimum_stock}</td>

                                                <td style={styles.td}>

                                                    <b>

                                                        {item.current_stock}

                                                    </b>

                                                </td>

                                              <td style={styles.td}>

                                                {

                                                    Number(item.current_stock) <= 0 ?

                                                        <span style={styles.out}>
                                                            Out
                                                        </span>

                                                        :

                                                        Number(item.current_stock) <= Number(item.minimum_stock) ?

                                                            <span style={styles.low}>
                                                                Low
                                                            </span>

                                                                :

                                                                <span style={styles.normal}>
                                                                    Normal
                                                                </span>

                                                }

                                            </td>

                                            {
                                                canViewLedger && (
                                                    <td style={styles.td}>

                                                        <button
                                                            style={styles.viewButton}
                                                            onClick={() => viewLedger(item.id)}
                                                        >
                                                            View Ledger
                                                        </button>

                                                    </td>
                                                )
                                            }

                                            </tr>                                             

                                        ))

                                }

                            </tbody>

                        </table>
                        <div style={styles.pagination}>

                            <button

                                disabled={currentPage === 1}

                                onClick={() =>
                                    setCurrentPage(currentPage - 1)
                                }

                            >
                                Previous
                            </button>

                            <span>

                                Page {currentPage} of {totalPages}

                            </span>

                            <button

                                disabled={currentPage === totalPages}

                                onClick={() =>
                                    setCurrentPage(currentPage + 1)
                                }

                            >
                                Next
                            </button>

                        </div>

                    </>

                )
            }

        </div>

    );

}

function SummaryCard({ title, value, color }) {

    return (

        <div
            style={{
                background: "#fff",
                padding: 20,
                borderRadius: 10,
                boxShadow: "0 2px 10px rgba(0,0,0,.08)",
                borderTop: `5px solid ${color}`
            }}
        >

            <h4
                style={{
                    margin: 0,
                    color: "#666"
                }}
            >
                {title}
            </h4>

            <h1
                style={{
                    marginTop: 10,
                    color
                }}
            >
                {value}
            </h1>

        </div>

    );

}

const styles = {

    page: {

        padding: 20

    },

    summaryGrid: {

        display: "grid",

        gridTemplateColumns: "repeat(4,1fr)",

        gap: 20,

        marginTop: 20,

        marginBottom: 25

    },

    toolbar: {

        display: "flex",

        justifyContent: "flex-end",

        gap: 10,

        marginBottom: 20

    },

    reconcileButton: {

        background: "#7c3aed",

        color: "#fff",

        border: "none",

        padding: "10px 20px",

        borderRadius: 6,

        cursor: "pointer",

        fontSize: 15

    },

    reconciliationPanel: {

        background: "#fff",

        border: "1px solid #cbd5e1",

        borderRadius: 10,

        padding: 20,

        marginBottom: 25,

        boxShadow: "0 2px 10px rgba(0,0,0,.08)"

    },

    reconciliationHeader: {

        display: "flex",

        justifyContent: "space-between",

        alignItems: "center",

        marginBottom: 15

    },

    closeButton: {

        background: "#64748b",

        color: "#fff",

        border: "none",

        padding: "7px 14px",

        borderRadius: 6,

        cursor: "pointer"

    },

    successMessage: {

        background: "#dcfce7",

        color: "#166534",

        padding: 15,

        borderRadius: 8,

        fontWeight: "bold"

    },

    warningMessage: {

        background: "#fef3c7",

        color: "#92400e",

        padding: 12,

        borderRadius: 8,

        marginBottom: 15,

        fontWeight: "bold"

    },

    repairButton: {

        background: "#dc2626",

        color: "#fff",

        border: "none",

        padding: "10px 18px",

        borderRadius: 6,

        cursor: "pointer",

        marginTop: 15,

        fontWeight: "bold"

    },

    refreshButton: {

        background: "#2563eb",

        color: "#fff",

        border: "none",

        padding: "10px 20px",

        borderRadius: 6,

        cursor: "pointer",

        fontSize: 15

    },

    table: {

        width: "100%",

        borderCollapse: "collapse",

        background: "#fff",

        boxShadow: "0 2px 10px rgba(0,0,0,.08)"

    },

    th: {

        background: "#2563eb",

        color: "#fff",

        padding: 12,

        textAlign: "left"

    },

    td: {

        padding: 10,

        borderBottom: "1px solid #ddd"

    },

    normal: {

        background: "#dcfce7",

        color: "#166534",

        padding: "5px 12px",

        borderRadius: 20,

        fontWeight: "bold"

    },

    low: {

        background: "#fef3c7",

        color: "#92400e",

        padding: "5px 12px",

        borderRadius: 20,

        fontWeight: "bold"

    },

    out: {

        background: "#fee2e2",

        color: "#991b1b",

        padding: "5px 12px",

        borderRadius: 20,

        fontWeight: "bold"

    },

    filterRow: {

        display: "flex",

        gap: 15,

        marginBottom: 20,

        alignItems: "center",

        flexWrap: "wrap"

    },

    input: {

        padding: 10,

        minWidth: 180,

        borderRadius: 6,

        border: "1px solid #ccc"

    },

    searchButton: {

        background: "#16a34a",

        color: "#fff",

        border: "none",

        padding: "10px 18px",

        borderRadius: 6,

        cursor: "pointer"

    },

    resetButton: {

        background: "#dc2626",

        color: "#fff",

        border: "none",

        padding: "10px 18px",

        borderRadius: 6,

        cursor: "pointer"

    },

        paginationBar: {

        display: "flex",

        justifyContent: "space-between",

        marginBottom: 15

    },

    pagination: {

        display: "flex",

        justifyContent: "center",

        gap: 20,

        marginTop: 25

    },

    viewButton: {

        background: "#2563eb",

        color: "#fff",

        border: "none",

        padding: "6px 12px",

        borderRadius: 6,

        cursor: "pointer"

    },

};
