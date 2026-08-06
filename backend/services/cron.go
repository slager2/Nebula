package services

import (
	"fmt"
	"log"
	"time"

	"github.com/robfig/cron/v3"
	"gorm.io/gorm"
	"nebula-backend/models"
)

func RunDailyReset(db *gorm.DB) error {
	return db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&models.DailyTask{}).Where("is_completed = ?", true).Update("is_completed", false).Error; err != nil {
			return err
		}
		var userIDs []uint
		if err := tx.Model(&models.User{}).Pluck("id", &userIDs).Error; err != nil {
			return err
		}
		for _, userID := range userIDs {
			if err := RecalculateUserProgress(tx, userID); err != nil {
				return fmt.Errorf("recalculate user %d: %w", userID, err)
			}
		}
		return nil
	})
}

// InitCronJobs starts the background scheduler for legacy completion-flag cleanup.
func InitCronJobs(db *gorm.DB) {
	c := cron.New(cron.WithLocation(time.UTC))

	// Habit day boundaries are consistently evaluated in UTC.
	_, err := c.AddFunc("0 0 * * *", func() {
		log.Println("[CRON] Refreshing daily habit state (UTC)...")
		if err := RunDailyReset(db); err != nil {
			log.Println("[CRON ERROR] Failed to refresh daily state:", err)
			return
		}
		log.Println("[CRON] Daily habit state refreshed successfully.")
	})

	if err != nil {
		log.Fatal("Failed to setup cron job:", err)
	}

	c.Start()
	log.Println("Cron scheduler started (UTC timezone).")
}
