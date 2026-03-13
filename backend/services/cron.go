package services

import (
	"log"
	"time"

	"github.com/robfig/cron/v3"
	"gorm.io/gorm"
)

// InitCronJobs starts the background scheduler for daily reset and penalty logic.
func InitCronJobs(db *gorm.DB) {
	loc, err := time.LoadLocation("Asia/Qyzylorda")
	if err != nil {
		log.Fatal("Failed to load timezone Asia/Qyzylorda:", err)
	}

	c := cron.New(cron.WithLocation(loc))

	// Run daily at exactly 00:00 Asia/Qyzylorda
	_, err = c.AddFunc("0 0 * * *", func() {
		log.Println("[CRON] Running daily reset and penalty job (Asia/Qyzylorda)...")

		// Step 1: Penalty — Subtract 15 HP per uncompleted task, floor at 0
		penaltyResult := db.Exec(`
			UPDATE users SET hp = GREATEST(0, hp - (
				SELECT COALESCE(COUNT(*), 0) * 15
				FROM daily_tasks
				WHERE daily_tasks.user_id = users.id AND daily_tasks.is_completed = false
			))
		`)
		if penaltyResult.Error != nil {
			log.Println("[CRON ERROR] Failed to apply HP penalty:", penaltyResult.Error)
			return
		}
		log.Printf("[CRON] HP penalty applied to %d users.\n", penaltyResult.RowsAffected)

		// Step 2: Death mechanic — If HP = 0, deduct 1 level (min 1), reset EXP to 0, restore HP to 100
		deathResult := db.Exec(`
			UPDATE users
			SET level = GREATEST(1, level - 1),
			    exp = 0,
			    hp = 100
			WHERE hp = 0
		`)
		if deathResult.Error != nil {
			log.Println("[CRON ERROR] Failed to apply death mechanic:", deathResult.Error)
			return
		}
		if deathResult.RowsAffected > 0 {
			log.Printf("[CRON] Death mechanic triggered for %d users.\n", deathResult.RowsAffected)
		}

		// Step 3: Reset all daily tasks
		resetResult := db.Exec(`UPDATE daily_tasks SET is_completed = false`)
		if resetResult.Error != nil {
			log.Println("[CRON ERROR] Failed to reset daily tasks:", resetResult.Error)
			return
		}

		log.Println("[CRON] Daily reset and penalty job completed successfully.")
	})

	if err != nil {
		log.Fatal("Failed to setup cron job:", err)
	}

	c.Start()
	log.Println("Cron scheduler started (Asia/Qyzylorda timezone).")
}
