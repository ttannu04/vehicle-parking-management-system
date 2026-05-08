-- =============================================================
-- Vehicle Parking Management System — Production Schema
-- =============================================================

CREATE DATABASE IF NOT EXISTS parking_system
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE parking_system;

-- ── USERS ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name         VARCHAR(100)     NOT NULL,
    email        VARCHAR(255)     NOT NULL,
    password     VARCHAR(255)     NOT NULL,   -- bcrypt hash
    role         ENUM('user','admin') NOT NULL DEFAULT 'user',
    created_at   DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB;

-- ── PARKING SLOTS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS parking_slots (
    id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    slot_number  VARCHAR(20)      NOT NULL,
    location     VARCHAR(100)     NOT NULL,
    vehicle_type ENUM('car','bike','truck') NOT NULL DEFAULT 'car',
    hourly_rate  DECIMAL(8,2)     NOT NULL DEFAULT 0.00,
    status       ENUM('available','booked','maintenance') NOT NULL DEFAULT 'available',
    created_at   DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uq_slot_number (slot_number),
    KEY idx_status (status)
) ENGINE=InnoDB;

-- ── BOOKINGS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookings (
    id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id      INT UNSIGNED     NOT NULL,
    slot_id      INT UNSIGNED     NOT NULL,
    status       ENUM('booked','paid','cancelled','completed') NOT NULL DEFAULT 'booked',
    check_in     DATETIME         NOT NULL,
    check_out    DATETIME         NOT NULL,
    booked_at    DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_bookings_user FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE RESTRICT,

    CONSTRAINT fk_bookings_slot FOREIGN KEY (slot_id)
        REFERENCES parking_slots (id) ON DELETE RESTRICT,

    KEY idx_bookings_user   (user_id),
    KEY idx_bookings_slot   (slot_id),
    KEY idx_bookings_status (status)
) ENGINE=InnoDB;

-- ── PAYMENTS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
    id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    booking_id   INT UNSIGNED     NOT NULL,
    amount       DECIMAL(10,2)    NOT NULL,
    method       ENUM('card','upi','cash','wallet') NOT NULL DEFAULT 'card',
    status       ENUM('pending','paid','refunded','failed') NOT NULL DEFAULT 'pending',
    txn_ref      VARCHAR(100)     NULL,
    paid_at      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_payments_booking FOREIGN KEY (booking_id)
        REFERENCES bookings (id) ON DELETE RESTRICT,

    KEY idx_payments_booking (booking_id)
) ENGINE=InnoDB;

-- ── DEFAULT ADMIN ─────────────────────────────────────────────
-- Email: admin@parkingsystem.com
-- Password: Admin@1234
INSERT IGNORE INTO users (name, email, password, role) VALUES (
    'Admin',
    'admin@parkingsystem.com',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/yleVm5Vkuq5sEqGDu',
    'admin'
);

-- ── SAMPLE PARKING SLOTS ──────────────────────────────────────
INSERT IGNORE INTO parking_slots (slot_number, location, vehicle_type, hourly_rate) VALUES
    ('A-01', 'Level 1 - Block A', 'car',   50.00),
    ('A-02', 'Level 1 - Block A', 'car',   50.00),
    ('A-03', 'Level 1 - Block A', 'car',   50.00),
    ('B-01', 'Level 1 - Block B', 'bike',  20.00),
    ('B-02', 'Level 1 - Block B', 'bike',  20.00),
    ('T-01', 'Level 2 - Truck Bay', 'truck', 100.00);