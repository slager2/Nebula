package models

import (
	"database/sql/driver"
	"encoding/json"
	"time"
)

type User struct {
	ID          uint    `gorm:"primaryKey"`
	Username    string  `gorm:"uniqueIndex"`
	Level       int     `gorm:"default:1"`
	EXP         int     `gorm:"default:0"`
	SkillPoints int     `gorm:"default:0"`
	HP          int     `gorm:"default:100"`
	Height      float32 // Real-life metric
	Weight      float32 // Real-life metric
	StatINT     int     `gorm:"default:10"`
	StatSTR     int     `gorm:"default:10"`
	StatAGI     int     `gorm:"default:10"`
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

type Constellation struct {
	ID          uint   `gorm:"primaryKey"`
	UserID      uint   `gorm:"index"`
	Topic       string // e.g., "Rust Programming"
	Description string
	CreatedAt   time.Time
}

// AIPayload stores the AI-generated study content for a skill node.
type AIPayload struct {
	Overview      string   `json:"overview"`
	KeyConcepts   []string `json:"key_concepts"`
	PracticalTask string   `json:"practical_task"`
}

// Scan implements sql.Scanner for reading JSONB from Postgres
func (a *AIPayload) Scan(value interface{}) error {
	if value == nil {
		*a = AIPayload{}
		return nil
	}
	b, ok := value.([]byte)
	if !ok {
		s, ok2 := value.(string)
		if !ok2 {
			return nil
		}
		b = []byte(s)
	}
	return json.Unmarshal(b, a)
}

// Value implements driver.Valuer for writing JSONB to Postgres
func (a AIPayload) Value() (driver.Value, error) {
	b, err := json.Marshal(a)
	return string(b), err
}

type StarNode struct {
	ID              uint      `gorm:"primaryKey"`
	ConstellationID uint      `gorm:"index"`
	ParentNodeID    *uint     `gorm:"index"`
	Title           string
	Description     string
	Cost            int       `gorm:"default:1"`
	Codex           AIPayload `gorm:"type:jsonb;default:'{}'"`
	KnowledgeShard  string    `gorm:"type:text"` // User's own summary
	IsUnlocked      bool      `gorm:"default:false"`
}

type DailyTask struct {
	ID          uint   `gorm:"primaryKey"`
	UserID      uint   `gorm:"index"`
	Title       string
	Type        string `gorm:"type:varchar(10)"` // "INT", "STR", "AGI"
	BaseEXP     int    `gorm:"default:50"`
	IsCompleted bool   `gorm:"default:false"` // Resets at midnight via cron/job
	LastDoneAt  *time.Time
}
