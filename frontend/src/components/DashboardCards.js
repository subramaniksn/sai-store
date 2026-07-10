import React from "react";

export default function DashboardCards({ dashboard }) {

    const cards = [

        {
            title: "Total Materials",
            value: dashboard?.total_materials || 0,
            color: "#2563eb",
            icon: "📦"
        },

        {
            title: "Available",
            value: dashboard?.available || 0,
            color: "#16a34a",
            icon: "✅"
        },

        {
            title: "Low Stock",
            value: dashboard?.low_stock || 0,
            color: "#f59e0b",
            icon: "⚠️"
        },

        {
            title: "Out Of Stock",
            value: dashboard?.out_of_stock || 0,
            color: "#dc2626",
            icon: "❌"
        },

        {
            title: "Inventory Value",
            value: `₹ ${Number(dashboard?.inventory_value || 0).toLocaleString()}`,
            color: "#0891b2",
            icon: "💰"
        },

        {
            title: "Today's Returns",
            value: dashboard?.return_statistics?.today || 0,
            color: "#7c3aed",
            icon: "↩"
        },

        {
            title: "This Month's Returns",
            value: dashboard?.return_statistics?.this_month || 0,
            color: "#9333ea",
            icon: "↩"
        }

    ];

    return (

        <div
            style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
                gap: 20
            }}
        >

            {cards.map((card, index) => (

                <div
                    key={index}
                    style={{
                        background: "#fff",
                        borderLeft: `6px solid ${card.color}`,
                        borderRadius: 10,
                        padding: 20,
                        boxShadow: "0 2px 8px rgba(0,0,0,.08)"
                    }}
                >

                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center"
                        }}
                    >

                        <div>

                            <div
                                style={{
                                    color: "#666",
                                    fontSize: 15
                                }}
                            >
                                {card.title}
                            </div>

                            <h2
                                style={{
                                    marginTop: 10,
                                    marginBottom: 0
                                }}
                            >
                                {card.value}
                            </h2>

                        </div>

                        <div
                            style={{
                                fontSize: 34
                            }}
                        >
                            {card.icon}
                        </div>

                    </div>

                </div>

            ))}

        </div>

    );

}
