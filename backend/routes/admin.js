const express = require("express");
const { body, param, validationResult } = require("express-validator");

const router = express.Router();
const db = require("../db");

const authenticate = require("../middleware/auth");
const { requireRole } = require("../middleware/auth");

function validate(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
    }
    return true;
}

// Protect All Admin Routes
router.use(authenticate, requireRole("admin"));

// ── GET /api/admin/dashboard ──────────────────────────────────
router.get("/dashboard", async (_req, res) => {
    try {

        const [[slots]] = await db.query(`
            SELECT COUNT(*) AS total_slots FROM parking_slots
        `);

        const [[available]] = await db.query(`
            SELECT COUNT(*) AS available_slots
            FROM parking_slots WHERE status = 'available'
        `);

        const [[bookings]] = await db.query(`
            SELECT COUNT(*) AS total_bookings FROM bookings
        `);

        const [[revenue]] = await db.query(`
            SELECT COALESCE(SUM(amount), 0) AS total_revenue
            FROM payments WHERE status = 'paid'
        `);

        const [[users]] = await db.query(`
            SELECT COUNT(*) AS total_users FROM users
        `);

        res.json({
            total_slots: slots.total_slots,
            available_slots: available.available_slots,
            total_bookings: bookings.total_bookings,
            total_revenue: revenue.total_revenue,
            total_users: users.total_users
        });

    } catch (err) {
        console.error("Dashboard error:", err);
        res.status(500).json({ error: "Failed to load dashboard" });
    }
});

// ── GET /api/admin/bookings ───────────────────────────────────
router.get("/bookings", async (_req, res) => {
    try {

        const [rows] = await db.query(`
            SELECT
                b.id,
                b.status,
                b.created_at AS booked_at,
                b.check_in,
                b.check_out,
                b.total_amount,
                u.name AS user_name,
                u.email,
                ps.slot_number,
                ps.location,
                p.amount,
                p.status AS payment_status
            FROM bookings b
            JOIN users u ON u.id = b.user_id
            JOIN parking_slots ps ON ps.id = b.slot_id
            LEFT JOIN payments p ON p.booking_id = b.id
            ORDER BY b.created_at DESC
        `);

        res.json(rows);

    } catch (err) {
        console.error("Bookings error:", err);
        res.status(500).json({ error: "Failed to fetch bookings" });
    }
});

// ── GET /api/admin/users ──────────────────────────────────────
router.get("/users", async (_req, res) => {
    try {

        const [rows] = await db.query(`
            SELECT id, name, email, role, created_at
            FROM users
            ORDER BY created_at DESC
        `);

        res.json(rows);

    } catch (err) {
        console.error("Users error:", err);
        res.status(500).json({ error: "Failed to fetch users" });
    }
});

// ── POST /api/admin/slots ─────────────────────────────────────
router.post(
    "/slots",
    [
        body("slot_number").trim().notEmpty().withMessage("Slot number is required"),
        body("location").trim().notEmpty().withMessage("Location is required"),
        body("vehicle_type").isIn(["car", "bike", "truck"]).withMessage("Invalid vehicle type"),
        body("hourly_rate").isFloat({ min: 0 }).withMessage("Hourly rate must be valid")
    ],
    async (req, res) => {

        if (!validate(req, res)) return;

        const { slot_number, location, vehicle_type, hourly_rate } = req.body;

        try {

            const [exists] = await db.query(
                "SELECT id FROM parking_slots WHERE slot_number = ?",
                [slot_number]
            );

            if (exists.length > 0) {
                return res.status(409).json({ error: "Slot already exists" });
            }

            const [result] = await db.query(`
                INSERT INTO parking_slots
                (slot_number, location, vehicle_type, hourly_rate, status)
                VALUES (?, ?, ?, ?, 'available')
            `, [slot_number, location, vehicle_type, hourly_rate]);

            res.status(201).json({
                message: "Slot added successfully",
                id: result.insertId
            });

        } catch (err) {
            console.error("Add slot error:", err);
            res.status(500).json({ error: "Failed to add slot" });
        }
    }
);

// ── DELETE /api/admin/slots/:id ───────────────────────────────
router.delete(
    "/slots/:id",
    [param("id").isInt({ min: 1 }).withMessage("Invalid slot ID")],
    async (req, res) => {

        if (!validate(req, res)) return;

        const slotId = req.params.id;

        try {

            const [rows] = await db.query(
                "SELECT status FROM parking_slots WHERE id = ?",
                [slotId]
            );

            if (rows.length === 0) {
                return res.status(404).json({ error: "Slot not found" });
            }

            if (rows[0].status !== "available") {
                return res.status(400).json({ error: "Booked slot cannot be removed" });
            }

            await db.query("DELETE FROM parking_slots WHERE id = ?", [slotId]);

            res.json({ message: "Slot removed successfully" });

        } catch (err) {
            console.error("Delete slot error:", err);
            res.status(500).json({ error: "Failed to remove slot" });
        }
    }
);

module.exports = router;