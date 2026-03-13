package models

import (
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

type StarNode struct {
	ID              uint   `gorm:"primaryKey"`
	ConstellationID uint   `gorm:"index"` // Belongs to a constellation
	ParentNodeID    *uint  `gorm:"index"` // Nullable for root nodes
	Title           string // e.g., "Borrow Checker"
	Description     string
	IsUnlocked      bool   `gorm:"default:false"`
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
