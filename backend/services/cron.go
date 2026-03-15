package services

import (
	"log"
	"time"

	"github.com/robfig/cron/v3"
	"gorm.io/gorm"
)

// InitCronJobs starts the background scheduler for daily reset and entropy decay.
func InitCronJobs(db *gorm.DB) {
	loc, err := time.LoadLocation("Asia/Qyzylorda")
	if err != nil {
		log.Fatal("Failed to load timezone Asia/Qyzylorda:", err)
	}

	c := cron.New(cron.WithLocation(loc))

	// Run daily at exactly 00:00 Asia/Qyzylorda
	_, err = c.AddFunc("0 0 * * *", func() {
		log.Println("[CRON] Running daily Sync Engine reset (Asia/Qyzylorda)...")

		// Step 1: Cognitive Decay — reduce CognitiveScore by 5 per day (floor 0)
		decayResult := db.Exec(`
			UPDATE users SET cognitive_score = GREATEST(0, cognitive_score - 5)
		`)
		if decayResult.Error != nil {
			log.Println("[CRON ERROR] Failed to apply cognitive decay:", decayResult.Error)
			return
		}
		log.Printf("[CRON] Cognitive decay applied to %d users.\n", decayResult.RowsAffected)

		// Step 2: Reset streaks for uncompleted tasks (entropy penalty)
		streakResetResult := db.Exec(`
			UPDATE daily_tasks SET streak = 0 WHERE is_completed = false
		`)
		if streakResetResult.Error != nil {
			log.Println("[CRON ERROR] Failed to reset streaks:", streakResetResult.Error)
			return
		}
		log.Printf("[CRON] Streaks reset for %d uncompleted tasks.\n", streakResetResult.RowsAffected)

		// Step 3: Recalculate SyncRate for all users after cognitive decay
		syncResult := db.Exec(`
			UPDATE users SET sync_rate = (routine_score + cognitive_score) / 2.0
		`)
		if syncResult.Error != nil {
			log.Println("[CRON ERROR] Failed to recalculate SyncRate:", syncResult.Error)
			return
		}

		// Step 4: Reset all daily tasks
		resetResult := db.Exec(`UPDATE daily_tasks SET is_completed = false`)
		if resetResult.Error != nil {
			log.Println("[CRON ERROR] Failed to reset daily tasks:", resetResult.Error)
			return
		}

		log.Println("[CRON] Daily Sync Engine reset completed successfully.")
	})

	if err != nil {
		log.Fatal("Failed to setup cron job:", err)
	}

	c.Start()
	log.Println("Cron scheduler started (Asia/Qyzylorda timezone).")
}
