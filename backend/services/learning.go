package services

import (
	"fmt"
	"time"

	"gorm.io/gorm"
	"nebula-backend/models"
)

type PlanSummary struct {
	ID             uint      `json:"id"`
	Topic          string    `json:"topic"`
	Description    string    `json:"description"`
	TotalNodes     int64     `json:"total_nodes"`
	CompletedNodes int64     `json:"completed_nodes"`
	DueReviews     int64     `json:"due_reviews"`
	CreatedAt      time.Time `json:"created_at"`
}

type LearningNodeSummary struct {
	ID              uint             `json:"id"`
	ConstellationID uint             `json:"constellation_id"`
	Topic           string           `json:"topic"`
	Title           string           `json:"title"`
	Description     string           `json:"description"`
	Codex           models.AIPayload `json:"codex"`
	NextReviewAt    *time.Time       `json:"next_review_at"`
	ReviewStage     int              `json:"review_stage"`
}

type ActivityDay struct {
	Date    string `json:"date"`
	Lessons int    `json:"lessons"`
	Reviews int    `json:"reviews"`
	Habits  int    `json:"habits"`
	Total   int    `json:"total"`
}

type LearningMetrics struct {
	LessonsCompleted7D int `json:"lessons_completed_7d"`
	ReviewsCompleted7D int `json:"reviews_completed_7d"`
	ActiveDays30D      int `json:"active_days_30d"`
}

type LearningToday struct {
	ActivePlan     *PlanSummary          `json:"active_plan"`
	Plans          []PlanSummary         `json:"plans"`
	NextLesson     *LearningNodeSummary  `json:"next_lesson"`
	DueReviews     []LearningNodeSummary `json:"due_reviews"`
	DueReviewCount int64                 `json:"due_review_count"`
	Habits         []models.DailyTask    `json:"habits"`
	Metrics        LearningMetrics       `json:"metrics"`
	ActivityByDay  []ActivityDay         `json:"activity_by_day"`
}

func ListPlans(db *gorm.DB, userID uint) ([]PlanSummary, error) {
	var constellations []models.Constellation
	if err := db.Where("user_id = ?", userID).Order("created_at DESC").Find(&constellations).Error; err != nil {
		return nil, err
	}

	plans := make([]PlanSummary, 0, len(constellations))
	now := time.Now().UTC()
	for _, constellation := range constellations {
		plan := PlanSummary{
			ID:          constellation.ID,
			Topic:       constellation.Topic,
			Description: constellation.Description,
			CreatedAt:   constellation.CreatedAt,
		}
		if err := db.Model(&models.StarNode{}).
			Where("constellation_id = ?", constellation.ID).Count(&plan.TotalNodes).Error; err != nil {
			return nil, err
		}
		if err := db.Model(&models.StarNode{}).
			Where("constellation_id = ? AND is_unlocked = ?", constellation.ID, true).
			Count(&plan.CompletedNodes).Error; err != nil {
			return nil, err
		}
		if err := db.Model(&models.StarNode{}).
			Where("constellation_id = ? AND is_unlocked = ? AND (next_review_at IS NULL OR next_review_at <= ?)", constellation.ID, true, now).
			Count(&plan.DueReviews).Error; err != nil {
			return nil, err
		}
		plans = append(plans, plan)
	}
	return plans, nil
}

