package handlers

import (
	"errors"
	"log"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
	"nebula-backend/database"
	"nebula-backend/models"
	"nebula-backend/services"
)

// GenerateConstellation triggers the AI pipeline
func GenerateConstellation(c *fiber.Ctx) error {
	type Request struct {
		Topic string `json:"topic"`
	}
	var req Request
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request payload"})
	}
	req.Topic = strings.TrimSpace(req.Topic)
	if req.Topic == "" || utf8.RuneCountInString(req.Topic) > 200 {
		return c.Status(400).JSON(fiber.Map{"error": "Topic must contain 1-200 characters"})
	}

	userID := uint(1)

	constellation, nodes, err := services.GenerateConstellation(database.DB, userID, req.Topic)
	if err != nil {
		log.Printf("Failed to generate constellation: %v", err)
		return c.Status(502).JSON(fiber.Map{"error": "AI generation failed. Please try again."})
	}

	return c.JSON(fiber.Map{
		"message":       "Constellation generated successfully",
		"constellation": constellation,
		"nodes":         nodes,
	})
}

// GetConstellation returns a constellation tree formatted for the React force graph
func GetConstellation(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid constellation ID"})
	}
	userID := uint(1)

	var constellation models.Constellation
	if err := database.DB.Where("id = ? AND user_id = ?", id, userID).First(&constellation).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Constellation not found"})
	}

	var nodes []models.StarNode
	if err := database.DB.Where("constellation_id = ?", id).Order("id ASC").Find(&nodes).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to load constellation nodes"})
	}

	type NodeDTO struct {
		ID              string           `json:"id"`
		ParentID        *uint            `json:"parent_id"`
		ConstellationID uint             `json:"constellation_id"`
		Name            string           `json:"name"`
		Desc            string           `json:"desc"`
		Status          string           `json:"status"`
		Available       bool             `json:"available"`
		Unlocked        bool             `json:"unlocked"`
		Codex           models.AIPayload `json:"codex"`
		KnowledgeShard  string           `json:"knowledge_shard"`
		ReviewCount     int              `json:"review_count"`
		NextReviewAt    *time.Time       `json:"next_review_at"`
		LearnedAt       *time.Time       `json:"learned_at"`
		ReviewDue       bool             `json:"review_due"`
	}

	type LinkDTO struct {
		Source string `json:"source"`
		Target string `json:"target"`
	}

	resNodes := make([]NodeDTO, 0, len(nodes))
	linkCapacity := len(nodes) - 1
	if linkCapacity < 0 {
		linkCapacity = 0
	}
	resLinks := make([]LinkDTO, 0, linkCapacity)
	completed := make(map[uint]bool, len(nodes))
	for _, node := range nodes {
		completed[node.ID] = node.IsUnlocked
	}
	now := time.Now().UTC()

	for _, n := range nodes {
		available := !n.IsUnlocked && (n.ParentNodeID == nil || completed[*n.ParentNodeID])
		status := "blocked"
		if n.IsUnlocked {
			status = "completed"
		} else if available {
			status = "available"
		}
		resNodes = append(resNodes, NodeDTO{
			ID:              strconv.Itoa(int(n.ID)),
			ParentID:        n.ParentNodeID,
			ConstellationID: n.ConstellationID,
			Name:            n.Title,
			Desc:            n.Description,
			Status:          status,
			Available:       available,
			Unlocked:        n.IsUnlocked,
			Codex:           n.Codex,
			KnowledgeShard:  n.KnowledgeShard,
			ReviewCount:     n.ReviewCount,
			NextReviewAt:    n.NextReviewAt,
			LearnedAt:       n.LearnedAt,
			ReviewDue:       n.IsUnlocked && (n.NextReviewAt == nil || !n.NextReviewAt.After(now)),
		})

		if n.ParentNodeID != nil {
			resLinks = append(resLinks, LinkDTO{
				Source: strconv.Itoa(int(*n.ParentNodeID)),
				Target: strconv.Itoa(int(n.ID)),
			})
		}
	}

	return c.JSON(fiber.Map{
		"constellation": fiber.Map{"id": constellation.ID, "topic": constellation.Topic, "description": constellation.Description},
		"nodes":         resNodes,
		"links":         resLinks,
	})
}

