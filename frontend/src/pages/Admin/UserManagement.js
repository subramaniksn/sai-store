import React, { useEffect, useState } from "react";
import api from "../../api/client";

export default function UserManagement() {

    const [users, setUsers] = useState([]);

    const [form, setForm] = useState({
        name: "",
        email: "",
        password: "",
        role: "store_incharge"
    });

    const [message, setMessage] = useState("");

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            const res = await api.get("/auth/users");
            setUsers(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const createUser = async (e) => {
        e.preventDefault();

        try {

            await api.post("/auth/users", form);

            setMessage("User created successfully.");

            setForm({
                name: "",
                email: "",
                password: "",
                role: "store_incharge"
            });

            loadUsers();

        } catch (err) {

            alert(
                err.response?.data?.error ||
                "Unable to create user."
            );

        }
    };

    const toggleActive = async (user) => {

        try {

            await api.patch(`/auth/users/${user.id}`, {
                is_active: !user.is_active
            });

            loadUsers();

        } catch (err) {
            console.error(err);
        }

    };

    return (

        <div>

            <h2>User Management</h2>

            {message &&
                <div style={styles.success}>
                    {message}
                </div>
            }

            <form onSubmit={createUser}>

                <div style={styles.grid}>

                    <input
                        placeholder="Name"
                        value={form.name}
                        onChange={(e) =>
                            setForm({
                                ...form,
                                name: e.target.value
                            })
                        }
                        required
                    />

                    <input
                        type="email"
                        placeholder="Email"
                        value={form.email}
                        onChange={(e) =>
                            setForm({
                                ...form,
                                email: e.target.value
                            })
                        }
                        required
                    />

                    <input
                        type="password"
                        placeholder="Password"
                        value={form.password}
                        onChange={(e) =>
                            setForm({
                                ...form,
                                password: e.target.value
                            })
                        }
                        required
                    />

                    <select
                        value={form.role}
                        onChange={(e) =>
                            setForm({
                                ...form,
                                role: e.target.value
                            })
                        }
                    >
                        <option value="store_incharge">
                            Store Incharge
                        </option>

                        <option value="manager">
                            Manager
                        </option>

                        <option value="admin">
                            Admin
                        </option>

                    </select>

                </div>

                <br />

                <button style={styles.button}>
                    Add User
                </button>

            </form>

            <hr />

            <table style={styles.table}>

                <thead>

                    <tr>

                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Action</th>

                    </tr>

                </thead>

                <tbody>

                    {users.map(user => (

                        <tr key={user.id}>

                            <td>{user.name}</td>

                            <td>{user.email}</td>

                            <td>{user.role}</td>

                            <td>

                                {user.is_active
                                    ? "Active"
                                    : "Disabled"}

                            </td>

                            <td>

                                <button
                                    onClick={() =>
                                        toggleActive(user)
                                    }
                                >

                                    {user.is_active
                                        ? "Disable"
                                        : "Enable"}

                                </button>

                            </td>

                        </tr>

                    ))}

                </tbody>

            </table>

        </div>

    );

}

const styles = {

    grid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
        gap: 15
    },

    table: {
        width: "100%",
        borderCollapse: "collapse",
        marginTop: 20
    },

    success: {
        background: "#d4edda",
        padding: 12,
        marginBottom: 20
    },

    button: {
        padding: "10px 20px",
        background: "#2563eb",
        color: "#fff",
        border: "none",
        cursor: "pointer"
    }

};