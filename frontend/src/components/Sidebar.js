import React from "react";

export default function Sidebar({ active, setActive, role }) {

    const allMenus = [
        { id: "dashboard", name: "Dashboard", roles: ["admin", "manager", "store_incharge"] },
        { id: "users", name: "User Management", roles: ["admin"] },
        { id: "materials", name: "Material Master", roles: ["admin", "manager"] },
        { id: "suppliers", name: "Supplier Master", roles: ["admin", "manager"] },
        { id: "purchaseorders", name: "Purchase Orders", roles: ["admin", "manager"] },
        { id: "vendorpayments", name: "Vendor Payment", roles: ["admin", "manager"] },
        { id: "incoming", name: "Goods Receipt Note", roles: ["admin", "store_incharge"] },
        { id: "stock", name: "Stock Register", roles: ["admin", "manager", "store_incharge"] },
        { id: "ledger", name: "Material Ledger", roles: ["admin", "manager"] },
        { id: "outgoing", name: "Material Issue", roles: ["admin", "store_incharge"] },
        { id: "return", name: "Material Return", roles: ["admin", "store_incharge"] },
        { id: "internal", name: "Internal Use", roles: ["admin", "store_incharge"] },
        { id: "reports", name: "Reports", roles: ["admin", "manager"] },
        { id: "audit", name: "Audit Log", roles: ["admin"] },
        { id: "backup", name: "Backup", roles: ["admin"] },
        { id: "lowstock", name: "Low Stock Alert", roles: ["admin", "manager", "store_incharge"] }
    ];

    const menus = allMenus.filter(menu => menu.roles.includes(role));

    return (

        <div style={styles.sidebar}>

            <div style={styles.logo}>

                <img
                    src="/sai_1.png"
                    alt="SAI Logo"
                    style={styles.logoImage}
                />

                <p style={styles.logoSubtitle}>
                    Store Management
                </p>

            </div>

            <div style={styles.menuList}>

                {menus.map(menu => (

                    <div
                        key={menu.id}
                        onClick={() => setActive(menu.id)}
                        style={{
                            ...styles.menu,
                            background:
                                active === menu.id
                                    ? "#2563eb"
                                    : "transparent"
                        }}
                    >
                        {menu.name}
                    </div>

                ))}

            </div>

        </div>

    );

}

const styles = {

    sidebar: {

        width: "clamp(220px, 13vw, 250px)",

        flexShrink: 0,

        background: "#0f172a",

        height: "100vh",

        color: "#fff",

        display: "flex",

        flexDirection: "column",

        overflow: "hidden"

    },

    logo: {

        padding: "10px 14px",

        borderBottom: "1px solid #334155",

        textAlign: "center",

        flexShrink: 0

    },

    logoImage: {

        maxWidth: "160px",

        maxHeight: "48px",

        width: "100%",

        objectFit: "contain"

    },

    logoSubtitle: {

        color: "#cbd5e1",

        margin: "4px 0 0",

        fontSize: 14,

        fontWeight: "700"

    },

    menuList: {

        flex: 1,

        overflowY: "hidden",

        overflowX: "hidden"

    },

    menu: {

        padding: "9px 14px",

        cursor: "pointer",

        borderBottom: "1px solid #1e293b",

        transition: ".2s",

        fontSize: 13,

        whiteSpace: "nowrap",

        lineHeight: 1.15

    }

};
