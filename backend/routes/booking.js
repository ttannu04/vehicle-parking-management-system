const express = require("express");
const { body, param, validationResult } = require("express-validator");

const router = express.Router();

const db = require("../db");
const authenticate = require("../middleware/auth");

// ─────────────────────────────────────────────────────────────
// Validation Helper
// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
// GET /api/booking/slots
// Public Route
// ─────────────────────────────────────────────────────────────
router.get("/slots", async (_req, res) => {

    try {

        const [rows] = await db.query(`
            SELECT
                id,
                slot_number,
                location,
                vehicle_type,
                status,
                hourly_rate
            FROM parking_slots
            ORDER BY slot_number ASC
        `);

        return res.json(rows);

    } catch (err) {

        console.error("Fetch Slots Error:", err);

        return res.status(500).json({
            error: "Could not fetch slots."
        });
    }
});

// ─────────────────────────────────────────────────────────────
// POST /api/booking/book
// Protected Route
// ─────────────────────────────────────────────────────────────
router.post(
    "/book",
    authenticate,
    [
        body("slot_id")
            .isInt({ min: 1 })
            .withMessage("Invalid slot ID."),

        body("check_in")
            .isISO8601()
            .withMessage("check_in must be a valid datetime."),

        body("check_out")
            .isISO8601()
            .withMessage("check_out must be a valid datetime.")
    ],

    async (req, res) => {

        if (!validate(req, res)) return;

        const {
            slot_id,
            check_in,
            check_out
        } = req.body;

        const user_id = req.user.id;

        // Validate dates
        const checkInDate = new Date(check_in);
        const checkOutDate = new Date(check_out);

        if (
            isNaN(checkInDate) ||
            isNaN(checkOutDate)
        ) {

            return res.status(400).json({
                error: "Invalid booking dates."
            });
        }

        if (checkOutDate <= checkInDate) {

            return res.status(400).json({
                error: "check_out must be after check_in."
            });
        }

        let conn;

        try {

            conn = await db.getConnection();

            await conn.beginTransaction();

            // Lock slot row
            const [slotRows] = await conn.query(
                `
                SELECT id, status
                FROM parking_slots
                WHERE id = ?
                FOR UPDATE
                `,
                [slot_id]
            );

            // Slot missing
            if (slotRows.length === 0) {

                await conn.rollback();

                return res.status(404).json({
                    error: "Slot not found."
                });
            }

            const slot = slotRows[0];

            // Already booked
            if (slot.status !== "available") {

                await conn.rollback();

                return res.status(409).json({
                    error: "Slot is no longer available."
                });
            }

            // Create booking
            const [bookingResult] = await conn.query(
                `
                INSERT INTO bookings
                (
                    user_id,
                    slot_id,
                    status,
                    check_in,
                    check_out
                )
                VALUES (?, ?, 'booked', ?, ?)
                `,
                [
                    user_id,
                    slot_id,
                    check_in,
                    check_out
                ]
            );

            // Update slot
            await conn.query(
                `
                UPDATE parking_slots
                SET status = 'booked'
                WHERE id = ?
                `,
                [slot_id]
            );

            await conn.commit();

            return res.status(201).json({
                message: "Slot booked successfully.",
                booking_id: bookingResult.insertId
            });

        } catch (err) {

            if (conn) {
                await conn.rollback();
            }

            console.error("Booking Error:", err);

            return res.status(500).json({
                error: "Booking failed. Please try again."
            });

        } finally {

            if (conn) {
                conn.release();
            }
        }
    }
);

// ─────────────────────────────────────────────────────────────
// DELETE /api/booking/:id/cancel
// Protected Route
// ─────────────────────────────────────────────────────────────
router.delete(
    "/:id/cancel",
    authenticate,
    [
        param("id")
            .isInt({ min: 1 })
            .withMessage("Invalid booking ID.")
    ],

    async (req, res) => {

        if (!validate(req, res)) return;

        const booking_id = Number(req.params.id);

        const user_id = req.user.id;

        let conn;

        try {

            conn = await db.getConnection();

            await conn.beginTransaction();

            // Lock booking row
            const [rows] = await conn.query(
                `
                SELECT
                    id,
                    slot_id,
                    status,
                    user_id
                FROM bookings
                WHERE id = ?
                FOR UPDATE
                `,
                [booking_id]
            );

            // Missing booking
            if (rows.length === 0) {

                await conn.rollback();

                return res.status(404).json({
                    error: "Booking not found."
                });
            }

            const booking = rows[0];

            // Not owner
            if (booking.user_id !== user_id) {

                await conn.rollback();

                return res.status(403).json({
                    error: "Not your booking."
                });
            }

            // Already cancelled
            if (booking.status === "cancelled") {

                await conn.rollback();

                return res.status(400).json({
                    error: "Booking already cancelled."
                });
            }

            // Cancel booking
            await conn.query(
                `
                UPDATE bookings
                SET status = 'cancelled'
                WHERE id = ?
                `,
                [booking_id]
            );

            // Free slot
            await conn.query(
                `
                UPDATE parking_slots
                SET status = 'available'
                WHERE id = ?
                `,
                [booking.slot_id]
            );

            await conn.commit();

            return res.json({
                message: "Booking cancelled successfully."
            });

        } catch (err) {

            if (conn) {
                await conn.rollback();
            }

            console.error("Cancel Error:", err);

            return res.status(500).json({
                error: "Cancellation failed."
            });

        } finally {

            if (conn) {
                conn.release();
            }
        }
    }
);

module.exports = router;