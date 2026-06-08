package handlers

import (
	"time"

	"flowcore-backend/models"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ErrorHandler struct {
	DB *gorm.DB
}

func NewErrorHandler(db *gorm.DB) *ErrorHandler {
	return &ErrorHandler{DB: db}
}

func (h *ErrorHandler) GetErrors(c *fiber.Ctx) error {
	type ErrorResponse struct {
		ID         uuid.UUID  `json:"id"`
		CommandID  *uuid.UUID `json:"command_id"`
		Command    string     `json:"command"`
		Stderr     string     `json:"stderr"`
		ErrorType  string     `json:"error_type"`
		FixApplied string     `json:"fix_applied"`
		CreatedAt  time.Time  `json:"created_at"`
	}

	var events []models.ErrorEvent
	if err := h.DB.Order("created_at desc").Limit(20).Find(&events).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to read errors"})
	}

	results := []ErrorResponse{}
	for _, e := range events {
		cmdStr := ""
		if e.CommandID != nil {
			var cmd models.Command
			if err := h.DB.Select("command").First(&cmd, *e.CommandID).Error; err == nil {
				cmdStr = cmd.Command
			}
		}
		results = append(results, ErrorResponse{
			ID:         e.ID,
			CommandID:  e.CommandID,
			Command:    cmdStr,
			Stderr:     e.Stderr,
			ErrorType:  e.ErrorType,
			FixApplied: e.FixApplied,
			CreatedAt:  e.CreatedAt,
		})
	}

	return c.JSON(results)
}

func (h *ErrorHandler) SaveErrorFix(c *fiber.Ctx) error {
	var payload struct {
		ID         string `json:"id"`
		Stderr     string `json:"stderr"`
		ErrorType  string `json:"error_type"`
		FixApplied string `json:"fix_applied"`
	}

	if err := c.BodyParser(&payload); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid payload body"})
	}

	var errEvent models.ErrorEvent
	var isNew = false

	if payload.ID != "" {
		eventUUID, err := uuid.Parse(payload.ID)
		if err == nil {
			if err := h.DB.First(&errEvent, eventUUID).Error; err != nil {
				isNew = true
			}
		} else {
			isNew = true
		}
	} else {
		isNew = true
	}

	if isNew {
		errEvent = models.ErrorEvent{
			ID:         uuid.New(),
			CommandID:  nil,
			Stderr:     payload.Stderr,
			ErrorType:  payload.ErrorType,
			FixApplied: payload.FixApplied,
			CreatedAt:  time.Now(),
		}
		if err := h.DB.Create(&errEvent).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to log error fix"})
		}
	} else {
		errEvent.FixApplied = payload.FixApplied
		errEvent.ErrorType = payload.ErrorType
		if err := h.DB.Save(&errEvent).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update error fix"})
		}
	}

	return c.JSON(fiber.Map{
		"status": "success",
		"id":     errEvent.ID,
	})
}
