# 🚗 SmartPark — Vehicle Parking Management System

A production-ready vehicle parking system with secure authentication, real-time slot booking, payments, and an admin dashboard.

---

## 📁 Project Structure

```
parking-pro/
├── backend/
│   ├── middleware/
│   │   └── auth.js          # JWT + role-based access control
│   ├── routes/
│   │   ├── user.js          # Register, login, profile, booking history
│   │   ├── booking.js       # Slot listing, booking with transactions, cancel
│   │   ├── payment.js       # Pay, payment history
│   │   └── admin.js         # Dashboard stats, manage slots/users/bookings
│   ├── db.js                # MySQL connection pool (async/await)
│   ├── server.js            # Express app with helmet, rate limiting, CORS
│   ├── package.json
│   └── .env.example         # ← Copy to .env and fill in your values
├── database/
│   └── schema.sql           # Full schema with constraints, indexes, seed data
└── frontend/
    ├── css/style.css
    ├── js/utils.js          # Shared API helpers, auth, formatting
    ├── index.html           # Landing page
    ├── login.html
    ├── register.html
    ├── dashboard.html       # User: browse slots, book, view/cancel bookings
    ├── payment.html         # User: pay for booking, history
    └── admin.html           # Admin: stats, all bookings, slots, users
```

---

## ⚙️ Setup

### 1. Database
```bash
mysql -u root -p < database/schema.sql
```
This creates the database, all tables with foreign keys & indexes, and seeds:
- A default admin account
- 6 sample parking slots

### 2. Backend
```bash
cd backend
cp .env.example .env
# Edit .env — set DB_PASSWORD and a strong JWT_SECRET
npm install
npm start
```
Server runs at `http://localhost:3000`

### 3. Frontend
Open the `frontend/` folder with any static server:
```bash
# Quick option with VS Code Live Server, or:
npx serve frontend
```

---

## 🔐 Default Admin Login
- **Email:** `admin@parkingsystem.com`
- **Password:** `Admin@1234`
- ⚠️ **Change this immediately after first login!**

---

## 🆚 What Changed from the Original

| Area | Before | After |
|------|--------|-------|
| **Credentials** | Hardcoded password in `db.js` | `.env` file — never in code |
| **JWT Secret** | `"secretkey"` | Long random secret from `.env` |
| **JWT Token** | No expiry | 24h expiry |
| **Auth Header** | Raw token | `Bearer <token>` standard |
| **DB Connection** | Single connection, crashes on disconnect | Connection pool (10 connections) |
| **DB Queries** | Callbacks | `async/await` with `pool.promise()` |
| **Double-booking** | Possible race condition | MySQL `FOR UPDATE` transaction lock |
| **Input validation** | None | `express-validator` on all routes |
| **Error responses** | Plain strings | Proper HTTP status codes + JSON |
| **Security headers** | None | `helmet` |
| **Rate limiting** | None | 100 req/15min global; 10 req/15min on login |
| **CORS** | Wildcard `*` | Allowlist from `.env` |
| **Role protection** | None on admin routes | JWT + `requireRole("admin")` middleware |
| **Password hashing** | `bcrypt cost 10` | `bcrypt cost 12` |
| **User enumeration** | Different errors for wrong email vs password | Generic "Invalid email or password" |
| **Duplicate booking** | Not checked | Checks for existing paid payment |
| **Frontend** | Bare HTML, no DOCTYPE, no validation | Full HTML5, Inter font, responsive CSS |
| **JS Frontend** | Inline `fetch` everywhere | Shared `apiFetch` wrapper with auto-logout on 401 |
| **Schema** | VARCHAR for foreign keys, no constraints | Proper `INT UNSIGNED`, FK constraints, indexes |
| **Timestamps** | None | `created_at`, `updated_at` on all tables |

---

## 🌐 API Endpoints

### Public
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/user/register` | Register new user |
| POST | `/api/user/login` | Login, returns JWT |
| GET  | `/api/booking/slots` | List all parking slots |

### Authenticated (Bearer token required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET  | `/api/user/profile` | Get own profile |
| GET  | `/api/user/bookings` | Get own booking history |
| POST | `/api/booking/book` | Book a slot |
| DELETE | `/api/booking/:id/cancel` | Cancel own booking |
| POST | `/api/payment/pay` | Record payment |
| GET  | `/api/payment/history` | Own payment history |

### Admin only
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET  | `/api/admin/dashboard` | Stats summary |
| GET  | `/api/admin/bookings` | All bookings |
| GET  | `/api/admin/users` | All users |
| POST | `/api/admin/slots` | Add parking slot |
| DELETE | `/api/admin/slots/:id` | Remove parking slot |
