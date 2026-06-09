// Package config provides shared application-level constants and configuration helpers.
package config

import (
	"log"
	"os"
)

// JWTSecret returns the JWT signing secret from the JWT_SECRET environment
// variable. If not set, it falls back to a development default and logs a
// prominent warning so it is never silently used in production.
func JWTSecret() string {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		log.Println("[WARNING] JWT_SECRET environment variable is not set. Using insecure development default. Set JWT_SECRET in production!")
		return "flowcore_default_secret_key_2026"
	}
	return secret
}