// CompleteDaily handler
func CompleteDaily(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid habit ID"})
	}

	user, task, err := services.CompleteDaily(database.DB, uint(id), 1)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"message": "Sync updated. Routine stability recalculated.",
		"user":    user,
		"task":    task,
	})
}

// VerifyNode records a lesson reflection. The route name is retained for compatibility.
func VerifyNode(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid node ID"})
	}

	userID := uint(1) // hardcoded for MVP

	type VerifyRequest struct {
		Shard string `json:"shard"`
	}

	var req VerifyRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request payload"})
	}

	shard := strings.TrimSpace(req.Shard)
	shardLength := utf8.RuneCountInString(shard)
	if shardLength < 80 || shardLength > 4000 {
		return c.Status(400).JSON(fiber.Map{"error": "Reflection must contain 80-4000 characters"})
	}

	node, user, statusCode, err := services.CompleteNode(database.DB, uint(id), userID, shard)
	if err != nil {
		if statusCode == 0 {
			statusCode = 400
		}
		return c.Status(statusCode).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"message": "Lesson completed. The first review is scheduled for tomorrow.",
		"node":    node,
		"user":    user,
	})
}

// GetProfile creates a fallback user for MVP testing and returns User state
func GetProfile(c *fiber.Ctx) error {
	userID := 1
	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to load profile"})
		}
		if err := database.DB.Transaction(func(tx *gorm.DB) error {
			user = models.User{ID: uint(userID), Username: "Learner"}
			if err := tx.Create(&user).Error; err != nil {
				return err
			}
			return tx.Create(&models.DailyTask{UserID: uint(userID), Title: "Review today's learning focus", Type: "INT"}).Error
		}); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to initialize default habit"})
		}
	}

	return c.JSON(user)
}

// UpdatePhysics updates the user's Height and Weight
func UpdatePhysics(c *fiber.Ctx) error {
	userID := 1
	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "User not found"})
	}

	type PhysicsRequest struct {
		Height float32 `json:"height"`
		Weight float32 `json:"weight"`
	}

	var req PhysicsRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid payload"})
	}
	if req.Height < 50 || req.Height > 250 || req.Weight < 20 || req.Weight > 400 {
		return c.Status(400).JSON(fiber.Map{"error": "Height must be 50-250 cm and weight must be 20-400 kg"})
	}

	user.Height = req.Height
	user.Weight = req.Weight

	if err := database.DB.Save(&user).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to update user"})
	}

	return c.JSON(user)
}

// GetUniverse returns the same persisted learning data used by the knowledge map.
func GetUniverse(c *fiber.Ctx) error {
	return GetArchive(c)
}

// GetDailies returns all daily tasks for the current user
func GetDailies(c *fiber.Ctx) error {
	userID := uint(1)
	var tasks []models.DailyTask
	if err := database.DB.Where("user_id = ?", userID).Order("id ASC").Find(&tasks).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch habits"})
	}
	dayStart := time.Now().UTC().Truncate(24 * time.Hour)
	yesterdayStart := dayStart.AddDate(0, 0, -1)
	for i := range tasks {
		tasks[i].IsCompleted = tasks[i].LastDoneAt != nil && !tasks[i].LastDoneAt.Before(dayStart)
		if tasks[i].LastDoneAt == nil || tasks[i].LastDoneAt.Before(yesterdayStart) {
			tasks[i].Streak = 0
		}
	}
	return c.JSON(tasks)
}

