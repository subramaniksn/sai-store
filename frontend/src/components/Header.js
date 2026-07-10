import React, { useEffect, useState } from "react";
import NotificationBell from "./NotificationBell";

export default function Header({ title = "Dashboard" }) {
    const [compact, setCompact] = useState(
        typeof window !== "undefined" ? window.innerWidth < 1200 : false
    );

    useEffect(() => {
        const handleResize = () => {
            setCompact(window.innerWidth < 1200);
        };

        window.addEventListener("resize", handleResize);

        return () => {
            window.removeEventListener("resize", handleResize);
        };
    }, []);

    const today = new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "long",
        year: "numeric"
    });

    const user = JSON.parse(localStorage.getItem("user") || "{}");

    const logout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/";
    };

    return (

        <div style={styles.header}>

            <div style={styles.left}>

                <h2 style={styles.title}>
                    {title}
                </h2>

                <small style={styles.subtitle}>
                    SAI Automation Store ERP
                </small>

            </div>

            <div style={styles.right}>

                {/* Notification Bell */}

                <NotificationBell />

                {/* User Info */}

                <div style={styles.userInfo}>

                    <div style={{ fontWeight: "bold" }}>
                        {user.name || "Admin"}
                    </div>

                    {!compact && <div style={{ fontSize: 12, color: "#666" }}>
                        {user.role || ""}
                    </div>}

                </div>

                {/* Today's Date */}

                {!compact && <div style={styles.date}>
                    {today}
                </div>}

                {/* Logout */}

                <button
                    onClick={logout}
                    style={styles.button}
                >
                    Logout
                </button>

            </div>

        </div>

    );

}

const styles = {

    header: {

        height: 64,

        minHeight: 64,

        background: "#ffffff",

        display: "flex",

        justifyContent: "space-between",

        alignItems: "center",

        padding: "0 clamp(14px, 1.1vw, 20px)",

        borderBottom: "1px solid #e5e7eb",

        boxShadow: "0 1px 5px rgba(0,0,0,.08)",

        flexShrink: 0,

        boxSizing: "border-box",

        overflow: "hidden"

    },

    left: {

        minWidth: 0,

        overflow: "hidden"

    },

    title: {

        margin: 0,

        fontSize: "clamp(20px, 1.5vw, 26px)",

        whiteSpace: "nowrap",

        overflow: "hidden",

        textOverflow: "ellipsis"

    },

    subtitle: {

        color: "#64748b",

        whiteSpace: "nowrap",

        overflow: "hidden",

        textOverflow: "ellipsis",

        display: "block"

    },

    right: {

        display: "flex",

        alignItems: "center",

        gap: "clamp(10px, 1vw, 20px)",

        flexShrink: 0

    },

    userInfo: {

        textAlign: "right",

        maxWidth: 140,

        whiteSpace: "nowrap",

        overflow: "hidden",

        textOverflow: "ellipsis"

    },

    date: {

        color: "#475569",

        fontSize: "clamp(12px, .85vw, 14px)",

        whiteSpace: "nowrap"

    },

    button: {

        background: "#dc2626",

        color: "#fff",

        border: "none",

        padding: "8px 16px",

        borderRadius: 6,

        cursor: "pointer"

    }

};
