import React from "react";

export default function DashboardQuickActions({ setActive, role }) {

    const allActions = [
        {
            title: "Goods Receipt Note",
            color: "#16a34a",
            page: "incoming",
            roles: ["admin", "store_incharge"]
        },
        {
            title: "Material Issue",
            color: "#2563eb",
            page: "outgoing",
            roles: ["admin", "store_incharge"]
        },
        {
            title: "Material Return",
            color: "#0f766e",
            page: "return",
            roles: ["admin", "store_incharge"]
        },
        {
            title: "Internal Use",
            color: "#7c3aed",
            page: "internal",
            roles: ["admin", "store_incharge"]
        },
        {
            title: "Purchase Orders",
            color: "#9333ea",
            page: "purchaseorders",
            roles: ["admin", "manager"]
        },
        {
            title: "Material Master",
            color: "#475569",
            page: "materials",
            roles: ["admin", "manager"]
        },
        {
            title: "Supplier Master",
            color: "#0891b2",
            page: "suppliers",
            roles: ["admin", "manager"]
        },
        {
            title: "Low Stock",
            color: "#f59e0b",
            page: "lowstock",
            roles: ["admin", "manager", "store_incharge"]
        }
    ];

    const actions = allActions.filter(item => item.roles.includes(role));

    return (

        <div
            style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
                gap: 20,
                marginTop: 25
            }}
        >

            {

                actions.map((item, index) => (

                    <div

                        key={index}

                        onClick={() => setActive(item.page)}

                        style={{
                            background: "#fff",
                            borderRadius: 8,
                            padding: 20,
                            cursor: "pointer",
                            transition: ".2s",
                            borderTop: `5px solid ${item.color}`,
                            boxShadow: "0 2px 8px rgba(0,0,0,.08)"
                        }}

                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = "translateY(-4px)";
                        }}

                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "translateY(0px)";
                        }}

                    >

                        <h3 style={{ marginTop: 0 }}>{item.title}</h3>

                        <div style={{ color: "#666" }}>

                            Open Module

                        </div>

                    </div>

                ))

            }

        </div>

    );

}
