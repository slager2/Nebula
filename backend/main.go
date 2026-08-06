package main

import (
	"log"
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/joho/godotenv"

	"nebula-backend/database"
	"nebula-backend/handlers"
	"nebula-backend/services"
)

func main() {
	// Load environment variables (like DB credentials and GROQ_API_KEY).
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
	allowedOrigins := os.Getenv("CORS_ALLOWED_ORIGINS")
	if allowedOrigins == "" {
		allowedOrigins = "http://localhost:5173,http://127.0.0.1:5173"
	}
	app.Use(cors.New(cors.Config{
		AllowOrigins: allowedOrigins,
		AllowHeaders: "Origin, Content-Type, Accept",
	}))

	api := app.Group("/api/v1")

	// Profile endpoints
	api.Get("/profile", handlers.GetProfile)
	api.Put("/profile/physics", handlers.UpdatePhysics)

	// Universe & Archive
	api.Get("/universe", handlers.GetUniverse)
	api.Get("/archive", handlers.GetArchive)

	// AI Generative Tree endpoints
	api.Post("/constellations/generate", handlers.GenerateConstellation)
	api.Get("/constellations/:id", handlers.GetConstellation)
	api.Delete("/constellations/:id", handlers.DeleteConstellation)
	api.Post("/nodes/:id/verify", handlers.VerifyNode)
	api.Post("/nodes/:id/review", handlers.ReviewNode)

	// Econ/Routine endpoints
	api.Get("/dailies", handlers.GetDailies)
	api.Post("/dailies", handlers.CreateDaily)
	api.Post("/dailies/:id/complete", handlers.CompleteDaily)
	api.Delete("/dailies/:id", handlers.DeleteDaily)

	log.Println("Server is running on http://localhost:3000")
	log.Fatal(app.Listen(":3000"))
}
