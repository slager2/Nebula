package services

import (
	"log"

	"github.com/robfig/cron/v3"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	"nebula-backend/models"
)

// InitCronJobs starts the background scheduler for daily reset and penalty logic.
func InitCronJobs(db *gorm.DB) {
	c := cron.New()

	// Run every day at exactly midnight (00:00)
	_, err := c.AddFunc("0 0 * * *", func() {
		log.Println("[CRON] Running daily reset and penalty job...")

		err := db.Transaction(func(tx *gorm.DB) error {
			// Find all users since penalties apply per user based on their tasks
			var users []models.User
			if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Find(&users).Error; err != nil {
				return err
			}

			// Process penalties for each user
			for i := range users {
				user := &users[i]
				
				// Count uncompleted tasks from yesterday (in MVP any task that is IsCompleted=false when cron runs)
				var uncompletedTasks int64
				if err := tx.Model(&models.DailyTask{}).Where("user_id = ? AND is_completed = ?", user.ID, false).Count(&uncompletedTasks).Error; err != nil {
					log.Println("[CRON ERROR] Failed to count uncompleted tasks for user", user.ID, err)
					continue
				}

				if uncompletedTasks > 0 {
					log.Printf("[CRON] User %d failed %d tasks. Applying penalty.\n", user.ID, uncompletedTasks)
					user.HP -= int(uncompletedTasks)
					
					// Level drop logic if HP <= 0
					if user.HP <= 0 {
						user.Level--
						if user.Level < 1 {
							user.Level = 1
						}
						user.HP = 100 // Reset HP after level drop
						log.Printf("[CRON] User %d dropped to Level %d!\n", user.ID, user.Level)
					}
					
					if err := tx.Save(user).Error; err != nil {
						log.Println("[CRON ERROR] Failed to save user penalty", err)
						continue
					}
				}
			}

			// Reset all tasks to incomplete
			if err := tx.Model(&models.DailyTask{}).Where("1 = 1").Update("is_completed", false).Error; err != nil {
				log.Println("[CRON ERROR] Failed to reset daily tasks", err)
				return err
			}

			log.Println("[CRON] Daily reset and penalty job completed successfully.")
			return nil
		})

		if err != nil {
			log.Println("[CRON ERROR] Transaction failed:", err)
		}
	})

	if err != nil {
		log.Fatal("Failed to setup cron job:", err)
	}

	c.Start()
	log.Println("Cron scheduler started.")
}
