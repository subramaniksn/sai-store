import React, { useEffect, useMemo, useState } from "react";
import api from "../../api/client";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export default function LowStock() {
    const styles = {

    card: {

        background: "#fff",

        padding: 25,

        borderRadius: 10,

        boxShadow: "0 2px 10px rgba(0,0,0,.08)"

    },

    summaryContainer: {

        display: "grid",

        gridTemplateColumns: "repeat(4,1fr)",

        gap: 20,

        marginBottom: 25

    },

    summaryCard: {

        background: "#fff",

        border: "1px solid #e5e7eb",

        borderLeft: "5px solid #2563eb",

        borderRadius: 8,

        padding: 20,

        boxShadow: "0 2px 5px rgba(0,0,0,.05)"

    },

    filterBar: {

        display: "flex",

        gap: 10,

        flexWrap: "wrap",

        marginBottom: 20,

        alignItems: "center"

    },

    input: {

        flex: 1,

        minWidth: 250,

        padding: 10,

        border: "1px solid #d1d5db",

        borderRadius: 6

    },

    select: {

        padding: 10,

        border: "1px solid #d1d5db",

        borderRadius: 6,

        minWidth: 180

    },

    button: {

        padding: "10px 18px",

        background: "#2563eb",

        color: "#fff",

        border: "none",

        borderRadius: 6,

        cursor: "pointer"

    },

    refreshButton: {

        padding: "10px 20px",

        background: "#059669",

        color: "#fff",

        border: "none",

        borderRadius: 6,

        cursor: "pointer"

    },

    th: {

        padding: 12,

        textAlign: "left",

        borderBottom: "1px solid #d1d5db"

    },

    td: {

        padding: 12,

        borderBottom: "1px solid #e5e7eb"

    }

};

    const [materials, setMaterials] = useState([]);

    const [search, setSearch] = useState("");

    const [category, setCategory] = useState("");

    const [status, setStatus] = useState("");

    const [loading, setLoading] = useState(false);

    useEffect(() => {

        loadData();

    }, []);

    const loadData = async () => {

        try {

            setLoading(true);

            const res = await api.get("/reports/low-stock");

            setMaterials(res.data);

        }
        catch (err) {

            console.log(err);

            alert("Unable to load Low Stock Report.");

        }
        finally {

            setLoading(false);

        }

    };

    //-----------------------------------------------------
    // Category List
    //-----------------------------------------------------

    const categories = [

        ...new Set(

            materials.map(item => item.category)

        )

    ];

    //-----------------------------------------------------
    // Filter Data
    //-----------------------------------------------------

    const filteredData = useMemo(() => {

        return materials.filter((item) => {

            const txt = search.toLowerCase().trim();

            const matchSearch =

                (item.item_code || "")
                    .toLowerCase()
                    .includes(txt)

                ||

                (item.item_name || "")
                    .toLowerCase()
                    .includes(txt)

                ||

                (item.category || "")
                    .toLowerCase()
                    .includes(txt)

                ||

                (item.brand || "")
                    .toLowerCase()
                    .includes(txt)

                ||

                (item.manufacturer || "")
                    .toLowerCase()
                    .includes(txt)

                ||

                (item.rack_location || "")
                    .toLowerCase()
                    .includes(txt);

            const matchCategory =
                category === "" ||
                item.category === category;

            const matchStatus =
                status === "" ||
                item.status === status;

            return (
                matchSearch &&
                matchCategory &&
                matchStatus
            );

        });

    }, [
        materials,
        search,
        category,
        status
    ]);

    //-----------------------------------------------------
    // Dashboard Cards
    //-----------------------------------------------------

    const totalMaterials = materials.length;

    const lowStock = materials.filter(

        x => x.status === "LOW STOCK"

    ).length;

    const outOfStock = materials.filter(

        x => x.status === "OUT OF STOCK"

    ).length;

    const healthyStock = materials.filter(

        x => x.status === "AVAILABLE"

    ).length;

    //-----------------------------------------------------
    // Export Excel
    //-----------------------------------------------------

    const exportExcel = () => {

        const exportData = filteredData.map((item) => ({

            "Item Code": item.item_code,

            "Material Name": item.item_name,

            "Category": item.category,

            "Brand": item.brand || "-",

            "Rack": item.rack_location || "-",

            "Manufacturer": item.manufacturer || "-",

            "Current Stock": `${Number(item.current_stock).toFixed(2)} ${item.unit}`,

            "Minimum Stock": Number(item.minimum_stock).toFixed(2),

            "Reorder Level": Number(item.reorder_level).toFixed(2),

            "Shortage":
                Number(item.shortage) > 0
                    ? Number(item.shortage).toFixed(2)
                    : "-",

            "Status": item.status

        }));

        const ws = XLSX.utils.json_to_sheet(exportData);

        const wb = XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(
            wb,
            ws,
            "Low Stock Report"
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
            `Low_Stock_Report_${new Date().toISOString().slice(0,10)}.xlsx`
        );

    };

    //-----------------------------------------------------

    const printReport = () => {

        const printWindow = window.open("", "", "width=1200,height=800");

        if (!printWindow) {
            alert("Unable to open print window.");
            return;
        }

        let html = `
        <html>

        <head>

            <title>Low Stock Report</title>

            <style>

                body{
                    font-family: Arial;
                    padding:20px;
                }

                h2{
                    text-align:center;
                }

                table{
                    width:100%;
                    border-collapse:collapse;
                    margin-top:20px;
                }

                th,td{
                    border:1px solid #000;
                    padding:8px;
                    text-align:left;
                }

                th{
                    background:#f2f2f2;
                }

            </style>

        </head>

        <body>

        <h2>Low Stock Report</h2>

        <table>

        <tr>

            <th>Item Code</th>
            <th>Material Name</th>
            <th>Category</th>
            <th>Brand</th>
            <th>Current Stock</th>
            <th>Minimum Stock</th>
            <th>Status</th>

        </tr>
        `;

        filteredData.forEach(item => {

            html += `

            <tr>

                <td>${item.item_code}</td>

                <td>${item.item_name}</td>

                <td>${item.category}</td>

                <td>${item.brand || "-"}</td>

                <td>${Number(item.current_stock).toFixed(2)} ${item.unit}</td>

                <td>${Number(item.minimum_stock).toFixed(2)}</td>

                <td>${item.status}</td>

            </tr>

            `;

        });

        html += `

        </table>

        </body>

        </html>

        `;

        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();

        printWindow.onload = function () {
            printWindow.focus();
            printWindow.print();
            printWindow.close();
        };

    };

    const badgeStyle = (status) => {

        switch (status) {

            case "OUT OF STOCK":
                return {
                    background: "#fee2e2",
                    color: "#dc2626",
                    padding: "6px 14px",
                    borderRadius: 20,
                    fontWeight: 700
                };

            case "LOW STOCK":
                return {
                    background: "#ffedd5",
                    color: "#ea580c",
                    padding: "6px 14px",
                    borderRadius: 20,
                    fontWeight: 700
                };

            case "AVAILABLE":
                return {
                    background: "#dcfce7",
                    color: "#16a34a",
                    padding: "6px 14px",
                    borderRadius: 20,
                    fontWeight: 700
                };

            default:
                return {
                    background: "#e5e7eb",
                    color: "#374151",
                    padding: "6px 14px",
                    borderRadius: 20,
                    fontWeight: 700
                };

        }

    };

    return (

        <div id="low-stock-report" style={styles.card}>

        <h2 style={{ marginBottom: 25 }}>

            Low Stock Alert

        </h2>

        {/* ==============================================
            Summary Cards
        ============================================== */}

        <div style={styles.summaryContainer}>

            <div style={styles.summaryCard}>

                <h4>Total Materials</h4>

                <h2>{totalMaterials}</h2>

            </div>

            <div
                style={{
                    ...styles.summaryCard,
                    borderLeft: "5px solid #f59e0b"
                }}
            >

                <h4>Low Stock</h4>

                <h2>{lowStock}</h2>

            </div>

            <div
                style={{
                    ...styles.summaryCard,
                    borderLeft: "5px solid #dc2626"
                }}
            >

                <h4>Out of Stock</h4>

                <h2>{outOfStock}</h2>

            </div>

            <div
                style={{
                    ...styles.summaryCard,
                    borderLeft: "5px solid #16a34a"
                }}
            >

                <h4>Available Stock</h4>

                <h2>{healthyStock}</h2>

            </div>

        </div>

        {/* ==============================================
            Filters
        ============================================== */}

        <div style={styles.filterBar}>

            <input

                placeholder="Search Material..."

                value={search}

                onChange={(e) =>
                    setSearch(e.target.value)
                }

                style={styles.input}

            />

            <select

                value={category}

                onChange={(e) =>
                    setCategory(e.target.value)
                }

                style={styles.select}

            >

                <option value="">
                    All Categories
                </option>

                {

                    categories.map(cat => (

                        <option
                            key={cat}
                            value={cat}
                        >

                            {cat}

                        </option>

                    ))

                }

            </select>

            <select

                value={status}

                onChange={(e) =>
                    setStatus(e.target.value)
                }

                style={styles.select}

            >

                <option value="">
                    All Status
                </option>

                <option value="AVAILABLE">
                    Available
                </option>

                <option value="LOW STOCK">
                    Low Stock
                </option>

                <option value="OUT OF STOCK">
                    Out Of Stock
                </option>

            </select>

            <button
                style={styles.button}
                onClick={exportExcel}
            >

                Export Excel

            </button>

            <button
                style={styles.button}
                onClick={printReport}
            >

                Print

            </button>

        </div>

        {

            loading

            ?

            (

                <h3 style={{ textAlign: "center" }}>

                    Loading...

                </h3>

            )

            :

            (

                <>
                <div
    style={{
        overflowX: "auto",
        marginTop: 20,
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
                    background: "#1e40af",
                    color: "black",
                    textAlign: "center"
                }}
            >

                <th style={styles.th}>#</th>

                <th style={styles.th}>Item Code</th>

                <th style={styles.th}>Material Name</th>

                <th style={styles.th}>Category</th>

                <th style={styles.th}>Brand</th>

                <th style={styles.th}>Rack</th>

                <th style={styles.th}>Manufacturer</th>

                <th style={styles.th}>Current Stock</th>

                <th style={styles.th}>Minimum Stock</th>

                <th style={styles.th}>Reorder Level</th>

                <th style={styles.th}>Shortage</th>

                <th style={styles.th}>Status</th>

            </tr>

        </thead>

        <tbody>

            {

                filteredData.length === 0

                ?

                (

                    <tr>

                        <td
                            colSpan="9"
                            style={{
                                textAlign: "center",
                                padding: 40,
                                color: "#6b7280",
                                fontWeight: "bold"
                            }}
                        >

                            No Records Found

                        </td>

                    </tr>

                )

                :

                (

                    filteredData.map((item, index) => (

                        <tr
                            key={item.id || item.item_code}
                            style={{
                                background:
                                    item.status === "OUT OF STOCK"
                                        ? "#fff5f5"
                                        : item.status === "LOW STOCK"
                                        ? "#fffaf0"
                                        : index % 2 === 0
                                        ? "#fff"
                                        : "#f8fafc"
                            }}
                        >

                            <td style={{...styles.td,textAlign: "left"}}>

                                {index + 1}

                            </td>

                            <td style={{...styles.td,textAlign: "left"}}>

                                {item.item_code}

                            </td>

                            <td
                                style={styles.td}
                                title={item.description || ""}
                            >
                                {item.item_name}
                            </td>

                            <td style={{...styles.td,textAlign: "left"}}>

                                {item.category}

                            </td>

                            <td style={{...styles.td,textAlign: "left"}}>

                                {item.brand || "-"}

                            </td>

                            <td style={{...styles.td,textAlign: "left"}}>
                                {item.rack_location || "-"}
                            </td>

                            <td style={{...styles.td,textAlign: "left"}}>
                                {item.manufacturer || "-"}
                            </td>

                            <td
                                style={{
                                    ...styles.td,
                                    textAlign: "left",
                                    fontWeight: "bold",
                                    color:
                                        item.status === "OUT OF STOCK"
                                            ? "#dc2626"
                                            : item.status === "LOW STOCK"
                                            ? "#ea580c"
                                            : "#16a34a"
                                }}
                            >

                                {Number.isInteger(Number(item.current_stock))
                                    ? Number(item.current_stock)
                                    : Number(item.current_stock).toFixed(2)
                                } {item.unit}

                            </td>

                            <td
                                style={{
                                    ...styles.td,
                                    textAlign: "left"
                                }}
                            >

                                {Number.isInteger(Number(item.minimum_stock))
                                    ? Number(item.minimum_stock)
                                    : Number(item.minimum_stock).toFixed(2)
                                }

                            </td>

                            <td
                                style={{
                                    ...styles.td,
                                    textAlign: "left"
                                }}
                            >
                                {Number(item.reorder_level).toFixed(2)}
                            </td>

                            <td
                                style={{
                                    ...styles.td,
                                    textAlign: "left",
                                    color:
                                        Number(item.shortage) > 0
                                            ? "#dc2626"
                                            : "#16a34a",
                                    fontWeight: "bold"
                                }}
                            >
                                {
                                    Number(item.shortage) > 0
                                        ? `Need ${Number(item.shortage).toFixed(2)} ${item.unit}`
                                        : "-"
                                }
                            </td>

                            <td style={styles.td}>

                                <span style={badgeStyle(item.status)}>
                                    {item.status}
                                </span>

                            </td>

                        </tr>

                    ))

                )

            }

        </tbody>

    </table>

</div>
                <div
                    style={{
                        marginTop: 20,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                    }}
                >

                    <h3>

                        Showing {filteredData.length} of {materials.length} Materials

                    </h3>

                    <button
                        style={styles.refreshButton}
                        onClick={loadData}
                    >

                        Refresh

                    </button>

                </div>

                </>

            )

        }

    </div>

);
}
