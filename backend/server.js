require("dotenv").config();
const express    = require("express");
const cors       = require("cors");
const helmet     = require("helmet");
const morgan     = require("morgan");
const rateLimit  = require("express-rate-limit");

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Security Headers ─────────────────────────────────────────────────────────
app.use(helmet());

// ── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.CORS_ORIGINS || "")
    .split(",")
    .map(o => o.trim())
    .filter(Boolean);

app.use(cors({
    origin: (origin, cb) => {
        // Allow server-to-server requests (no origin) and listed origins
        if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
        cb(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true
}));

// ── Body Parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10kb" }));  // Prevent huge payload attacks
app.use(express.urlencoded({ extended: false }));

// ── Logging ───────────────────────────────────────────────────────────────────
const logFormat = process.env.NODE_ENV === "production" ? "combined" : "dev";
app.use(morgan(logFormat));

// ── Global Rate Limiter ───────────────────────────────────────────────────────
app.use(rateLimit({
    windowMs:         15 * 60 * 1000,  // 15 minutes
    max:              100,              // requests per window per IP
    standardHeaders:  true,
    legacyHeaders:    false,
    message:          { error: "Too many requests, please try again later." }
}));

// ── Stricter limiter for auth routes ─────────────────────────────────────────
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max:      10,
    message:  { error: "Too many login attempts. Please wait 15 minutes." }
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/user",    authLimiter, require("./routes/user"));
app.use("/api/booking", require("./routes/booking"));
app.use("/api/payment", require("./routes/payment"));
app.use("/api/admin",   require("./routes/admin"));

// ── Health Check ──────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => res.json({ status: "ok", uptime: process.uptime() }));

// ── 404 Handler ───────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: "Route not found" }));

// ── Global Error Handler ──────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
    console.error(err.stack);
    const status  = err.statusCode || 500;
    const message = process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message;
    res.status(status).json({ error: message });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () =>
    console.log(`🚗  Parking server running on http://localhost:${PORT} [${process.env.NODE_ENV}]`)
);