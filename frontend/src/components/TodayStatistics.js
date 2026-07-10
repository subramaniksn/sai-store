import React from "react";

export default function TodayStatistics({ stats }) {

    const cards = [

        {
            title: "Incoming",
            value: stats?.incoming || 0,
            color: "#16a34a",
            icon: "📥"
        },

        {
            title: "Outgoing",
            value: stats?.outgoing || 0,
            color: "#2563eb",
            icon: "📤"
        },

        {
            title: "Internal Use",
            value: stats?.internal || 0,
            color: "#f59e0b",
            icon: "🏭"
        },

        {
            title: "Purchase Orders",
            value: stats?.purchase_orders || 0,
            color: "#9333ea",
            icon: "🛒"
        }

    ];

    return (

        <div
            style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
                gap: 20,
                marginTop: 30
            }}
        >

            {

                cards.map((card, index)=>(

                    <div

                        key={index}

                        style={{
                            background:"#fff",
                            padding:20,
                            borderRadius:10,
                            boxShadow:"0 2px 8px rgba(0,0,0,.08)",
                            borderTop:`5px solid ${card.color}`
                        }}

                    >

                        <div style={{fontSize:28}}>

                            {card.icon}

                        </div>

                        <div
                            style={{
                                color:"#666",
                                marginTop:8
                            }}
                        >

                            {card.title}

                        </div>

                        <h2>{card.value}</h2>

                    </div>

                ))

            }

        </div>

    );

}