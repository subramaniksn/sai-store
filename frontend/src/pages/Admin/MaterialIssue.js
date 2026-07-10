import React, { useEffect, useState } from "react";
import api from "../../api/client";
import getApiErrorMessage from "../../api/errorMessage";

export default function MaterialIssue() {

    const [issueNumber, setIssueNumber] = useState("");
    const [materials, setMaterials] = useState([]);
    const [selectedIssue, setSelectedIssue] = useState(null);
    const [issueDetails, setIssueDetails] = useState(null);
    const [issueItems, setIssueItems] = useState([]);
    const [scanCode, setScanCode] = useState("");

    const [items, setItems] = useState([
        {
            material_id: "",
            current_stock: 0,
            unit: "",
            issue_qty: "",
            remarks: ""
        }
    ]);

    const [form, setForm] = useState({

        issue_date: new Date().toISOString().substring(0, 10),

        project_name: "",

        issued_to: "",

        remarks: ""

    });

    useEffect(() => {

        loadIssueNumber();

        loadMaterials();

        const issueId = localStorage.getItem("selectedIssue");

        if (issueId) {

            loadIssueDetails(issueId);

            localStorage.removeItem("selectedIssue");

        }

    }, []);

    const loadIssueNumber = async () => {

        try {

            const res = await api.get("/material-issue/next-number");

            setIssueNumber(res.data.issue_number);

        }
        catch (err) {

            console.log(err);

        }

    };

    const loadMaterials = async () => {

        try {

            const res = await api.get("/material-issue/materials");

            setMaterials(res.data);

        }
        catch (err) {

            console.log(err);

        }

    };

    const addRow = () => {

        setItems([
            ...items,
            {
                material_id: "",
                current_stock: 0,
                unit: "",
                issue_qty: "",
                remarks: ""
            }
        ]);

    };

    const removeRow = (index) => {

        const arr = [...items];

        arr.splice(index, 1);

        setItems(arr);

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

                arr[index].current_stock = mat.current_stock;

            }

        }

        setItems(arr);

    };

    const totalItems = items.length;

    const totalQty = items.reduce(
        (sum, item) =>
            sum + Number(item.issue_qty || 0),
        0
    );

    const loadIssueDetails = async (id) => {

        try {

            const res = await api.get(`/material-issue/${id}`);

            setSelectedIssue(id);
            setIssueDetails(res.data.issue);
            setIssueItems(res.data.items);

        } catch (err) {

            console.log(err);

        }

    };

    const scanMaterial = async () => {

        if (!scanCode.trim()) return;

        try {

            const res = await api.get(
                `/materials/barcode/${scanCode.trim()}`
            );

            const mat = res.data;

            const arr = [...items];

            const existsIndex = arr.findIndex(
                x => Number(x.material_id) === Number(mat.id)
            );

            if (existsIndex >= 0) {

                const currentQty = Number(arr[existsIndex].issue_qty || 0);
                const stock = Number(arr[existsIndex].current_stock || 0);

                if (currentQty + 1 > stock) {
                    alert("Issue quantity cannot exceed available stock.");
                    setScanCode("");
                    return;
                }

                arr[existsIndex].issue_qty = currentQty + 1;

            } else {

                const emptyIndex = arr.findIndex(
                    x => !x.material_id
                );

                const newRow = {
                    material_id: mat.id,
                    current_stock: mat.current_stock,
                    unit: mat.unit,
                    issue_qty: 1,
                    remarks: ""
                };

                if (emptyIndex >= 0) {
                    arr[emptyIndex] = newRow;
                } else {
                    arr.push(newRow);
                }

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

    const saveIssue = async () => {

        try {

            if (items.length === 0) {

                alert("Please add at least one material.");

                return;

            }

            // -------------------------------
            // Validate Each Material
            // -------------------------------

            for (const item of items) {

                if (!item.material_id) {

                    alert("Please select material.");

                    return;

                }

                if (Number(item.issue_qty) <= 0) {

                    alert("Issue quantity must be greater than zero.");

                    return;

                }

                if (Number(item.issue_qty) > Number(item.current_stock)) {

                    alert("Issue quantity cannot exceed available stock.");

                    return;

                }

            }

            await api.post(

                "/material-issue",

                {

                    issue_number: issueNumber,

                    issue_date: form.issue_date,

                    project_name: form.project_name,

                    issued_to: form.issued_to,

                    remarks: form.remarks,

                    items

                }

            );

            alert("Material Issued Successfully.");

            //-----------------------------------
            // Reset Form
            //-----------------------------------

            setForm({

                issue_date: new Date().toISOString().substring(0, 10),

                project_name: "",

                issued_to: "",

                remarks: ""

            });

            setItems([
                {
                    material_id: "",
                    current_stock: 0,
                    unit: "",
                    issue_qty: "",
                    remarks: ""
                }
            ]);

            loadIssueNumber();

            loadMaterials();

        }
        catch (err) {

            console.log(err);

            alert(getApiErrorMessage(
                err,
                "Unable to save Material Issue."
            ));

        }

    };

    return (

        <div style={styles.card}>

            {issueDetails && (
                <div
                    style={{
                        background: "#eff6ff",
                        border: "1px solid #93c5fd",
                        padding: 20,
                        borderRadius: 8,
                        marginBottom: 25
                    }}
                >
                    <h3>📤 Material Issue Details</h3>

                    <p><b>Issue No:</b> {issueDetails.issue_number}</p>
                    <p><b>Issue Date:</b> {issueDetails.issue_date?.substring(0,10)}</p>
                    <p><b>Project:</b> {issueDetails.project_name || "-"}</p>
                    <p><b>Issued To:</b> {issueDetails.issued_to || "-"}</p>
                    <p><b>Issued By:</b> {issueDetails.issued_by_name || "-"}</p>
                    <p><b>Remarks:</b> {issueDetails.remarks || "-"}</p>

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
                                <th>Issued Qty</th>
                                <th>Remarks</th>
                            </tr>
                        </thead>

                        <tbody>
                            {issueItems.map(item => (
                                <tr key={item.id}>
                                    <td>{item.item_code}</td>
                                    <td>{item.item_name}</td>
                                    <td>{item.unit}</td>
                                    <td>{item.issued_qty}</td>
                                    <td>{item.remarks || "-"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <button
                        onClick={() => {
                            setSelectedIssue(null);
                            setIssueDetails(null);
                            setIssueItems([]);
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
                        Close Issue Details
                    </button>
                </div>
            )}

            <h2>Material Issue</h2>

            <div style={styles.grid}>

                <div>

                    <label>Issue Number</label>

                    <input
                        value={issueNumber}
                        readOnly
                    />

                </div>

                <div>

                    <label>Issue Date</label>

                    <input
                        type="date"
                        value={form.issue_date}
                        onChange={(e) =>
                            setForm({
                                ...form,
                                issue_date: e.target.value
                            })
                        }
                    />

                </div>

                <div>

                    <label>Project Name</label>

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

                    <label>Issued To</label>

                    <input
                        value={form.issued_to}
                        onChange={(e) =>
                            setForm({
                                ...form,
                                issued_to: e.target.value
                            })
                        }
                    />

                </div>

                <div style={{ gridColumn: "1 / span 2" }}>

                    <label>Remarks</label>

                    <textarea
                        rows="3"
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

                <h3>Materials</h3>

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

                            <th>Material</th>

                            <th>Current Stock</th>

                            <th>Unit</th>

                            <th width="120">Issue Qty</th>

                            <th>Remarks</th>

                            <th width="80"></th>

                        </tr>

                    </thead>

                    <tbody>

                        {

                            items.map((item, index) => (

                                <tr key={index}>

                                    <td>

                                        <select

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

                                    </td>

                                    <td>

                                        {item.current_stock}

                                    </td>

                                    <td>

                                        {item.unit}

                                    </td>

                                    <td>

                                        <input

                                            type="number"

                                            value={item.issue_qty}

                                            onChange={(e) =>
                                                updateItem(
                                                    index,
                                                    "issue_qty",
                                                    e.target.value
                                                )
                                            }

                                        />

                                    </td>

                                    <td>

                                        <input

                                            value={item.remarks}

                                            onChange={(e) =>
                                                updateItem(
                                                    index,
                                                    "remarks",
                                                    e.target.value
                                                )
                                            }

                                        />

                                    </td>

                                    <td>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                removeRow(index)
                                            }
                                        >

                                            Delete

                                        </button>

                                    </td>

                                </tr>

                            ))

                        }

                    </tbody>

                </table>

                <div
                    style={{
                        marginTop: 15
                    }}
                >

                    <button
                        type="button"
                        onClick={addRow}
                    >

                        + Add Material

                    </button>

                </div>

                <hr style={{ marginTop: 30 }} />

                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                    }}
                >

                    <div>

                        <h3>

                            Total Items : {totalItems}

                        </h3>

                        <h3>

                            Total Qty : {totalQty}

                        </h3>

                    </div>

                    <button

                        disabled={items.length === 0}

                        onClick={saveIssue}

                        style={{

                            background:
                                items.length === 0
                                    ? "#9ca3af"
                                    : "#2563eb",

                            color: "#fff",

                            border: "none",

                            padding: "12px 30px",

                            borderRadius: 6,

                            cursor:
                                items.length === 0
                                    ? "not-allowed"
                                    : "pointer"

                        }}

                    >

                        Save Issue

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

        gridTemplateColumns: "repeat(2,1fr)",

        gap: 20,

        marginTop: 20

    }

};
