package services

import (
	"errors"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	"nebula-backend/models"
)

func utcDayStart(t time.Time) time.Time {
	year, month, day := t.UTC().Date()
	return time.Date(year, month, day, 0, 0, 0, 0, time.UTC)
}

// RecalculateUserProgress keeps legacy score fields aligned with transparent completion percentages.
func RecalculateUserProgress(tx *gorm.DB, userID uint) error {
	dayStart := utcDayStart(time.Now())
	dayEnd := dayStart.AddDate(0, 0, 1)

	var totalTasks, completedTasks int64
	if err := tx.Model(&models.DailyTask{}).Where("user_id = ?", userID).Count(&totalTasks).Error; err != nil {
		return err
	}
	if err := tx.Model(&models.DailyTask{}).
		Where("user_id = ? AND last_done_at >= ? AND last_done_at < ?", userID, dayStart, dayEnd).
		Count(&completedTasks).Error; err != nil {
		return err
	}

	var totalNodes, completedNodes int64
	if err := tx.Model(&models.StarNode{}).
		Joins("JOIN constellations ON constellations.id = star_nodes.constellation_id").
		Where("constellations.user_id = ?", userID).
		Count(&totalNodes).Error; err != nil {
		return err
	}
	if err := tx.Model(&models.StarNode{}).
		Joins("JOIN constellations ON constellations.id = star_nodes.constellation_id").
		Where("constellations.user_id = ? AND star_nodes.is_unlocked = ?", userID, true).
		Count(&completedNodes).Error; err != nil {
		return err
	}

	routineScore := 0.0
	if totalTasks > 0 {
		routineScore = float64(completedTasks) / float64(totalTasks) * 100
	}
	cognitiveScore := 0.0
	if totalNodes > 0 {
		cognitiveScore = float64(completedNodes) / float64(totalNodes) * 100
	}

	return tx.Model(&models.User{}).Where("id = ?", userID).Updates(map[string]interface{}{
		"routine_score":   routineScore,
		"cognitive_score": cognitiveScore,
		"sync_rate":       (routineScore + cognitiveScore) / 2,
	}).Error
}

// CompleteDaily records one habit completion per UTC calendar day.
func CompleteDaily(db *gorm.DB, taskID uint, userID uint) (*models.User, *models.DailyTask, error) {
	var user models.User
	var task models.DailyTask

	err := db.Transaction(func(tx *gorm.DB) error {
		// Lock the task before checking completion to prevent duplicate rewards.
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("id = ? AND user_id = ?", taskID, userID).First(&task).Error; err != nil {
			return err
		}

		now := time.Now().UTC()
		dayStart := utcDayStart(now)
		if task.LastDoneAt != nil && !task.LastDoneAt.Before(dayStart) {
			return errors.New("habit already completed today")
		}

		// Lock user row
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&user, task.UserID).Error; err != nil {
			return err
		}

		// Continue a streak only when the previous completion was yesterday.
		yesterdayStart := dayStart.AddDate(0, 0, -1)
		if task.LastDoneAt != nil && !task.LastDoneAt.Before(yesterdayStart) && task.LastDoneAt.Before(dayStart) {
			task.Streak++
		} else {
			task.Streak = 1
		}
		task.IsCompleted = true
		task.LastDoneAt = &now

		if err := tx.Save(&task).Error; err != nil {
			return err
		}
		taskIDCopy := task.ID
		if err := tx.Create(&models.ActivityEvent{
			UserID:      userID,
			DailyTaskID: &taskIDCopy,
			EventType:   "habit_completed",
			OccurredAt:  now,
		}).Error; err != nil {
			return err
		}
		if err := RecalculateUserProgress(tx, userID); err != nil {
			return err
		}
		return tx.First(&user, userID).Error
	})

	return &user, &task, err
}

// CompleteNode records a learner reflection and schedules the first retrieval review.
func CompleteNode(db *gorm.DB, nodeID uint, userID uint, reflection string) (*models.StarNode, *models.User, int, error) {
	var user models.User
	var node models.StarNode
	var statusCode int

	err := db.Transaction(func(tx *gorm.DB) error {
		// Lock user row
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&user, userID).Error; err != nil {
			statusCode = 404
			return err
		}

		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&node, nodeID).Error; err != nil {
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
			return errors.New("lesson already completed")
		}

		// Parent chain check: verify entire unlock chain is satisfied
		if node.ParentNodeID != nil {
			currentNodeID := node.ParentNodeID
			visited := make(map[uint]bool)
			for currentNodeID != nil {
				if visited[*currentNodeID] {
					statusCode = 409
					return errors.New("invalid prerequisite cycle")
				}
				visited[*currentNodeID] = true
				var parent models.StarNode
				if err := tx.First(&parent, *currentNodeID).Error; err != nil {
					statusCode = 404
					return err
				}
				if !parent.IsUnlocked {
					statusCode = 403
					return errors.New("complete prerequisite lessons first")
				}
				if parent.ConstellationID != node.ConstellationID {
					statusCode = 409
					return errors.New("invalid cross-plan prerequisite")
				}
				currentNodeID = parent.ParentNodeID
			}
		}

		now := time.Now().UTC()
		firstReview := now.AddDate(0, 0, 1)
		node.IsUnlocked = true
		node.KnowledgeShard = reflection
		node.LearnedAt = &now
		node.NextReviewAt = &firstReview
		node.ReviewCount = 0
		if err := tx.Save(&node).Error; err != nil {
			statusCode = 500
			return err
		}
		nodeIDCopy := node.ID
		if err := tx.Create(&models.ActivityEvent{
			UserID:     userID,
			StarNodeID: &nodeIDCopy,
			EventType:  "lesson_completed",
			OccurredAt: now,
		}).Error; err != nil {
			statusCode = 500
			return err
		}
		if err := RecalculateUserProgress(tx, userID); err != nil {
			statusCode = 500
			return err
		}
		if err := tx.First(&user, userID).Error; err != nil {
			statusCode = 500
			return err
		}

		return nil
	})

	return &node, &user, statusCode, err
}

