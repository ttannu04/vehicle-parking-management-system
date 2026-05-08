const mysql = require("mysql2");
require("dotenv").config();

// ── Create MySQL Connection Pool ──────────────────────────────
const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),

    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "parking_system",

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,

    timezone: "Z",
    decimalNumbers: true
});

// ── Promise Wrapper ───────────────────────────────────────────
const promisePool = pool.promise();

// ── Test Database Connection ──────────────────────────────────
(async () => {
    try {

        const connection = await promisePool.getConnection();

        console.log("✅ Database connected successfully");

        const [rows] = await connection.query(
            "SELECT DATABASE() AS db"
        );

        console.log("📂 Using database:", rows[0].db);

        connection.release();

    } catch (err) {

        console.error("❌ Database connection failed:");
        console.error(err.message);

        process.exit(1);
    }
})();

// ── Export Promise Pool ───────────────────────────────────────
module.exports = promisePool;