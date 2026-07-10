import React from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";

export default function AdminLayout({
    active,
    setActive,
    role,
    title,
    children
}) {

    return (

        <div style={styles.container}>

            <Sidebar
                active={active}
                setActive={setActive}
                role={role}
            />

            <div style={styles.main}>

                <Header title={title} />

                <div style={styles.content}>

                    {children}

                </div>

            </div>

        </div>

    );

}

const styles = {

    container: {
        display: "flex",
        height: "100vh",
        width: "100vw",
        background: "#f1f5f9",
        overflow: "hidden"
    },

    main: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
        height: "100vh",
        overflow: "hidden"
    },

    content: {
        flex: 1,
        padding: "clamp(12px, 1vw, 18px)",
        overflow: "auto",
        minHeight: 0,
        boxSizing: "border-box"
    }

};
