const pool = require("../db/pool");

async function createNotification(
    title,
    message,
    type = "info",
    referenceType = null,
    referenceId = null
) {

    try {

        await pool.query(

            `INSERT INTO notifications
            (
                title,
                message,
                type,
                reference_type,
                reference_id
            )
            VALUES ($1,$2,$3,$4,$5)`,

            [
                title,
                message,
                type,
                referenceType,
                referenceId
            ]

        );

    }
    catch (err) {

        console.log("Notification Error :", err);

    }

}

module.exports = createNotification;