// CreateDaily creates a new daily task
func CreateDaily(c *fiber.Ctx) error {
	userID := uint(1)

	type CreateRequest struct {
		Title string `json:"title"`
		Type  string `json:"type"`
	}

	var req CreateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid payload"})
	}

	req.Title = strings.TrimSpace(req.Title)
	req.Type = strings.ToUpper(strings.TrimSpace(req.Type))
	if utf8.RuneCountInString(req.Title) < 1 || utf8.RuneCountInString(req.Title) > 120 {
		return c.Status(400).JSON(fiber.Map{"error": "Habit title must contain 1-120 characters"})
	}
	if req.Type != "INT" && req.Type != "STR" && req.Type != "AGI" {
		return c.Status(400).JSON(fiber.Map{"error": "Type must be INT, STR, or AGI"})
	}

	task := models.DailyTask{
		UserID: userID,
		Title:  req.Title,
		Type:   req.Type,
	}

	if err := database.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&task).Error; err != nil {
			return err
		}
		return services.RecalculateUserProgress(tx, userID)
	}); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create habit"})
	}

	return c.Status(201).JSON(task)
}

// DeleteDaily deletes a daily task by ID
func DeleteDaily(c *fiber.Ctx) error {
	userID := uint(1)
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid habit ID"})
	}

	var task models.DailyTask
	if err := database.DB.Where("id = ? AND user_id = ?", id, userID).First(&task).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Task not found"})
	}

	if err := database.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Delete(&task).Error; err != nil {
			return err
		}
		return services.RecalculateUserProgress(tx, userID)
	}); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to delete habit"})
	}

	return c.JSON(fiber.Map{"message": "Task deleted"})
}

// GetArchive returns all constellations and their unlocked nodes
func GetArchive(c *fiber.Ctx) error {
	userID := 1

	var constellations []models.Constellation
	if err := database.DB.Where("user_id = ?", userID).Find(&constellations).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch constellations"})
	}

	type ArchiveData struct {
		models.Constellation
		Nodes []models.StarNode `json:"nodes"`
	}

	result := make([]ArchiveData, 0, len(constellations))

	for _, constellation := range constellations {
		var unlockedNodes []models.StarNode
		if err := database.DB.Where("constellation_id = ? AND is_unlocked = ?", constellation.ID, true).Find(&unlockedNodes).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch completed lessons"})
		}

		result = append(result, ArchiveData{
			Constellation: constellation,
			Nodes:         unlockedNodes,
		})
	}

	return c.JSON(result)
}

// ReviewNode handles POST /api/v1/nodes/:id/review
// Payload: {"quality": "hard"|"good"|"easy"}
// Returns: {node, user} or error
func ReviewNode(c *fiber.Ctx) error {
	type Request struct {
		Quality string `json:"quality"`
	}
	var req Request
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request payload"})
	}

	nodeID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid node ID"})
	}

	userID := uint(1) // MVP single-user mode

	node, user, statusCode, svcErr := services.ReviewNode(database.DB, uint(nodeID), userID, strings.ToLower(strings.TrimSpace(req.Quality)))
	if svcErr != nil {
		if statusCode == 0 {
			statusCode = 500
		}
		return c.Status(statusCode).JSON(fiber.Map{"error": svcErr.Error()})
	}

	return c.JSON(fiber.Map{
		"node": node,
		"user": user,
	})
}

// DeleteConstellation handles DELETE /api/v1/constellations/:id
// Deletes constellation and all associated nodes
func DeleteConstellation(c *fiber.Ctx) error {
	constellationID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid constellation ID"})
	}

	userID := uint(1) // MVP single-user mode

	statusCode, svcErr := services.DeleteConstellation(database.DB, uint(constellationID), userID)
	if svcErr != nil {
		return c.Status(statusCode).JSON(fiber.Map{"error": svcErr.Error()})
	}

	return c.Status(statusCode).JSON(fiber.Map{
		"message": "Constellation deleted successfully",
	})
}
