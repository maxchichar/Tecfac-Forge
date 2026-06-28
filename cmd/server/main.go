package main

import (
	"database/sql"
	"fmt"
	"os"
	"log"

	// Database driver
	_ "modernc.org/sqlite"
)

func main() {
	// Open or create SQLite database
	db, err := sql.Open("sqlite", "./leefcenterhostel.db")
	if err != nil {
		log.Fatalf("Failed to open database: %v", err)
	}
	defer db.Close()

	// Test connection
	if err := db.Ping(); err != nil {
		log.Fatalf("Failed to ping database: %v", err)
	}

	// Read schema.sql
	schema, err := os.ReadFile("internal/db/schema.sql")
	if err != nil {
		log.Fatalf("Failed to read schema.sql: %v", err)
	}

	// Execute schema
	if _, err := db.Exec(string(schema)); err != nil {
		log.Fatalf("Failed to execute schema: %v", err)
	}

	fmt.Println("Database connected and schema ready")
}