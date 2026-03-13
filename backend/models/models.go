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

// ResourceList is a custom type for GORM JSONB storage
type ResourceList []Resource

type Resource struct {
	Title string `json:"title"`
	Type  string `json:"type"` // "article", "video", "exercise"
	URL   string `json:"url"`
}

// Scan implements sql.Scanner for reading JSONB from Postgres
func (r *ResourceList) Scan(value interface{}) error {
	if value == nil {
		*r = ResourceList{}
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
	return json.Unmarshal(b, r)
}

// Value implements driver.Valuer for writing JSONB to Postgres
func (r ResourceList) Value() (driver.Value, error) {
	if r == nil {
		return "[]", nil
	}
	b, err := json.Marshal(r)
	return string(b), err
}

type StarNode struct {
	ID              uint         `gorm:"primaryKey"`
	ConstellationID uint         `gorm:"index"`
	ParentNodeID    *uint        `gorm:"index"`
	Title           string
	Description     string
	Cost            int          `gorm:"default:1"`
	Resources       ResourceList `gorm:"type:jsonb;default:'[]'"`
	IsUnlocked      bool         `gorm:"default:false"`
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
