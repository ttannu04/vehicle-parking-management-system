const express = require("express");
const { body, validationResult } = require("express-validator");
const router  = express.Router();
const db      = require("../db");
const authenticate = require("../middleware/auth");

function validate(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.status(422).json({ errors: errors.array() });
        return false;
    }
    return true;
}

// ── POST /api/payment/pay ─────────────────────────────────────
router.post(
    "/pay",
    authenticate,
    [
        body("booking_id").isInt({ min: 1 }).withMessage("Invalid booking ID."),
        body("amount")
            .isDecimal({ decimal_digits: "0,2" })
            .withMessage("Amount must be a valid positive number."),
        body("method")
            .isIn(["card", "upi", "cash", "wallet"])
            .withMessage("Invalid payment method.")
    ],
    async (req, res) => {
        if (!validate(req, res)) return;

        const { booking_id, amount, method } = req.body;
        const user_id = req.user.id;

        try {
            // Verify the booking belongs to this user
            const [booking] = await db.query(
                "SELECT id, status FROM bookings WHERE id = ? AND user_id = ?",
                [booking_id, user_id]
            );

            if (booking.length === 0) {
                return res.status(404).json({ error: "Booking not found." });
            }

            if (booking[0].status === "cancelled") {
                return res.status(400).json({ error: "Cannot pay for a cancelled booking." });
            }

            // Prevent duplicate payments
            const [existing] = await db.query(
                "SELECT id FROM payments WHERE booking_id = ? AND status = 'paid'",
                [booking_id]
            );

            if (existing.length > 0) {
                return res.status(409).json({ error: "Booking already paid." });
            }

            // Generate transaction reference
            const txn_ref = `TXN-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

            // Record payment
            const [result] = await db.query(
                `INSERT INTO payments (booking_id, amount, method, status, txn_ref)
                 VALUES (?, ?, ?, 'paid', ?)`,
                [booking_id, amount, method, txn_ref]
            );

            // ✅ Use 'confirmed' status which exists in the ENUM
            await db.query(
                "UPDATE bookings SET status = 'confirmed' WHERE id = ?",
                [booking_id]
            );

            res.status(201).json({
                message:    "Payment successful.",
                payment_id: result.insertId,
                txn_ref
            });

        } catch (err) {
            console.error("Payment error:", err);
            res.status(500).json({ error: "Payment failed. Please try again." });
        }
    }
);

// ── GET /api/payment/history ──────────────────────────────────
router.get("/history", authenticate, async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT p.id, p.amount, p.method, p.status, p.txn_ref, p.paid_at,
                    b.check_in, b.check_out, ps.slot_number
             FROM payments p
             JOIN bookings b ON b.id = p.booking_id
             JOIN parking_slots ps ON ps.id = b.slot_id
             WHERE b.user_id = ?
             ORDER BY p.paid_at DESC`,
            [req.user.id]
        );
        res.json(rows);
    } catch (err) {
        console.error("Payment history error:", err);
        res.status(500).json({ error: "Could not fetch payment history." });
    }
});

module.exports = router;