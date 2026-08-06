package handlers

import (
	"github.com/gofiber/fiber/v2"
	"nebula-backend/database"
	"nebula-backend/services"
)

func ListConstellations(c *fiber.Ctx) error {
	plans, err := services.ListPlans(database.DB, 1)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to load learning plans"})
	}
	return c.JSON(plans)
}

func GetLearningToday(c *fiber.Ctx) error {
	today, err := services.GetLearningToday(database.DB, 1)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to load today's learning focus"})
	}
	return c.JSON(today)
}