func GetLearningToday(db *gorm.DB, userID uint) (*LearningToday, error) {
	plans, err := ListPlans(db, userID)
	if err != nil {
		return nil, err
	}

	result := &LearningToday{
		Plans:         plans,
		DueReviews:    make([]LearningNodeSummary, 0),
		Habits:        make([]models.DailyTask, 0),
		ActivityByDay: make([]ActivityDay, 0, 30),
	}

	for i := range plans {
		if plans[i].CompletedNodes < plans[i].TotalNodes {
			result.ActivePlan = &plans[i]
			break
		}
	}
	if result.ActivePlan == nil && len(plans) > 0 {
		result.ActivePlan = &plans[0]
	}

	if err := db.Where("user_id = ?", userID).Order("id ASC").Find(&result.Habits).Error; err != nil {
		return nil, err
	}
	dayStart := utcDayStart(time.Now())
	yesterdayStart := dayStart.AddDate(0, 0, -1)
	for i := range result.Habits {
		result.Habits[i].IsCompleted = result.Habits[i].LastDoneAt != nil && !result.Habits[i].LastDoneAt.Before(dayStart)
		if result.Habits[i].LastDoneAt == nil || result.Habits[i].LastDoneAt.Before(yesterdayStart) {
			result.Habits[i].Streak = 0
		}
	}

	if len(plans) > 0 {
		planIDs := make([]uint, 0, len(plans))
		topics := make(map[uint]string, len(plans))
		for _, plan := range plans {
			planIDs = append(planIDs, plan.ID)
			topics[plan.ID] = plan.Topic
		}

		var dueNodes []models.StarNode
		now := time.Now().UTC()
		if err := db.Where("constellation_id IN ? AND is_unlocked = ? AND (next_review_at IS NULL OR next_review_at <= ?)", planIDs, true, now).
			Order("next_review_at ASC NULLS FIRST").Find(&dueNodes).Error; err != nil {
			return nil, err
		}
		result.DueReviewCount = int64(len(dueNodes))
		for _, node := range dueNodes {
			if len(result.DueReviews) >= 5 {
				break
			}
			result.DueReviews = append(result.DueReviews, learningNodeSummary(node, topics[node.ConstellationID]))
		}
	}

	if result.ActivePlan != nil {
		var nodes []models.StarNode
		if err := db.Where("constellation_id = ?", result.ActivePlan.ID).Order("id ASC").Find(&nodes).Error; err != nil {
			return nil, err
		}
		completed := make(map[uint]bool, len(nodes))
		for _, node := range nodes {
			completed[node.ID] = node.IsUnlocked
		}
		for _, node := range nodes {
			if node.IsUnlocked {
				continue
			}
			if node.ParentNodeID == nil || completed[*node.ParentNodeID] {
				next := learningNodeSummary(node, result.ActivePlan.Topic)
				result.NextLesson = &next
				break
			}
		}
	}

	if err := populateActivity(db, userID, result); err != nil {
		return nil, fmt.Errorf("load activity: %w", err)
	}
	return result, nil
}

func learningNodeSummary(node models.StarNode, topic string) LearningNodeSummary {
	return LearningNodeSummary{
		ID:              node.ID,
		ConstellationID: node.ConstellationID,
		Topic:           topic,
		Title:           node.Title,
		Description:     node.Description,
		Codex:           node.Codex,
		NextReviewAt:    node.NextReviewAt,
		ReviewStage:     node.ReviewCount,
	}
}

func populateActivity(db *gorm.DB, userID uint, result *LearningToday) error {
	today := utcDayStart(time.Now())
	start := today.AddDate(0, 0, -29)
	var events []models.ActivityEvent
	if err := db.Where("user_id = ? AND occurred_at >= ?", userID, start).Order("occurred_at ASC").Find(&events).Error; err != nil {
		return err
	}

	byDate := make(map[string]*ActivityDay, 30)
	for i := 0; i < 30; i++ {
		date := start.AddDate(0, 0, i).Format("2006-01-02")
		day := &ActivityDay{Date: date}
		byDate[date] = day
		result.ActivityByDay = append(result.ActivityByDay, *day)
	}

	activeDates := make(map[string]bool)
	sevenDaysAgo := today.AddDate(0, 0, -6)
	for _, event := range events {
		date := event.OccurredAt.UTC().Format("2006-01-02")
		day := byDate[date]
		if day == nil {
			continue
		}
		switch event.EventType {
		case "lesson_completed":
			day.Lessons++
			activeDates[date] = true
			if !event.OccurredAt.Before(sevenDaysAgo) {
				result.Metrics.LessonsCompleted7D++
			}
		case "review_completed":
			day.Reviews++
			activeDates[date] = true
			if !event.OccurredAt.Before(sevenDaysAgo) {
				result.Metrics.ReviewsCompleted7D++
			}
		case "habit_completed":
			day.Habits++
		}
		day.Total++
	}
	result.Metrics.ActiveDays30D = len(activeDates)

	for i := range result.ActivityByDay {
		if day := byDate[result.ActivityByDay[i].Date]; day != nil {
			result.ActivityByDay[i] = *day
		}
	}
	return nil
}
