package auth

import (
	"crypto/rand"
	"database/sql"
	"encoding/base64"
	"time"

	"golang.org/x/crypto/bcrypt"
)

// HashPassword returns the bcrypt hash of the password.
func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(bytes), err
}

// CheckPassword compares the hashed password with the plain text password.
func CheckPassword(hash, password string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

// CreateSession generates a random session token, stores it in the sessions table
// with an expiry of 7 days from now, and returns the token.
func CreateSession(db *sql.DB, adminUserID int64) (string, error) {
	// Generate a 32-byte random token
	tokenBytes := make([]byte, 32)
	if _, err := rand.Read(tokenBytes); err != nil {
		return "", err
	}
	// Encode to base64 for storage
	token := base64.URLEncoding.EncodeToString(tokenBytes)

	now := time.Now()
	expiresAt := now.Add(7 * 24 * time.Hour)

	_, err := db.Exec(
		"INSERT INTO sessions (id, admin_user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
		token, adminUserID, now, expiresAt,
	)
	return token, err
}

// ValidateSession checks if the session token exists and hasn't expired.
// If valid, it returns the associated AdminUser.
// Returns nil if invalid or expired.
func ValidateSession(db *sql.DB, sessionToken string) (*AdminUser, error) {
	var adminID int64
	var createdAt time.Time
	var expiresAt time.Time

	err := db.QueryRow(
		"SELECT admin_user_id, created_at, expires_at FROM sessions WHERE id = ?",
		sessionToken,
	).Scan(&adminID, &createdAt, &expiresAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil // no session
		}
		return nil, err
	}

	if time.Now().After(expiresAt) {
		// Delete expired session
		_ = DeleteSession(db, sessionToken)
		return nil, nil
	}

	// Fetch the admin user
	var username string
	var passwordHash string
	var userCreatedAt time.Time

	err = db.QueryRow(
		"SELECT username, password_hash, created_at FROM admin_user WHERE id = ?",
		adminID,
	).Scan(&username, &passwordHash, &userCreatedAt)
	if err != nil {
		return nil, err
	}

	return &AdminUser{
		ID:         adminID,
		Username:   username,
		PasswordHash: passwordHash,
		CreatedAt:  userCreatedAt,
	}, nil
}

// DeleteSession removes the session from the database.
func DeleteSession(db *sql.DB, sessionToken string) error {
	_, err := db.Exec("DELETE FROM sessions WHERE id = ?", sessionToken)
	return err
}

// CheckLoginAttempts returns false if the username has had 5 or more failed
// login attempts in the last 15 minutes (i.e., blocking further attempts).
// Returns true if attempts are below the threshold.
func CheckLoginAttempts(db *sql.DB, username string) (bool, error) {
	var count int64
	err := db.QueryRow(`
		SELECT COUNT(*) FROM login_attempts
		WHERE username = ? AND success = 0 AND attempted_at > datetime(?, '-15 minutes')
	`, username, time.Now()).Scan(&count)
	if err != nil {
		return false, err
	}
	return count < 5, nil // true if less than 5 failures
}

// RecordLoginAttempt logs a login attempt (success or failure) for the username.
func RecordLoginAttempt(db *sql.DB, username string, success bool) error {
	_, err := db.Exec(`
		INSERT INTO login_attempts (username, attempted_at, success)
		VALUES (?, ?, ?)
	`, username, time.Now(), success)
	return err
}