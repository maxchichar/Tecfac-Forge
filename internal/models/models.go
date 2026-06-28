package models

import "time"

// House represents a dormitory house.
type House struct {
	ID   int64  `json:"id"`
	Name string `json:"name"`
}

// Room represents a room within a house.
type Room struct {
	ID          int64  `json:"id"`
	HouseID     int64  `json:"house_id"`
	Floor       string `json:"floor"` // Ground, Middle, Last
	RoomNumber int64  `json:"room_number"`
	Capacity    int64  `json:"capacity"`
}

// Student represents a student residing in a house/room.
type Student struct {
	ID         int64     `json:"id"`
	FullName   string    `json:"full_name"`
	HouseID    int64     `json:"house_id"`
	RoomID     *int64    `json:"room_id,omitempty"` // nullable
	MonthlyRent int64    `json:"monthly_rent"` // in kobo/cents
	Phone      string    `json:"phone"`
	CreatedAt  time.Time `json:"created_at"`
}

// Payment represents a payment made by a student.
type Payment struct {
	ID         int64     `json:"id"`
	StudentID  int64     `json:"student_id"`
	Month      int64     `json:"month"` // 1-12
	Year       int64     `json:"year"`
	AmountPaid int64     `json:"amount_paid"` // in kobo/cents
	DatePaid   time.Time `json:"date_paid"`
	Status     string    `json:"status"` // paid, partial, owing
	ReceiptPath *string  `json:"receipt_path,omitempty"` // nullable
	Notes      *string   `json:"notes,omitempty"` // nullable
	CreatedAt  time.Time `json:"created_at"`
}

// AdminUser represents an administrator account.
type AdminUser struct {
	ID         int64     `json:"id"`
	Username   string    `json:"username"`
	PasswordHash string   `json:"password_hash"`
	CreatedAt  time.Time `json:"created_at"`
}