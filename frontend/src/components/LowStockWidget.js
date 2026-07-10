import React from "react";

export default function LowStockWidget({ items = [] }) {

    return (

        <div
            style={{
                background: "#fff",
                padding: 20,
                borderRadius: 10,
                boxShadow: "0 2px 8px rgba(0,0,0,.08)"
            }}
        >

            <h3 style={{ marginBottom: 15 }}>
                ⚠ Low Stock Alert
            </h3>

            {

                items.length === 0

                ?

                (

                    <div
                        style={{
                            color: "#16a34a",
                            fontWeight: "bold",
                            padding: 20,
                            textAlign: "center"
                        }}
                    >

                        ✅ No Low Stock Items

                    </div>

                )

                :

                (

                    items.map((item) => (

                        <div
                            key={item.id}
                            style={{
                                padding: "12px 0",
                                borderBottom: "1px solid #eee"
                            }}
                        >

                            <strong>

                                {item.item_name}

                            </strong>

                            <br />

                            <span style={{ color: "#666" }}>

                                Current :

                            </span>

                            <span
                                style={{
                                    color: "#dc2626",
                                    fontWeight: "bold"
                                }}
                            >

                                {" "}
                                {item.current_stock}

                            </span>

                            {" / "}

                            {item.minimum_stock} {item.unit}

                        </div>

                    ))

                )

            }

        </div>

    );

}