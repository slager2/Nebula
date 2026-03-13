package services

import (
	"errors"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	"nebula-backend/models"
)

// CompleteDaily marks a task as done, grants EXP, and handles leveling up securely.
func CompleteDaily(db *gorm.DB, taskID uint) (*models.User, error) {
	var user models.User
	var task models.DailyTask

	// Wrapping in a transaction to prevent race conditions
	err := db.Transaction(func(tx *gorm.DB) error {
		// Fetch task
		if err := tx.First(&task, taskID).Error; err != nil {
			return err
		}

		if task.IsCompleted {
			return errors.New("task already completed")
		}

		// Use FOR UPDATE lock to prevent concurrent modifications on User
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&user, task.UserID).Error; err != nil {
			return err
		}

		// State updates
		task.IsCompleted = true
		now := time.Now()
		task.LastDoneAt = &now

		user.EXP += task.BaseEXP
		
		switch task.Type {
		case "INT":
			user.StatINT++
		case "STR":
			user.StatSTR++
		case "AGI":
			user.StatAGI++
		}

		// Level up logic
		for {
			requiredExp := 100 * user.Level
			if user.EXP >= requiredExp {
				user.EXP -= requiredExp
				user.Level++
				user.SkillPoints += 3
				user.HP = 100
			} else {
				break
			}
		}

		if err := tx.Save(&task).Error; err != nil {
			return err
		}
		if err := tx.Save(&user).Error; err != nil {
			return err
		}

		return nil
	})

	return &user, err
}

// UnlockStar spends skill points to unlock a node in the tree.
func UnlockStar(db *gorm.DB, nodeID uint, userID uint) (*models.StarNode, *models.User, int, error) {
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
			return errors.New("node already unlocked")
		}

		// Balance check
		if user.SkillPoints < node.Cost {
			statusCode = 402
			return errors.New("not enough skill points")
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
				return errors.New("parent skill must be unlocked first")
			}
		}

		// Mutation
		user.SkillPoints -= node.Cost
		node.IsUnlocked = true

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
