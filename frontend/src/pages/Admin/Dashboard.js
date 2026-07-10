import React, { useEffect, useState } from "react";
import api from "../../api/client";

import DashboardCards from "../../components/DashboardCards";
import DashboardQuickActions from "../../components/DashboardQuickActions";
import DashboardCharts from "../../components/DashboardCharts";
import RecentTransactions from "../../components/RecentTransactions";
import LowStockWidget from "../../components/LowStockWidget";
import TodayStatistics from "../../components/TodayStatistics";

export default function Dashboard({ setActive, role }) {
    

    const [dashboard, setDashboard] = useState(null);

    const [loading, setLoading] = useState(true);

    useEffect(() => {

        loadDashboard();

        const interval = setInterval(() => {
            loadDashboard();
        }, 30000); // 30 seconds

        return () => clearInterval(interval);

    }, []);

    const [lastUpdated, setLastUpdated] = useState("");

    const loadDashboard = async () => {

        try {

            const res = await api.get("/reports/dashboard");

            setDashboard(res.data);
            setLastUpdated(new Date().toLocaleString());

        }

        catch (err) {

            console.log(err);

        }

        finally {

            setLoading(false);

        }

    };

    if (loading) {

        return (

            <div
                style={{
                    padding: 40,
                    textAlign: "center",
                    fontSize: 18,
                    fontWeight: "bold"
                }}
            >

                <div
                    style={{
                        textAlign: "center",
                        padding: 80
                    }}
                >

                    <div
                        style={{
                            fontSize: 40
                        }}
                    >
                        📦
                    </div>

                    <h3>Loading Dashboard...</h3>

                </div>

            </div>

        );

    }

    return (

        <div
            style={{
                padding: 20
            }}
        >

            <h2
                style={{
                    marginBottom: 25
                }}
            >

                Dashboard

            </h2>

            <div
                style={{
                    textAlign: "right",
                    color: "#666",
                    fontSize: 13,
                    marginBottom: 20
                }}
            >
                Last Updated : {lastUpdated}
            </div>

            {/* ================= Summary Cards ================= */}

            <DashboardCards dashboard={dashboard} />

            {/* ================= Quick Actions ================= */}

            <DashboardQuickActions setActive={setActive} role={role} />

            <TodayStatistics

                stats={dashboard?.today_statistics}

            />

            {/* ================= Charts ================= */}

            <div
                style={{
                    marginTop: 30
                }}
            >

                <DashboardCharts

                    inventory={dashboard?.inventory_chart}

                    categories={dashboard?.category_chart}

                />

            </div>

            {/* ================= Bottom Section ================= */}

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "2fr 1fr",
                    gap: 20,
                    marginTop: 30,
                    alignItems: "start"
                }}
            >

                <RecentTransactions

                    transactions={dashboard?.recent_transactions || []}

                />

                <LowStockWidget

                    items={dashboard?.low_stock_items || []}

                />

            </div>

        </div>

    );

}
