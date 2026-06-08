package models

import (
	"time"

	"github.com/google/uuid"
)

type User struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	Email     string    `gorm:"unique;not null" json:"email"`
	HashedPw  string    `gorm:"not null" json:"-"`
	Shell     string    `gorm:"default:'powershell'" json:"shell"`
	Settings  string    `gorm:"type:jsonb" json:"settings"`
	CreatedAt time.Time `json:"created_at"`
}

type Command struct {
	ID         uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	UserID     uuid.UUID `gorm:"type:uuid" json:"user_id"`
	Command    string    `gorm:"type:text;not null" json:"command"`
	Cwd        string    `gorm:"type:text" json:"cwd"`
	ExitCode   int       `gorm:"type:integer" json:"exit_code"`
	DurationMs int       `gorm:"type:integer" json:"duration_ms"`
	SessionID  uuid.UUID `gorm:"type:uuid" json:"session_id"`
	CreatedAt  time.Time `json:"created_at"`
}

type Workflow struct {
	ID           uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	UserID       uuid.UUID `gorm:"type:uuid" json:"user_id"`
	Name         string    `gorm:"type:text;not null" json:"name"`
	Steps        string    `gorm:"type:jsonb;not null" json:"steps"` // JSON array of string commands
	TriggerCount int       `gorm:"type:integer;default:0" json:"trigger_count"`
	CreatedAt    time.Time `json:"created_at"`
	LastUsedAt   *time.Time `json:"last_used_at"`
}

type ErrorEvent struct {
	ID         uuid.UUID  `gorm:"type:uuid;primaryKey" json:"id"`
	CommandID  *uuid.UUID `gorm:"type:uuid" json:"command_id"`
	Stderr     string     `gorm:"type:text;not null" json:"stderr"`
	ErrorType  string     `gorm:"type:text" json:"error_type"`
	FixApplied string     `gorm:"type:text" json:"fix_applied"`
	CreatedAt  time.Time  `json:"created_at"`
}

type Session struct {
	ID           uuid.UUID  `gorm:"type:uuid;primaryKey" json:"id"`
	UserID       uuid.UUID  `gorm:"type:uuid" json:"user_id"`
	StartedAt    time.Time  `json:"started_at"`
	EndedAt      *time.Time `json:"ended_at"`
	CommandCount int        `gorm:"type:integer;default:0" json:"command_count"`
	Recording    string     `gorm:"type:jsonb" json:"recording"` // JSON listing execution history
}
