package database

import (
	"log"
	"os"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
	"nebula-backend/models"
)

var DB *gorm.DB

func Connect() {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		dsn = "host=localhost user=postgres password=postgres dbname=nebula port=5432 sslmode=disable TimeZone=UTC"
	}

	var db *gorm.DB
	var err error
	logMode := logger.Warn
	if os.Getenv("GORM_LOG_LEVEL") == "info" {
		logMode = logger.Info
	}

	// Retry connection loop
	for i := 0; i < 10; i++ {
		db, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
			Logger: logger.Default.LogMode(logMode),
		})
		if err == nil {
			break
		}
		log.Printf("Failed to connect to database (attempt %d/10). Retrying in 2 seconds...\n", i+1)
		time.Sleep(2 * time.Second)
	}

	if err != nil {
		log.Fatal("Failed to connect to database after multiple attempts. \n", err)
	}

	log.Println("Connected to Database")
	sqlDB, err := db.DB()
	if err != nil {
		log.Fatal("Failed to configure database pool. \n", err)
	}
	sqlDB.SetMaxOpenConns(20)
	sqlDB.SetMaxIdleConns(5)
	sqlDB.SetConnMaxLifetime(time.Hour)

	log.Println("Running migrations...")
	err = db.AutoMigrate(&models.User{}, &models.Constellation{}, &models.StarNode{}, &models.DailyTask{}, &models.ActivityEvent{})
	if err != nil {
		log.Fatal("Failed to migrate. \n", err)
	}

	DB = db
}
