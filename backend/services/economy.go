package services

import (
	"errors"
	"math"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	"nebula-backend/models"
)

// CompleteDaily marks a task done, increments streak, recalculates RoutineScore & SyncRate.
func CompleteDaily(db *gorm.DB, taskID uint) (*models.User, *models.DailyTask, error) {
	var user models.User
	var task models.DailyTask

	err := db.Transaction(func(tx *gorm.DB) error {
		// Fetch task
		if err := tx.First(&task, taskID).Error; err != nil {
			return err
		}

		if task.IsCompleted {
			return errors.New("task already completed")
		}

		// Lock user row
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&user, task.UserID).Error; err != nil {
			return err
		}

		// Mark completed + increment streak
		task.IsCompleted = true
		now := time.Now()
		task.LastDoneAt = &now
		task.Streak++

		// Stat boost based on type
		switch task.Type {
		case "INT":
			user.StatINT++
		case "STR":
			user.StatSTR++
		case "AGI":
			user.StatAGI++
		}

		if err := tx.Save(&task).Error; err != nil {
			return err
		}

		// Recalculate RoutineScore: (completed / total * 100) + streak bonuses, clamped to 100
		var totalTasks int64
		var completedTasks int64
		tx.Model(&models.DailyTask{}).Where("user_id = ?", user.ID).Count(&totalTasks)
		tx.Model(&models.DailyTask{}).Where("user_id = ? AND is_completed = true", user.ID).Count(&completedTasks)

		var score float64
		if totalTasks > 0 {
			score = (float64(completedTasks) / float64(totalTasks)) * 100.0
		}

		// Streak bonus: sum of all streaks * 0.5, capped contribution
		var streakSum int64
		tx.Model(&models.DailyTask{}).Where("user_id = ? AND is_completed = true", user.ID).
			Select("COALESCE(SUM(streak), 0)").Scan(&streakSum)
		score += float64(streakSum) * 0.5

		// HARD CLAMP: RoutineScore never exceeds 100
		user.RoutineScore = math.Min(100.0, score)
		user.SyncRate = (user.RoutineScore + user.CognitiveScore) / 2.0

		if err := tx.Save(&user).Error; err != nil {
			return err
		}

		return nil
	})

	return &user, &task, err
}

// VerifyNode validates knowledge shard, unlocks node, boosts CognitiveScore.
func VerifyNode(db *gorm.DB, nodeID uint, userID uint, shard string) (*models.StarNode, *models.User, int, error) {
	var user models.User
	var node models.StarNode
	var statusCode int

	err := db.Transaction(func(tx *gorm.DB) error {
		// Lock user row
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&user, userID).Error; err != nil {
			statusCode = 404
			return err
		}

		// Fetch node
		if err := tx.First(&node, nodeID).Error; err != nil {
			statusCode = 404
			return err
		}

		// Verify ownership
		var constellation models.Constellation
		if err := tx.First(&constellation, node.ConstellationID).Error; err != nil {
			statusCode = 404
			return err
		}
		if constellation.UserID != userID {
			statusCode = 403
			return errors.New("unauthorized")
		}

		if node.IsUnlocked {
			statusCode = 400
			return errors.New("node already verified")
		}

		// Parent check
		if node.ParentNodeID != nil {
			var parent models.StarNode
			if err := tx.First(&parent, *node.ParentNodeID).Error; err != nil {
				statusCode = 404
				return err
			}
			if !parent.IsUnlocked {
				statusCode = 403
				return errors.New("parent skill must be verified first")
			}
		}

		// Mutation
		node.IsUnlocked = true
		node.KnowledgeShard = shard

		// Boost CognitiveScore to 100 on successful verification
		user.CognitiveScore = 100.0
		user.SyncRate = (user.RoutineScore + user.CognitiveScore) / 2.0

		if err := tx.Save(&user).Error; err != nil {
			statusCode = 500
			return err
		}
		if err := tx.Save(&node).Error; err != nil {
			statusCode = 500
			return err
		}

		return nil
	})

	return &node, &user, statusCode, err
}
