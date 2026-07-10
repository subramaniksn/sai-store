import React from "react";
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip,
    Legend,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid
} from "recharts";

export default function DashboardCharts({ inventory, categories }) {

    const inventoryData = [
        {
            name: "Available",
            value: inventory?.available || 0
        },
        {
            name: "Low Stock",
            value: inventory?.low_stock || 0
        },
        {
            name: "Out Of Stock",
            value: inventory?.out_of_stock || 0
        }
    ];

    const COLORS = [
        "#16a34a",
        "#f59e0b",
        "#dc2626"
    ];

    return (

        <div
            style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 20
            }}
        >

            {/* Inventory Pie */}

            <div
                style={{
                    background: "#fff",
                    padding: 20,
                    borderRadius: 10,
                    boxShadow: "0 2px 8px rgba(0,0,0,.08)"
                }}
            >

                <h3>Inventory Status</h3>

                <ResponsiveContainer
                    width="100%"
                    height={320}
                >

                    <PieChart>

                        <Pie
                            data={inventoryData}
                            dataKey="value"
                            outerRadius={100}
                            label
                        >

                            {
                                inventoryData.map((entry, index) => (

                                    <Cell
                                        key={index}
                                        fill={COLORS[index]}
                                    />

                                ))
                            }

                        </Pie>

                        <Tooltip />

                        <Legend />

                    </PieChart>

                </ResponsiveContainer>

            </div>

            {/* Category Chart */}

            <div
                style={{
                    background: "#fff",
                    padding: 20,
                    borderRadius: 10,
                    boxShadow: "0 2px 8px rgba(0,0,0,.08)"
                }}
            >

                <h3>Materials By Category</h3>

                <ResponsiveContainer
                    width="100%"
                    height={320}
                >

                    <BarChart data={categories}>

                        <CartesianGrid strokeDasharray="3 3" />

                        <XAxis dataKey="category" />

                        <YAxis />

                        <Tooltip />

                        <Legend />

                        <Bar
                            dataKey="count"
                            fill="#2563eb"
                        />

                    </BarChart>

                </ResponsiveContainer>

            </div>

        </div>

    );

}