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

// UnlockStar spends a skill point to unlock a node in the tree.
func UnlockStar(db *gorm.DB, nodeID uint, userID uint) (*models.StarNode, error) {
	var user models.User
	var node models.StarNode

	err := db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&user, userID).Error; err != nil {
			return err
		}

		if user.SkillPoints < 1 {
			return errors.New("not enough skill points")
		}

		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&node, nodeID).Error; err != nil {
			return err
		}

		// Verify the node belongs to the correct user
		var constellation models.Constellation
		if err := tx.First(&constellation, node.ConstellationID).Error; err != nil {
			return err
		}
		if constellation.UserID != userID {
			return errors.New("unauthorized to unlock this node")
		}

		if node.IsUnlocked {
			return errors.New("node already unlocked")
		}

		// Parent node check
		if node.ParentNodeID != nil {
			var parent models.StarNode
			if err := tx.First(&parent, *node.ParentNodeID).Error; err != nil {
				return err
			}
			if !parent.IsUnlocked {
				return errors.New("parent node must be unlocked first")
			}
		}

		// State updates
		user.SkillPoints--
		node.IsUnlocked = true

		if err := tx.Save(&user).Error; err != nil {
			return err
		}
		if err := tx.Save(&node).Error; err != nil {
			return err
		}

		return nil
	})

	return &node, err
}
