import React, { useEffect, useState } from 'react';
import api from '../api/client';
import NavBar from '../components/NavBar';

export default function ManagerPage() {
    const [summary, setSummary] = useState(null);
    const [pos, setPos] = useState([]);
    const [selectedPO, setSelectedPO] = useState(null);

    const loadSummary = async () => {
        const res = await api.get('/transactions/summary');
        setSummary(res.data);
    };
    const loadPOs = async () => {
        const res = await api.get('/purchase-orders');
        setPos(res.data);
    };

    useEffect(() => { loadSummary(); loadPOs(); }, []);

    const openPO = async (id) => {
        const res = await api.get(`/purchase-orders/${id}`);
        setSelectedPO(res.data);
    };

    const statusColor = (s) => ({
        as_per_po: '#16a34a', short_qty: '#d97706', excess_qty: '#2563eb',
        pending: '#999', not_in_po: '#dc2626'
    }[s] || '#999');

    return (
        <div>
            <NavBar title="Manager Dashboard" />
            <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>

                {summary && (
                    <>
                        <div style={styles.cards}>
                            {summary.totals.map(t => (
                                <div key={t.txn_type} style={styles.card}>
                                    <div style={{ fontSize: 13, color: '#666' }}>{t.txn_type.replace('_', ' ').toUpperCase()}</div>
                                    <div style={{ fontSize: 24, fontWeight: 700 }}>{t.txn_count}</div>
                                    <div style={{ fontSize: 12, color: '#999' }}>Total Qty: {t.total_qty}</div>
                                </div>
                            ))}
                            <div style={styles.card}>
                                <div style={{ fontSize: 13, color: '#666' }}>OPEN / PARTIAL POs</div>
                                <div style={{ fontSize: 24, fontWeight: 700 }}>{summary.open_or_partial_pos}</div>
                            </div>
                        </div>

                        <h3>Incoming Material - PO Match Breakdown</h3>
                        <div style={styles.cards}>
                            {summary.po_match_breakdown.map(b => (
                                <div key={b.po_match_status || 'none'} style={{ ...styles.card, borderTop: `4px solid ${statusColor(b.po_match_status)}` }}>
                                    <div style={{ fontSize: 13, color: '#666' }}>{(b.po_match_status || 'unspecified').replace('_', ' ').toUpperCase()}</div>
                                    <div style={{ fontSize: 22, fontWeight: 700 }}>{b.count}</div>
                                </div>
                            ))}
                        </div>

                        {summary.recent_not_in_po.length > 0 && (
                            <>
                                <h3>Recent Items Received NOT in any PO</h3>
                                <table style={styles.table}>
                                    <thead><tr><th>Date</th><th>Item</th><th>Qty</th><th>Remarks</th></tr></thead>
                                    <tbody>
                                        {summary.recent_not_in_po.map(r => (
                                            <tr key={r.id}><td>{r.txn_date}</td><td>{r.item_name}</td><td>{r.quantity}</td><td>{r.remarks}</td></tr>
                                        ))}
                                    </tbody>
                                </table>
                            </>
                        )}
                    </>
                )}

                <h3 style={{ marginTop: 32 }}>Purchase Orders</h3>
                <table style={styles.table}>
                    <thead><tr><th>PO Number</th><th>Supplier</th><th>Date</th><th>Status</th><th>Items</th><th></th></tr></thead>
                    <tbody>
                        {pos.map(po => (
                            <tr key={po.id}>
                                <td>{po.po_number}</td>
                                <td>{po.supplier_name}</td>
                                <td>{po.po_date}</td>
                                <td style={{ textTransform: 'capitalize' }}>{po.status}</td>
                                <td>{po.fully_received_items}/{po.total_items} fully received</td>
                                <td><button style={styles.linkBtn} onClick={() => openPO(po.id)}>View Comparison</button></td>
                            </tr>
                        ))}
                        {pos.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', color: '#999' }}>No purchase orders yet</td></tr>}
                    </tbody>
                </table>

                {selectedPO && (
                    <div style={{ marginTop: 24 }}>
                        <h3>PO {selectedPO.po.po_number} - Received vs Ordered</h3>
                        <table style={styles.table}>
                            <thead><tr><th>Item</th><th>Ordered</th><th>Received</th><th>Status</th></tr></thead>
                            <tbody>
                                {selectedPO.items.map(it => (
                                    <tr key={it.id}>
                                        <td>{it.item_name} ({it.unit})</td>
                                        <td>{it.ordered_qty}</td>
                                        <td>{it.received_qty}</td>
                                        <td style={{ color: statusColor(it.match_status), fontWeight: 600, textTransform: 'capitalize' }}>
                                            {it.match_status.replace('_', ' ')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {selectedPO.extra_items_not_in_po.length > 0 && (
                            <>
                                <h4 style={{ color: '#dc2626' }}>Items Received Against This PO But NOT Listed In PO</h4>
                                <table style={styles.table}>
                                    <thead><tr><th>Item</th><th>Qty Received</th></tr></thead>
                                    <tbody>
                                        {selectedPO.extra_items_not_in_po.map(ex => (
                                            <tr key={ex.material_id}><td>{ex.item_name} ({ex.unit})</td><td>{ex.received_qty}</td></tr>
                                        ))}
                                    </tbody>
                                </table>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

const styles = {
    cards: { display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 24 },
    card: { background: '#fff', padding: 16, borderRadius: 8, minWidth: 160, boxShadow: '0 1px 6px rgba(0,0,0,0.08)' },
    table: { width: '100%', borderCollapse: 'collapse', background: '#fff', boxShadow: '0 1px 6px rgba(0,0,0,0.08)', marginBottom: 20 },
    linkBtn: { background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', textDecoration: 'underline' }
};
