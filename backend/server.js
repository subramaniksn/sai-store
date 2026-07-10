require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const materialRoutes = require('./routes/materials');
const poRoutes = require('./routes/purchaseOrders');
const txnRoutes = require('./routes/transactions');
const supplierRoutes = require('./routes/suppliers');
const stockRoutes = require('./routes/stock');
const dashboardRoutes = require('./routes/dashboard');
const reportRoutes = require('./routes/reports');
const alertRoutes=require('./routes/alerts');
const grnRoutes = require('./routes/grn');
const materialIssueRoutes = require('./routes/materialIssue');
const internalUseRoutes = require("./routes/internalUse");
const notificationRoutes = require("./routes/notifications");
const materialReturnRoutes = require("./routes/materialReturn");
const auditLogRoutes = require("./routes/auditLogs");
const vendorInvoiceRoutes = require("./routes/vendorInvoices");

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/purchase-orders', poRoutes);
app.use('/api/transactions', txnRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/grn', grnRoutes);
app.use('/api/material-issue', materialIssueRoutes);
app.use("/api/internal-use", internalUseRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/material-return", materialReturnRoutes);
app.use("/api/audit-logs", auditLogRoutes);
app.use("/api/vendor-invoices", vendorInvoiceRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Store app backend running on port ${PORT}`));
