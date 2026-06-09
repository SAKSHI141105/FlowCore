package main

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"sync"
	"syscall"
	"time"

	"github.com/spf13/cobra"
)

type TelemetryPayload struct {
	Command    string    `json:"command"`
	Cwd        string    `json:"cwd"`
	ExitCode   int       `json:"exit_code"`
	DurationMs int       `json:"duration_ms"`
	SessionID  string    `json:"session_id"`
	Stderr     string    `json:"stderr"`
	CreatedAt  time.Time `json:"created_at"`
}

var (
	bufferMutex sync.Mutex
	bufferFile  string
	serverURL   string
	jwtToken    string
)

func init() {
	home, err := os.UserHomeDir()
	if err != nil {
		home = "."
	}
	bufferFile = filepath.Join(home, ".flowcore_buffer.json")
}

// readBuffer reads all buffered events from disk
func readBuffer() ([]TelemetryPayload, error) {
	bufferMutex.Lock()
	defer bufferMutex.Unlock()

	if _, err := os.Stat(bufferFile); os.IsNotExist(err) {
		return []TelemetryPayload{}, nil
	}

	data, err := os.ReadFile(bufferFile)
	if err != nil {
		return nil, err
	}

	var list []TelemetryPayload
	if err := json.Unmarshal(data, &list); err != nil {
		return []TelemetryPayload{}, nil // return empty on corrupt json
	}
	return list, nil
}

// writeBuffer saves events list back to disk
func writeBuffer(list []TelemetryPayload) error {
	bufferMutex.Lock()
	defer bufferMutex.Unlock()

	data, err := json.MarshalIndent(list, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(bufferFile, data, 0644)
}

// appendToBuffer locks and appends a single event to the persistent file
func appendToBuffer(payload TelemetryPayload) {
	list, err := readBuffer()
	if err != nil {
		list = []TelemetryPayload{}
	}
	list = append(list, payload)
	writeBuffer(list)
}

// sendEventToServer attempts to POST a single command log to the API
func sendEventToServer(event TelemetryPayload) bool {
	body, err := json.Marshal(event)
	if err != nil {
		return false
	}

	client := http.Client{Timeout: 1 * time.Second}
	req, err := http.NewRequest("POST", serverURL+"/api/commands", bytes.NewBuffer(body))
	if err != nil {
		return false
	}

	req.Header.Set("Content-Type", "application/json")
	if jwtToken != "" {
		req.Header.Set("Authorization", "Bearer "+jwtToken)
	}

	resp, err := client.Do(req)
	if err != nil {
		return false
	}
	defer resp.Body.Close()

	return resp.StatusCode == http.StatusCreated || resp.StatusCode == http.StatusOK
}

// batchSyncWorker polls the buffer file and flushes matches when online
func batchSyncWorker() {
	ticker := time.NewTicker(15 * time.Second)
	for range ticker.C {
		list, err := readBuffer()
		if err != nil || len(list) == 0 {
			continue
		}

		unsent := []TelemetryPayload{}
		syncedCount := 0

		for _, item := range list {
			// Try to ship event
			if sendEventToServer(item) {
				syncedCount++
			} else {
				unsent = append(unsent, item)
			}
		}

		if syncedCount > 0 {
			fmt.Printf("[Sync] Flushed %d events to API. Remaining in buffer: %d\n", syncedCount, len(unsent))
			writeBuffer(unsent)
		}
	}
}

func main() {
	var sessionID string
	var cwd string
	var exitCode int
	var duration int
	var stderr string

	var rootCmd = &cobra.Command{
		Use:   "flowcore-agent [command string]",
		Short: "Logs command events to local daemon or central server",
		Args:  cobra.MinimumNArgs(1),
		Run: func(cmd *cobra.Command, args []string) {
			commandStr := args[0]
			payload := TelemetryPayload{
				Command:    commandStr,
				Cwd:        cwd,
				ExitCode:   exitCode,
				DurationMs: duration,
				SessionID:  sessionID,
				Stderr:     stderr,
				CreatedAt:  time.Now(),
			}

			// Try to connect to background TCP daemon listener (fast path: <1ms)
			conn, err := net.Dial("tcp", "127.0.0.1:8088")
			if err == nil {
				defer conn.Close()
				data, _ := json.Marshal(payload)
				conn.Write(append(data, '\n'))
				os.Exit(0)
			}

			// Daemon is offline, write directly to local JSON buffer
			appendToBuffer(payload)
			os.Exit(0)
		},
	}

	// Daemon mode command
	var daemonCmd = &cobra.Command{
		Use:   "daemon",
		Short: "Launches background log buffering agent listener",
		Run: func(cmd *cobra.Command, args []string) {
			fmt.Println("Starting FlowCore background agent on TCP port 8088...")
			listener, err := net.Listen("tcp", "127.0.0.1:8088")
			if err != nil {
				fmt.Printf("Fatal: Failed to start TCP daemon: %v\n", err)
				os.Exit(1)
			}
			defer listener.Close()

			// Start background syncer to periodically POST buffered items to API
			go batchSyncWorker()

			// Handle exit signals — os.Interrupt handles Ctrl+C on Windows (SIGTERM is no-op there)
			sigChan := make(chan os.Signal, 1)
			signal.Notify(sigChan, os.Interrupt, syscall.SIGINT, syscall.SIGTERM)
			go func() {
				<-sigChan
				fmt.Println("\nStopping agent daemon...")
				listener.Close()
				os.Exit(0)
			}()

			for {
				conn, err := listener.Accept()
				if err != nil {
					continue
				}

				go func(c net.Conn) {
					defer c.Close()
					reader := bufio.NewReader(c)
					data, err := reader.ReadBytes('\n')
					if err != nil && err != io.EOF {
						return
					}

					var payload TelemetryPayload
					if err := json.Unmarshal(data, &payload); err == nil {
						appendToBuffer(payload)
					}
				}(conn)
			}
		},
	}

	rootCmd.PersistentFlags().StringVar(&serverURL, "server", "http://localhost:8000", "Central gateway URL")
	rootCmd.PersistentFlags().StringVar(&jwtToken, "token", "", "JWT Authentication bearer token")
	
	rootCmd.Flags().StringVarP(&sessionID, "session", "i", "agent_session", "Target tracking session ID")
	rootCmd.Flags().StringVarP(&cwd, "cwd", "c", "", "Current working directory")
	rootCmd.Flags().IntVarP(&exitCode, "exit", "e", 0, "Last command exit status code")
	rootCmd.Flags().IntVarP(&duration, "duration", "d", 0, "Command duration in milliseconds")
	rootCmd.Flags().StringVarP(&stderr, "stderr", "x", "", "Command stderr output")

	rootCmd.AddCommand(daemonCmd)

	if err := rootCmd.Execute(); err != nil {
		os.Exit(1)
	}
}
