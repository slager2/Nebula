package handlers

import (
	"strconv"

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

	// Assuming User ID 1 for MVP
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

	return c.JSON(fiber.Map{
		"constellation": constellation,
		"nodes":         nodes,
	})
}

// CompleteDaily handler
func CompleteDaily(c *fiber.Ctx) error {
	idParam := c.Params("id")
	id, _ := strconv.Atoi(idParam)

	user, err := services.CompleteDaily(database.DB, uint(id))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"message": "Daily tasks recorded! EXP awarded.",
		"user":    user,
	})
}

// UnlockStar handler
func UnlockStar(c *fiber.Ctx) error {
	idParam := c.Params("id")
	id, _ := strconv.Atoi(idParam)

	userID := uint(1) // hardcoded for MVP

	node, err := services.UnlockStar(database.DB, uint(id), userID)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"message": "Star unlocked successfully! Skill Point deducted.",
		"node":    node,
	})
}

// GetUser creates a fallback user for MVP testing and returns User state
func GetUser(c *fiber.Ctx) error {
	userID := 1
	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		// Auto-creation of user on first call
		user = models.User{ID: uint(userID), Username: "INTP_Builder", Level: 1, EXP: 0, SkillPoints: 5}
		database.DB.Create(&user)
		
		// Create a sample Daily Task to be completable
		dailyTask := models.DailyTask{UserID: uint(userID), Title: "Commit Code Tracker", ExpReward: 100}
		database.DB.Create(&dailyTask)
	}

	return c.JSON(user)
}
