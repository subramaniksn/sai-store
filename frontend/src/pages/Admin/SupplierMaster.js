import React, { useEffect, useState } from "react";
import api from "../../api/client";

export default function SupplierMaster() {

    const emptySupplier = {
        supplier_name: "",
        contact_person: "",
        phone: "",
        email: "",
        gst_number: "",
        state: "",
        address: "",
        is_active: true
    };

    const [suppliers, setSuppliers] = useState([]);
    const [form, setForm] = useState(emptySupplier);
    const [editingId, setEditingId] = useState(null);
    const [search, setSearch] = useState("");
    const [message, setMessage] = useState("");

    useEffect(() => {
        loadSuppliers();
    }, []);

    const loadSuppliers = async () => {
        try {
            const res = await api.get("/suppliers", {
                params: {
                    include_inactive: true
                }
            });
            setSuppliers(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const clearForm = () => {
        setForm(emptySupplier);
        setEditingId(null);
    };

    const saveSupplier = async (e) => {

        e.preventDefault();

        try {

            if (editingId) {

                await api.put(`/suppliers/${editingId}`, form);

                setMessage("Supplier updated successfully.");

            } else {

                await api.post("/suppliers", form);

                setMessage("Supplier added successfully.");

            }

            clearForm();

            loadSuppliers();

        } catch (err) {

            setMessage(
                err.response?.data?.error || "Unable to save supplier."
            );

        }

    };

    const editSupplier = (supplier) => {

        setEditingId(supplier.id);

        setForm({

            supplier_name: supplier.supplier_name || "",

            contact_person: supplier.contact_person || "",

            phone: supplier.phone || "",

            email: supplier.email || "",

            gst_number: supplier.gst_number || "",

            state: supplier.state || "",

            address: supplier.address || "",

            is_active: supplier.is_active

        });

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    };

    const deactivateSupplier = async (id) => {

        if (!window.confirm("Deactivate this supplier? It will be hidden from new Purchase Orders, but old history will remain."))
            return;

        try {

            await api.delete(`/suppliers/${id}`);

            loadSuppliers();

            setMessage("Supplier deactivated successfully.");

        } catch (err) {

            setMessage(
                err.response?.data?.error || "Unable to deactivate supplier."
            );

        }

    };

    const reactivateSupplier = async (id) => {

        try {

            await api.patch(`/suppliers/${id}/status`, {
                is_active: true
            });

            loadSuppliers();

            setMessage("Supplier reactivated successfully.");

        } catch (err) {

            setMessage(
                err.response?.data?.error || "Unable to reactivate supplier."
            );

        }

    };

    const filtered = suppliers.filter((s) => {

        const value = search.toLowerCase();

        return (
            s.supplier_name?.toLowerCase().includes(value) ||
            s.contact_person?.toLowerCase().includes(value) ||
            s.phone?.toLowerCase().includes(value) ||
            s.email?.toLowerCase().includes(value) ||
            s.state?.toLowerCase().includes(value)
        );

    });
        return (

        <div>

            <h2>Supplier Master</h2>

            {message &&

                <div style={styles.message}>

                    {message}

                </div>

            }

            <form
                onSubmit={saveSupplier}
                style={styles.form}
            >

                <div style={styles.grid}>

                    <div>

                        <label>Supplier Name *</label>

                        <input
                            style={styles.input}
                            value={form.supplier_name}
                            onChange={(e) =>
                                setForm({
                                    ...form,
                                    supplier_name: e.target.value
                                })
                            }
                            required
                        />

                    </div>

                    <div>

                        <label>Contact Person</label>

                        <input
                            style={styles.input}
                            value={form.contact_person}
                            onChange={(e) =>
                                setForm({
                                    ...form,
                                    contact_person: e.target.value
                                })
                            }
                        />

                    </div>

                    <div>

                        <label>Phone</label>

                        <input
                            style={styles.input}
                            value={form.phone}
                            onChange={(e) =>
                                setForm({
                                    ...form,
                                    phone: e.target.value
                                })
                            }
                        />

                    </div>

                    <div>

                        <label>Email</label>

                        <input
                            type="email"
                            style={styles.input}
                            value={form.email}
                            onChange={(e) =>
                                setForm({
                                    ...form,
                                    email: e.target.value
                                })
                            }
                        />

                    </div>

                    <div>

                        <label>GST Number</label>

                        <input
                            style={styles.input}
                            value={form.gst_number}
                            onChange={(e) =>
                                setForm({
                                    ...form,
                                    gst_number: e.target.value
                                })
                            }
                        />

                    </div>

                    <div>

                        <label>State</label>

                        <input
                            style={styles.input}
                            value={form.state}
                            placeholder="Example: 29-Karnataka"
                            onChange={(e) =>
                                setForm({
                                    ...form,
                                    state: e.target.value
                                })
                            }
                        />

                    </div>

                    <div>

                        <label>Status</label>

                        <select
                            style={styles.input}
                            value={form.is_active ? "true" : "false"}
                            onChange={(e) =>
                                setForm({
                                    ...form,
                                    is_active: e.target.value === "true"
                                })
                            }
                        >

                            <option value="true">
                                Active
                            </option>

                            <option value="false">
                                Inactive
                            </option>

                        </select>

                    </div>

                </div>

                <div style={{ marginTop: 15 }}>

                    <label>Address</label>

                    <textarea
                        rows="3"
                        style={styles.textarea}
                        value={form.address}
                        onChange={(e) =>
                            setForm({
                                ...form,
                                address: e.target.value
                            })
                        }
                    />

                </div>

                <div style={{ marginTop: 20 }}>

                    <button
                        style={styles.saveButton}
                        type="submit"
                    >

                        {editingId
                            ? "Update Supplier"
                            : "Save Supplier"}

                    </button>

                    {editingId &&

                        <button
                            type="button"
                            style={styles.cancelButton}
                            onClick={clearForm}
                        >

                            Cancel

                        </button>

                    }

                </div>

            </form>
                        <div style={{ marginTop: 30 }}>

                <div style={styles.searchBar}>

                    <h3>Supplier List</h3>

                    <input
                        placeholder="Search Supplier..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={styles.searchInput}
                    />

                </div>

                <table style={styles.table}>

                    <thead>

                        <tr>

                            <th style={styles.th}>Supplier</th>

                            <th style={styles.th}>Contact</th>

                            <th style={styles.th}>Phone</th>

                            <th style={styles.th}>Email</th>

                            <th style={styles.th}>GST No</th>

                            <th style={styles.th}>State</th>

                            <th style={styles.th}>Address</th>

                            <th style={styles.th}>Status</th>

                            <th style={styles.th}>Action</th>

                        </tr>

                    </thead>

                    <tbody>

                        {filtered.length === 0 && (

                            <tr>

                                <td
                                    colSpan="9"
                                    style={{
                                        textAlign: "center",
                                        padding: 20
                                    }}
                                >

                                    No Suppliers Found

                                </td>

                            </tr>

                        )}

                        {filtered.map((supplier) => (

                            <tr key={supplier.id}>

                                <td style={styles.td}>
                                    <b>{supplier.supplier_name}</b>
                                </td>

                                <td style={styles.td}>
                                    {supplier.contact_person}
                                </td>

                                <td style={styles.td}>
                                    {supplier.phone}
                                </td>

                                <td style={styles.td}>
                                    {supplier.email}
                                </td>

                                <td style={styles.td}>
                                    {supplier.gst_number}
                                </td>

                                <td style={styles.td}>
                                    {supplier.state}
                                </td>

                                <td style={styles.td}>
                                    {supplier.address}
                                </td>

                                <td style={styles.td}>

                                    <span
                                        style={{
                                            color: supplier.is_active
                                                ? "green"
                                                : "red",
                                            fontWeight: "bold"
                                        }}
                                    >

                                        {supplier.is_active
                                            ? "Active"
                                            : "Inactive"}

                                    </span>

                                </td>

                                <td style={styles.td}>

                                    <button
                                        style={styles.editButton}
                                        onClick={() =>
                                            editSupplier(supplier)
                                        }
                                    >

                                        Edit

                                    </button>

                                    {supplier.is_active ? (
                                        <button
                                            style={styles.deleteButton}
                                            onClick={() =>
                                                deactivateSupplier(supplier.id)
                                            }
                                        >

                                            Deactivate

                                        </button>
                                    ) : (
                                        <button
                                            style={styles.reactivateButton}
                                            onClick={() =>
                                                reactivateSupplier(supplier.id)
                                            }
                                        >

                                            Reactivate

                                        </button>
                                    )}

                                </td>

                            </tr>

                        ))}

                    </tbody>

                </table>

            </div>

        </div>

    );

}
const styles = {

    message: {
        background: "#dbeafe",
        color: "#1e3a8a",
        padding: 12,
        borderRadius: 6,
        marginBottom: 20,
        fontWeight: "bold"
    },

    form: {
        background: "#fff",
        padding: 20,
        borderRadius: 8,
        boxShadow: "0 2px 8px rgba(0,0,0,.08)"
    },

    grid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))",
        gap: 15
    },

    input: {
        width: "100%",
        padding: 10,
        marginTop: 5,
        border: "1px solid #ccc",
        borderRadius: 5,
        boxSizing: "border-box"
    },

    textarea: {
        width: "100%",
        padding: 10,
        marginTop: 5,
        border: "1px solid #ccc",
        borderRadius: 5,
        resize: "vertical",
        boxSizing: "border-box"
    },

    saveButton: {
        background: "#2563eb",
        color: "#fff",
        border: "none",
        padding: "10px 20px",
        borderRadius: 5,
        cursor: "pointer",
        marginRight: 10
    },

    cancelButton: {
        background: "#6b7280",
        color: "#fff",
        border: "none",
        padding: "10px 20px",
        borderRadius: 5,
        cursor: "pointer"
    },

    searchBar: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 15
    },

    searchInput: {
        width: 300,
        padding: 10,
        border: "1px solid #ccc",
        borderRadius: 5
    },

    table: {
        width: "100%",
        borderCollapse: "collapse",
        background: "#fff",
        boxShadow: "0 2px 8px rgba(0,0,0,.08)"
    },

    th: {
        background: "#2563eb",
        color: "#fff",
        padding: 12,
        textAlign: "left",
        border: "1px solid #ddd"
    },

    td: {
        padding: 12,
        border: "1px solid #ddd"
    },

    editButton: {
        background: "#2563eb",
        color: "#fff",
        border: "none",
        padding: "6px 12px",
        borderRadius: 4,
        cursor: "pointer",
        marginRight: 8
    },

    deleteButton: {
        background: "#dc2626",
        color: "#fff",
        border: "none",
        padding: "6px 12px",
        borderRadius: 4,
        cursor: "pointer"
    },

    reactivateButton: {
        background: "#16a34a",
        color: "#fff",
        border: "none",
        padding: "6px 12px",
        borderRadius: 4,
        cursor: "pointer"
    }

};
