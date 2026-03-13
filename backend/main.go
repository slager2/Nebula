package main

import (
	"log"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/joho/godotenv"

	"nebula-backend/database"
	"nebula-backend/handlers"
	"nebula-backend/services"
)

func main() {
	// Load environment variables (like DB credentials, GEMINI_API_KEY)
	err := godotenv.Load()
	if err != nil {
		log.Println("Note: .env file not found. Assuming environment variables are injected via OS")
	}

	// Connect to PostgreSQL & Migrate
	database.Connect()

	// Initialize background jobs
	services.InitCronJobs(database.DB)

	app := fiber.New(fiber.Config{
		AppName: "Cosmic Skill Tree MVP",
	})
	app.Use(logger.New())
	app.Use(cors.New())

	api := app.Group("/api/v1")

	// Global state
	api.Get("/user", handlers.GetUser)

	// AI Generative Tree endpoints
	api.Post("/constellations/generate", handlers.GenerateConstellation)
	api.Get("/constellations/:id", handlers.GetConstellation)
	api.Post("/nodes/:id/unlock", handlers.UnlockStar)

	// Econ/Routine endpoints
	api.Post("/dailies/:id/complete", handlers.CompleteDaily)

	log.Println("Server is running on http://localhost:3000")
	log.Fatal(app.Listen(":3000"))
}
