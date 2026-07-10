import React, { useEffect, useState } from "react";
import api from "../../api/client";
import getApiErrorMessage from "../../api/errorMessage";

export default function IncomingMaterial() {

    const [openPOs, setOpenPOs] = useState([]);
    const [selectedPO, setSelectedPO] = useState("");
    const [poDetails, setPoDetails] = useState(null);
    const [items, setItems] = useState([]);
    const [selectedGRN, setSelectedGRN] = useState(null);
    const [grnDetails, setGrnDetails] = useState(null);
    const [grnItems, setGrnItems] = useState([]);
    const [scanCode, setScanCode] = useState("");

    useEffect(() => {

        loadOpenPOs();

        const grnId = localStorage.getItem("selectedGRN");

        if (grnId) {

            loadGRNDetails(grnId);

            localStorage.removeItem("selectedGRN");

        }

    }, []);

    const [form, setForm] = useState({
        grn_number: "",
        received_date: new Date().toISOString().substring(0, 10),
        invoice_number: "",
        vehicle_number: "",
        lr_number: "",
        dc_number: "",
        received_by: "",
        remarks: ""
    });    

    const loadOpenPOs = async () => {

        try {

            const res = await api.get("/purchase-orders/open");

            setOpenPOs(res.data);

        }
        catch (err) {

            console.log(err);

        }

    };

    const loadPODetails = async (poId) => {

        if (!poId) {

            setPoDetails(null);
            setItems([]);
            return;

        }

        try {

            const res = await api.get(`/purchase-orders/${poId}`);

            setPoDetails(res.data.po);

            const poItems = res.data.items.map(item => ({

                ...item,

                receive_qty: 0

            }));

            setItems(poItems);

        }
        catch (err) {

            console.log(err);

        }

    };

    const loadGRNDetails = async (id) => {

        try {

            const res = await api.get(`/grn/${id}`);

            setSelectedGRN(id);
            setGrnDetails(res.data.grn);
            setGrnItems(res.data.items);

        } catch (err) {

            console.log(err);

        }

    };

    const scanMaterial = async () => {

        if (!selectedPO) {
            alert("Please select Purchase Order first.");
            return;
        }

        if (!scanCode.trim()) return;

        try {

            const res = await api.get(
                `/materials/barcode/${scanCode.trim()}`
            );

            const mat = res.data;

            const rowIndex = items.findIndex(
                x => Number(x.material_id) === Number(mat.id)
            );

            if (rowIndex === -1) {
                alert("This material is not available in selected Purchase Order.");
                setScanCode("");
                return;
            }

            const arr = [...items];

            if (Number(arr[rowIndex].pending_qty) <= 0) {
                alert("This material is already fully received.");
                setScanCode("");
                return;
            }

            arr[rowIndex].receive_qty =
                Number(arr[rowIndex].receive_qty || 0) + 1;

            if (arr[rowIndex].receive_qty > Number(arr[rowIndex].pending_qty)) {
                arr[rowIndex].receive_qty = Number(arr[rowIndex].pending_qty);
            }

            setItems(arr);
            setScanCode("");

        } catch (err) {

            alert(getApiErrorMessage(
                err,
                "Material not found for this barcode."
            ));

        }

    };

    const saveGRN = async () => {

        if (!selectedPO) {

            alert("Please select Purchase Order.");

            return;

        }

        const receiveItems = items.filter(
            i => Number(i.receive_qty) > 0
        );

        if (receiveItems.length === 0) {

            alert("Please enter received quantity.");

            return;

        }

        try {

            await api.post("/grn", {

                po_id: Number(selectedPO),

                supplier_id: poDetails?.supplier_id || null,

                received_date: form.received_date,

                invoice_number: form.invoice_number,

                vehicle_number: form.vehicle_number,

                lr_number: form.lr_number,

                dc_number: form.dc_number,

                received_by: form.received_by,

                remarks: form.remarks,

                items: receiveItems.map(i => ({

                    po_item_id: i.id,

                    material_id: i.material_id,

                    received_qty: Number(i.receive_qty),

                    unit_price: Number(i.unit_price || 0)

                }))

            });

            alert("GRN Saved Successfully.");

            setSelectedPO("");

            setPoDetails(null);

            setItems([]);

            setForm({

                grn_number: "",

                received_date: new Date().toISOString().substring(0,10),

                invoice_number: "",

                vehicle_number: "",

                lr_number: "",

                dc_number: "",

                received_by: "",

                remarks: ""

            });

            loadOpenPOs();

        }
        catch (err) {

            console.log(err);

            alert(getApiErrorMessage(err, "Unable to save GRN."));

        }

    };

    const totalItems = items.filter(
        i => Number(i.receive_qty) > 0
    ).length;

    const totalQty = items.reduce(
        (sum, i) => sum + Number(i.receive_qty || 0),
        0
    );

    return (

        <div style={styles.card}>

            {grnDetails && (
                <div
                    style={{
                        background: "#ecfdf5",
                        border: "1px solid #86efac",
                        padding: 20,
                        borderRadius: 8,
                        marginBottom: 25
                    }}
                >
                    <h3>📥 GRN Details</h3>

                    <p><b>GRN No:</b> {grnDetails.grn_number}</p>
                    <p><b>PO No:</b> {grnDetails.po_number}</p>
                    <p><b>Supplier:</b> {grnDetails.supplier_name}</p>
                    <p><b>Received Date:</b> {grnDetails.received_date?.substring(0,10)}</p>
                    <p><b>Invoice:</b> {grnDetails.invoice_number || "-"}</p>

                    <table
                        width="100%"
                        border="1"
                        cellPadding="8"
                        style={{
                            borderCollapse: "collapse",
                            marginTop: 15
                        }}
                    >
                        <thead>
                            <tr>
                                <th>Item Code</th>
                                <th>Material</th>
                                <th>Unit</th>
                                <th>Ordered</th>
                                <th>Received</th>
                                <th>Accepted</th>
                            </tr>
                        </thead>

                        <tbody>
                            {grnItems.map(item => (
                                <tr key={item.id}>
                                    <td>{item.item_code}</td>
                                    <td>{item.item_name}</td>
                                    <td>{item.unit}</td>
                                    <td>{item.ordered_qty}</td>
                                    <td>{item.received_qty}</td>
                                    <td>{item.accepted_qty}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <button
                        onClick={() => {
                            setSelectedGRN(null);
                            setGrnDetails(null);
                            setGrnItems([]);
                        }}
                        style={{
                            marginTop: 15,
                            background: "#dc2626",
                            color: "#fff",
                            border: "none",
                            padding: "8px 15px",
                            borderRadius: 5,
                            cursor: "pointer"
                        }}
                    >
                        Close GRN Details
                    </button>
                </div>
            )}

            <h2>Goods Receipt Note (GRN)</h2>

            <div style={styles.grid}>

                <div>

                    <label>Purchase Order</label>

                    <select
                        value={selectedPO}
                        onChange={(e) => {

                            setSelectedPO(e.target.value);

                            loadPODetails(e.target.value);

                        }}
                    >

                        <option value="">
                            Select Purchase Order
                        </option>

                        {openPOs.map(po => (

                            <option
                                key={po.id}
                                value={po.id}
                            >
                                {po.po_number} - {po.supplier_name}
                            </option>

                        ))}

                    </select>

                </div>

                <div>

                    <label>Received Date</label>

                    <input
                        type="date"
                        value={form.received_date}
                        onChange={(e) =>
                            setForm({
                                ...form,
                                received_date: e.target.value
                            })
                        }
                    />

                </div>

                <div>

                    <label>Invoice Number</label>

                    <input
                        value={form.invoice_number}
                        onChange={(e) =>
                            setForm({
                                ...form,
                                invoice_number: e.target.value
                            })
                        }
                    />

                </div>

                <div>

                    <label>Vehicle Number</label>

                    <input
                        value={form.vehicle_number}
                        onChange={(e) =>
                            setForm({
                                ...form,
                                vehicle_number: e.target.value
                            })
                        }
                    />

                </div>

                <div>

                    <label>LR Number</label>

                    <input
                        value={form.lr_number}
                        onChange={(e) =>
                            setForm({
                                ...form,
                                lr_number: e.target.value
                            })
                        }
                    />

                </div>

                <div>

                    <label>DC Number</label>

                    <input
                        value={form.dc_number}
                        onChange={(e) =>
                            setForm({
                                ...form,
                                dc_number: e.target.value
                            })
                        }
                    />

                </div>

                <div>

                    <label>Received By</label>

                    <input
                        value={form.received_by}
                        onChange={(e) =>
                            setForm({
                                ...form,
                                received_by: e.target.value
                            })
                        }
                    />

                </div>

                <div>

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

            <div
                style={{
                    display: "flex",
                    gap: 10,
                    marginBottom: 20
                }}
            >
                <input
                    placeholder="Scan / Enter Barcode"
                    value={scanCode}
                    onChange={(e) => setScanCode(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            scanMaterial();
                        }
                    }}
                    style={{
                        padding: 10,
                        border: "1px solid #ccc",
                        borderRadius: 6,
                        width: 300
                    }}
                />

                <button
                    type="button"
                    onClick={scanMaterial}
                    style={{
                        background: "#2563eb",
                        color: "#fff",
                        border: "none",
                        padding: "10px 18px",
                        borderRadius: 6,
                        cursor: "pointer"
                    }}
                >
                    Scan
                </button>
            </div>

            <h3>Material Details</h3>

            {poDetails && (

                <div
                    style={{
                        marginBottom: 20,
                        padding: 15,
                        background: "#f8fafc",
                        borderRadius: 8,
                        border: "1px solid #e2e8f0"
                    }}
                >

                    <h3>Purchase Order Details</h3>

                    <p><b>PO Number :</b> {poDetails.po_number}</p>

                    <p><b>Supplier :</b> {poDetails.supplier_name}</p>

                    <p><b>Project :</b> {poDetails.project_name}</p>

                    <p><b>PO Date :</b> {poDetails.po_date?.substring(0,10)}</p>

                </div>

            )}
            <table
                width="100%"
                border="1"
                cellPadding="8"
                style={{
                    borderCollapse: "collapse"
                }}
            >

                <thead>

                    <tr>

                        <th>Item Code</th>

                        <th>Material</th>

                        <th>Unit</th>

                        <th>Ordered</th>

                        <th>Received</th>

                        <th>Pending</th>

                        <th>Unit Price</th>

                        <th width="150">
                            Receive Now
                        </th>

                    </tr>

                </thead>

                <tbody>

                    {items.map((item, index) => (

                        <tr key={item.id}>

                            <td>{item.item_code}</td>

                            <td>{item.item_name}</td>

                            <td>{item.unit}</td>

                            <td>{item.ordered_qty}</td>

                            <td>{item.received_qty}</td>

                            <td>{item.pending_qty}</td>

                            <td>₹ {Number(item.unit_price || 0).toFixed(2)}</td>

                            <td>

                                <input
                                    type="number"
                                    min="0"
                                    max={item.pending_qty}
                                    value={item.receive_qty}
                                    onChange={(e) => {

                                        let value = Number(e.target.value);

                                        if (value > item.pending_qty)
                                            value = item.pending_qty;

                                        if (value < 0)
                                            value = 0;

                                        const arr = [...items];

                                        arr[index].receive_qty = value;

                                        setItems(arr);

                                    }}
                                    style={{
                                        width: 100
                                    }}
                                />

                            </td>

                        </tr>

                    ))}
                    

                </tbody>
                

            </table>
            
                <hr style={{ marginTop: 30 }} />

            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                }}
            >

                <div>

                    <h3>Total Items : {totalItems}</h3>

                    <h3>Total Qty : {totalQty}</h3>

                </div>

                <button
                    onClick={saveGRN}
                    style={{
                        background: "#16a34a",
                        color: "#fff",
                        border: "none",
                        padding: "12px 30px",
                        borderRadius: 6,
                        cursor: "pointer",
                        fontSize: 16
                    }}
                >
                    Save GRN
                </button>

            </div>

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

    }

};
