# FlowCore: AI-Powered Terminal Intelligence & Workflow Optimization

FlowCore is an intelligent developer operating layer that operates directly inside native operating system terminals (Windows PowerShell, macOS Terminal, iTerm2, Linux Bash, and Zsh) rather than running as a standalone utility. It transforms traditional command-line environments into adaptive, workflow-aware engineering systems capable of learning behavior, auto-mining repetitive sequences, predicting next commands, and resolving runtime errors in real time.

---

## ⚡ Key Features

1. **Intelligent Command Predictions**: Uses local Markov Chain transition probability analysis to suggest the most likely next command as Fish-style ghost text or clean ASCII boxes directly inside your shell.
2. **Contextual Error Recovery**: Instantly intercepts non-zero exit codes and matches the `stderr` string against a local error vector database to present resolution steps (e.g., missing dependencies, wrong ports, path configurations) in clean terminal layouts.
3. **Behavioral Workflow Mining**: Runs a DBSCAN sequence-mining algorithm over command loops to automatically group repetitive command histories (like `npm install` -> `npm run dev`) into single triggered workflows.
4. **Session Replay Engine**: Logs timelines of terminal sessions, capturing durations, directories, timestamps, commands, and exit codes, allowing you to reconstruct past sessions step-by-step.
5. **Multi-Platform Shell Hooks**: Features native integrations for both Windows PowerShell (`ns.ps1`) and POSIX Zsh/Bash (`ns.sh`) with zero-latency response loops (<3ms).
6. **Premium Developer HUD**: A dashboard showing command velocity charts, workflow clustering maps, active errors, and replay timelines.

---

## 🏗️ Architecture

FlowCore is split into specialized decoupled layers:
* **Shell Integration Layer (`ns.ps1` & `ns.sh`)**: Fast prompt hooks that capture command execution durations, active directories, exit codes, and errors, shipping them to the background server.
* **Unified Daemon (`run_demo.py`)**: A zero-install background server built with FastAPI. It handles the local SQLite storage (`flowcore.db`), local Markov Chain autocompletion, error resolution searches, and hosts the HUD.
* **Go REST Backend (`backend/`)**: High-performance module configured with GORM and Fiber to scale telemetry synchronization, user sessions, and PostgreSQL databases.
* **Go Shell Agent (`shell-agent/`)**: An alternative compiled background CLI agent that handles asynchronous batch shipping of local telemetries to remote servers.
* **Next.js React HUD (`frontend/`)**: Advanced dashboard interface built with Tailwind CSS, Framer Motion, and xterm.js for viewing production analytics.

---

## 🚀 Installation & Setup

### 1. Start the Background Server
Ensure Python is installed, then launch the FastAPI server:
```bash
python run_demo.py
```
This starts the local daemon listening on port `8000` and creates the `flowcore.db` database.

### 2. Activate the Shell Hook
To bind the cognitive logger to your current shell session:

* **On Windows PowerShell**:
  ```powershell
  . .\ns.ps1
  ```
  *To load automatically on startup:* Run `notepad $PROFILE` in PowerShell and append `. C:\path\to\ns.ps1` to the end of the file.

* **On macOS / Linux (Zsh or Bash)**:
  ```bash
  source ./ns.sh
  ```
  *To load automatically on startup:* Append `source /path/to/ns.sh` to your `~/.zshrc` or `~/.bashrc` file.

### 3. Open the Developer HUD
Navigate to **`http://127.0.0.1:8000`** in your browser to inspect command velocity graphs, view suggested workflows, and replay terminal timelines.

---

## 🛠️ Verification & Test Suite

You can verify the entire local prediction engine, similarity scoring, error resolvers, and sliding window miners by running the Python test suite:
```bash
python -m unittest test_engine.py
```

---

## 🔒 Local-First & Privacy Configs

FlowCore works locally first. Your command telemetry is saved inside the local SQLite database `flowcore.db`. You can configure prediction thresholds, models, and toggle local offline fallbacks inside the **User Settings** tab of the dashboard.
