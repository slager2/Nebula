package database

import (
	"log"
	"os"

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
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		log.Fatal("Failed to connect to database. \n", err)
	}

	log.Println("Connected to Database")

	log.Println("Running migrations...")
	err = db.AutoMigrate(&models.User{}, &models.Constellation{}, &models.StarNode{}, &models.DailyTask{})
	if err != nil {
		log.Fatal("Failed to migrate. \n", err)
	}

	DB = db
}
