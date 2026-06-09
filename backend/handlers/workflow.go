package handlers

import (
	"encoding/json"
	"time"

	"flowcore-backend/models"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type WorkflowHandler struct {
	DB *gorm.DB
}

func NewWorkflowHandler(db *gorm.DB) *WorkflowHandler {
	return &WorkflowHandler{DB: db}
}

func (h *WorkflowHandler) GetWorkflows(c *fiber.Ctx) error {
	var list []models.Workflow
	if err := h.DB.Order("trigger_count desc").Find(&list).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch workflows"})
	}

	type workflowResponse struct {
		ID           uuid.UUID `json:"id"`
		Name         string    `json:"name"`
		Steps        []string  `json:"steps"`
		TriggerCount int       `json:"trigger_count"`
		CreatedAt    time.Time `json:"created_at"`
		LastUsedAt   *time.Time `json:"last_used_at"`
	}

	results := []workflowResponse{}
	for _, w := range list {
		var steps []string
		json.Unmarshal([]byte(w.Steps), &steps)
		results = append(results, workflowResponse{
			ID:           w.ID,
			Name:         w.Name,
			Steps:        steps,
			TriggerCount: w.TriggerCount,
			CreatedAt:    w.CreatedAt,
			LastUsedAt:   w.LastUsedAt,
		})
	}

	return c.JSON(fiber.Map{
		"saved_workflows":    results,
		"suggested_patterns": []string{}, // Python ML worker populates suggestions via Redis
	})
}

func (h *WorkflowHandler) CreateWorkflow(c *fiber.Ctx) error {
	var payload struct {
		Name  string   `json:"name"`
		Steps []string `json:"steps"`
	}

	if err := c.BodyParser(&payload); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	stepsBytes, _ := json.Marshal(payload.Steps)

	w := models.Workflow{
		ID:           uuid.New(),
		UserID:       uuid.Nil,
		Name:         payload.Name,
		Steps:        string(stepsBytes),
		TriggerCount: 0,
		CreatedAt:    time.Now(),
		LastUsedAt:   nil,
	}

	if err := h.DB.Create(&w).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to save workflow"})
	}

	// Deserialise Steps for the response so caller gets a proper JSON array,
	// not the double-encoded string stored in the DB column.
	var decodedSteps []string
	json.Unmarshal([]byte(w.Steps), &decodedSteps)

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"id":            w.ID,
		"name":          w.Name,
		"steps":         decodedSteps,
		"trigger_count": w.TriggerCount,
		"created_at":    w.CreatedAt,
	})
}

func (h *WorkflowHandler) DeleteWorkflow(c *fiber.Ctx) error {
	idStr := c.Params("id")
	wID, err := uuid.Parse(idStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid workflow UUID"})
	}

	if err := h.DB.Delete(&models.Workflow{}, wID).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to delete workflow"})
	}

	return c.JSON(fiber.Map{"status": "success"})
}

func (h *WorkflowHandler) TriggerWorkflow(c *fiber.Ctx) error {
	idStr := c.Params("id")
	wID, err := uuid.Parse(idStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid workflow UUID"})
	}

	var w models.Workflow
	if err := h.DB.First(&w, wID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Workflow not found"})
	}

	now := time.Now()
	w.TriggerCount++
	w.LastUsedAt = &now

	if err := h.DB.Save(&w).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update workflow usage"})
	}

	var steps []string
	json.Unmarshal([]byte(w.Steps), &steps)

	return c.JSON(fiber.Map{
		"status": "triggered",
		"workflow": fiber.Map{
			"id":            w.ID,
			"name":          w.Name,
			"steps":         steps,
			"trigger_count": w.TriggerCount,
		},
	})
}
