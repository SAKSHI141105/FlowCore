# NeuroShell (FlowCore) — AI-Powered Cognitive Terminal OS Layer

**NeuroShell** (internally code-named **FlowCore**) is a next-generation AI-powered cognitive terminal operating layer that hooks directly into native operating system terminals (Windows PowerShell, macOS Terminal, iTerm2, Linux Bash, and Zsh). Rather than running as a standalone utility, it transforms your existing shell into an adaptive, self-learning co-pilot.

---

## 💡 About & Core Vision

Traditional terminals are stateless and passive. Developers execute the same commands thousands of times without automation, hit the same environment or dependency errors repeatedly, and lose valuable context when switching between the shell, documentation, and web browsers.

**NeuroShell** solves this by inserting a cognitive intelligence layer directly into the terminal prompt loop:
* **Behavioral Learning**: It observes your shell command sequences and auto-detects workflows that you run repeatedly.
* **Predictive Autocomplete**: It uses a local Markov Chain transition probability model to predict and suggest your next command inline (as ghost text) or in clean terminal suggestion overlays.
* **Contextual Error Recovery**: When a command fails, NeuroShell catches the standard error (`stderr`), parses it through a rule-based engine, and matches it against similar past solutions in a local vector-like search database to present the exact fix instantly.

---

## 🛠️ Repository & Project Architecture

The codebase contains the following files and directories:

### Shell Integrations & CLI Hooks
* [ns.ps1](file:///c:/Users/shubh/Desktop/Neuro-Shell/ns.ps1): Native Windows PowerShell integration hook. Uses `$Host.UI.RawUI.GetBufferContents` as a fallback to capture error tracebacks from native console commands (like Python exceptions) and ships telemetry asynchronously.
* [ns.sh](file:///c:/Users/shubh/Desktop/Neuro-Shell/ns.sh): Native Linux/macOS POSIX Bash & Zsh integration hook. Uses `curl` for communication, a portable `awk` word-wrapping mechanism for macOS BSD compatibility, and auto-starts the daemon in the background.

### Cognitive Services & Telemetry Collector
* [run_demo.py](file:///c:/Users/shubh/Desktop/Neuro-Shell/run_demo.py): The main FastAPI background daemon. It coordinates the local SQLite telemetry database, Markov Chain autocomplete transition matrix, sliding-window workflow mining, and cognitive error resolution rules.
* [templates/dashboard.html](file:///c:/Users/shubh/Desktop/Neuro-Shell/templates/dashboard.html): Premium dark terminal futurism HUD single-page dashboard serving analytics, workflow execution, active error details, session replays, and onboarding telemetry.
* [flowcore.db](file:///c:/Users/shubh/Desktop/Neuro-Shell/flowcore.db): Local SQLite database storing commands history, parsed sessions, mined workflows, and resolved error telemetry.

### Production Microservices (Ready to Compile)
* [backend/](file:///c:/Users/shubh/Desktop/Neuro-Shell/backend/): High-performance telemetry server written in Go using the **Fiber** framework and **GORM** for robust database interaction.
* [shell-agent/](file:///c:/Users/shubh/Desktop/Neuro-Shell/shell-agent/): Alternative compiled background CLI daemon written in Go to handle asynchronous offline buffer syncing.
* [frontend/](file:///c:/Users/shubh/Desktop/Neuro-Shell/frontend/): Complete Next.js React frontend codebase featuring Spline 3D Scene loading, framer-motion animations, and customized telemetry panels.
* [ml-service/](file:///c:/Users/shubh/Desktop/Neuro-Shell/ml-service/): Specialized ML microservice written in Python for scaling semantic cosine similarity and sequence clustering.

---

## 🧪 Verification & Automated Testing

NeuroShell includes a comprehensive, multi-tiered test suite that can be run to verify the entire system's functionality:

### Running the Tests
To run all tests and audit scripts locally, run:
```bash
# Run the core unit test engine
python test_engine.py

# Run all 65 comprehensive scenarios (simulating errors, typos, and paths)
python test_comprehensive.py

# Verify the 24 cognitive error mapping rules
python verify_rules.py

# Audit all 17 live daemon API endpoints (daemon must be running)
python audit_api.py
```

### Coverage Overview
1. [test_engine.py](file:///c:/Users/shubh/Desktop/Neuro-Shell/test_engine.py): Unit tests verifying the Markov autocomplete transition matrix, sequence mining, and basic error classification.
2. [test_comprehensive.py](file:///c:/Users/shubh/Desktop/Neuro-Shell/test_comprehensive.py): 65 comprehensive testing scenarios confirming matching accuracy for various errors (syntax error, indentation error, Git auth issues, port conflicts, NPM typos, PyPI packages).
3. [verify_rules.py](file:///c:/Users/shubh/Desktop/Neuro-Shell/verify_rules.py): Spot-checks the 24 error mapping rules of the cognitive solver engine.
4. [audit_api.py](file:///c:/Users/shubh/Desktop/Neuro-Shell/audit_api.py): Executes live HTTP requests against the FastAPI backend, verifying all 17 API endpoints function correctly with 95%+ classification confidence.
5. [crossplatform_audit.py](file:///c:/Users/shubh/Desktop/Neuro-Shell/crossplatform_audit.py): Audits platform-specific code constraints across Windows, macOS, and Linux, ensuring maximum cross-platform compatibility.

---

## 🚀 Installation & Usage

1. **Start the background daemon**:
   ```bash
   python run_demo.py
   ```
2. **Source the hook in your terminal**:
   * **Windows (PowerShell)**:
     ```powershell
     . .\ns.ps1
     ```
   * **Linux / macOS (Bash or Zsh)**:
     ```bash
     source ./ns.sh
     ```
3. **Explore the Developer HUD**:
   Open your browser to `http://localhost:8000` to access the premium control center.
