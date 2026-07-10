import React, { useEffect, useState } from "react";
import api from "../../api/client";

const emptyForm = {
    po_number: "",
    supplier_id: "",
    po_date: "",
    expected_delivery_date: "",
    project_name: "",
    vendor_code: "",
    project_code: "",
    ref_no: "",
    remarks: "",
    gst_percent: 18,
    freight: 0
};

const emptyItem = {
    material_id: "",
    unit: "",
    ordered_qty: "",
    unit_price: "",
    amount: 0
};

export default function PurchaseOrders() {

    const [suppliers, setSuppliers] = useState([]);
    const [materials, setMaterials] = useState([]);
    const [purchaseOrders, setPurchaseOrders] = useState([]);
    const [selectedPO, setSelectedPO] = useState(null);

    const [form, setForm] = useState(emptyForm);

    const [items, setItems] = useState([
        { ...emptyItem }
    ]);

    useEffect(() => {
        loadSuppliers();
        loadMaterials();
        loadPurchaseOrders();
        loadNextPONumber();
        const id = localStorage.getItem("selectedPO");

        if (id) {

            setSelectedPO(Number(id));

            localStorage.removeItem("selectedPO");

        }
    }, []);

    const loadNextPONumber = async () => {

        try {

            const res = await api.get("/purchase-orders/next-number");

            setForm(prev => ({
                ...prev,
                po_number: res.data.po_number
            }));

        } catch (err) {

            console.log(err);

        }

    };

    const resetPOForm = async () => {

        setForm(emptyForm);

        setItems([
            { ...emptyItem }
        ]);

        await loadNextPONumber();

    };

    const loadSuppliers = async () => {

        try {

            const res = await api.get("/suppliers");

            setSuppliers(res.data);

        } catch (err) {

            console.log(err);

        }

    };

    const loadMaterials = async () => {

        try {

            const res = await api.get("/materials");

            setMaterials(res.data);

        } catch (err) {

            console.log(err);

        }

    };

    const addRow = () => {

        setItems([
            ...items,
            { ...emptyItem }
        ]);

    };

    const removeRow = (index) => {

        const arr = [...items];

        arr.splice(index, 1);

        setItems(arr);

    };

    const uniquePOValues = (field) => [
        ...new Set(
            purchaseOrders
                .map(po => po[field])
                .filter(value => value !== null && value !== undefined && String(value).trim())
        )
    ];

    const projectNameOptions = uniquePOValues("project_name");
    const projectCodeOptions = uniquePOValues("project_code");
    const refNoOptions = uniquePOValues("ref_no");

    const handleSupplierChange = (supplierId) => {
        const supplier = suppliers.find(s => Number(s.id) === Number(supplierId));

        setForm({
            ...form,
            supplier_id: supplierId,
            vendor_code: supplier?.vendor_code || ""
        });
    };

    const updateItem = (index, field, value) => {

        const arr = [...items];

        arr[index][field] = value;

        if (field === "material_id") {

            const mat = materials.find(
                m => m.id === Number(value)
            );

            if (mat) {

                arr[index].unit = mat.unit;
                arr[index].unit_price =
                    Number(mat.unit_price || 0) > 0
                        ? mat.unit_price
                        : "";

            }

        }

        const qty = Number(arr[index].ordered_qty || 0);

        const price = Number(arr[index].unit_price || 0);

        arr[index].amount = qty * price;

        setItems(arr);

    };

    const subtotal = items.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0
    );

    const gstAmount =
        subtotal * Number(form.gst_percent || 0) / 100;

    const grandTotal =
        subtotal +
        gstAmount +
        Number(form.freight || 0);

    const savePO = async () => {

        try {

            await api.post("/purchase-orders", {

                ...form,

                subtotal,

                grand_total: grandTotal,

                items: items.map(i => ({

                    material_id: Number(i.material_id),

                    ordered_qty: Number(i.ordered_qty),

                    unit_price: Number(i.unit_price)

                }))

            });

            alert("Purchase Order Created Successfully");
            loadPurchaseOrders();
            resetPOForm();

        }
        catch (err) {

            console.log(err);

            alert(
                err.response?.data?.error ||
                "Unable to create Purchase Order."
            );

        }

    };

    const loadPurchaseOrders = async () => {

        try {

            const res = await api.get("/purchase-orders");

            setPurchaseOrders(res.data);

        }
        catch (err) {

            console.log(err);

        }

    };

    const openVendorPayment = (poId) => {
        localStorage.setItem("selectedVendorPaymentPO", String(poId));
        window.dispatchEvent(new Event("openVendorPayments"));
    };

    const company = {
        name: "SAI Automation Analytics LLP",
        address: [
            "#9, 3rd Floor, Krishna Kasthuri,",
            "Sanjay Nagar Main Road, RMV 2nd Stage,",
            "Ashwath Nagar, Bangalore-560094"
        ],
        phone: "9945712371",
        email: "accounts@saiautomation.co.in",
        gstin: "29AEZFS6090R1ZG",
        state: "29-Karnataka"
    };

    const formatDate = (value) => {
        if (!value) return "";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) return value;

        return date.toLocaleDateString("en-GB").replaceAll("/", "-");
    };

    const formatMoney = (value) =>
        `Rs ${Number(value || 0).toFixed(2)}`;

    const formatPaymentStatus = (value) => {
        if (value === "paid") return "Paid";
        if (value === "partial") return "Partially Paid";
        if (value === "unpaid") return "Unpaid";
        return "No Invoice";
    };

    const paymentStatusStyle = (value) => {
        if (value === "paid") return styles.paidBadge;
        if (value === "partial") return styles.partialBadge;
        if (value === "unpaid") return styles.unpaidBadge;
        return styles.noInvoiceBadge;
    };

    const escapeHtml = (value) =>
        String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

    const numberToWords = (amount) => {
        const ones = [
            "",
            "One",
            "Two",
            "Three",
            "Four",
            "Five",
            "Six",
            "Seven",
            "Eight",
            "Nine",
            "Ten",
            "Eleven",
            "Twelve",
            "Thirteen",
            "Fourteen",
            "Fifteen",
            "Sixteen",
            "Seventeen",
            "Eighteen",
            "Nineteen"
        ];
        const tens = [
            "",
            "",
            "Twenty",
            "Thirty",
            "Forty",
            "Fifty",
            "Sixty",
            "Seventy",
            "Eighty",
            "Ninety"
        ];

        const twoDigits = (num) => {
            if (num < 20) return ones[num];

            return `${tens[Math.floor(num / 10)]} ${ones[num % 10]}`.trim();
        };

        const threeDigits = (num) => {
            const hundred = Math.floor(num / 100);
            const rest = num % 100;

            return `${hundred ? `${ones[hundred]} Hundred` : ""} ${rest ? twoDigits(rest) : ""}`.trim();
        };

        let num = Math.round(Number(amount || 0));

        if (num === 0) return "Zero";

        const parts = [
            [10000000, "Crore"],
            [100000, "Lakh"],
            [1000, "Thousand"],
            [1, ""]
        ];

        const words = [];

        parts.forEach(([value, label]) => {
            const count = Math.floor(num / value);

            if (!count) return;

            words.push(`${threeDigits(count)} ${label}`.trim());
            num %= value;
        });

        return words.join(" ");
    };

    const printPurchaseOrder = async (poId) => {
        try {
            const res = await api.get(`/purchase-orders/${poId}`);
            const { po, items: poItems } = res.data;

            const poSubtotal = poItems.reduce(
                (sum, item) =>
                    sum +
                    Number(item.ordered_qty || 0) *
                    Number(item.unit_price || 0),
                0
            );
            const poGstPercent = Number(po.gst_percent || 18);
            const poGstAmount = poSubtotal * poGstPercent / 100;
            const poGrandTotal =
                Number(po.grand_total || 0) ||
                poSubtotal + poGstAmount + Number(po.freight || 0);
            const totalQty = poItems.reduce(
                (sum, item) => sum + Number(item.ordered_qty || 0),
                0
            );

            const supplierAddress = escapeHtml(po.supplier_address)
                .split(/\r?\n/)
                .map(line => line.trim())
                .filter(Boolean);

            const html = `
            <html>
            <head>
                <title>Purchase Order ${escapeHtml(po.po_number)}</title>
                <style>
                    @page { size: A4; margin: 14mm; }
                    * { box-sizing: border-box; }
                    body {
                        margin: 0;
                        color: #111827;
                        font-family: Arial, Helvetica, sans-serif;
                        font-size: 12px;
                    }
                    .po-page {
                        width: 100%;
                        min-height: 100%;
                    }
                    .top {
                        display: grid;
                        grid-template-columns: 1fr 170px;
                        gap: 16px;
                        align-items: start;
                    }
                    .company {
                        display: block;
                    }
                    .company h1 {
                        margin: 0 0 6px;
                        color: #0a7aa8;
                        font-size: 20px;
                        line-height: 1.15;
                    }
                    .company div,
                    .details div,
                    .supplier div {
                        line-height: 1.42;
                    }
                    .signature {
                        min-height: 92px;
                        border: 1px solid #e5e7eb;
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                        align-items: center;
                        text-align: center;
                        padding: 10px;
                        font-weight: 700;
                    }
                    .signature-logo {
                        max-width: 140px;
                        max-height: 82px;
                        object-fit: contain;
                    }
                    .title {
                        margin: 20px 0 14px;
                        text-align: center;
                        font-size: 22px;
                        font-weight: 700;
                        letter-spacing: .3px;
                    }
                    .section-grid {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        border-top: 2px solid #0a7aa8;
                        border-bottom: 1px solid #cbd5e1;
                    }
                    .section {
                        padding: 10px 12px;
                        min-height: 145px;
                    }
                    .section + .section {
                        border-left: 1px solid #cbd5e1;
                    }
                    .section-title {
                        margin: -10px -12px 10px;
                        padding: 7px 12px;
                        background: #0a7aa8;
                        color: #fff;
                        font-weight: 700;
                    }
                    .supplier-name {
                        margin-bottom: 8px;
                        font-weight: 700;
                        font-size: 13px;
                    }
                    .detail-row {
                        display: grid;
                        grid-template-columns: 110px 1fr;
                        gap: 8px;
                        margin-bottom: 5px;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                    }
                    .item-table {
                        margin-top: 18px;
                    }
                    th {
                        background: #0a7aa8;
                        color: #fff;
                        font-weight: 700;
                    }
                    th,
                    td {
                        border: 1px solid #808080;
                        padding: 7px;
                        vertical-align: top;
                    }
                    .right { text-align: right; }
                    .center { text-align: center; }
                    .summary-grid {
                        display: grid;
                        grid-template-columns: 1fr 340px;
                        gap: 26px;
                        margin-top: 18px;
                    }
                    .amount-words {
                        border-top: 2px solid #0a7aa8;
                    }
                    .amount-words .label {
                        padding: 7px 10px;
                        background: #f8fafc;
                        font-weight: 700;
                        border: 1px solid #cbd5e1;
                        border-top: none;
                    }
                    .amount-words .words {
                        min-height: 42px;
                        padding: 10px;
                        border: 1px solid #cbd5e1;
                        border-top: none;
                    }
                    .totals td {
                        padding: 8px 10px;
                    }
                    .totals .grand td {
                        background: #f8fafc;
                        font-weight: 700;
                    }
                    .terms {
                        margin-top: 18px;
                        max-width: 560px;
                    }
                    .terms h3 {
                        margin: 0 0 8px;
                        font-size: 13px;
                    }
                    .terms ol {
                        margin: 0;
                        padding-left: 18px;
                    }
                    .terms li {
                        margin-bottom: 5px;
                        line-height: 1.35;
                    }
                    .footer-sign {
                        margin-top: 42px;
                        text-align: right;
                        font-weight: 700;
                    }
                    @media print {
                        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    }
                </style>
            </head>
            <body>
                <div class="po-page">
                    <div class="top">
                        <div class="company">
                            <h1>${company.name}</h1>
                            ${company.address.map(line => `<div>${escapeHtml(line)}</div>`).join("")}
                            <div>Phone no. : ${escapeHtml(company.phone)}</div>
                            <div>Email : ${escapeHtml(company.email)}</div>
                            <div>GSTIN : ${escapeHtml(company.gstin)}</div>
                            <div>State: ${escapeHtml(company.state)}</div>
                        </div>
                        <div class="signature">
                            <img class="signature-logo" src="/sai.png" alt="SAI" />
                        </div>
                    </div>

                    <div class="title">PURCHASE ORDER</div>

                    <div class="section-grid">
                        <div class="section supplier">
                            <div class="section-title">Order To</div>
                            <div class="supplier-name">${escapeHtml(po.supplier_name)}</div>
                            ${supplierAddress.map(line => `<div>${line}</div>`).join("")}
                            <div>Contact No. : ${escapeHtml(po.supplier_phone)}</div>
                            <div>Email : ${escapeHtml(po.supplier_email)}</div>
                            <div>GSTIN : ${escapeHtml(po.supplier_gst_number)}</div>
                            <div>State: ${escapeHtml(po.supplier_state)}</div>
                        </div>

                        <div class="section details">
                            <div class="section-title">Order Details</div>
                            <div class="detail-row"><b>Order No. :</b><span>${escapeHtml(po.po_number)}</span></div>
                            <div class="detail-row"><b>Date :</b><span>${formatDate(po.po_date)}</span></div>
                            <div class="detail-row"><b>Place of supply:</b><span>${company.state}</span></div>
                            <div class="detail-row"><b>Due Date :</b><span>${formatDate(po.expected_delivery_date)}</span></div>
                            <div class="detail-row"><b>VENDOR CODE:</b><span>${escapeHtml(po.vendor_code || "xxx")}</span></div>
                            <div class="detail-row"><b>PROJECT CODE:</b><span>${escapeHtml(po.project_code || "xxx")}</span></div>
                            <div class="detail-row"><b>REF. NO.:</b><span>${escapeHtml(po.ref_no || "xxx")}</span></div>
                            <div class="detail-row"><b>REF. DATE :</b><span>${formatDate(po.po_date)}</span></div>
                        </div>
                    </div>

                    <table class="item-table">
                        <thead>
                            <tr>
                                <th style="width:8%;">SR.NO.</th>
                                <th>ITEM NAME</th>
                                <th style="width:14%;">HSN/ SAC</th>
                                <th style="width:10%;">QTY</th>
                                <th style="width:16%;">PRICE/ UNIT</th>
                                <th style="width:16%;">AMOUNT</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${poItems.map((item, index) => {
                                const qty = Number(item.ordered_qty || 0);
                                const price = Number(item.unit_price || 0);
                                return `
                                    <tr>
                                        <td class="center">${index + 1}</td>
                                        <td>${escapeHtml(item.item_name)}</td>
                                        <td class="center">${escapeHtml(item.hsn_code)}</td>
                                        <td class="center">${qty}</td>
                                        <td class="right">${formatMoney(price)}</td>
                                        <td class="right">${formatMoney(qty * price)}</td>
                                    </tr>
                                `;
                            }).join("")}
                            <tr>
                                <td></td>
                                <td colspan="2" class="right"><b>Total</b></td>
                                <td class="center"><b>${totalQty}</b></td>
                                <td></td>
                                <td></td>
                            </tr>
                        </tbody>
                    </table>

                    <div class="summary-grid">
                        <div>
                            <div class="amount-words">
                                <div class="label">Order Amount In Words</div>
                                <div class="words">${numberToWords(poGrandTotal)}</div>
                            </div>
                            <div class="terms">
                                <h3>Terms and Conditions</h3>
                                <ol>
                                    <li>Delivery: Immediately</li>
                                    <li>Payment Terms: Payment shall be made within 45 days from the date of invoice receipt and acceptance of services/materials</li>
                                    <li>Freight Charges: Including</li>
                                    <li>Warranty: Standard Warranty and support: One Years Service and Replacement from the date of Delivery.</li>
                                    <li>Test Report: Test Certificates &amp; Warranty Certificates Wil be provided at the time of delivery</li>
                                </ol>
                            </div>
                        </div>

                        <table class="totals">
                            <tbody>
                                <tr>
                                    <td><b>Sub Total</b></td>
                                    <td class="right">${formatMoney(poSubtotal)}</td>
                                </tr>
                                <tr>
                                    <td><b>IGST@${poGstPercent}%</b></td>
                                    <td class="right">${formatMoney(poGstAmount)}</td>
                                </tr>
                                ${Number(po.freight || 0) ? `
                                    <tr>
                                        <td><b>Freight</b></td>
                                        <td class="right">${formatMoney(po.freight)}</td>
                                    </tr>
                                ` : ""}
                                <tr class="grand">
                                    <td><b>Total</b></td>
                                    <td class="right">${formatMoney(poGrandTotal)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div class="footer-sign">For : ${company.name}<br /><br /><br />Authorized Signatory</div>
                </div>
            </body>
            </html>
            `;

            const win = window.open("", "_blank");

            if (!win) {
                alert("Unable to open print window. Please allow popups.");
                return;
            }

            win.document.write(html);
            win.document.close();
            win.focus();
            win.onload = () => win.print();
        }
        catch (err) {
            console.log(err);
            alert("Unable to generate Purchase Order PDF.");
        }
    };

    return (

        <div style={styles.card}>

            <h2>Purchase Order</h2>

            <div style={styles.grid}>

                <div>

                    <label>PO Number</label>

                    <input
                        value={form.po_number}
                        readOnly
                        style={styles.input}
                    />

                </div>

                <div>

                    <label>Supplier</label>

                    <select
                        value={form.supplier_id}
                        onChange={(e) =>
                            setForm({
                                ...form,
                                supplier_id: e.target.value
                            })
                        }
                    >

                        <option value="">
                            Select Supplier
                        </option>

                        {suppliers.map(s => (

                            <option
                                key={s.id}
                                value={s.id}
                            >
                                {s.supplier_name}
                            </option>

                        ))}

                    </select>

                </div>

                <div>

                    <label>PO Date</label>

                    <input
                        type="date"
                        value={form.po_date}
                        onChange={(e) =>
                            setForm({
                                ...form,
                                po_date: e.target.value
                            })
                        }
                    />

                </div>

                <div>

                    <label>Expected Delivery</label>

                    <input
                        type="date"
                        value={form.expected_delivery_date}
                        onChange={(e) =>
                            setForm({
                                ...form,
                                expected_delivery_date: e.target.value
                            })
                        }
                    />

                </div>

                <div>

                    <label>Project</label>

                    <input
                        value={form.project_name}
                        onChange={(e) =>
                            setForm({
                                ...form,
                                project_name: e.target.value
                            })
                        }
                    />

                </div>

                <div>

                    <label>Vendor Code</label>

                    <input
                        value={form.vendor_code}
                        onChange={(e) =>
                            setForm({
                                ...form,
                                vendor_code: e.target.value
                            })
                        }
                    />

                </div>

                <div>

                    <label>Project Code</label>

                    <input
                        value={form.project_code}
                        onChange={(e) =>
                            setForm({
                                ...form,
                                project_code: e.target.value
                            })
                        }
                    />

                </div>

                <div>

                    <label>Ref. No.</label>

                    <input
                        value={form.ref_no}
                        onChange={(e) =>
                            setForm({
                                ...form,
                                ref_no: e.target.value
                            })
                        }
                    />

                </div>

                <div>

                    <label>GST %</label>

                    <input
                        type="number"
                        value={form.gst_percent}
                        onChange={(e) =>
                            setForm({
                                ...form,
                                gst_percent: e.target.value
                            })
                        }
                    />

                </div>

                <div>

                    <label>Freight</label>

                    <input
                        type="number"
                        value={form.freight}
                        onChange={(e) =>
                            setForm({
                                ...form,
                                freight: e.target.value
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

            <hr style={{ margin: "30px 0" }} />

            <h3>Material Details</h3>

            <table style={styles.table}>

                <thead>

                    <tr>

                        <th width="35%">Material</th>

                        <th width="10%">Unit</th>

                        <th width="10%">Qty</th>

                        <th width="15%">Unit Price</th>

                        <th width="15%">Amount</th>

                        <th width="15%">Action</th>

                    </tr>

                </thead>

                <tbody>

                    {items.map((item, index) => (

                        <tr key={index}>

                            <td>

                                <select
                                    style={styles.input}
                                    value={item.material_id}
                                    onChange={(e) =>
                                        updateItem(
                                            index,
                                            "material_id",
                                            e.target.value
                                        )
                                    }
                                >

                                    <option value="">
                                        Select Material
                                    </option>

                                    {materials.map((m) => (

                                        <option
                                            key={m.id}
                                            value={m.id}
                                        >
                                            {m.item_code} - {m.item_name}
                                        </option>

                                    ))}

                                </select>

                            </td>

                            <td>

                                <input
                                    style={styles.input}
                                    value={item.unit}
                                    readOnly
                                />

                            </td>

                            <td>

                                <input
                                    style={styles.input}
                                    type="number"
                                    min="0"
                                    value={item.ordered_qty}
                                    onChange={(e) =>
                                        updateItem(
                                            index,
                                            "ordered_qty",
                                            e.target.value
                                        )
                                    }
                                />

                            </td>

                            <td>

                                <input
                                    style={styles.input}
                                    type="number"
                                    min="0"
                                    value={item.unit_price}
                                    onChange={(e) =>
                                        updateItem(
                                            index,
                                            "unit_price",
                                            e.target.value
                                        )
                                    }
                                />

                            </td>

                            <td>

                                <input
                                    style={styles.input}
                                    value={item.amount.toFixed(2)}
                                    readOnly
                                />

                            </td>

                            <td>

                                <button
                                    type="button"
                                    style={styles.deleteBtn}
                                    onClick={() => removeRow(index)}
                                >
                                    Delete
                                </button>

                            </td>

                        </tr>

                    ))}

                </tbody>

            </table>

            <div
                style={{
                    marginTop: 15
                }}
            >

                <button
                    type="button"
                    style={styles.addBtn}
                    onClick={addRow}
                >
                    + Add Material
                </button>

            </div>
            <hr style={{ margin: "30px 0" }} />

            <div
                style={{
                    display: "flex",
                    justifyContent: "flex-end"
                }}
            >

                <table style={{ width: 350 }}>

                    <tbody>

                        <tr>
                            <td><b>Subtotal</b></td>
                            <td align="right">
                                ₹ {subtotal.toFixed(2)}
                            </td>
                        </tr>

                        <tr>
                            <td>
                                <b>GST ({form.gst_percent}%)</b>
                            </td>

                            <td align="right">
                                ₹ {gstAmount.toFixed(2)}
                            </td>
                        </tr>

                        <tr>
                            <td><b>Freight</b></td>

                            <td align="right">
                                ₹ {Number(form.freight).toFixed(2)}
                            </td>
                        </tr>

                        <tr
                            style={{
                                background: "#2563eb",
                                color: "#fff",
                                fontSize: 18
                            }}
                        >

                            <td>
                                <b>Grand Total</b>
                            </td>

                            <td align="right">
                                ₹ {grandTotal.toFixed(2)}
                            </td>

                        </tr>

                    </tbody>

                </table>

            </div>
            <div
                style={{
                    textAlign: "right",
                    marginTop: 30
                }}
            >

                <button
                    style={{
                        background: "#16a34a",
                        color: "#fff",
                        border: "none",
                        padding: "12px 25px",
                        borderRadius: 6,
                        cursor: "pointer",
                        fontSize: 16
                    }}
                    onClick={savePO}
                >
                    Save Purchase Order
                </button>

            </div>
            <hr style={{ margin: "40px 0" }} />

            <h2>Purchase Orders</h2>

            <table style={styles.table}>

            <thead>

            <tr>

            <th>PO No</th>

            <th>Supplier</th>

            <th>Date</th>

            <th>Project</th>

            <th>Total</th>

            <th>Invoice</th>

            <th>Paid</th>

            <th>Balance</th>

            <th>Payment</th>

            <th>Status</th>

            <th>Action</th>

            </tr>

            </thead>

            <tbody>

            {purchaseOrders.map(po=>(

            <tr
                key={po.id}
                style={{
                    background:
                        selectedPO === po.id
                            ? "#FEF3C7"
                            : "#fff"
                }}
            >

            <td>{po.po_number}</td>

            <td>{po.supplier_name}</td>

            <td>{po.po_date?.substring(0,10)}</td>

            <td>{po.project_name}</td>

            <td>

            ₹ {Number(po.grand_total).toFixed(2)}

            </td>

            <td>

            ₹ {Number(po.invoice_amount || 0).toFixed(2)}

            </td>

            <td>

            ₹ {Number(po.paid_amount || 0).toFixed(2)}

            </td>

            <td>

            ₹ {Number(po.payment_balance || 0).toFixed(2)}

            </td>

            <td>

            <span
                style={{
                    ...styles.paymentBadge,
                    ...paymentStatusStyle(po.payment_status)
                }}
            >
                {formatPaymentStatus(po.payment_status)}
            </span>

            </td>

            <td>

            {po.status}

            </td>

            <td>

            <button
            onClick={() => printPurchaseOrder(po.id)}
            >

            Print PO

            </button>

            <button
            onClick={() => openVendorPayment(po.id)}
            style={{
                marginLeft: 8
            }}
            >

            Payment

            </button>

            </td>

            </tr>

            ))}

            </tbody>

            </table>

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

        gridTemplateColumns: "repeat(2, minmax(300px,1fr))",

        gap: 20,

        marginTop: 20

    },

    table: {

    width: "100%",

    borderCollapse: "collapse",

    marginTop: 20

    },

    input: {

        width: "100%",

        padding: 8,

        borderRadius: 5,

        border: "1px solid #cbd5e1",

        boxSizing: "border-box"

    },

    addBtn: {

        background: "#2563eb",

        color: "#fff",

        border: "none",

        padding: "10px 18px",

        borderRadius: 5,

        cursor: "pointer"

    },

    deleteBtn: {

        background: "#dc2626",

        color: "#fff",

        border: "none",

        padding: "8px 12px",

        borderRadius: 5,

        cursor: "pointer"

    },

    table: {

    width: "100%",

    borderCollapse: "collapse",

    marginTop: 20

    },

    th: {

        background: "#2563eb",

        color: "#fff",

        padding: 10

    },

    td: {

        padding: 10,

        borderBottom: "1px solid #ddd"

    },

    paymentBadge: {

        padding: "4px 8px",

        borderRadius: 999,

        fontSize: 12,

        fontWeight: "bold",

        whiteSpace: "nowrap"

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

    }

};
