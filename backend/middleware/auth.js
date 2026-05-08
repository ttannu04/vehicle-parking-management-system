const jwt = require("jsonwebtoken");

/**
 * ─────────────────────────────────────────────────────────────
 * JWT Authentication Middleware
 * Expects:
 * Authorization: Bearer <token>
 * ─────────────────────────────────────────────────────────────
 */
function authenticate(req, res, next) {

    const authHeader = req.headers.authorization;

    // No token
    if (!authHeader || !authHeader.startsWith("Bearer ")) {

        return res.status(401).json({
            error: "Access denied. No token provided."
        });
    }

    // Extract token
    const token = authHeader.split(" ")[1];

    try {

        // Verify token
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        // Attach user payload
        req.user = decoded;

        next();

    } catch (err) {

        console.error("JWT Error:", err.message);

        // Expired token
        if (err.name === "TokenExpiredError") {

            return res.status(401).json({
                error: "Session expired. Please log in again."
            });
        }

        // Invalid token
        return res.status(401).json({
            error: "Invalid token."
        });
    }
}

/**
 * ─────────────────────────────────────────────────────────────
 * Role-based Access Control
 * Example:
 * router.get(
 *   "/admin",
 *   authenticate,
 *   requireRole("admin"),
 *   handler
 * )
 * ─────────────────────────────────────────────────────────────
 */
function requireRole(...roles) {

    return (req, res, next) => {

        if (
            !req.user ||
            !roles.includes(req.user.role)
        ) {

            return res.status(403).json({
                error: "Forbidden. Insufficient permissions."
            });
        }

        next();
    };
}

module.exports = authenticate;
module.exports.requireRole = requireRole;