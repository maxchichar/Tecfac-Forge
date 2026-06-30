package main

import (
	"database/sql"
	"html/template"
	"net/http"
	"os"
	"strings"
	"time"

	_ "modernc.org/sqlite"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	"leefcenterhostel/internal/auth"
	"leefcenterhostel/internal/models"
)

func main() {
	// Open or create SQLite database
	db, err := sql.Open("sqlite", "./leefcenterhostel.db")
	if err != nil {
		panic(err)
	}
	defer db.Close()

	// Test connection
	if err := db.Ping(); err != nil {
		panic(err)
	}

	// Read schema.sql
	schema, err := os.ReadFile("internal/db/schema.sql")
	if err != nil {
		panic(err)
	}

	// Execute schema
	if _, err := db.Exec(string(schema)); err != nil {
		panic(err)
	}

	// Create router
	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	// Serve static files
	FileServer(r, "/static", http.Dir("./static"))

	// Templates
	templates := template.Must(template.ParseGlob("./templates/*.html"))

	// Routes
	r.Get("/login", func(w http.ResponseWriter, r *http.Request) {
		templates.ExecuteTemplate(w, "login.html", nil)
	})

	r.Post("/login", func(w http.ResponseWriter, r *http.Request) {
		username := r.FormValue("username")
		password := r.FormValue("password")

		if username == "" || password == "" {
			http.Error(w, "Username and password are required", http.StatusBadRequest)
			return
		}

		// Check login attempts (brute force protection)
		allowed, err := auth.CheckLoginAttempts(db, username)
		if err != nil {
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}
		if !allowed {
			// Return htmx-friendly error: we'll swap the innerHTML of the error div
			w.Header().Set("HX-Retarget", "#login-error")
			w.Header().Set("HX-Reswap", "innerHTML")
			w.Write([]byte(`<div class="error-message">Too many login attempts. Please try again later.</div>`))
			return
		}

		// Look up the admin user by username
		var admin models.AdminUser
		err = db.QueryRow("SELECT id, username, password_hash, created_at FROM admin_user WHERE username = ?", username).
			Scan(&admin.ID, &admin.Username, &admin.PasswordHash, &admin.CreatedAt)
		if err != nil {
			if err == sql.ErrNoRows {
				// User not found
				recordLoginAttempt(db, username, false)
				w.Header().Set("HX-Retarget", "#login-error")
				w.Header().Set("HX-Reswap", "innerHTML")
				w.Write([]byte(`<div class="error-message">Invalid username or password</div>`))
				return
			}
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}

		// Check password
		if !auth.CheckPassword(admin.PasswordHash, password) {
			// Invalid password
			recordLoginAttempt(db, username, false)
			w.Header().Set("HX-Retarget", "#login-error")
			w.Header().Set("HX-Reswap", "innerHTML")
			w.Write([]byte(`<div class="error-message">Invalid username or password</div>`))
			return
		}

		// Successful login
		recordLoginAttempt(db, username, true)

		// Create session
		sessionToken, err := auth.CreateSession(db, admin.ID)
		if err != nil {
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}

		// Set cookie
		cookie := &http.Cookie{
			Name:     "session_token",
			Value:    sessionToken,
			Path:     "/",
			HttpOnly: true,
			Secure:   true, // In production, set to true (requires HTTPS)
			SameSite: http.SameSiteStrictMode,
			Expires:  time.Now().Add(7 * 24 * time.Hour),
		}
		http.SetCookie(w, cookie)

		// Return HX-Redirect header to redirect to dashboard
		w.Header().Set("HX-Redirect", "/dashboard")
		w.WriteHeader(http.StatusOK)
	})

	r.Get("/dashboard", func(w http.ResponseWriter, r *http.Request) {
		// Check session
		sessionToken, err := r.Cookie("session_token")
		if err != nil {
			http.Redirect(w, r, "/login", http.StatusSeeOther)
			return
		}

		admin, err := auth.ValidateSession(db, sessionToken.Value)
		if err != nil {
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}
		if admin == nil {
			http.Redirect(w, r, "/login", http.StatusSeeOther)
			return
		}

		// For now, just show a simple message
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.Write([]byte(`<h1>Welcome, ` + admin.Username + `!</h1><p>You are logged in.</p><form hx-post="/logout" hx-target="body" hx-swap="outerHTML"><button type="submit">Logout</button></form>`))
	})

	r.Post("/logout", func(w http.ResponseWriter, r *http.Request) {
		sessionToken, err := r.Cookie("session_token")
		if err != nil {
			// No cookie, just redirect to login
			http.Redirect(w, r, "/login", http.StatusSeeOther)
			return
		}

		// Delete session from database
		auth.DeleteSession(db, sessionToken.Value)

		// Clear cookie
		cookie := &http.Cookie{
			Name:     "session_token",
			Value:    "",
			Path:     "/",
			HttpOnly: true,
			Secure:   true,
			SameSite: http.SameSiteStrictMode,
			Expires:  time.Unix(0, 0),
		}
		http.SetCookie(w, cookie)

		// Redirect to login page
		http.Redirect(w, r, "/login", http.StatusSeeOther)
	})

	// Start server
	println("Server starting on :8080")
	if err := http.ListenAndServe(":8080", r); err != nil {
		panic(err)
	}
}

// recordLoginAttempt logs a login attempt (success or failure)
func recordLoginAttempt(db *sql.DB, username string, success bool) {
	_ = auth.RecordLoginAttempt(db, username, success)
}

// FileServer conveniently sets up a http.Handler to serve files from a filesystem.
// This is a copy of the chi.FileServer function to avoid importing an old version.
func FileServer(r chi.Router, path string, root http.FileSystem) {
	if strings.ContainsAny(path, "{}*") {
		panic("FileServer does not permit URL parameters.")
	}

	fs := http.StripPrefix(path, http.FileServer(root))

	if path != "/" && path[len(path)-1] != '/' {
		r.Get(path, http.RedirectHandler(path+"/", http.StatusMovedPermanently).ServeHTTP)
		path += "/"
	}
	path += "*"

	r.Get(path, func(w http.ResponseWriter, r *http.Request) {
		fs.ServeHTTP(w, r)
	})
}