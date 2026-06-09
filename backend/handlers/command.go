package handlers

import (
	"time"

	"flowcore-backend/models"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type CommandHandler struct {
	DB *gorm.DB
}

func NewCommandHandler(db *gorm.DB) *CommandHandler {
	return &CommandHandler{DB: db}
}

func (h *CommandHandler) LogCommand(c *fiber.Ctx) error {
	var payload struct {
		Command    string `json:"command"`
		Cwd        string `json:"cwd"`
		ExitCode   int    `json:"exit_code"`
		DurationMs int    `json:"duration_ms"`
		SessionID  string `json:"session_id"`
		Stderr     string `json:"stderr"`
	}

	if err := c.BodyParser(&payload); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse request body"})
	}

	cmd := models.Command{
		ID:         uuid.New(),
		UserID:     uuid.Nil, // Default global user
		Command:    payload.Command,
		Cwd:        payload.Cwd,
		ExitCode:   payload.ExitCode,
		DurationMs: payload.DurationMs,
		SessionID:  payload.SessionID, // stored as plain string - supports 'powershell_live_session' etc.
		CreatedAt:  time.Now(),
	}

	if err := h.DB.Create(&cmd).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to log command history"})
	}

	// Capture errors
	if payload.ExitCode != 0 && payload.Stderr != "" {
		errEvent := models.ErrorEvent{
			ID:        uuid.New(),
			CommandID: &cmd.ID,
			Stderr:    payload.Stderr,
			ErrorType: "Runtime Error",
			CreatedAt: time.Now(),
		}
		h.DB.Create(&errEvent)
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"status":    "success",
		"command":   cmd,
		"logged_id": cmd.ID,
	})
}

func (h *CommandHandler) GetCommands(c *fiber.Ctx) error {
	var cmds []models.Command
	if err := h.DB.Order("created_at desc").Limit(50).Find(&cmds).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to query history"})
	}
	return c.JSON(cmds)
}
