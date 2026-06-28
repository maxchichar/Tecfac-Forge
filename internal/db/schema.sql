-- Houses table
CREATE TABLE IF NOT EXISTS houses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

-- Rooms table
CREATE TABLE IF NOT EXISTS rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    house_id INTEGER NOT NULL,
    floor TEXT NOT NULL CHECK (floor IN ('Ground', 'Middle', 'Last')),
    room_number INTEGER NOT NULL CHECK (room_number >= 1 AND room_number <= 14),
    capacity INTEGER NOT NULL DEFAULT 1,
    UNIQUE(house_id, floor, room_number),
    FOREIGN KEY (house_id) REFERENCES houses(id)
);

-- Students table
CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    house_id INTEGER NOT NULL,
    room_id INTEGER, -- nullable FK to rooms.id
    monthly_rent INTEGER NOT NULL, -- stored in kobo/cents
    phone TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (house_id) REFERENCES houses(id),
    FOREIGN KEY (room_id) REFERENCES rooms(id)
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    year INTEGER NOT NULL,
    amount_paid INTEGER NOT NULL, -- stored in kobo/cents
    date_paid DATETIME NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('paid', 'partial', 'owing')),
    receipt_path TEXT, -- nullable
    notes TEXT, -- nullable
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id)
);

-- Admin users table
CREATE TABLE IF NOT EXISTS admin_user (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Sessions table for admin authentication
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY, -- securely random token
    admin_user_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    FOREIGN KEY (admin_user_id) REFERENCES admin_user(id)
);

-- Login attempts table for brute-force protection
CREATE TABLE IF NOT EXISTS login_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    attempted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    success BOOLEAN NOT NULL
);

-- Insert initial house data
INSERT OR IGNORE INTO houses (name) VALUES ('Blue'), ('White'), ('Green');

-- Insert room data: 3 houses × 3 floors × 14 rooms = 126 rooms
INSERT OR IGNORE INTO rooms (house_id, floor, room_number, capacity)
SELECT
    h.id,
    f.floor,
    r.room_number,
    1
FROM
    houses h
CROSS JOIN
    (SELECT 'Ground' AS floor UNION ALL SELECT 'Middle' UNION ALL SELECT 'Last') f
CROSS JOIN
    (SELECT 1 AS room_number UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
     UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10
     UNION ALL SELECT 11 UNION ALL SELECT 12 UNION ALL SELECT 13 UNION ALL SELECT 14) r
WHERE
    h.name IN ('Blue', 'White', 'Green');