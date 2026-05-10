const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");

const router = express.Router();
const db = require("../db");
const authenticate = require("../middleware/auth");

// ── Validation Rules ──────────────────────────────────────────
const registerRules = [
    body("name")
        .trim()
        .notEmpty().withMessage("Name is required.")
        .isLength({ max: 100 }).withMessage("Name too long."),

    body("email")
        .trim()
        .isEmail().withMessage("Valid email is required.")
        .normalizeEmail(),

    body("password")
        .isLength({ min: 8 }).withMessage("Password must be at least 8 characters.")
        .matches(/[A-Z]/).withMessage("Password must contain an uppercase letter.")
        .matches(/[0-9]/).withMessage("Password must contain a number.")
];

const loginRules = [
    body("email")
        .trim()
        .isEmail().withMessage("Valid email is required.")
        .normalizeEmail(),

    body("password")
        .notEmpty().withMessage("Password is required.")
];

// ── Validation Handler ────────────────────────────────────────
function validate(req, res) {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        res.status(422).json({
            errors: errors.array()
        });
        return false;
    }

    return true;
}

// ── POST /api/user/register ───────────────────────────────────
router.post("/register", registerRules, async (req, res) => {

    if (!validate(req, res)) return;

    const { name, email, password } = req.body;

    try {

        const [existing] = await db.query(
            "SELECT id FROM users WHERE email = ?",
            [email]
        );

        if (existing.length > 0) {
            return res.status(409).json({
                error: "Email already registered."
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        await db.query(
            "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
            [name, email, hashedPassword, "user"]
        );

        return res.status(201).json({
            message: "Registration successful"
        });

    } catch (err) {

        console.error("🔥 Register Error:", err);

        return res.status(500).json({
            error: "Registration failed"
        });
    }
});

// ── POST /api/user/login ──────────────────────────────────────
router.post("/login", loginRules, async (req, res) => {

    if (!validate(req, res)) return;

    const { email, password } = req.body;

    try {

        const [rows] = await db.query(
            "SELECT id, name, email, password, role FROM users WHERE email = ?",
            [email]
        );

        const GENERIC_ERROR = "Invalid email or password.";

        if (rows.length === 0) {
            return res.status(401).json({ error: GENERIC_ERROR });
        }

        const user = rows[0];

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ error: GENERIC_ERROR });
        }

        if (!process.env.JWT_SECRET) {
            console.error("❌ JWT_SECRET missing in .env");
            return res.status(500).json({ error: "Server configuration error" });
        }

        const token = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || "24h" }
        );

        return res.status(200).json({
            message: "Login successful",
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (err) {

        console.error("🔥 Login Error:", err);

        return res.status(500).json({ error: "Login failed" });
    }
});

// ── GET /api/user/profile ─────────────────────────────────────
router.get("/profile", authenticate, async (req, res) => {

    try {

        const [rows] = await db.query(
            "SELECT id, name, email, role, created_at FROM users WHERE id = ?",
            [req.user.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: "User not found." });
        }

        return res.json(rows[0]);

    } catch (err) {

        console.error("🔥 Profile Error:", err);

        return res.status(500).json({ error: "Could not fetch profile" });
    }
});

// ── GET /api/user/bookings ────────────────────────────────────
router.get("/bookings", authenticate, async (req, res) => {

    try {

        const [rows] = await db.query(
            `SELECT 
                b.id,
                b.status,
                b.created_at AS booked_at,
                b.check_in,
                b.check_out,
                b.total_amount AS amount,
                ps.slot_number,
                ps.location,
                p.amount AS payment_amount,
                p.status AS payment_status
            FROM bookings b
            JOIN parking_slots ps 
                ON ps.id = b.slot_id
            LEFT JOIN payments p 
                ON p.booking_id = b.id
            WHERE b.user_id = ?
            ORDER BY b.created_at DESC`,
            [req.user.id]
        );

        return res.json(rows);

    } catch (err) {

        console.error("🔥 Bookings Error:", err);

        return res.status(500).json({ error: "Could not fetch bookings" });
    }
});

module.exports = router;