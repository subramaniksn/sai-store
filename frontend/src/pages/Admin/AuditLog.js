import React, { useEffect, useMemo, useState } from "react";
import api from "../../api/client";
import getApiErrorMessage from "../../api/errorMessage";

const ACTIONS = ["CREATE", "UPDATE", "DEACTIVATE", "REACTIVATE", "DELETE", "REPAIR"];
const ENTITY_TYPES = [
    "MATERIAL",
    "SUPPLIER",
    "PURCHASE_ORDER",
    "GRN",
    "MATERIAL_ISSUE",
    "MATERIAL_RETURN",
    "INTERNAL_USE",
    "VENDOR_INVOICE",
    "STOCK_RECONCILIATION"
];

export default function AuditLog() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [filters, setFilters] = useState({
        from_date: "",
        to_date: "",
        action: "",
        entity_type: "",
        user: "",
        search: ""
    });

    useEffect(() => {
        loadAuditLogs();
    }, []);

    const queryParams = useMemo(() => {
        const params = {};

        Object.entries(filters).forEach(([key, value]) => {
            if (value) params[key] = value;
        });

        return params;
    }, [filters]);

    const loadAuditLogs = async () => {
        try {
            setLoading(true);
            setError("");

            const res = await api.get("/audit-logs", {
                params: queryParams
            });

            setLogs(res.data || []);
        } catch (err) {
            setError(getApiErrorMessage(err, "Unable to load Audit Log."));
        } finally {
            setLoading(false);
        }
    };

    const resetFilters = async () => {
        setFilters({
            from_date: "",
            to_date: "",
            action: "",
            entity_type: "",
            user: "",
            search: ""
        });

        try {
            setLoading(true);
            setError("");
            const res = await api.get("/audit-logs");
            setLogs(res.data || []);
        } catch (err) {
            setError(getApiErrorMessage(err, "Unable to load Audit Log."));
        } finally {
            setLoading(false);
        }
    };

    const formatDateTime = (value) => {
        if (!value) return "-";

        return new Date(value).toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    const formatEntityType = (value) => {
        if (!value) return "-";
        return value.replaceAll("_", " ");
    };

    const formatDetails = (details) => {
        if (!details) return "-";

        const parsed =
            typeof details === "string"
                ? safeParseJson(details)
                : details;

        if (!parsed || typeof parsed !== "object") return "-";

        return Object.entries(parsed)
            .filter(([, value]) => value !== null && value !== undefined && value !== "")
            .slice(0, 5)
            .map(([key, value]) => {
                const label = key.replaceAll("_", " ");
                const displayValue =
                    typeof value === "object"
                        ? JSON.stringify(value)
                        : String(value);

                return `${label}: ${displayValue}`;
            })
            .join(" | ");
    };

    const safeParseJson = (value) => {
        try {
            return JSON.parse(value);
        } catch {
            return null;
        }
    };

    return (
        <div style={styles.page}>
            <div style={styles.headerRow}>
                <div>
                    <h2 style={styles.title}>Audit Log</h2>
                    <p style={styles.subtitle}>
                        Track important ERP actions with user and time details.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={loadAuditLogs}
                    style={styles.refreshButton}
                    disabled={loading}
                >
                    Refresh
                </button>
            </div>

            <div style={styles.filters}>
                <input
                    type="date"
                    value={filters.from_date}
                    onChange={(e) => setFilters({ ...filters, from_date: e.target.value })}
                    style={styles.input}
                />

                <input
                    type="date"
                    value={filters.to_date}
                    onChange={(e) => setFilters({ ...filters, to_date: e.target.value })}
                    style={styles.input}
                />

                <select
                    value={filters.action}
                    onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                    style={styles.input}
                >
                    <option value="">All Actions</option>
                    {ACTIONS.map(action => (
                        <option key={action} value={action}>{action}</option>
                    ))}
                </select>

                <select
                    value={filters.entity_type}
                    onChange={(e) => setFilters({ ...filters, entity_type: e.target.value })}
                    style={styles.input}
                >
                    <option value="">All Modules</option>
                    {ENTITY_TYPES.map(type => (
                        <option key={type} value={type}>{formatEntityType(type)}</option>
                    ))}
                </select>

                <input
                    type="text"
                    placeholder="User..."
                    value={filters.user}
                    onChange={(e) => setFilters({ ...filters, user: e.target.value })}
                    style={styles.input}
                />

                <input
                    type="text"
                    placeholder="Search..."
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    style={styles.input}
                />

                <button
                    type="button"
                    onClick={loadAuditLogs}
                    style={styles.searchButton}
                    disabled={loading}
                >
                    Search
                </button>

                <button
                    type="button"
                    onClick={resetFilters}
                    style={styles.resetButton}
                    disabled={loading}
                >
                    Reset
                </button>
            </div>

            {error && <div style={styles.error}>{error}</div>}

            <div style={styles.summary}>
                Showing latest {logs.length} audit record(s)
            </div>

            <div style={styles.tableWrap}>
                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th style={styles.th}>Date & Time</th>
                            <th style={styles.th}>User</th>
                            <th style={styles.th}>Role</th>
                            <th style={styles.th}>Action</th>
                            <th style={styles.th}>Module</th>
                            <th style={styles.th}>Reference</th>
                            <th style={styles.th}>Details</th>
                        </tr>
                    </thead>

                    <tbody>
                        {logs.length === 0 && (
                            <tr>
                                <td colSpan="7" style={styles.empty}>
                                    {loading ? "Loading..." : "No audit records found."}
                                </td>
                            </tr>
                        )}

                        {logs.map(log => (
                            <tr key={log.id}>
                                <td style={styles.td}>{formatDateTime(log.created_at)}</td>
                                <td style={styles.td}>{log.user_name || "-"}</td>
                                <td style={styles.td}>{log.user_role || "-"}</td>
                                <td style={styles.td}>
                                    <span style={{
                                        ...styles.badge,
                                        ...(log.action === "DELETE"
                                            ? styles.deleteBadge
                                            : log.action === "UPDATE"
                                                ? styles.updateBadge
                                                : log.action === "REPAIR"
                                                    ? styles.repairBadge
                                                    : styles.createBadge)
                                    }}>
                                        {log.action}
                                    </span>
                                </td>
                                <td style={styles.td}>{formatEntityType(log.entity_type)}</td>
                                <td style={styles.td}>{log.entity_label || "-"}</td>
                                <td style={styles.td}>{formatDetails(log.details)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

const styles = {
    page: {
        padding: 20
    },
    headerRow: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 20,
        marginBottom: 20
    },
    title: {
        margin: 0,
        fontSize: 26
    },
    subtitle: {
        marginTop: 6,
        color: "#64748b"
    },
    filters: {
        display: "flex",
        flexWrap: "wrap",
        gap: 12,
        marginBottom: 18
    },
    input: {
        padding: "10px 12px",
        border: "1px solid #cbd5e1",
        borderRadius: 6,
        minWidth: 150
    },
    searchButton: {
        padding: "10px 18px",
        border: "none",
        borderRadius: 6,
        background: "#16a34a",
        color: "#fff",
        fontWeight: 600,
        cursor: "pointer"
    },
    resetButton: {
        padding: "10px 18px",
        border: "none",
        borderRadius: 6,
        background: "#dc2626",
        color: "#fff",
        fontWeight: 600,
        cursor: "pointer"
    },
    refreshButton: {
        padding: "10px 18px",
        border: "none",
        borderRadius: 6,
        background: "#2563eb",
        color: "#fff",
        fontWeight: 600,
        cursor: "pointer"
    },
    error: {
        background: "#fee2e2",
        color: "#991b1b",
        padding: 12,
        borderRadius: 8,
        marginBottom: 14
    },
    summary: {
        marginBottom: 10,
        fontWeight: 600
    },
    tableWrap: {
        overflowX: "auto",
        background: "#fff",
        borderRadius: 8,
        boxShadow: "0 2px 8px rgba(15,23,42,0.08)"
    },
    table: {
        width: "100%",
        borderCollapse: "collapse",
        fontSize: 14
    },
    th: {
        background: "#2563eb",
        color: "#fff",
        padding: 12,
        textAlign: "left",
        whiteSpace: "nowrap"
    },
    td: {
        padding: 12,
        borderBottom: "1px solid #e2e8f0",
        verticalAlign: "top"
    },
    empty: {
        padding: 25,
        textAlign: "center",
        color: "#64748b"
    },
    badge: {
        padding: "5px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700
    },
    createBadge: {
        background: "#dcfce7",
        color: "#15803d"
    },
    updateBadge: {
        background: "#dbeafe",
        color: "#1d4ed8"
    },
    deleteBadge: {
        background: "#fee2e2",
        color: "#b91c1c"
    },
    repairBadge: {
        background: "#fef3c7",
        color: "#b45309"
    }
};
