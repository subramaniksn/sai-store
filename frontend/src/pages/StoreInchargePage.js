import React, { useEffect, useState } from 'react';
import api from '../api/client';
import NavBar from '../components/NavBar';

const TXN_TABS = [
    { key: 'incoming', label: 'Material Incoming' },
    { key: 'outgoing', label: 'Material Outgoing' },
    { key: 'internal_use', label: 'Internal Use' }
];

export default function StoreInchargePage() {
    const [tab, setTab] = useState('incoming');
    const [materials, setMaterials] = useState([]);
    const [pos, setPos] = useState([]);
    const [recent, setRecent] = useState([]);
    const [message, setMessage] = useState('');

    const [form, setForm] = useState({
        material_id: '', quantity: '', txn_date: '', remarks: '',
        po_id: '', issued_to: '', purpose: '', used_by_dept: '', used_for: ''
    });

    const loadData = async () => {
        const [m, p, t] = await Promise.all([
            api.get('/materials'),
            api.get('/purchase-orders'),
            api.get('/transactions', { params: { txn_type: tab } })
        ]);
        setMaterials(m.data);
        setPos(p.data.filter(po => po.status === 'open' || po.status === 'partial'));
        setRecent(t.data);
    };

    useEffect(() => { loadData(); /* eslint-disable-next-line */ }, [tab]);

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        try {
            const payload = { txn_type: tab, ...form };
            if (tab !== 'incoming') delete payload.po_id;
            await api.post('/transactions', payload);
            setMessage('Saved successfully.');
            setForm({
                material_id: '', quantity: '', txn_date: '', remarks: '',
                po_id: '', issued_to: '', purpose: '', used_by_dept: '', used_for: ''
            });
            loadData();
        } catch (err) {
            setMessage(err.response?.data?.error || 'Error saving entry');
        }
    };

    const matchLabel = (status) => {
        const map = {
            as_per_po: { text: 'As per PO', color: '#16a34a' },
            short_qty: { text: 'Short Qty', color: '#d97706' },
            excess_qty: { text: 'Excess Qty', color: '#2563eb' },
            not_in_po: { text: 'Not in PO', color: '#dc2626' }
        };
        return map[status] || { text: '-', color: '#999' };
    };

    return (
        <div>
            <NavBar title="Store Incharge Dashboard" />
            <div style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>

                <div style={styles.tabs}>
                    {TXN_TABS.map(t => (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            style={{ ...styles.tabBtn, ...(tab === t.key ? styles.tabActive : {}) }}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                <form onSubmit={handleSubmit} style={styles.form}>
                    <h3 style={{ marginTop: 0 }}>{TXN_TABS.find(t => t.key === tab).label} Entry</h3>

                    <div style={styles.row}>
                        <div style={styles.field}>
                            <label>Material *</label>
                            <select name="material_id" value={form.material_id} onChange={handleChange} required style={styles.input}>
                                <option value="">-- select material --</option>
                                {materials.map(m => (
                                    <option key={m.id} value={m.id}>{m.item_name} ({m.unit})</option>
                                ))}
                            </select>
                        </div>
                        <div style={styles.field}>
                            <label>Quantity *</label>
                            <input style={styles.input} type="number" step="0.01" name="quantity" value={form.quantity} onChange={handleChange} required />
                        </div>
                        <div style={styles.field}>
                            <label>Date</label>
                            <input style={styles.input} type="date" name="txn_date" value={form.txn_date} onChange={handleChange} />
                        </div>
                    </div>

                    {tab === 'incoming' && (
                        <div style={styles.row}>
                            <div style={styles.field}>
                                <label>Against PO (leave blank if not in any PO)</label>
                                <select name="po_id" value={form.po_id} onChange={handleChange} style={styles.input}>
                                    <option value="">-- not against a PO --</option>
                                    {pos.map(po => (
                                        <option key={po.id} value={po.id}>{po.po_number} - {po.supplier_name || ''}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    {tab === 'outgoing' && (
                        <div style={styles.row}>
                            <div style={styles.field}>
                                <label>Issued To (site/person/dept) *</label>
                                <input style={styles.input} name="issued_to" value={form.issued_to} onChange={handleChange} required />
                            </div>
                            <div style={styles.field}>
                                <label>Purpose</label>
                                <input style={styles.input} name="purpose" value={form.purpose} onChange={handleChange} />
                            </div>
                        </div>
                    )}

                    {tab === 'internal_use' && (
                        <div style={styles.row}>
                            <div style={styles.field}>
                                <label>Used By Department *</label>
                                <input style={styles.input} name="used_by_dept" value={form.used_by_dept} onChange={handleChange} required />
                            </div>
                            <div style={styles.field}>
                                <label>Used For</label>
                                <input style={styles.input} name="used_for" value={form.used_for} onChange={handleChange} />
                            </div>
                        </div>
                    )}

                    <div style={styles.field}>
                        <label>Remarks</label>
                        <input style={styles.input} name="remarks" value={form.remarks} onChange={handleChange} />
                    </div>

                    {message && <div style={{ margin: '10px 0', color: message.includes('Error') ? '#d33' : '#16a34a' }}>{message}</div>}

                    <button type="submit" style={styles.button}>Save Entry</button>
                </form>

                <h3>Recent {TXN_TABS.find(t => t.key === tab).label} Entries</h3>
                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th>Date</th><th>Item</th><th>Qty</th>
                            {tab === 'incoming' && <><th>PO</th><th>Match Status</th></>}
                            {tab === 'outgoing' && <><th>Issued To</th><th>Purpose</th></>}
                            {tab === 'internal_use' && <><th>Dept</th><th>Used For</th></>}
                            <th>Entered By</th>
                        </tr>
                    </thead>
                    <tbody>
                        {recent.map(r => (
                            <tr key={r.id}>
                                <td>{r.txn_date}</td>
                                <td>{r.item_name}</td>
                                <td>{r.quantity}</td>
                                {tab === 'incoming' && (
                                    <>
                                        <td>{r.po_number || '-'}</td>
                                        <td style={{ color: matchLabel(r.po_match_status).color, fontWeight: 600 }}>
                                            {matchLabel(r.po_match_status).text}
                                        </td>
                                    </>
                                )}
                                {tab === 'outgoing' && <><td>{r.issued_to}</td><td>{r.purpose}</td></>}
                                {tab === 'internal_use' && <><td>{r.used_by_dept}</td><td>{r.used_for}</td></>}
                                <td>{r.entered_by_name}</td>
                            </tr>
                        ))}
                        {recent.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', color: '#999' }}>No entries yet</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

const styles = {
    tabs: { display: 'flex', gap: 8, marginBottom: 16 },
    tabBtn: { padding: '8px 16px', border: '1px solid #ccc', background: '#fff', borderRadius: 6, cursor: 'pointer' },
    tabActive: { background: '#2563eb', color: '#fff', borderColor: '#2563eb' },
    form: { background: '#fff', padding: 20, borderRadius: 8, boxShadow: '0 1px 6px rgba(0,0,0,0.08)', marginBottom: 28 },
    row: { display: 'flex', gap: 16, marginBottom: 10, flexWrap: 'wrap' },
    field: { flex: 1, minWidth: 220, display: 'flex', flexDirection: 'column', gap: 4 },
    input: { padding: '8px 10px', borderRadius: 6, border: '1px solid #ccc', fontSize: 14 },
    button: { marginTop: 10, padding: '10px 22px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14 },
    table: { width: '100%', borderCollapse: 'collapse', background: '#fff', boxShadow: '0 1px 6px rgba(0,0,0,0.08)' }
};
