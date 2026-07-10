import React, { useEffect, useState } from "react";
import api from "../../api/client";

export default function InternalUse() {

    const [issueNumber, setIssueNumber] = useState("");

    const [materials, setMaterials] = useState([]);
    const [items, setItems] = useState([
        {
            material_id: "",
            current_stock: 0,
            unit: "",
            used_qty: "",
            remarks: ""
        }
    ]);

    const [form, setForm] = useState({

        use_date: new Date().toISOString().substring(0,10),

        department: "",

        used_by: "",

        purpose: "",

        remarks: ""

    });

    useEffect(() => {

        loadIssueNumber();

        loadMaterials();

    }, []);

    const loadIssueNumber = async () => {

        try {

            const res = await api.get("/internal-use/next-number");

            setIssueNumber(res.data.internal_use_number);

        }
        catch (err) {

            console.log(err);

        }

    };

    const loadMaterials = async () => {

        try {

            const res = await api.get("/internal-use/materials");

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
                used_qty: "",
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
            sum + Number(item.used_qty || 0),
        0
    );

    const saveIssue = async () => {

        if (!form.department || !form.used_by || !form.purpose) {
            alert("Please fill all required fields.");
            return;
        }

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

                if (Number(item.used_qty) <= 0) {

                    alert("Used quantity must be greater than zero.");

                    return;

                }

                if (Number(item.used_qty) > Number(item.current_stock)) {

                    alert("Used quantity cannot exceed available stock.");

                    return;

                }

            }

            await api.post("/internal-use",{

                internal_use_number:issueNumber,

                use_date:form.use_date,

                department:form.department,

                used_by:form.used_by,

                purpose:form.purpose,

                remarks:form.remarks,

                items

            });

            alert("Internal Use Saved Successfully.");

            //-----------------------------------
            // Reset Form
            //-----------------------------------

            setForm({

                use_date:new Date().toISOString().substring(0,10),

                department:"",

                used_by:"",

                purpose:"",

                remarks:""

            });

            setItems([
                {
                    material_id: "",
                    current_stock: 0,
                    unit: "",
                    used_qty: "",
                    remarks: ""
                }
            ]);

            loadIssueNumber();

            loadMaterials();

        }
        catch (err) {

            console.log(err);

            alert(

                err.response?.data?.error ||

                "Unable to save Material Issue."

            );

        }

    };

    return (

        <div style={styles.card}>

            <h2>Internal Use</h2>

            <div style={styles.grid}>

                <div>

                    <label>Internal Use Number</label>

                    <input
                        value={issueNumber}
                        readOnly
                    />

                </div>

                <div>

                    <label>Use Date</label>

                    <input
                        type="date"
                        value={form.use_date}
                        onChange={(e) =>
                            setForm({
                                ...form,
                                use_date: e.target.value
                            })
                        }
                    />

                </div>

                <div>

                    <label>Department</label>

                    <input
                        value={form.department}
                        onChange={(e) =>
                            setForm({
                                ...form,
                                department: e.target.value
                            })
                        }
                    />

                </div>

                <div>

                    <label>Used By</label>

                    <input
                        value={form.used_by}
                        onChange={(e) =>
                            setForm({
                                ...form,
                                used_by: e.target.value
                            })
                        }
                    />

                </div>

                <div style={{ gridColumn: "1 / span 2" }}>

                    <label>Purpose</label>

                    <input
                        value={form.purpose}
                        onChange={(e) =>
                            setForm({
                                ...form,
                                purpose: e.target.value
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

                                            value={item.used_qty}

                                            onChange={(e) =>
                                                updateItem(
                                                    index,
                                                    "used_qty",
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

                        Save Internal Use

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
