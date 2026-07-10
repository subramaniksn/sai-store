import React, { useState, useEffect } from "react";

import AdminLayout from "../../layouts/AdminLayout";

import Dashboard from "./Dashboard";
import MaterialMaster from "./MaterialMaster";
import SupplierMaster from "./SupplierMaster";
import PurchaseOrders from "./PurchaseOrders";
import UserManagement from "./UserManagement";
import IncomingMaterial from "./IncomingMaterial";
import StockRegister from "./StockRegister";
import MaterialIssue from "./MaterialIssue";
import Reports from "./Reports";
import MaterialLedger from "./MaterialLedger";
import LowStock from "./LowStock";
import InternalUse from "./InternalUse";
import MaterialReturn from "./MaterialReturn";
import AuditLog from "./AuditLog";
import Backup from "./Backup";
import VendorPayments from "./VendorPayments";

export default function AdminPage() {

    const [active, setActive] = useState("dashboard");
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const role = user.role || "store_incharge";

    const pageRoles = {
        dashboard: ["admin", "manager", "store_incharge"],
        users: ["admin"],
        materials: ["admin", "manager"],
        suppliers: ["admin", "manager"],
        purchaseorders: ["admin", "manager"],
        vendorpayments: ["admin", "manager"],
        incoming: ["admin", "store_incharge"],
        stock: ["admin", "manager", "store_incharge"],
        ledger: ["admin", "manager"],
        outgoing: ["admin", "store_incharge"],
        return: ["admin", "store_incharge"],
        internal: ["admin", "store_incharge"],
        reports: ["admin", "manager"],
        audit: ["admin"],
        backup: ["admin"],
        lowstock: ["admin", "manager", "store_incharge"]
    };

    const canOpenPage = (page) => pageRoles[page]?.includes(role);

    const openPage = (page) => {
        setActive(canOpenPage(page) ? page : "dashboard");
    };


useEffect(() => {

    const openPurchaseOrders = () => {
        openPage("purchaseorders");
    };

    const openIncomingMaterial = () => {
        openPage("incoming");
    };

    const openMaterialIssue = () => {
        openPage("outgoing");
    };

    const openLowStock = () => {
        openPage("lowstock");
    };

    const openMaterialMaster = () => {
        openPage("materials");
    };

    const openMaterialReturn = () => {
        openPage("return");
    };

    const openMaterialLedger = () => {
        openPage("ledger");
    };

    const openVendorPayments = () => {
        openPage("vendorpayments");
    };

    window.addEventListener("openPurchaseOrders", openPurchaseOrders);
    window.addEventListener("openIncomingMaterial", openIncomingMaterial);
    window.addEventListener("openMaterialIssue", openMaterialIssue);
    window.addEventListener("openLowStock", openLowStock);
    window.addEventListener("openMaterialMaster", openMaterialMaster);
    window.addEventListener("openMaterialReturn", openMaterialReturn);
    window.addEventListener("openMaterialLedger", openMaterialLedger);
    window.addEventListener("openVendorPayments", openVendorPayments);

    return () => {
        window.removeEventListener("openPurchaseOrders", openPurchaseOrders);
        window.removeEventListener("openIncomingMaterial", openIncomingMaterial);
        window.removeEventListener("openMaterialIssue", openMaterialIssue);
        window.removeEventListener("openLowStock", openLowStock);
        window.removeEventListener("openMaterialMaster", openMaterialMaster);
        window.removeEventListener("openMaterialReturn", openMaterialReturn);
        window.removeEventListener("openMaterialLedger", openMaterialLedger);
        window.removeEventListener("openVendorPayments", openVendorPayments);
    };

}, []);

useEffect(() => {
    if (!canOpenPage(active)) {
        setActive("dashboard");
    }
});


    const getTitle = () => {

        switch (active) {

            case "dashboard":
                return "Dashboard";

            case "users":
                return "User Management";

            case "materials":
                return "Material Master";

            case "suppliers":
                return "Supplier Master";

            case "purchaseorders":
                return "Purchase Orders";

            case "vendorpayments":
                return "Vendor Invoice / Payment";

            case "incoming":
                return "Incoming Material";

            case "outgoing":
                return "Outgoing Material";

            case "internal":
                return "Internal Use";

            case "reports":
                return "Reports";

            case "audit":
                return "Audit Log";

            case "backup":
                return "Backup";

            case "lowstock":
                return "Low Stock Alert";

            case "stock":
                return "Stock Register";

            case "ledger":
                return "Material Ledger";

            case "return":
                return "Material Return";

            default:
                return "Dashboard";
        }

    };

    const renderPage = () => {

        switch (active) {

            case "dashboard":
                return <Dashboard setActive={openPage} role={role} />;

            case "materials":
                return <MaterialMaster />;

            case "users":
                return <UserManagement />;

            case "suppliers":
                return <SupplierMaster />;

            case "purchaseorders":
                return <PurchaseOrders />;

            case "vendorpayments":
                return <VendorPayments />;

            case "incoming":
                return <IncomingMaterial />;

            case "outgoing":
                return <MaterialIssue />;

            case "internal":
                return <InternalUse />;

            case "stock":
                return <StockRegister />;
                
            case "ledger":
                return <MaterialLedger />;

            case "reports":
                return <Reports />;

            case "audit":
                return <AuditLog />;

            case "backup":
                return <Backup />;

            case "lowstock":
                return <LowStock />;

            case "return":
                return <MaterialReturn />;

            default:
                return <Dashboard setActive={openPage} role={role} />;

        }

    };

    return (

        <AdminLayout
            active={active}
            setActive={openPage}
            role={role}
            title={getTitle()}
        >

            {renderPage()}

        </AdminLayout>

    );

}
