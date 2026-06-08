package main

import (
	"log"
	"os"

	"flowcore-backend/handlers"
	"flowcore-backend/middleware"
	"flowcore-backend/models"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	// 1. Establish PostgreSQL database connection via GORM
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		// Default development string
		dsn = "host=localhost user=postgres password=postgres dbname=flowcore port=5432 sslmode=disable"
	}

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("Fatal: Failed to connect to GORM database context: %v", err)
	}

	// 2. Automatically sync migrations
	db.AutoMigrate(
		&models.User{},
		&models.Command{},
		&models.Workflow{},
		&models.ErrorEvent{},
		&models.Session{},
	)
	log.Println("[OK] Database migration schemas verified.")

	// 3. Initialize Fiber HTTP Server
	app := fiber.New(fiber.Config{
		AppName: "FlowCore Gateway REST v1.0",
	})

	// Configure CORS for web requests
	app.Use(cors.New(cors.Config{
		AllowOrigins: "*",
		AllowHeaders: "Origin, Content-Type, Accept, Authorization",
		AllowMethods: "GET, POST, PUT, DELETE, OPTIONS",
	}))

	// 4. Initialize services
	authHandler := handlers.NewAuthHandler(db)
	cmdHandler := handlers.NewCommandHandler(db)
	wHandler := handlers.NewWorkflowHandler(db)
	errHandler := handlers.NewErrorHandler(db)

	// 5. Register REST routes
	api := app.Group("/api")

	// Public Auth Endpoints
	api.Post("/auth/register", authHandler.Register)
	api.Post("/auth/login", authHandler.Login)

	// Protected Endpoints
	protected := api.Group("/", middleware.JWTProtected())

	// Command Logging
	protected.Post("/commands", cmdHandler.LogCommand)
	protected.Get("/commands", cmdHandler.GetCommands)

	// Workflow CRUD
	protected.Get("/workflows", wHandler.GetWorkflows)
	protected.Post("/workflows", wHandler.CreateWorkflow)
	protected.Delete("/workflows/:id", wHandler.DeleteWorkflow)
	protected.Post("/workflows/trigger/:id", wHandler.TriggerWorkflow)

	// Error recovery DB
	protected.Get("/errors", errHandler.GetErrors)
	protected.Post("/errors/fix", errHandler.SaveErrorFix)

	// Start server on port 8000
	port := os.Getenv("PORT")
	if port == "" {
		port = "8000"
	}

	log.Printf("FlowCore daemon service starting on port %s...", port)
	if err := app.Listen(":" + port); err != nil {
		log.Fatalf("Fatal: Web Server crashed: %v", err)
	}
}