var reviewIntervals = []time.Duration{
	24 * time.Hour,
	3 * 24 * time.Hour,
	7 * 24 * time.Hour,
	14 * 24 * time.Hour,
	30 * 24 * time.Hour,
	60 * 24 * time.Hour,
}

func calculateReviewSchedule(stage int, quality string, now time.Time) (int, time.Time, error) {
	if stage < 0 {
		stage = 0
	}
	if stage >= len(reviewIntervals) {
		stage = len(reviewIntervals) - 1
	}
	switch quality {
	case "again":
		if stage > 0 {
			stage--
		}
		return stage, now.Add(10 * time.Minute), nil
	case "hard":
		return stage, now.Add(24 * time.Hour), nil
	case "good":
		stage++
	case "easy":
		stage += 2
	default:
		return stage, time.Time{}, errors.New("invalid quality value: must be again, hard, good, or easy")
	}
	if stage >= len(reviewIntervals) {
		stage = len(reviewIntervals) - 1
	}
	return stage, now.Add(reviewIntervals[stage]), nil
}

// ReviewNode records a retrieval attempt and advances an explainable review stage.
func ReviewNode(db *gorm.DB, nodeID uint, userID uint, quality string) (*models.StarNode, *models.User, int, error) {
	var user models.User
	var node models.StarNode
	var statusCode int

	// Validate quality parameter
	if quality != "again" && quality != "hard" && quality != "good" && quality != "easy" {
		return nil, nil, 400, errors.New("invalid quality value: must be again, hard, good, or easy")
	}

	err := db.Transaction(func(tx *gorm.DB) error {
		// Fetch and lock user row for update
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&user, userID).Error; err != nil {
			statusCode = 404
			return err
		}

		// Fetch and lock the node so concurrent reviews cannot reuse stale state.
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&node, nodeID).Error; err != nil {
			statusCode = 404
			return err
		}

		// Verify node is unlocked (can only review unlocked nodes)
		if !node.IsUnlocked {
			statusCode = 403
			return errors.New("node is not unlocked and cannot be reviewed")
		}

		// Verify ownership: node's constellation must belong to the user
		var constellation models.Constellation
		if err := tx.First(&constellation, node.ConstellationID).Error; err != nil {
			statusCode = 404
			return err
		}
		if constellation.UserID != userID {
			statusCode = 403
			return errors.New("unauthorized: user does not own this node")
		}

		now := time.Now()
		if node.NextReviewAt != nil && now.Before(*node.NextReviewAt) {
			statusCode = 409
			return errors.New("node review is not due yet")
		}

		stage, nextReview, err := calculateReviewSchedule(node.ReviewCount, quality, now)
		if err != nil {
			statusCode = 400
			return err
		}
		node.ReviewCount = stage
		node.NextReviewAt = &nextReview
		node.LastReviewedAt = &now
		if err := tx.Save(&node).Error; err != nil {
			statusCode = 500
			return err
		}
		nodeIDCopy := node.ID
		if err := tx.Create(&models.ActivityEvent{
			UserID:     userID,
			StarNodeID: &nodeIDCopy,
			EventType:  "review_completed",
			Quality:    quality,
			OccurredAt: now,
		}).Error; err != nil {
			statusCode = 500
			return err
		}
		statusCode = 200

		return nil
	})

	return &node, &user, statusCode, err
}

// DeleteConstellation removes a constellation and all its nodes if authorized.
func DeleteConstellation(db *gorm.DB, constellationID uint, userID uint) (int, error) {
	var constellation models.Constellation

	err := db.Transaction(func(tx *gorm.DB) error {
		// Fetch constellation
		if err := tx.First(&constellation, constellationID).Error; err != nil {
			return err
		}

		// Verify ownership
		if constellation.UserID != userID {
			return errors.New("unauthorized: user does not own this constellation")
		}

		// Delete all nodes associated with this constellation
		if err := tx.Where("constellation_id = ?", constellationID).Delete(&models.StarNode{}).Error; err != nil {
			return err
		}

		// Delete the constellation itself
		if err := tx.Delete(&constellation).Error; err != nil {
			return err
		}
		return RecalculateUserProgress(tx, userID)
	})

	statusCode := 200
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			statusCode = 404
		} else if err.Error() == "unauthorized: user does not own this constellation" {
			statusCode = 403
		} else {
			statusCode = 500
		}
	}

	return statusCode, err
}
