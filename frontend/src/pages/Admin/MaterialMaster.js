import React, { useEffect, useState } from "react";
import api from "../../api/client";
import JsBarcode from "jsbarcode";
import QRCode from "qrcode";

const units = [
  "Nos",
  "Kg",
  "Meter",
  "Litre",
  "Box",
  "Pack",
  "Roll",
  "Set",
  "Pair"
];

const categories = [
  "SCADA",
  "PLC",
  "Electrical",
  "Networking",
  "Instrumentation",
  "Solar",
  "WMS",
  "Communication",
  "Consumables",
  "Spare Parts",
  "Tools",
  "Others"
];

const initialForm = {
  item_code: "",
  item_name: "",
  category: "",
  brand: "",
  manufacturer: "",
  unit: "Nos",
  minimum_stock: 0,
  reorder_level: 0,
  maximum_stock: 0,
  unit_price: 0,
  rack_location: "",
  hsn_code: "",
  description: ""
};

export default function MaterialMaster() {

  const [materials, setMaterials] = useState([]);
  const [filteredMaterials, setFilteredMaterials] = useState([]);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");

  const [message, setMessage] = useState("");

  const [error, setError] = useState("");

  const [editId, setEditId] = useState(null);

  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    loadMaterials();
  }, []);

  useEffect(() => {

    const txt = search.toLowerCase();

    const data = materials.filter((m) => {

      return (
        (m.item_code || "").toLowerCase().includes(txt) ||
        (m.item_name || "").toLowerCase().includes(txt) ||
        (m.brand || "").toLowerCase().includes(txt) ||
        (m.category || "").toLowerCase().includes(txt) ||
        (m.rack_location || "").toLowerCase().includes(txt)
      );

    });

    setFilteredMaterials(data);

  }, [search, materials]);

  const loadMaterials = async () => {

    try {

      setLoading(true);

      const res = await api.get("/materials", {
        params: {
          include_inactive: true
        }
      });

      setMaterials(res.data);

      setFilteredMaterials(res.data);

    } catch (err) {

      console.log(err);

      setError("Unable to load materials.");

    } finally {

      setLoading(false);

    }

  };

  const handleChange = (e) => {

    setForm({

      ...form,

      [e.target.name]: e.target.value

    });

  };

  const resetForm = () => {

    setForm(initialForm);

    setEditId(null);

    setError("");

    setMessage("");

  };

  const editMaterial = (material) => {

    setEditId(material.id);

    setForm({

      item_code: material.item_code || "",

      item_name: material.item_name || "",

      category: material.category || "",

      brand: material.brand || "",

      manufacturer: material.manufacturer || "",

      unit: material.unit || "Nos",

      minimum_stock: material.minimum_stock || 0,

      reorder_level: material.reorder_level || 0,

      maximum_stock: material.maximum_stock || 0,

      unit_price: material.unit_price || 0,

      rack_location: material.rack_location || "",

      hsn_code: material.hsn_code || "",

      description: material.description || ""

    });

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });

  };
    /* ============================================
      SAVE / UPDATE MATERIAL
    ============================================ */

    const saveMaterial = async (e) => {

      e.preventDefault();

      setError("");
      setMessage("");

      if (!form.item_code.trim()) {
        setError("Item Code is required.");
        return;
      }

      if (!form.item_name.trim()) {
        setError("Item Name is required.");
        return;
      }

      if (!form.category) {
        setError("Please select Category.");
        return;
      }

      try {

        setSaving(true);

        if (editId) {

          await api.put(`/materials/${editId}`, form);

          setMessage("Material updated successfully.");

        } else {

          await api.post("/materials", form);

          setMessage("Material created successfully.");

        }

        resetForm();

        loadMaterials();

      } catch (err) {

        console.log(err);

        setError(
          err.response?.data?.error ||
          "Unable to save material."
        );

      } finally {

        setSaving(false);

      }

    };


    /* ============================================
      DEACTIVATE MATERIAL
    ============================================ */

    const deactivateMaterial = async (id) => {

      const ok = window.confirm(
        "Deactivate this material? It will be hidden from new PO/Issue/Internal Use forms, but old history will remain."
      );

      if (!ok) return;

      try {

        await api.delete(`/materials/${id}`);

        setMessage("Material deactivated successfully.");

        loadMaterials();

      } catch (err) {

        console.log(err);

        setError(
          err.response?.data?.error ||
          "Unable to deactivate material."
        );

      }

    };

    const reactivateMaterial = async (id) => {

      try {

        await api.patch(`/materials/${id}/status`, {
          is_active: true
        });

        setMessage("Material reactivated successfully.");

        loadMaterials();

      } catch (err) {

        console.log(err);

        setError(
          err.response?.data?.error ||
          "Unable to reactivate material."
        );

      }

    };


    /* ============================================
      CANCEL EDIT
    ============================================ */

    const cancelEdit = () => {

      resetForm();

    };

    const printLabel = async (m) => {

      try {

        const barcodeCanvas = document.createElement("canvas");

        JsBarcode(barcodeCanvas, m.barcode_value || m.item_code, {
          format: "CODE128",
          width: 2,
          height: 55,
          displayValue: true,
          fontSize: 14,
          margin: 5
        });

        const barcodeImage = barcodeCanvas.toDataURL("image/png");

        const qrImage = await QRCode.toDataURL(
          m.qr_value || m.item_code,
          {
            width: 120,
            margin: 1
          }
        );

        const w = window.open("", "_blank");

        if (!w) {
          alert("Popup blocked. Please allow popups.");
          return;
        }

        w.document.write(`
          <html>
            <head>
              <title>Material Label</title>

              <style>
                body {
                  font-family: Arial, sans-serif;
                  padding: 20px;
                }

                .label {
                  width: 380px;
                  border: 2px solid #000;
                  padding: 14px;
                  text-align: center;
                }

                .company {
                  font-size: 20px;
                  font-weight: bold;
                  margin-bottom: 8px;
                }

                .code {
                  font-size: 24px;
                  font-weight: bold;
                  margin: 5px 0;
                }

                .name {
                  font-size: 16px;
                  font-weight: bold;
                  margin-bottom: 8px;
                }

                .info {
                  font-size: 13px;
                  margin: 3px 0;
                }

                .barcode {
                  margin-top: 10px;
                }

                .qr-section {
                  margin-top: 10px;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  gap: 15px;
                }

                .qr-text {
                  font-size: 11px;
                  text-align: left;
                  max-width: 180px;
                  word-break: break-word;
                }

                @media print {
                  body {
                    margin: 0;
                    padding: 0;
                  }

                  .label {
                    margin: 0;
                  }
                }
              </style>
            </head>

            <body>
              <div class="label">

                <div class="company">SAI Automation</div>

                <div class="code">${m.item_code || "-"}</div>

                <div class="name">${m.item_name || "-"}</div>

                <div class="info">Rack: ${m.rack_location || "-"}</div>

                <div class="info">Unit: ${m.unit || "-"}</div>

                <div class="barcode">
                  <img src="${barcodeImage}" style="width:320px;height:auto;" />
                </div>

                <div class="qr-section">

                  <img src="${qrImage}" width="110" height="110" />

                  <div class="qr-text">
                    <b>QR Data</b><br/>
                    ${m.qr_value || "-"}
                  </div>

                </div>

              </div>

              <script>
                window.onload = function() {
                  window.print();
                };
              </script>

            </body>
          </html>
        `);

        w.document.close();

      } catch (err) {

        console.log(err);

        alert("Unable to generate Barcode / QR label.");

      }

    };

    return (

    <div style={styles.container}>

      <div style={styles.card}>

        <div style={styles.cardHeader}>

          <h2>
            {editId ? "Edit Material" : "Material Master"}
          </h2>

        </div>

        {message && (
          <div style={styles.success}>
            {message}
          </div>
        )}

        {error && (
          <div style={styles.error}>
            {error}
          </div>
        )}

        <form onSubmit={saveMaterial}>

          <div style={styles.grid}>

            <div>

              <label>Item Code</label>

              <input
                name="item_code"
                value={form.item_code}
                onChange={handleChange}
                style={styles.input}
                required
              />

            </div>

            <div>

              <label>Item Name</label>

              <input
                name="item_name"
                value={form.item_name}
                onChange={handleChange}
                style={styles.input}
                required
              />

            </div>

            <div>

              <label>Brand</label>

              <input
                name="brand"
                value={form.brand}
                onChange={handleChange}
                style={styles.input}
              />

            </div>

            <div>

              <label>Manufacturer</label>

              <input
                name="manufacturer"
                value={form.manufacturer}
                onChange={handleChange}
                style={styles.input}
              />

            </div>

            <div>

              <label>Category</label>

              <select
                name="category"
                value={form.category}
                onChange={handleChange}
                style={styles.input}
              >

                <option value="">
                  Select Category
                </option>

                {categories.map(c => (

                  <option
                    key={c}
                    value={c}
                  >
                    {c}
                  </option>

                ))}

              </select>

            </div>

            <div>

              <label>Unit</label>

              <select
                name="unit"
                value={form.unit}
                onChange={handleChange}
                style={styles.input}
              >

                {units.map(u => (

                  <option
                    key={u}
                    value={u}
                  >
                    {u}
                  </option>

                ))}

              </select>

            </div>

            <div>

              <label>Minimum Stock</label>

              <input
                type="number"
                name="minimum_stock"
                value={form.minimum_stock}
                onChange={handleChange}
                style={styles.input}
              />

            </div>

            <div>

              <label>Reorder Level</label>

              <input
                type="number"
                name="reorder_level"
                value={form.reorder_level}
                onChange={handleChange}
                style={styles.input}
              />

            </div>

            <div>

              <label>Maximum Stock</label>

              <input
                type="number"
                name="maximum_stock"
                value={form.maximum_stock}
                onChange={handleChange}
                style={styles.input}
              />

            </div>

            <div>

              <label>Unit Price (₹)</label>

              <input
                type="number"
                name="unit_price"
                min="0"
                step="0.01"
                value={form.unit_price}
                onChange={handleChange}
                style={styles.input}
              />

            </div>

            <div>

              <label>Rack Location</label>

              <input
                name="rack_location"
                value={form.rack_location}
                onChange={handleChange}
                style={styles.input}
              />

            </div>

            <div>

              <label>HSN Code</label>

              <input
                name="hsn_code"
                value={form.hsn_code}
                onChange={handleChange}
                style={styles.input}
              />

            </div>

          </div>

          <div style={{ marginTop: 20 }}>

            <label>Description</label>

            <textarea
              rows="4"
              name="description"
              value={form.description}
              onChange={handleChange}
              style={{
                ...styles.input,
                resize: "vertical"
              }}
            />

          </div>

          <div style={styles.buttonRow}>

            <button
              type="submit"
              style={styles.saveButton}
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : editId
                  ? "Update Material"
                  : "Save Material"}
            </button>

            {editId && (

              <button
                type="button"
                onClick={cancelEdit}
                style={styles.cancelButton}
              >
                Cancel
              </button>

            )}

          </div>

        </form>

      </div>
            {/* ================================
                Material List
            ================================= */}

            <div style={styles.card}>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 20
                }}
              >

                <h2 style={{ margin: 0 }}>
                  Material List ({filteredMaterials.length})
                </h2>

                <input
                  type="text"
                  placeholder="🔍 Search Material..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    width: 320,
                    padding: 10,
                    borderRadius: 6,
                    border: "1px solid #ccc"
                  }}
                />

              </div>

              {loading ? (

                <div
                  style={{
                    textAlign: "center",
                    padding: 40
                  }}
                >
                  Loading Materials...
                </div>

              ) : filteredMaterials.length === 0 ? (

                <div
                  style={{
                    textAlign: "center",
                    padding: 40,
                    color: "#666"
                  }}
                >
                  No materials found.
                </div>

              ) : (

                <div
                  style={{
                    overflowX: "auto"
                  }}
                >

                  <table style={styles.table}>

                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Name</th>
                        <th>Brand</th>
                        <th>Manufacturer</th>
                        <th>Category</th>
                        <th>Unit</th>
                        <th>Min</th>
                        <th>Reorder</th>
                        <th>Max</th>
                        <th>Unit Price</th>
                        <th>Rack</th>
                        <th>HSN</th>
                        <th>Barcode</th>
                        <th>QR</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>

                    <tbody>

                      {filteredMaterials.map((m) => (

                        <tr key={m.id}>

                          <td>{m.item_code}</td>
                          <td>{m.item_name}</td>
                          <td>{m.brand}</td>
                          <td>{m.manufacturer}</td>
                          <td>{m.category}</td>
                          <td>{m.unit}</td>
                          <td>{m.minimum_stock}</td>
                          <td>{m.reorder_level}</td>
                          <td>{m.maximum_stock}</td>
                          <td>₹ {Number(m.unit_price || 0).toFixed(2)}</td>
                          <td>{m.rack_location}</td>
                          <td>{m.hsn_code}</td>
                          <td>
                            <span style={styles.codeBadge}>
                              {m.barcode_value || "-"}
                            </span>
                          </td>

                          <td>
                            {m.qr_value ? (
                              <span style={styles.qrBadge}>
                                QR Available
                              </span>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td>
                            <span
                              style={{
                                ...styles.statusBadge,
                                ...(m.is_active === false
                                  ? styles.inactiveBadge
                                  : styles.activeBadge)
                              }}
                            >
                              {m.is_active === false ? "Inactive" : "Active"}
                            </span>
                          </td>
                          <td>

                            <button
                              onClick={() => printLabel(m)}
                              style={styles.printButton}
                            >
                              🏷 Print Label
                            </button>

                            <button
                              onClick={() => editMaterial(m)}
                              style={styles.editButton}
                            >
                              ✏ Edit
                            </button>

                            {m.is_active === false ? (
                              <button
                                onClick={() => reactivateMaterial(m.id)}
                                style={styles.reactivateButton}
                              >
                                Reactivate
                              </button>
                            ) : (
                              <button
                                onClick={() => deactivateMaterial(m.id)}
                                style={styles.deleteButton}
                              >
                                Deactivate
                              </button>
                            )}

                          </td>

                        </tr>

                      ))}

                    </tbody>

                  </table>

                </div>

              )}

      </div>

    </div>

  );
}
const styles = {
  container: {
    padding: 20,
  },

  card: {
    background: "#fff",
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
  },

  cardHeader: {
    marginBottom: 20,
  },

  success: {
    background: "#d1fae5",
    color: "#065f46",
    padding: 10,
    borderRadius: 6,
    marginBottom: 15,
  },

  error: {
    background: "#fee2e2",
    color: "#991b1b",
    padding: 10,
    borderRadius: 6,
    marginBottom: 15,
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))",
    gap: 15,
  },

  input: {
    width: "100%",
    padding: 10,
    border: "1px solid #ccc",
    borderRadius: 6,
    fontSize: 14,
    boxSizing: "border-box",
  },

  buttonRow: {
    marginTop: 20,
    display: "flex",
    gap: 10,
  },

  saveButton: {
    background: "#2563eb",
    color: "#fff",
    border: "none",
    padding: "10px 18px",
    borderRadius: 6,
    cursor: "pointer",
  },

  cancelButton: {
    background: "#6b7280",
    color: "#fff",
    border: "none",
    padding: "10px 18px",
    borderRadius: 6,
    cursor: "pointer",
  },

  editButton: {
    background: "#f59e0b",
    color: "#fff",
    border: "none",
    padding: "6px 10px",
    borderRadius: 5,
    cursor: "pointer",
    marginRight: 5,
  },

  deleteButton: {
    background: "#dc2626",
    color: "#fff",
    border: "none",
    padding: "6px 10px",
    borderRadius: 5,
    cursor: "pointer",
  },

  reactivateButton: {
    background: "#16a34a",
    color: "#fff",
    border: "none",
    padding: "6px 10px",
    borderRadius: 5,
    cursor: "pointer",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
  },

  printButton: {
    background: "#2563eb",
    color: "#fff",
    border: "none",
    padding: "6px 10px",
    borderRadius: 5,
    cursor: "pointer",
    marginTop: 5
  },

  codeBadge: {
    background: "#eef2ff",
    color: "#1d4ed8",
    padding: "4px 8px",
    borderRadius: 5,
    fontWeight: "bold",
    fontSize: 12
  },

  qrBadge: {
    background: "#dcfce7",
    color: "#15803d",
    padding: "4px 8px",
    borderRadius: 5,
    fontWeight: "bold",
    fontSize: 12
  },

  statusBadge: {
    padding: "4px 8px",
    borderRadius: 999,
    fontWeight: "bold",
    fontSize: 12
  },

  activeBadge: {
    background: "#dcfce7",
    color: "#15803d"
  },

  inactiveBadge: {
    background: "#fee2e2",
    color: "#b91c1c"
  }
};
