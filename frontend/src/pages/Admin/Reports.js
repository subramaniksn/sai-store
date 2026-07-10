import React, { useEffect, useState } from "react";
import api from "../../api/client";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export default function Reports() {

    const [summary, setSummary] = useState({

        materials: 0,
        suppliers: 0,
        purchaseOrders: 0,
        grns: 0,
        issues: 0,
        inventoryValue: 0

    });

    const [currentStock, setCurrentStock] = useState([]);
    const [showStockReport, setShowStockReport] = useState(false);
    const [search, setSearch] = useState("");
    const [purchaseOrders, setPurchaseOrders] = useState([]);
    const [showPOReport, setShowPOReport] = useState(false);
    const [poSearch, setPOSearch] = useState("");
    const [poStatus, setPOStatus] = useState("All");
    const [incoming, setIncoming] = useState([]);
    const [showIncoming, setShowIncoming] = useState(false);
    const [outgoing, setOutgoing] = useState([]);
    const [showOutgoing, setShowOutgoing] = useState(false);
    const [outgoingSearch, setOutgoingSearch] = useState("");
    const [internalUse, setInternalUse] = useState([]);
    const [showInternalUse, setShowInternalUse] = useState(false);
    const [internalSearch, setInternalSearch] = useState("");
    const [materialReturns, setMaterialReturns] = useState([]);
    const [showReturnReport, setShowReturnReport] = useState(false);
    const [returnFilters, setReturnFilters] = useState({
        from_date: "",
        to_date: "",
        issue_number: "",
        returned_by: "",
        material: ""
    });
    const [vendorPayments, setVendorPayments] = useState([]);
    const [showVendorPaymentReport, setShowVendorPaymentReport] = useState(false);
    const [vendorPaymentFilters, setVendorPaymentFilters] = useState({
        from_date: "",
        to_date: "",
        supplier: "",
        po_number: "",
        invoice_number: "",
        payment_status: ""
    });

    useEffect(() => {

        loadSummary();

    }, []);

    const loadSummary = async () => {

        try {

            const res = await api.get("/reports/summary");

            setSummary(res.data);

        }
        catch (err) {

            console.log(err);

        }

    };

    const loadCurrentStock = async () => {

        try {

            const res = await api.get("/reports/current-stock");

            setCurrentStock(res.data);

            setShowStockReport(true);

        }
        catch (err) {

            console.log(err);

        }

    };

    const filteredStock = currentStock.filter((item) =>

        item.item_code
            ?.toLowerCase()
            .includes(search.toLowerCase())

        ||

        item.item_name
            ?.toLowerCase()
            .includes(search.toLowerCase())

    );

    const totalStock = filteredStock.reduce(

        (sum, item) =>

            sum + Number(item.current_stock || 0),

        0

    );

    const exportCurrentStock = () => {

        const data = filteredStock.map(item => ({

            "Item Code": item.item_code,

            "Material Name": item.item_name,

            "Category": item.category,

            "Unit": item.unit,

            "Current Stock": item.current_stock

        }));

        const worksheet = XLSX.utils.json_to_sheet(data);

        const workbook = XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(
            workbook,
            worksheet,
            "Current Stock"
        );

        const excelBuffer = XLSX.write(
            workbook,
            {
                bookType: "xlsx",
                type: "array"
            }
        );

        const file = new Blob(
            [excelBuffer],
            {
                type:
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            }
        );

        saveAs(file, "Current_Stock_Report.xlsx");

    };

    const printCurrentStock = () => {

        const printWindow = window.open("", "", "width=1000,height=700");

        let html = `
            <html>

            <head>

                <title>Current Stock Report</title>

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

            <h2>Current Stock Report</h2>

            <table>

            <tr>

                <th>Item Code</th>

                <th>Material Name</th>

                <th>Category</th>

                <th>Unit</th>

                <th>Current Stock</th>

            </tr>
        `;

        filteredStock.forEach(item => {

            html += `

                <tr>

                    <td>${item.item_code}</td>

                    <td>${item.item_name}</td>

                    <td>${item.category}</td>

                    <td>${item.unit}</td>

                    <td>${item.current_stock}</td>

                </tr>

            `;

        });

        html += `

            <tr>

                <td colspan="4">

                    <b>Total Stock</b>

                </td>

                <td>

                    <b>${totalStock}</b>

                </td>

            </tr>

            </table>

            </body>

            </html>

        `;

        printWindow.document.write(html);

        printWindow.document.close();

        printWindow.focus();

        printWindow.print();

    };

    const loadPurchaseOrders = async () => {

        try {

            const res = await api.get("/reports/purchase-orders");

            setPurchaseOrders(res.data);

            setShowPOReport(true);

        }
        catch (err) {

            console.log(err);

        }

    };

    const filteredPO = purchaseOrders.filter((po) => {

        const searchMatch =

            po.po_number
                ?.toLowerCase()
                .includes(poSearch.toLowerCase())

            ||

            po.supplier_name
                ?.toLowerCase()
                .includes(poSearch.toLowerCase());

        const statusMatch =

            poStatus === "All"

            ||

            po.status === poStatus;

        return searchMatch && statusMatch;

    });

    const exportPO = () => {

        const data = filteredPO.map(po => ({

            "PO Number": po.po_number,

            "Supplier": po.supplier_name,

            "PO Date": po.po_date,

            "Status": po.status,

            "Items": po.total_items,

            "Ordered Qty": po.ordered_qty,

            "Received Qty": po.received_qty

        }));

        const ws = XLSX.utils.json_to_sheet(data);

        const wb = XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(wb, ws, "Purchase Orders");

        const excel = XLSX.write(
            wb,
            {
                bookType: "xlsx",
                type: "array"
            }
        );

        saveAs(

            new Blob([excel]),

            "Purchase_Order_Report.xlsx"

        );

    };

    const printPO = () => {

        const win = window.open("", "");

        let html = `
        <html>
        <head>
        <title>Purchase Order Report</title>

        <style>

        table{
            width:100%;
            border-collapse:collapse;
        }

        th,td{
            border:1px solid black;
            padding:8px;
        }

        </style>

        </head>

        <body>

        <h2>Purchase Order Report</h2>

        <table>

        <tr>

        <th>PO</th>

        <th>Supplier</th>

        <th>Date</th>

        <th>Status</th>

        <th>Ordered</th>

        <th>Received</th>

        </tr>
        `;

        filteredPO.forEach(po => {

            html += `

            <tr>

            <td>${po.po_number}</td>

            <td>${po.supplier_name}</td>

            <td>${po.po_date.substring(0,10)}</td>

            <td>${po.status}</td>

            <td>${po.ordered_qty}</td>

            <td>${po.received_qty}</td>

            </tr>

            `;

        });

        html += "</table></body></html>";

        win.document.write(html);

        win.document.close();

        win.print();

    };

    const loadIncoming = async () => {

        try {

            const res = await api.get("/reports/incoming");

            setIncoming(res.data);

            setShowIncoming(true);

        }
        catch (err) {

            console.log(err);

        }

    };

    const exportIncoming = () => {

        const data = incoming.map(r => ({

            Date: r.txn_date,

            PO: r.po_number,

            Material: r.item_name,

            Quantity: r.quantity,

            Unit: r.unit,

            "Entered By": r.entered_by

        }));

        const ws = XLSX.utils.json_to_sheet(data);

        const wb = XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(wb, ws, "Incoming");

        const excel = XLSX.write(wb, {
            bookType: "xlsx",
            type: "array"
        });

        saveAs(
            new Blob([excel]),
            "Incoming_Report.xlsx"
        );

    };

    const printIncoming = () => {

        const win = window.open("", "");

        let html = `
        <html>
        <head>
        <title>Incoming Material Report</title>
        <style>
        table{
            width:100%;
            border-collapse:collapse;
        }
        th,td{
            border:1px solid black;
            padding:8px;
        }
        </style>
        </head>
        <body>

        <h2>Incoming Material Report</h2>

        <table>

        <tr>

        <th>Date</th>

        <th>PO</th>

        <th>Material</th>

        <th>Qty</th>

        <th>Unit</th>

        <th>Entered By</th>

        </tr>
        `;

        incoming.forEach(r => {

            html += `

            <tr>

            <td>${r.txn_date.substring(0,10)}</td>

            <td>${r.po_number}</td>

            <td>${r.item_name}</td>

            <td>${r.quantity}</td>

            <td>${r.unit}</td>

            <td>${r.entered_by}</td>

            </tr>

            `;

        });

        html += "</table></body></html>";

        win.document.write(html);

        win.document.close();

        win.print();

    };

    const loadOutgoing = async () => {

        try {

            const res = await api.get("/reports/outgoing");

            setOutgoing(res.data);

            setShowOutgoing(true);

        }
        catch (err) {

            console.log(err);

        }

    };

    const filteredOutgoing = outgoing.filter(row =>

            row.item_name
                ?.toLowerCase()
                .includes(outgoingSearch.toLowerCase())

            ||

            row.issued_to
                ?.toLowerCase()
                .includes(outgoingSearch.toLowerCase())

        );

        const totalIssuedQty = filteredOutgoing.reduce(

        (sum, row) =>

            sum + Number(row.quantity || 0),

        0

    );

    const exportOutgoing = () => {

        const data = filteredOutgoing.map(row => ({

            Date: row.txn_date,

            Material: row.item_name,

            Quantity: row.quantity,

            "Issued To": row.issued_to,

            Purpose: row.purpose,

            "Entered By": row.entered_by

        }));

        const ws = XLSX.utils.json_to_sheet(data);

        const wb = XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(
            wb,
            ws,
            "Outgoing"
        );

        const excel = XLSX.write(
            wb,
            {
                bookType:"xlsx",
                type:"array"
            }
        );

        saveAs(

            new Blob([excel]),

            "Outgoing_Report.xlsx"

        );

    };

    const printOutgoing = () => {

        const win = window.open("", "");

        let html = `
        <html>
        <head>
        <title>Outgoing Material Report</title>
        <style>
        table{
            width:100%;
            border-collapse:collapse;
        }
        th,td{
            border:1px solid #000;
            padding:8px;
        }
        </style>
        </head>
        <body>

        <h2>Outgoing Material Report</h2>

        <table>

        <tr>

        <th>Date</th>

        <th>Material</th>

        <th>Qty</th>

        <th>Issued To</th>

        <th>Purpose</th>

        <th>Entered By</th>

        </tr>
        `;

        filteredOutgoing.forEach(row => {

            html += `

            <tr>

            <td>${row.txn_date.substring(0,10)}</td>

            <td>${row.item_name}</td>

            <td>${Number(row.quantity)}</td>

            <td>${row.issued_to}</td>

            <td>${row.purpose}</td>

            <td>${row.entered_by}</td>

            </tr>

            `;

        });

        html += `
        </table>

        <h3>Total Issued Qty : ${totalIssuedQty}</h3>

        </body>

        </html>
        `;

        win.document.write(html);

        win.document.close();

        win.print();

    };

    const loadInternalUse = async () => {

        try {

            const res = await api.get("/reports/internal-use");

            setInternalUse(res.data);
            setShowInternalUse(true);

        }
        catch (err) {

            console.log(err);
            alert(
                err.response?.data?.error ||
                "Unable to load Internal Use report."
            );

        }

    };

    const filteredInternalUse = internalUse.filter(row => {

        const text = internalSearch.toLowerCase();

        return (
            row.item_code?.toLowerCase().includes(text) ||
            row.item_name?.toLowerCase().includes(text) ||
            row.used_by_dept?.toLowerCase().includes(text) ||
            row.used_for?.toLowerCase().includes(text)
        );

    });

    const totalInternalQty = filteredInternalUse.reduce(
        (sum, row) => sum + Number(row.quantity || 0),
        0
    );

    const exportInternalUse = () => {

        const data = filteredInternalUse.map(row => ({
            Date: row.txn_date?.substring(0, 10),
            "Item Code": row.item_code,
            Material: row.item_name,
            Quantity: Number(row.quantity),
            Unit: row.unit,
            Department: row.used_by_dept,
            Purpose: row.used_for,
            "Entered By": row.entered_by
        }));

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(
            workbook,
            worksheet,
            "Internal Use"
        );

        const excel = XLSX.write(workbook, {
            bookType: "xlsx",
            type: "array"
        });

        saveAs(
            new Blob([excel]),
            "Internal_Use_Report.xlsx"
        );

    };

    const printInternalUse = () => {

        const win = window.open("", "");

        if (!win) {
            alert("Unable to open print window. Please allow popups.");
            return;
        }

        const rows = filteredInternalUse.map(row => `
            <tr>
                <td>${row.txn_date?.substring(0, 10) || "-"}</td>
                <td>${row.item_code || "-"}</td>
                <td>${row.item_name || "-"}</td>
                <td>${Number(row.quantity)}</td>
                <td>${row.unit || "-"}</td>
                <td>${row.used_by_dept || "-"}</td>
                <td>${row.used_for || "-"}</td>
                <td>${row.entered_by || "-"}</td>
            </tr>
        `).join("");

        win.document.write(`
            <html>
            <head>
                <title>Internal Use Report</title>
                <style>
                    body { font-family: Arial; padding: 20px; }
                    h2 { text-align: center; }
                    table { width: 100%; border-collapse: collapse; }
                    th, td { border: 1px solid #000; padding: 7px; }
                    th { background: #f2f2f2; }
                </style>
            </head>
            <body>
                <h2>Internal Use Report</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Date</th><th>Item Code</th><th>Material</th>
                            <th>Qty</th><th>Unit</th><th>Department</th>
                            <th>Purpose</th><th>Entered By</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
                <h3>Total Internal Use Quantity: ${totalInternalQty}</h3>
            </body>
            </html>
        `);

        win.document.close();
        win.print();

    };

    const loadMaterialReturns = async () => {

        if (
            returnFilters.from_date &&
            returnFilters.to_date &&
            returnFilters.from_date > returnFilters.to_date
        ) {
            alert("From Date cannot be later than To Date.");
            return;
        }

        try {

            const params = Object.fromEntries(
                Object.entries(returnFilters).filter(([, value]) => value)
            );

            const res = await api.get("/reports/material-returns", { params });

            setMaterialReturns(res.data);
            setShowReturnReport(true);

        }
        catch (err) {

            console.log(err);
            alert(
                err.response?.data?.error ||
                "Unable to load Material Return report."
            );

        }

    };

    const exportMaterialReturns = () => {

        const data = materialReturns.map(row => ({
            "Return Date": row.return_date?.substring(0, 10),
            "Return Number": row.return_number,
            "Issue Number": row.issue_number,
            "Project": row.project_name,
            "Item Code": row.item_code,
            "Material": row.item_name,
            "Unit": row.unit,
            "Returned Qty": Number(row.returned_qty),
            "Returned By": row.returned_by,
            "Received By": row.received_by,
            "Item Remarks": row.item_remarks,
            "Return Remarks": row.return_remarks
        }));

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(
            workbook,
            worksheet,
            "Material Returns"
        );

        const excel = XLSX.write(workbook, {
            bookType: "xlsx",
            type: "array"
        });

        saveAs(
            new Blob([excel]),
            "Material_Return_Report.xlsx"
        );

    };

    const loadVendorPayments = async () => {

        if (
            vendorPaymentFilters.from_date &&
            vendorPaymentFilters.to_date &&
            vendorPaymentFilters.from_date > vendorPaymentFilters.to_date
        ) {
            alert("From Date cannot be later than To Date.");
            return;
        }

        try {
            const params = Object.fromEntries(
                Object.entries(vendorPaymentFilters).filter(([, value]) => value)
            );

            const res = await api.get("/reports/vendor-payments", { params });

            setVendorPayments(res.data);
            setShowVendorPaymentReport(true);
        } catch (err) {
            console.log(err);

            alert(
                err.response?.data?.error ||
                "Unable to load Vendor Payment report."
            );
        }

    };

    const exportVendorPayments = () => {

        const data = vendorPayments.map(row => ({
            "PO Number": row.po_number,
            "Supplier": row.supplier_name,
            "Project": row.project_name,
            "Invoice Number": row.invoice_number,
            "Invoice Date": row.invoice_date?.substring(0, 10),
            "Invoice Amount": row.invoice_amount,
            "GST Amount": row.gst_amount,
            "Paid Amount": row.paid_amount,
            "Balance Amount": row.balance_amount,
            "Payment Status": formatVendorPaymentStatus(row.payment_status),
            "Payment Date": row.payment_date?.substring(0, 10),
            "Payment Mode": row.payment_mode,
            "Transaction Reference": row.payment_reference,
            "Remarks": row.remarks
        }));

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(
            workbook,
            worksheet,
            "Vendor Payments"
        );

        const excel = XLSX.write(workbook, {
            bookType: "xlsx",
            type: "array"
        });

        saveAs(
            new Blob([excel]),
            "Vendor_Payment_Report.xlsx"
        );

    };

    const formatVendorPaymentStatus = (value) => {
        if (value === "paid") return "Paid";
        if (value === "partial") return "Partially Paid";
        if (value === "unpaid") return "Unpaid";
        return "No Invoice";
    };

    const totalVendorInvoiceAmount = vendorPayments.reduce(
        (sum, row) => sum + Number(row.invoice_amount || 0),
        0
    );

    const totalVendorPaidAmount = vendorPayments.reduce(
        (sum, row) => sum + Number(row.paid_amount || 0),
        0
    );

    const totalVendorBalanceAmount = vendorPayments.reduce(
        (sum, row) => sum + Number(row.balance_amount || 0),
        0
    );

    const totalReturnedQty = materialReturns.reduce(
        (sum, row) => sum + Number(row.returned_qty || 0),
        0
    );

    return (

        <div style={styles.container}>

            <h2>Reports Dashboard</h2>

            <div style={styles.grid}>

                <div style={styles.card}>
                    <h3>Total Materials</h3>
                    <h1>{summary.materials}</h1>
                </div>

                <div style={styles.card}>
                    <h3>Total Suppliers</h3>
                    <h1>{summary.suppliers}</h1>
                </div>

                <div style={styles.card}>
                    <h3>Purchase Orders</h3>
                    <h1>{summary.purchaseOrders}</h1>
                </div>

                <div style={styles.card}>
                    <h3>Goods Receipts</h3>
                    <h1>{summary.grns}</h1>
                </div>

                <div style={styles.card}>
                    <h3>Material Issues</h3>
                    <h1>{summary.issues}</h1>
                </div>

                <div style={styles.card}>
                    <h3>Current Stock</h3>
                    <h1>{summary.inventoryValue}</h1>
                </div>

            </div>

            <hr style={{ margin: "40px 0" }} />

            <h2>Available Reports</h2>

            <div style={styles.buttonGrid}>

                <button
                    style={styles.button}
                    onClick={loadCurrentStock}
                >
                    Current Stock Report
                </button>

                <button
                    style={styles.button}
                    onClick={loadPurchaseOrders}
                >
                    Purchase Order Report
                </button>

                <button
                    style={styles.button}
                    onClick={loadIncoming}
                >
                    Incoming Material Report
                </button>

                <button
                    style={styles.button}
                    onClick={loadOutgoing}
                >
                    Outgoing Material Report
                </button>

                <button
                    style={styles.button}
                    onClick={loadInternalUse}
                >
                    Internal Use Report
                </button>

                <button
                    style={styles.button}
                    onClick={loadMaterialReturns}
                >
                    Material Return Report
                </button>

                <button
                    style={styles.button}
                    onClick={loadVendorPayments}
                >
                    Vendor Payment Report
                </button>


            </div>

            {
                showStockReport && (

                    <>

                        <hr style={{ margin: "40px 0" }} />

                        <h2>Current Stock Report</h2>

                        <div style={{ margin: "20px 0" }}>

                            <input

                                type="text"

                                placeholder="Search Item Code / Material Name"

                                value={search}

                                onChange={(e) => setSearch(e.target.value)}

                                style={{

                                    width: "300px",

                                    padding: "10px",

                                    borderRadius: 6,

                                    border: "1px solid #ccc"

                                }}

                            />

                        </div>

                        <div
                            style={{
                                marginBottom: 20
                            }}
                        >

                            <button

                                onClick={exportCurrentStock}

                                style={{

                                    background: "#16a34a",

                                    color: "#fff",

                                    border: "none",

                                    padding: "10px 20px",

                                    borderRadius: 6,

                                    cursor: "pointer"

                                }}

                            >

                                Export to Excel

                            </button>

                            <button

                                onClick={printCurrentStock}

                                style={{

                                    marginLeft:15,

                                    background:"#2563eb",

                                    color:"#fff",

                                    border:"none",

                                    padding:"10px 20px",

                                    borderRadius:6,

                                    cursor:"pointer"

                                }}

                            >

                                Print Report

                            </button>

                        </div>

                        

                        <table
                            width="100%"
                            border="1"
                            cellPadding="8"
                            style={{
                                borderCollapse: "collapse",
                                marginTop: 20
                            }}
                        >

                            <thead>

                                <tr>

                                    <th>Item Code</th>

                                    <th>Material Name</th>

                                    <th>Category</th>

                                    <th>Unit</th>

                                    <th>Current Stock</th>

                                </tr>

                            </thead>

                            <tbody>

                                {

                                    filteredStock.map(row => (

                                        <tr key={row.id}>

                                            <td>{row.item_code}</td>

                                            <td>{row.item_name}</td>

                                            <td>{row.category}</td>

                                            <td>{row.unit}</td>

                                            <td>{row.current_stock}</td>

                                        </tr>

                                    ))

                                }

                            </tbody>
                            <tfoot>

                            <tr
                                style={{
                                    background: "#f3f4f6",
                                    fontWeight: "bold"
                                }}
                            >

                                <td colSpan="4">

                                    Total Stock

                                </td>

                                <td>

                                    {totalStock}

                                </td>

                            </tr>

                            </tfoot>

                        </table>

                    </>

                )
            }

            {
                showPOReport && (

                    <>

                        <hr style={{ margin: "40px 0" }} />

                        <h2>Purchase Order Report</h2>

                        <div
                            style={{
                                display: "flex",
                                gap: 20,
                                margin: "20px 0"
                            }}
                        >

                            <input

                                type="text"

                                placeholder="Search PO / Supplier"

                                value={poSearch}

                                onChange={(e) => setPOSearch(e.target.value)}

                                style={{
                                    padding: 10,
                                    width: 250
                                }}

                            />

                            <select

                                value={poStatus}

                                onChange={(e) => setPOStatus(e.target.value)}

                                style={{
                                    padding: 10
                                }}

                            >

                                <option>All</option>

                                <option>open</option>

                                <option>partial</option>

                                <option>closed</option>

                            </select>

                        </div>
                        <div style={{ marginBottom: 20 }}>

                            <button
                                style={styles.button}
                                onClick={exportPO}
                            >

                                Export Excel

                            </button>

                            <button

                                style={{
                                    ...styles.button,
                                    marginLeft: 10
                                }}

                                onClick={printPO}

                            >

                                Print

                            </button>

                        </div>

                        <table
                            width="100%"
                            border="1"
                            cellPadding="8"
                            style={{
                                borderCollapse: "collapse",
                                marginTop: 20
                            }}
                        >

                            <thead>

                                <tr>

                                    <th>PO Number</th>

                                    <th>Supplier</th>

                                    <th>PO Date</th>

                                    <th>Status</th>

                                    <th>Total Items</th>

                                    <th>Ordered Qty</th>

                                    <th>Received Qty</th>

                                </tr>

                            </thead>

                            <tbody>

                                {

                                    filteredPO.map(po => (

                                        <tr key={po.id}>

                                            <td>{po.po_number}</td>

                                            <td>{po.supplier_name}</td>

                                            <td>{po.po_date?.substring(0,10)}</td>

                                            <td>{po.status}</td>

                                            <td>{po.total_items}</td>

                                            <td>{po.ordered_qty}</td>

                                            <td>{po.received_qty}</td>

                                        </tr>

                                    ))

                                }

                            </tbody>

                        </table>

                    </>

                )
            }

            {
                showIncoming && (

                    <>

                        <hr style={{ margin: "40px 0" }} />

                        <h2>Incoming Material Report</h2>

                        <div style={{ marginBottom: 20 }}>

                            <button
                                style={styles.button}
                                onClick={exportIncoming}
                            >
                                Export Excel
                            </button>

                            <button
                                style={{
                                    ...styles.button,
                                    marginLeft: 10
                                }}
                                onClick={printIncoming}
                            >
                                Print
                            </button>

                        </div>

                        <table
                            width="100%"
                            border="1"
                            cellPadding="8"
                            style={{
                                borderCollapse: "collapse",
                                marginTop: 20
                            }}
                        >

                            <thead>

                                <tr>

                                    <th>Date</th>

                                    <th>PO Number</th>

                                    <th>Material</th>

                                    <th>Quantity</th>

                                    <th>Unit</th>

                                    <th>Entered By</th>

                                </tr>

                            </thead>

                            <tbody>

                                {

                                    incoming.map(row => (

                                        <tr key={row.id}>

                                            <td>{row.txn_date?.substring(0,10)}</td>

                                            <td>{row.po_number}</td>

                                            <td>{row.item_name}</td>

                                            <td>{parseFloat(row.quantity)}</td>

                                            <td>{row.unit}</td>

                                            <td>{row.entered_by}</td>

                                        </tr>

                                    ))

                                }

                            </tbody>

                        </table>

                    </>

                )
            }

            {
                showOutgoing && (

                    <>

                        <hr style={{ margin: "40px 0" }} />

                        <h2>Outgoing Material Report</h2>

                        <div style={{ margin: "20px 0" }}>

                            <input

                                type="text"

                                placeholder="Search Material / Issued To"

                                value={outgoingSearch}

                                onChange={(e) =>
                                    setOutgoingSearch(e.target.value)
                                }

                                style={{

                                    width:300,

                                    padding:10,

                                    border:"1px solid #ccc",

                                    borderRadius:6

                                }}

                            />

                        </div>
                        
                        <div style={{ marginBottom:20 }}>

                            <button
                                style={styles.button}
                                onClick={exportOutgoing}
                            >

                                Export Excel

                            </button>

                            <button

                                style={{
                                    ...styles.button,
                                    marginLeft:10
                                }}

                                onClick={printOutgoing}

                            >

                                Print

                            </button>

                        </div>

                        <table
                            width="100%"
                            border="1"
                            cellPadding="8"
                            style={{
                                borderCollapse: "collapse",
                                marginTop: 20
                            }}
                        >

                            <thead>

                                <tr>

                                    <th>Date</th>

                                    <th>Material</th>

                                    <th>Quantity</th>

                                    <th>Issued To</th>

                                    <th>Purpose</th>

                                    <th>Entered By</th>

                                </tr>

                            </thead>

                            <tbody>

                                {

                                    filteredOutgoing.map(row => (

                                        <tr key={row.id}>

                                            <td>{row.txn_date?.substring(0,10)}</td>

                                            <td>{row.item_name}</td>

                                            <td>{Number(row.quantity)}</td>

                                            <td>{row.issued_to}</td>

                                            <td>{row.purpose}</td>

                                            <td>{row.entered_by}</td>

                                        </tr>

                                    ))

                                }

                            </tbody>

                            <tfoot>

                                <tr
                                    style={{
                                        background:"#f3f4f6",
                                        fontWeight:"bold"
                                    }}
                                >

                                    <td colSpan="2">

                                        Total Issued Quantity

                                    </td>

                                    <td>

                                        {totalIssuedQty}

                                    </td>

                                    <td colSpan="3"></td>

                                </tr>

                                </tfoot>

                        </table>

                    </>

                )
            }

            {
                showInternalUse && (

                    <>

                        <hr style={{ margin: "40px 0" }} />

                        <h2>Internal Use Report</h2>

                        <div style={{ margin: "20px 0" }}>
                            <input
                                placeholder="Search Material / Department / Purpose"
                                value={internalSearch}
                                onChange={(e) => setInternalSearch(e.target.value)}
                                style={{
                                    width: 320,
                                    padding: 10,
                                    border: "1px solid #ccc",
                                    borderRadius: 6
                                }}
                            />
                        </div>

                        <div style={{ marginBottom: 20 }}>
                            <button
                                style={styles.button}
                                onClick={exportInternalUse}
                            >
                                Export Excel
                            </button>

                            <button
                                style={{
                                    ...styles.button,
                                    marginLeft: 10
                                }}
                                onClick={printInternalUse}
                            >
                                Print
                            </button>
                        </div>

                        <div style={{ overflowX: "auto" }}>
                            <table
                                width="100%"
                                border="1"
                                cellPadding="8"
                                style={{
                                    borderCollapse: "collapse",
                                    marginTop: 20
                                }}
                            >
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Item Code</th>
                                        <th>Material</th>
                                        <th>Quantity</th>
                                        <th>Unit</th>
                                        <th>Department</th>
                                        <th>Purpose</th>
                                        <th>Entered By</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {
                                        filteredInternalUse.length === 0 ? (
                                            <tr>
                                                <td
                                                    colSpan="8"
                                                    style={{
                                                        textAlign: "center",
                                                        padding: 25
                                                    }}
                                                >
                                                    No Internal Use Records Found
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredInternalUse.map(row => (
                                                <tr key={row.id}>
                                                    <td>{row.txn_date?.substring(0, 10)}</td>
                                                    <td>{row.item_code}</td>
                                                    <td>{row.item_name}</td>
                                                    <td>{Number(row.quantity)}</td>
                                                    <td>{row.unit}</td>
                                                    <td>{row.used_by_dept || "-"}</td>
                                                    <td>{row.used_for || "-"}</td>
                                                    <td>{row.entered_by || "-"}</td>
                                                </tr>
                                            ))
                                        )
                                    }
                                </tbody>

                                <tfoot>
                                    <tr style={{
                                        background: "#f3f4f6",
                                        fontWeight: "bold"
                                    }}>
                                        <td colSpan="3">Total Internal Use Quantity</td>
                                        <td>{totalInternalQty}</td>
                                        <td colSpan="4"></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                    </>

                )
            }

            {
                showReturnReport && (

                    <>

                        <hr style={{ margin: "40px 0" }} />

                        <h2>Material Return Report</h2>

                        <div style={styles.filterGrid}>

                            <div>
                                <label>From Date</label>
                                <input
                                    type="date"
                                    value={returnFilters.from_date}
                                    onChange={(e) => setReturnFilters({
                                        ...returnFilters,
                                        from_date: e.target.value
                                    })}
                                    style={styles.filterInput}
                                />
                            </div>

                            <div>
                                <label>To Date</label>
                                <input
                                    type="date"
                                    value={returnFilters.to_date}
                                    onChange={(e) => setReturnFilters({
                                        ...returnFilters,
                                        to_date: e.target.value
                                    })}
                                    style={styles.filterInput}
                                />
                            </div>

                            <div>
                                <label>Issue Number</label>
                                <input
                                    placeholder="Issue Number"
                                    value={returnFilters.issue_number}
                                    onChange={(e) => setReturnFilters({
                                        ...returnFilters,
                                        issue_number: e.target.value
                                    })}
                                    style={styles.filterInput}
                                />
                            </div>

                            <div>
                                <label>Returned By</label>
                                <input
                                    placeholder="Returned By"
                                    value={returnFilters.returned_by}
                                    onChange={(e) => setReturnFilters({
                                        ...returnFilters,
                                        returned_by: e.target.value
                                    })}
                                    style={styles.filterInput}
                                />
                            </div>

                            <div>
                                <label>Material</label>
                                <input
                                    placeholder="Item Code / Material"
                                    value={returnFilters.material}
                                    onChange={(e) => setReturnFilters({
                                        ...returnFilters,
                                        material: e.target.value
                                    })}
                                    style={styles.filterInput}
                                />
                            </div>

                        </div>

                        <div style={{ margin: "20px 0" }}>
                            <button
                                style={styles.button}
                                onClick={loadMaterialReturns}
                            >
                                Apply Filters
                            </button>

                            <button
                                style={{
                                    ...styles.button,
                                    marginLeft: 10,
                                    background: "#16a34a"
                                }}
                                onClick={exportMaterialReturns}
                                disabled={materialReturns.length === 0}
                            >
                                Export Excel
                            </button>

                            <button
                                style={{
                                    ...styles.button,
                                    marginLeft: 10,
                                    background: "#64748b"
                                }}
                                onClick={() => setReturnFilters({
                                    from_date: "",
                                    to_date: "",
                                    issue_number: "",
                                    returned_by: "",
                                    material: ""
                                })}
                            >
                                Clear Filters
                            </button>
                        </div>

                        <div style={{ overflowX: "auto" }}>
                            <table
                                width="100%"
                                border="1"
                                cellPadding="8"
                                style={{
                                    borderCollapse: "collapse",
                                    marginTop: 20
                                }}
                            >
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Return No</th>
                                        <th>Issue No</th>
                                        <th>Project</th>
                                        <th>Item Code</th>
                                        <th>Material</th>
                                        <th>Qty</th>
                                        <th>Unit</th>
                                        <th>Returned By</th>
                                        <th>Received By</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {
                                        materialReturns.length === 0 ? (
                                            <tr>
                                                <td
                                                    colSpan="10"
                                                    style={{
                                                        textAlign: "center",
                                                        padding: 25
                                                    }}
                                                >
                                                    No Material Returns Found
                                                </td>
                                            </tr>
                                        ) : (
                                            materialReturns.map(row => (
                                                <tr key={row.id}>
                                                    <td>{row.return_date?.substring(0, 10)}</td>
                                                    <td>{row.return_number}</td>
                                                    <td>{row.issue_number}</td>
                                                    <td>{row.project_name || "-"}</td>
                                                    <td>{row.item_code}</td>
                                                    <td>{row.item_name}</td>
                                                    <td>{Number(row.returned_qty)}</td>
                                                    <td>{row.unit}</td>
                                                    <td>{row.returned_by || "-"}</td>
                                                    <td>{row.received_by || "-"}</td>
                                                </tr>
                                            ))
                                        )
                                    }
                                </tbody>

                                <tfoot>
                                    <tr style={{
                                        background: "#f3f4f6",
                                        fontWeight: "bold"
                                    }}>
                                        <td colSpan="6">Total Returned Quantity</td>
                                        <td>{totalReturnedQty}</td>
                                        <td colSpan="3"></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                    </>

                )
            }

            {
                showVendorPaymentReport && (

                    <>

                        <hr style={{ margin: "40px 0" }} />

                        <h2>Vendor Payment Report</h2>

                        <div style={styles.filterGrid}>

                            <div>
                                <label>From Date</label>
                                <input
                                    type="date"
                                    value={vendorPaymentFilters.from_date}
                                    onChange={(e) => setVendorPaymentFilters({
                                        ...vendorPaymentFilters,
                                        from_date: e.target.value
                                    })}
                                    style={styles.filterInput}
                                />
                            </div>

                            <div>
                                <label>To Date</label>
                                <input
                                    type="date"
                                    value={vendorPaymentFilters.to_date}
                                    onChange={(e) => setVendorPaymentFilters({
                                        ...vendorPaymentFilters,
                                        to_date: e.target.value
                                    })}
                                    style={styles.filterInput}
                                />
                            </div>

                            <div>
                                <label>Supplier</label>
                                <input
                                    placeholder="Supplier"
                                    value={vendorPaymentFilters.supplier}
                                    onChange={(e) => setVendorPaymentFilters({
                                        ...vendorPaymentFilters,
                                        supplier: e.target.value
                                    })}
                                    style={styles.filterInput}
                                />
                            </div>

                            <div>
                                <label>PO Number</label>
                                <input
                                    placeholder="PO Number"
                                    value={vendorPaymentFilters.po_number}
                                    onChange={(e) => setVendorPaymentFilters({
                                        ...vendorPaymentFilters,
                                        po_number: e.target.value
                                    })}
                                    style={styles.filterInput}
                                />
                            </div>

                            <div>
                                <label>Invoice Number</label>
                                <input
                                    placeholder="Invoice Number"
                                    value={vendorPaymentFilters.invoice_number}
                                    onChange={(e) => setVendorPaymentFilters({
                                        ...vendorPaymentFilters,
                                        invoice_number: e.target.value
                                    })}
                                    style={styles.filterInput}
                                />
                            </div>

                            <div>
                                <label>Payment Status</label>
                                <select
                                    value={vendorPaymentFilters.payment_status}
                                    onChange={(e) => setVendorPaymentFilters({
                                        ...vendorPaymentFilters,
                                        payment_status: e.target.value
                                    })}
                                    style={styles.filterInput}
                                >
                                    <option value="">All Status</option>
                                    <option value="unpaid">Unpaid</option>
                                    <option value="partial">Partially Paid</option>
                                    <option value="paid">Paid</option>
                                </select>
                            </div>

                        </div>

                        <div style={{ margin: "20px 0" }}>
                            <button
                                style={styles.button}
                                onClick={loadVendorPayments}
                            >
                                Apply Filters
                            </button>

                            <button
                                style={{
                                    ...styles.button,
                                    marginLeft: 10,
                                    background: "#16a34a"
                                }}
                                onClick={exportVendorPayments}
                                disabled={vendorPayments.length === 0}
                            >
                                Export Excel
                            </button>

                            <button
                                style={{
                                    ...styles.button,
                                    marginLeft: 10,
                                    background: "#64748b"
                                }}
                                onClick={() => setVendorPaymentFilters({
                                    from_date: "",
                                    to_date: "",
                                    supplier: "",
                                    po_number: "",
                                    invoice_number: "",
                                    payment_status: ""
                                })}
                            >
                                Clear Filters
                            </button>
                        </div>

                        <div style={{ overflowX: "auto" }}>
                            <table
                                width="100%"
                                border="1"
                                cellPadding="8"
                                style={{
                                    borderCollapse: "collapse",
                                    marginTop: 20
                                }}
                            >
                                <thead>
                                    <tr>
                                        <th>PO Number</th>
                                        <th>Supplier</th>
                                        <th>Invoice No</th>
                                        <th>Invoice Date</th>
                                        <th>Invoice Amount</th>
                                        <th>Paid</th>
                                        <th>Balance</th>
                                        <th>Status</th>
                                        <th>Payment Date</th>
                                        <th>Mode</th>
                                        <th>Reference</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {
                                        vendorPayments.length === 0 ? (
                                            <tr>
                                                <td
                                                    colSpan="11"
                                                    style={{
                                                        textAlign: "center",
                                                        padding: 25
                                                    }}
                                                >
                                                    No Vendor Payment Records Found
                                                </td>
                                            </tr>
                                        ) : (
                                            vendorPayments.map(row => (
                                                <tr key={row.id}>
                                                    <td>{row.po_number}</td>
                                                    <td>{row.supplier_name}</td>
                                                    <td>{row.invoice_number}</td>
                                                    <td>{row.invoice_date?.substring(0, 10) || "-"}</td>
                                                    <td>₹ {Number(row.invoice_amount || 0).toFixed(2)}</td>
                                                    <td>₹ {Number(row.paid_amount || 0).toFixed(2)}</td>
                                                    <td>₹ {Number(row.balance_amount || 0).toFixed(2)}</td>
                                                    <td>{formatVendorPaymentStatus(row.payment_status)}</td>
                                                    <td>{row.payment_date?.substring(0, 10) || "-"}</td>
                                                    <td>{row.payment_mode || "-"}</td>
                                                    <td>{row.payment_reference || "-"}</td>
                                                </tr>
                                            ))
                                        )
                                    }
                                </tbody>

                                <tfoot>
                                    <tr style={{
                                        background: "#f3f4f6",
                                        fontWeight: "bold"
                                    }}>
                                        <td colSpan="4">Total</td>
                                        <td>₹ {totalVendorInvoiceAmount.toFixed(2)}</td>
                                        <td>₹ {totalVendorPaidAmount.toFixed(2)}</td>
                                        <td>₹ {totalVendorBalanceAmount.toFixed(2)}</td>
                                        <td colSpan="4"></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                    </>

                )
            }

        </div>

    );

}

const styles = {

    container: {

        background: "#fff",

        padding: 25,

        borderRadius: 10,

        boxShadow: "0 2px 10px rgba(0,0,0,.08)"

    },

    grid: {

        display: "grid",

        gridTemplateColumns: "repeat(3,1fr)",

        gap: 20,

        marginTop: 25

    },

    card: {

        background: "#f8fafc",

        border: "1px solid #e5e7eb",

        borderRadius: 8,

        padding: 20,

        textAlign: "center"

    },

    buttonGrid: {

        display: "grid",

        gridTemplateColumns: "repeat(2,1fr)",

        gap: 20,

        marginTop: 20

    },

    button: {

        padding: "15px",

        fontSize: 16,

        border: "none",

        borderRadius: 8,

        cursor: "pointer",

        background: "#2563eb",

        color: "#fff"

    },

    filterGrid: {

        display: "grid",

        gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))",

        gap: 15,

        marginTop: 20

    },

    filterInput: {

        display: "block",

        width: "100%",

        padding: 10,

        marginTop: 6,

        border: "1px solid #cbd5e1",

        borderRadius: 6

    }

};
