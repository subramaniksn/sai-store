import React from "react";

export default function RecentTransactions({ transactions = [] }) {

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
                📋 Recent Transactions
            </h3>

            <table
                style={{
                    width: "100%",
                    borderCollapse: "collapse"
                }}
            >

                <thead>

                    <tr>

                        <th style={styles.th}>Date</th>

                        <th style={styles.th}>Type</th>

                        <th style={styles.th}>Material</th>

                        <th style={styles.th}>Qty</th>

                    </tr>

                </thead>

                <tbody>

                    {

                        transactions.length === 0

                        ?

                        (

                            <tr>

                                <td
                                    colSpan="4"
                                    style={{
                                        textAlign: "center",
                                        padding: 30
                                    }}
                                >

                                    No Transactions

                                </td>

                            </tr>

                        )

                        :

                        (

                            transactions.map((item, index) => (

                                <tr key={index}>

                                    <td style={styles.td}>
                                        {new Date(item.txn_date).toLocaleDateString()}
                                    </td>

                                    <td style={styles.td}>

                                        <span
                                            style={{
                                                color:
                                                    item.txn_type === "incoming"
                                                        ? "#16a34a"
                                                        : item.txn_type === "outgoing"
                                                        ? "#dc2626"
                                                        : "#f59e0b",
                                                fontWeight: "bold",
                                                textTransform: "capitalize"
                                            }}
                                        >

                                            {item.txn_type}

                                        </span>

                                    </td>

                                    <td style={styles.td}>
                                        {item.item_name}
                                    </td>

                                    <td
                                        style={{
                                            ...styles.td,
                                            textAlign: "right"
                                        }}
                                    >

                                        {Number(item.quantity).toFixed(0)} {item.unit}

                                    </td>

                                </tr>

                            ))

                        )

                    }

                </tbody>

            </table>

        </div>

    );

}

const styles = {

    th: {
        padding: 12,
        background: "#f8fafc",
        borderBottom: "1px solid #ddd",
        textAlign: "left"
    },

    td: {
        padding: 12,
        borderBottom: "1px solid #eee"
    }

};