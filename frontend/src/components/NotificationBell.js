import React, { useEffect, useState } from "react";
import api from "../api/client";

export default function NotificationBell() {

    const [notifications, setNotifications] = useState([]);
    const [show, setShow] = useState(false);

    useEffect(() => {

        loadNotifications();

        const interval = setInterval(() => {

            loadNotifications();

        }, 15000);

        return () => clearInterval(interval);

    }, []);

    const loadNotifications = async () => {

        try {

            const res = await api.get("/notifications");

            setNotifications(res.data);

        }

        catch (err) {

            console.log(err);

        }

    };

    const markAsRead = async (id) => {

        try {

            await api.put(`/notifications/read/${id}`);

            loadNotifications();

        }

        catch (err) {

            console.log(err);

        }

    };

    const openNotification = (notification) => {

        if (notification.reference_type === "PO") {

            localStorage.setItem(
                "selectedPO",
                notification.reference_id
            );

            window.dispatchEvent(
                new CustomEvent("openPurchaseOrders")
            );

        }

        if (notification.reference_type === "GRN") {

            localStorage.setItem(
                "selectedGRN",
                notification.reference_id
            );

            window.dispatchEvent(
                new CustomEvent("openIncomingMaterial")
            );

        }

        if (notification.reference_type === "ISSUE") {

            localStorage.setItem(
                "selectedIssue",
                notification.reference_id
            );

            window.dispatchEvent(
                new CustomEvent("openMaterialIssue")
            );

        }

        if (notification.reference_type === "STOCK") {

            window.dispatchEvent(
                new CustomEvent("openLowStock")
            );

        }

        if (notification.reference_type === "MATERIAL") {

            window.dispatchEvent(
                new CustomEvent("openMaterialMaster")
            );

        }

        if (notification.reference_type === "RETURN") {

            localStorage.setItem(
                "selectedReturn",
                notification.reference_id
            );

            window.dispatchEvent(
                new CustomEvent("openMaterialReturn", {
                    detail: {
                        returnId: notification.reference_id
                    }
                })
            );

        }

        setShow(false);

    };

    const unread = notifications.filter(x => !x.is_read).length;

        const getNotificationIcon = (type) => {
        switch (type) {
            case "success":
                return "🟢";
            case "warning":
                return "🟡";
            case "danger":
                return "🔴";
            case "info":
                return "🔵";
            default:
                return "⚪";
        }
    };

    const timeAgo = (utcDateString) => {

        // Convert UTC DB time to IST
        const createdUTC = new Date(utcDateString);

        const createdIST = new Date(
            createdUTC.toLocaleString("en-US", {
                timeZone: "Asia/Kolkata"
            })
        );

        const nowIST = new Date(
            new Date().toLocaleString("en-US", {
                timeZone: "Asia/Kolkata"
            })
        );

        const seconds = Math.floor((nowIST - createdIST) / 1000);

        if (seconds < 60) return "Just now";

        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) {
            return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
        }

        const hours = Math.floor(minutes / 60);
        if (hours < 24) {
            return `${hours} hour${hours > 1 ? "s" : ""} ago`;
        }

        const days = Math.floor(hours / 24);
        if (days === 1) return "Yesterday";

        return `${days} days ago`;
    };

    return (

        <div style={{ position: "relative" }}>

            <div
                onClick={() => setShow(!show)}
                style={{
                    cursor: "pointer",
                    fontSize: 24,
                    position: "relative"
                }}
            >
                🔔

                {

                    unread > 0 &&

                    <span
                        style={{
                            position: "absolute",
                            top: -8,
                            right: -8,
                            background: "red",
                            color: "#fff",
                            borderRadius: "50%",
                            width: 18,
                            height: 18,
                            fontSize: 11,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                        }}
                    >
                        {unread}
                    </span>

                }

            </div>

            {

                show &&

                <div
                    style={{
                        position: "absolute",
                        right: 0,
                        top: 35,
                        width: 340,
                        background: "#fff",
                        borderRadius: 10,
                        boxShadow: "0 5px 20px rgba(0,0,0,.15)",
                        zIndex: 1000,
                        maxHeight: 400,
                        overflowY: "auto"
                    }}
                >

                    <div
                        style={{
                            padding: 15,
                            borderBottom: "1px solid #eee",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center"
                        }}
                    >

                        <strong>

                            Notifications

                        </strong>

                        <button

                            onClick={async () => {

                                await api.put("/notifications/read-all");

                                loadNotifications();

                            }}

                            style={{
                                border: "none",
                                background: "#2563eb",
                                color: "#fff",
                                padding: "6px 10px",
                                borderRadius: 5,
                                cursor: "pointer",
                                fontSize: 12
                            }}

                        >

                            Mark All

                        </button>

                    </div>

                    {

                        notifications.length === 0 ?

                        <div style={{ padding: 20 }}>

                            No Notifications

                        </div>

                        :

                        notifications.map(item => (

                            <div
                                key={item.id}

                                onClick={async () => {

                                    await markAsRead(item.id);

                                    openNotification(item);

                                }}

                                style={{
                                    padding: 15,
                                    borderBottom: "1px solid #eee",
                                    background: item.is_read ? "#fff" : "#eef6ff",
                                    cursor: "pointer"
                                }}
                            >

                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between"
                                    }}
                                >

                                    <strong>
                                        {getNotificationIcon(item.type)} {item.title}
                                    </strong>

                                    {

                                        !item.is_read &&

                                        <span
                                            style={{
                                                color: "#2563eb",
                                                fontSize: 12
                                            }}
                                        >
                                            NEW
                                        </span>

                                    }

                                </div>

                                <div
                                    style={{
                                        marginTop: 5
                                    }}
                                >
                                    {item.message}
                                </div>

                                <small
                                    style={{
                                        color: "#777"
                                    }}
                                >
                                    {timeAgo(item.created_at_ist)}
                                </small>

                            </div>

                        ))

                    }

                </div>

            }

        </div>

    );

}
