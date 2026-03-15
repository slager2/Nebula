package handlers

import (
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
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

	userID := uint(1)

	constellation, nodes, err := services.GenerateConstellation(database.DB, userID, req.Topic)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"message":       "Constellation generated successfully",
		"constellation": constellation,
		"nodes":         nodes,
	})
}

// GetConstellation returns a constellation tree formatted for the React force graph
func GetConstellation(c *fiber.Ctx) error {
	id := c.Params("id")

	var constellation models.Constellation
	if err := database.DB.First(&constellation, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Constellation not found"})
	}

	var nodes []models.StarNode
	database.DB.Where("constellation_id = ?", id).Find(&nodes)

	type CodexDTO struct {
		Overview      string   `json:"overview"`
		KeyConcepts   []string `json:"key_concepts"`
		PracticalTask string   `json:"practical_task"`
	}

	type NodeDTO struct {
		ID             string   `json:"id"`
		Name           string   `json:"name"`
		Desc           string   `json:"desc"`
		Unlocked       bool     `json:"unlocked"`
		Codex          CodexDTO `json:"codex"`
		KnowledgeShard string   `json:"knowledge_shard"`
	}

	type LinkDTO struct {
		Source string `json:"source"`
		Target string `json:"target"`
	}

	var resNodes []NodeDTO
	var resLinks []LinkDTO

	for _, n := range nodes {
		resNodes = append(resNodes, NodeDTO{
			ID:       strconv.Itoa(int(n.ID)),
			Name:     n.Title,
			Desc:     n.Description,
			Unlocked: n.IsUnlocked,
			Codex: CodexDTO{
				Overview:      n.Codex.Overview,
				KeyConcepts:   n.Codex.KeyConcepts,
				PracticalTask: n.Codex.PracticalTask,
			},
			KnowledgeShard: n.KnowledgeShard,
		})

		if n.ParentNodeID != nil {
			resLinks = append(resLinks, LinkDTO{
				Source: strconv.Itoa(int(*n.ParentNodeID)),
				Target: strconv.Itoa(int(n.ID)),
			})
		}
	}

	return c.JSON(fiber.Map{
		"nodes": resNodes,
		"links": resLinks,
	})
}

// CompleteDaily handler
func CompleteDaily(c *fiber.Ctx) error {
	idParam := c.Params("id")
	id, _ := strconv.Atoi(idParam)

	user, task, err := services.CompleteDaily(database.DB, uint(id))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"message": "Sync updated. Routine stability recalculated.",
		"user":    user,
		"task":    task,
	})
}

// VerifyNode handler — validates knowledge shard (min 50 chars), unlocks node
func VerifyNode(c *fiber.Ctx) error {
	idParam := c.Params("id")
	id, _ := strconv.Atoi(idParam)

	userID := uint(1) // hardcoded for MVP

	type VerifyRequest struct {
		Shard string `json:"shard"`
	}

	var req VerifyRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request payload"})
	}

	shard := strings.TrimSpace(req.Shard)
	if len(shard) < 50 {
		return c.Status(400).JSON(fiber.Map{"error": "Knowledge shard must be at least 50 characters. Prove your understanding."})
	}

	node, user, statusCode, err := services.VerifyNode(database.DB, uint(id), userID, shard)
	if err != nil {
		if statusCode == 0 {
			statusCode = 400
		}
		return c.Status(statusCode).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"message": "Node verified. Cognitive score boosted.",
		"node":    node,
		"user":    user,
	})
}

// GetProfile creates a fallback user for MVP testing and returns User state
func GetProfile(c *fiber.Ctx) error {
	userID := 1
	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		user = models.User{ID: uint(userID), Username: "INTP_Builder"}
		database.DB.Create(&user)

		dailyTask := models.DailyTask{UserID: uint(userID), Title: "Commit Code Tracker", Type: "INT"}
		database.DB.Create(&dailyTask)
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

	user.Height = req.Height
	user.Weight = req.Weight

	if err := database.DB.Save(&user).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to update user"})
	}

	return c.JSON(user)
}

// GetUniverse checks user SyncRate and returns universe data
func GetUniverse(c *fiber.Ctx) error {
	userID := 1
	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "User not found"})
	}

	if user.SyncRate < 30 {
		return c.Status(403).JSON(fiber.Map{"error": "Universe access locked. Required Sync Rate: 30%"})
	}

	return c.JSON(fiber.Map{
		"message": "Welcome to the Universe",
		"data":    "dummy constellation data",
	})
}

// GetDailies returns all daily tasks for the current user
func GetDailies(c *fiber.Ctx) error {
	userID := uint(1)
	var tasks []models.DailyTask
	database.DB.Where("user_id = ?", userID).Find(&tasks)
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

	if req.Type != "INT" && req.Type != "STR" && req.Type != "AGI" {
		return c.Status(400).JSON(fiber.Map{"error": "Type must be INT, STR, or AGI"})
	}

	task := models.DailyTask{
		UserID: userID,
		Title:  req.Title,
		Type:   req.Type,
	}

	if err := database.DB.Create(&task).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create task"})
	}

	return c.Status(201).JSON(task)
}

// DeleteDaily deletes a daily task by ID
func DeleteDaily(c *fiber.Ctx) error {
	userID := uint(1)
	idParam := c.Params("id")
	id, _ := strconv.Atoi(idParam)

	var task models.DailyTask
	if err := database.DB.Where("id = ? AND user_id = ?", id, userID).First(&task).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Task not found"})
	}

	if err := database.DB.Delete(&task).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to delete task"})
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

	var result []ArchiveData

	for _, c := range constellations {
		var unlockedNodes []models.StarNode
		if err := database.DB.Where("constellation_id = ? AND is_unlocked = ?", c.ID, true).Find(&unlockedNodes).Error; err != nil {
			unlockedNodes = []models.StarNode{} // fallback
		}
		
		result = append(result, ArchiveData{
			Constellation: c,
			Nodes:         unlockedNodes,
		})
	}

	return c.JSON(result)
}
