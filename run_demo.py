import os
import sys
import uuid
import json
import sqlite3
import asyncio
import subprocess
import threading
import math
from datetime import datetime
from collections import Counter, defaultdict
from typing import List, Dict, Any

try:
    from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
    from fastapi.responses import HTMLResponse, JSONResponse
    from fastapi.staticfiles import StaticFiles
    import uvicorn
except ImportError:
    print("FastAPI or Uvicorn not installed. Attempting to install required packages...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "fastapi", "uvicorn"])
    from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
    from fastapi.responses import HTMLResponse, JSONResponse
    from fastapi.staticfiles import StaticFiles
    import uvicorn

DB_PATH = "flowcore.db"

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    # Table for commands history
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS commands (
        id TEXT PRIMARY KEY,
        command TEXT NOT NULL,
        cwd TEXT,
        exit_code INTEGER,
        duration_ms INTEGER,
        session_id TEXT,
        created_at TEXT NOT NULL
    )""")
    # Table for workflows
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS workflows (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        steps TEXT NOT NULL, -- JSON string array
        trigger_count INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        last_used_at TEXT
    )""")
    # Table for error logs and fixes
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS errors (
        id TEXT PRIMARY KEY,
        command_id TEXT,
        stderr TEXT,
        error_type TEXT,
        fix_applied TEXT,
        created_at TEXT NOT NULL
    )""")
    # Table for recording sessions
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        started_at TEXT NOT NULL,
        ended_at TEXT,
        command_count INTEGER DEFAULT 0,
        recording TEXT -- JSON string of session log
    )""")
    
    # Insert some seed workflows if empty
    cursor.execute("SELECT COUNT(*) FROM workflows")
    if cursor.fetchone()[0] == 0:
        seed_workflows = [
            (str(uuid.uuid4()), "React Launch", json.dumps(["npm install", "npm run dev"]), 12, datetime.now().isoformat(), datetime.now().isoformat()),
            (str(uuid.uuid4()), "Git Sync", json.dumps(["git add .", 'git commit -m "update"', "git push"]), 45, datetime.now().isoformat(), datetime.now().isoformat()),
            (str(uuid.uuid4()), "Python Setup", json.dumps(["python -m venv venv", ".\\venv\\Scripts\\activate", "pip install -r requirements.txt"]), 5, datetime.now().isoformat(), datetime.now().isoformat()),
        ]
        cursor.executemany("INSERT INTO workflows (id, name, steps, trigger_count, created_at, last_used_at) VALUES (?, ?, ?, ?, ?, ?)", seed_workflows)
        
    # Insert seed errors and fixes
    cursor.execute("SELECT COUNT(*) FROM errors")
    if cursor.fetchone()[0] == 0:
        seed_errors = [
            (str(uuid.uuid4()), None, "ModuleNotFoundError: No module named 'numpy'", "Python Dependency Missing", "Run: pip install numpy", datetime.now().isoformat()),
            (str(uuid.uuid4()), None, "pip : The term 'pip' is not recognized as the name of a cmdlet", "Python Path Error", "Install Python and check the 'Add to PATH' option during setup.", datetime.now().isoformat()),
            (str(uuid.uuid4()), None, "npm : The term 'npm' is not recognized as the name of a cmdlet", "NPM Missing", "Install Node.js from https://nodejs.org/ and restart your terminal.", datetime.now().isoformat()),
            (str(uuid.uuid4()), None, "fatal: not a git repository (or any of the parent directories): .git", "Git Error", "Run 'git init' to initialize a git repository in this folder.", datetime.now().isoformat()),
            (str(uuid.uuid4()), None, "PermissionError: [Errno 13] Permission denied", "OS Permission Error", "Run the command as Administrator, or check folder permissions.", datetime.now().isoformat()),
        ]
        cursor.executemany("INSERT INTO errors (id, command_id, stderr, error_type, fix_applied, created_at) VALUES (?, ?, ?, ?, ?, ?)", seed_errors)

    # Insert some mock commands to populate charts
    cursor.execute("SELECT COUNT(*) FROM commands")
    if cursor.fetchone()[0] == 0:
        mock_commands = []
        commands_list = [
            ("git status", 0, 150), ("git add .", 0, 200), ("git commit -m 'wip'", 0, 350), 
            ("python run_demo.py", 1, 1200), ("pip install fastapi", 0, 4200), ("python run_demo.py", 0, 8000),
            ("dir", 0, 50), ("cd ..", 0, 20), ("npm run build", 1, 5500), ("npm install", 0, 15000),
            ("git log -n 5", 0, 180), ("docker-compose up -d", 0, 6000), ("docker ps", 0, 300)
        ]
        session_id = str(uuid.uuid4())
        # Generate history over past 7 days
        from datetime import timedelta
        for i in range(120):
            day_offset = i // 17
            hour_offset = i % 24
            cmd, code, dur = commands_list[i % len(commands_list)]
            # shift timestamps back safely using timedelta
            ts = (datetime(2026, 6, 7, hour_offset, 10) - timedelta(days=day_offset)).isoformat()
            mock_commands.append((
                str(uuid.uuid4()),
                cmd,
                "C:\\Users\\shubh\\Desktop\\Neuro-Shell",
                code,
                dur,
                session_id,
                ts
            ))
        cursor.executemany("INSERT INTO commands (id, command, cwd, exit_code, duration_ms, session_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)", mock_commands)

    conn.commit()
    conn.close()

init_db()

# --- Predictive Command & Error Recovery Algorithms (Pure Python) ---

def tokenize(text: str) -> List[str]:
    # Simple alphanumeric tokenizer
    return [word.lower() for word in text.split() if word]

def compute_cosine_similarity(text1: str, text2: str) -> float:
    # Tokenize
    tokens1 = tokenize(text1)
    tokens2 = tokenize(text2)
    if not tokens1 or not tokens2:
        return 0.0
    
    # Count frequencies
    freq1 = Counter(tokens1)
    freq2 = Counter(tokens2)
    
    # Calculate cosine similarity
    all_tokens = set(freq1.keys()).union(set(freq2.keys()))
    dot_product = sum(freq1[token] * freq2[token] for token in all_tokens)
    
    mag1 = math.sqrt(sum(val ** 2 for val in freq1.values()))
    mag2 = math.sqrt(sum(val ** 2 for val in freq2.values()))
    
    if mag1 == 0 or mag2 == 0:
        return 0.0
    return dot_product / (mag1 * mag2)

def predict_next_command(last_command: str) -> List[Dict[str, Any]]:
    """Markov chain and overlap-based prediction for next command."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT command, created_at FROM commands ORDER BY created_at ASC")
    rows = cursor.fetchall()
    conn.close()
    
    if not rows:
        return []
        
    commands = [row['command'] for row in rows]
    transitions = defaultdict(list)
    
    for i in range(len(commands) - 1):
        transitions[commands[i].strip()].append(commands[i+1].strip())
        
    last_cmd_stripped = last_command.strip()
    
    # Direct matches
    candidates = transitions.get(last_cmd_stripped, [])
    
    # If no direct transition, look for partial/similar matches using cosine similarity
    if not candidates:
        best_sim = 0.0
        best_match_cmd = None
        for cmd in transitions.keys():
            sim = compute_cosine_similarity(last_cmd_stripped, cmd)
            if sim > best_sim and sim > 0.5:
                best_sim = sim
                best_match_cmd = cmd
        if best_match_cmd:
            candidates = transitions[best_match_cmd]
            
    # Rank candidates by probability
    if candidates:
        total = len(candidates)
        counts = Counter(candidates)
        predictions = []
        for cmd, count in counts.most_common(5):
            predictions.append({
                "command": cmd,
                "confidence": round((count / total) * 100, 1)
            })
        return predictions
        
    # Global fallback: top 5 overall commands
    global_counts = Counter(commands)
    predictions = []
    total = len(commands)
    for cmd, count in global_counts.most_common(5):
        predictions.append({
            "command": cmd,
            "confidence": round((count / total) * 10, 1) # lower confidence for global defaults
        })
    return predictions

def mine_workflows_sliding_window() -> List[Dict[str, Any]]:
    """Detects sequences of 3 commands that run 3+ times."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT command FROM commands ORDER BY created_at ASC")
    commands = [row['command'].strip() for row in cursor.fetchall()]
    conn.close()
    
    window_size = 3
    sequences = []
    for i in range(len(commands) - window_size + 1):
        seq = tuple(commands[i:i+window_size])
        # avoid trivial self-loops (e.g. dir -> dir -> dir)
        if len(set(seq)) > 1:
            sequences.append(seq)
            
    counts = Counter(sequences)
    suggestions = []
    
    # Query current workflows to check for existing ones
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT steps FROM workflows")
    existing_steps = [set(json.loads(row['steps'])) for row in cursor.fetchall()]
    conn.close()
    
    for seq, count in counts.items():
        if count >= 3:
            # Check if this workflow already exists (to avoid duplicates)
            seq_set = set(seq)
            already_saved = any(seq_set == ex for ex in existing_steps)
            if not already_saved:
                suggestions.append({
                    "steps": list(seq),
                    "count": count,
                    "suggested_name": f"{seq[0].split()[0].capitalize()} Sequence"
                })
    return sorted(suggestions, key=lambda x: x['count'], reverse=True)

def find_error_fix(stderr_text: str) -> Dict[str, Any]:
    """Finds best matching error fix in SQLite using Cosine Similarity."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, stderr, error_type, fix_applied FROM errors WHERE fix_applied IS NOT NULL")
    errors_db = cursor.fetchall()
    conn.close()
    
    best_similarity = 0.0
    best_match = None
    
    for err in errors_db:
        # Match against stored stderr
        sim = compute_cosine_similarity(stderr_text, err['stderr'])
        if sim > best_similarity:
            best_similarity = sim
            best_match = err
            
    # Default threshold
    if best_similarity > 0.35 and best_match:
        return {
            "error_type": best_match["error_type"],
            "fix_applied": best_match["fix_applied"],
            "confidence": round(best_similarity * 100, 1),
            "source": "Memory"
        }
        
    # AI Fallback generator (Rule-based for common developer errors if LLM not connected)
    fix_suggestion = "Ensure dependencies are installed and the executable is in your PATH environment variable."
    err_type = "Unspecified Error"
    
    lower_stderr = stderr_text.lower()
    if "pip" in lower_stderr and "not recognized" in lower_stderr:
        err_type = "Python Path Error"
        fix_suggestion = "Run: python -m pip install <package> or re-install Python selecting 'Add to PATH'."
    elif "modulenotfounderror" in lower_stderr or "no module named" in lower_stderr:
        err_type = "Python Dependency Missing"
        pkg = stderr_text.split("named")[-1].replace("'", "").strip() if "named" in stderr_text else "<package>"
        fix_suggestion = f"Run: pip install {pkg}"
    elif "node" in lower_stderr and "not recognized" in lower_stderr:
        err_type = "NodeJS Missing"
        fix_suggestion = "Download and install Node.js from https://nodejs.org/."
    elif "unauthorizedaccess" in lower_stderr or "permission denied" in lower_stderr:
        err_type = "Permission Denied"
        fix_suggestion = "Run your console as Administrator (right click -> Run as Administrator)."
    elif "not a git repository" in lower_stderr:
        err_type = "Git Repository Missing"
        fix_suggestion = "Initialize git: run 'git init'"
    elif "npm" in lower_stderr and "not recognized" in lower_stderr:
        err_type = "Command / Typo Error"
        if "instal\r" in lower_stderr or "instal\n" in lower_stderr or " instal" in lower_stderr:
            fix_suggestion = "Typo detected! You wrote 'instal', but the correct spelling is 'npm install'. (Note: You also need to install Node.js first if npm is not found on this system)."
        else:
            fix_suggestion = "Install Node.js (which includes npm) and ensure it is added to your Environment PATH."
        
    return {
        "error_type": err_type,
        "fix_applied": fix_suggestion,
        "confidence": 85.0,
        "source": "Cognitive AI Layer"
    }


# --- FastAPI Server Setup ---

app = FastAPI(title="FlowCore Gateway")

# Serve UI static page
@app.get("/", response_class=HTMLResponse)
async def get_dashboard():
    dashboard_path = os.path.join(os.path.dirname(__file__), "templates", "dashboard.html")
    if os.path.exists(dashboard_path):
        with open(dashboard_path, "r", encoding="utf-8") as f:
            return f.read()
    else:
        return """
        <html>
            <body style="background: #0A0E1A; color: #00F5FF; font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh;">
                <h1>FlowCore Dashboard Template Missing</h1>
                <p>Please build the dashboard.html template first.</p>
            </body>
        </html>
        """

# --- REST APIs ---

@app.post("/api/commands")
def log_command(data: Dict[str, Any]):
    cmd_id = data.get("id", str(uuid.uuid4()))
    command = data.get("command")
    cwd = data.get("cwd")
    exit_code = data.get("exit_code", 0)
    duration_ms = data.get("duration_ms", 0)
    session_id = data.get("session_id", "default")
    
    if not command:
        raise HTTPException(status_code=400, detail="Command is required")
        
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO commands (id, command, cwd, exit_code, duration_ms, session_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (cmd_id, command, cwd, exit_code, duration_ms, session_id, datetime.now().isoformat())
    )
    
    # If exit code was an error, log it to errors table
    if exit_code != 0 and data.get("stderr"):
        err_id = str(uuid.uuid4())
        cursor.execute(
            "INSERT INTO errors (id, command_id, stderr, error_type, fix_applied, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (err_id, cmd_id, data["stderr"], "Runtime Error", None, datetime.now().isoformat())
        )
        
    conn.commit()
    conn.close()
    
    # Calculate predictions and suggested workflows
    predictions = predict_next_command(command)
    
    return {
        "status": "success",
        "logged_id": cmd_id,
        "predictions": predictions
    }

@app.get("/api/commands")
def get_commands(limit: int = 50):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM commands ORDER BY created_at DESC LIMIT ?", (limit,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.get("/api/workflows")
def get_workflows():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM workflows ORDER BY trigger_count DESC")
    rows = cursor.fetchall()
    conn.close()
    
    result = []
    for r in rows:
        item = dict(r)
        item["steps"] = json.loads(item["steps"])
        result.append(item)
        
    # Mine current patterns to see if we have suggestions
    suggestions = mine_workflows_sliding_window()
    
    return {
        "saved_workflows": result,
        "suggested_patterns": suggestions
    }

@app.post("/api/workflows")
def save_workflow(data: Dict[str, Any]):
    name = data.get("name")
    steps = data.get("steps")
    if not name or not steps:
        raise HTTPException(status_code=400, detail="Name and steps are required")
        
    conn = get_db()
    cursor = conn.cursor()
    w_id = str(uuid.uuid4())
    cursor.execute(
        "INSERT INTO workflows (id, name, steps, trigger_count, created_at) VALUES (?, ?, ?, ?, ?)",
        (w_id, name, json.dumps(steps), 0, datetime.now().isoformat())
    )
    conn.commit()
    conn.close()
    return {"status": "success", "id": w_id}

@app.delete("/api/workflows/{w_id}")
def delete_workflow(w_id: str):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM workflows WHERE id = ?", (w_id,))
    conn.commit()
    conn.close()
    return {"status": "success"}

@app.post("/api/workflows/trigger/{w_id}")
def trigger_workflow(w_id: str):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE workflows SET trigger_count = trigger_count + 1, last_used_at = ? WHERE id = ?", 
                   (datetime.now().isoformat(), w_id))
    cursor.execute("SELECT * FROM workflows WHERE id = ?", (w_id,))
    row = cursor.fetchone()
    conn.commit()
    conn.close()
    
    if not row:
        raise HTTPException(status_code=404, detail="Workflow not found")
        
    item = dict(row)
    item["steps"] = json.loads(item["steps"])
    return {"status": "triggered", "workflow": item}

@app.get("/api/errors")
def get_errors():
    conn = get_db()
    cursor = conn.cursor()
    # Fetch errors
    cursor.execute("""
        SELECT e.*, c.command 
        FROM errors e 
        LEFT JOIN commands c ON e.command_id = c.id 
        ORDER BY e.created_at DESC LIMIT 20
    """)
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.post("/api/errors/resolve")
def resolve_error(data: Dict[str, Any]):
    stderr = data.get("stderr")
    if not stderr:
        raise HTTPException(status_code=400, detail="stderr text is required")
    fix = find_error_fix(stderr)
    return fix

@app.post("/api/errors/fix")
def save_error_fix(data: Dict[str, Any]):
    err_id = data.get("id") or str(uuid.uuid4())
    stderr = data.get("stderr")
    error_type = data.get("error_type", "Runtime Error")
    fix_applied = data.get("fix_applied")
    
    if not stderr or not fix_applied:
        raise HTTPException(status_code=400, detail="stderr and fix_applied are required")
        
    conn = get_db()
    cursor = conn.cursor()
    # Check if exists
    cursor.execute("SELECT id FROM errors WHERE id = ?", (err_id,))
    exists = cursor.fetchone()
    if exists:
        cursor.execute(
            "UPDATE errors SET fix_applied = ?, error_type = ? WHERE id = ?",
            (fix_applied, error_type, err_id)
        )
    else:
        cursor.execute(
            "INSERT INTO errors (id, stderr, error_type, fix_applied, created_at) VALUES (?, ?, ?, ?, ?)",
            (err_id, stderr, error_type, fix_applied, datetime.now().isoformat())
        )
    conn.commit()
    conn.close()
    return {"status": "success", "id": err_id}

@app.get("/api/sessions")
def get_sessions():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, started_at, ended_at, command_count FROM sessions ORDER BY started_at DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.get("/api/sessions/{session_id}/replay")
def get_session_replay(session_id: str):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM sessions WHERE id = ?", (session_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Session not found")
    res = dict(row)
    if res["recording"]:
        res["recording"] = json.loads(res["recording"])
    else:
        res["recording"] = []
    return res


@app.post("/api/automation/generate-alias")
def generate_alias(data: Dict[str, Any]):
    name = data.get("name")
    steps = data.get("steps")
    if not name or not steps:
        raise HTTPException(status_code=400, detail="Name and steps are required")
        
    alias_name = name.lower().replace(" ", "-")
    
    ps_function = f"function Invoke-{name.replace(' ', '')} {{\n"
    ps_function += "    <#\n"
    ps_function += "    .SYNOPSIS\n"
    ps_function += "        FlowCore AI-Generated Automation Sequence\n"
    ps_function += "    .DESCRIPTION\n"
    ps_function += "        Sequence of operations captured from repeating command patterns.\n"
    ps_function += "    #>\n"
    ps_function += f"    Write-Host \"[FlowCore] Running sequence '{name}'...\" -ForegroundColor Cyan\n\n"
    
    for idx, step in enumerate(steps):
        ps_function += f"    Write-Host \"[{idx+1}/{len(steps)}] Executing: {step}\" -ForegroundColor Gray\n"
        ps_function += f"    {step}\n"
        ps_function += f"    if ($LastExitCode -ne 0 -and $null -ne $LastExitCode) {{ Write-Host \"[Error] Step failed with code $LastExitCode\" -ForegroundColor Red; return }}\n\n"
    ps_function += "}\n"
    
    ps_alias = f"Set-Alias -Name {alias_name} -Value Invoke-{name.replace(' ', '')}"
    
    bash_alias = f"alias {alias_name}='{' && '.join(steps)}'"
    
    return {
        "alias_name": alias_name,
        "powershell_code": ps_function + "\n" + ps_alias,
        "bash_code": bash_alias,
        "explanation": f"Generates a direct alias '{alias_name}' to run this workflow sequence."
    }

@app.post("/api/automation/apply-alias")
def apply_alias(data: Dict[str, Any]):
    code = data.get("code")
    if not code:
        raise HTTPException(status_code=400, detail="Code is required")
        
    profile_file = ".flowcore_profile.ps1"
    try:
        with open(profile_file, "a") as f:
            f.write("\n# AI-Generated Automation: " + datetime.now().isoformat() + "\n")
            f.write(code + "\n")
            
        return {
            "status": "success",
            "message": "Alias appended to local .flowcore_profile.ps1 profile file.",
            "instruction": "Source this profile in your current terminal: . .\\.flowcore_profile.ps1"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- Analytics APIs ---

@app.get("/api/analytics/summary")
def get_analytics_summary():
    conn = get_db()
    cursor = conn.cursor()
    
    # Total commands
    cursor.execute("SELECT COUNT(*) FROM commands")
    total_cmds = cursor.fetchone()[0]
    
    # Exit codes breakdown
    cursor.execute("SELECT exit_code, COUNT(*) FROM commands GROUP BY exit_code")
    exit_codes = dict(cursor.fetchall())
    success_count = exit_codes.get(0, 0)
    failed_count = total_cmds - success_count
    
    # Efficiency Score calculation
    # Formula: 100 - (failed_commands / total_commands * 100) - (duration penalty for debug loops)
    efficiency = 100
    if total_cmds > 0:
        err_rate = (failed_count / total_cmds) * 100
        efficiency -= err_rate * 0.5 # error rate penalty
        
    # Average duration
    cursor.execute("SELECT AVG(duration_ms) FROM commands")
    avg_dur = round(cursor.fetchone()[0] or 0.0, 1)
    
    # Most active directory
    cursor.execute("SELECT cwd, COUNT(*) as cnt FROM commands GROUP BY cwd ORDER BY cnt DESC LIMIT 1")
    cwd_row = cursor.fetchone()
    active_cwd = cwd_row['cwd'] if cwd_row else "Unknown"
    
    # Workflows run
    cursor.execute("SELECT SUM(trigger_count) FROM workflows")
    workflows_run = cursor.fetchone()[0] or 0
    
    # Command frequency chart
    cursor.execute("SELECT command, COUNT(*) as cnt FROM commands GROUP BY command ORDER BY cnt DESC LIMIT 7")
    most_used = [{"command": r[0], "count": r[1]} for r in cursor.fetchall()]
    
    conn.close()
    
    return {
        "total_commands": total_cmds,
        "success_rate": round((success_count / total_cmds * 100) if total_cmds > 0 else 100, 1),
        "efficiency_score": max(50, min(100, round(efficiency))),
        "avg_duration_ms": avg_dur,
        "most_active_cwd": active_cwd,
        "workflows_triggered": workflows_run,
        "most_used_commands": most_used,
        "recorded_errors_count": failed_count
    }

@app.get("/api/analytics/heatmap")
def get_analytics_heatmap():
    # Heatmap distribution by hour and day of week
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT created_at FROM commands")
    dates = [row[0] for row in cursor.fetchall()]
    conn.close()
    
    # Initialize 7 days x 24 hours grid
    # days: Mon=0, Tue=1, ... Sun=6
    grid = [[0 for _ in range(24)] for _ in range(7)]
    
    for d_str in dates:
        try:
            # handle timestamp formats
            dt = datetime.fromisoformat(d_str)
            day = dt.weekday()
            hour = dt.hour
            grid[day][hour] += 1
        except Exception:
            continue
            
    # Format for chart consumption
    day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    formatted = []
    for day in range(7):
        for hour in range(24):
            formatted.append({
                "day": day_names[day],
                "hour": f"{hour:02d}:00",
                "count": grid[day][hour]
            })
            
    return formatted

@app.get("/api/analytics/velocity")
def get_analytics_velocity():
    # Group commands count by date
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT substr(created_at, 1, 10) as dt, COUNT(*) as cnt FROM commands GROUP BY dt ORDER BY dt DESC LIMIT 10")
    rows = cursor.fetchall()
    conn.close()
    
    # Reverse to chronological order
    data = [{"date": r['dt'], "commands": r['cnt']} for r in reversed(rows)]
    return data


# --- WebSocket Terminal Handler ---

class TerminalManager:
    def __init__(self, websocket: WebSocket):
        self.websocket = websocket
        self.process = None
        self.session_id = str(uuid.uuid4())
        self.session_commands = []
        self.session_started = datetime.now().isoformat()
        
    def start_shell(self):
        # Spawns PowerShell in non-interactive mode but allows interactive-like stdin feeding
        self.process = subprocess.Popen(
            ["powershell.exe", "-NoLogo", "-NoExit", "-Command", "-"],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            bufsize=0,
            text=True,
            shell=True
        )
        
        # Start read threads
        threading.Thread(target=self.read_stdout, daemon=True).start()
        threading.Thread(target=self.read_stderr, daemon=True).start()
        
        # Send initial session start
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("INSERT INTO sessions (id, started_at) VALUES (?, ?)", (self.session_id, self.session_started))
        conn.commit()
        conn.close()

    def read_stdout(self):
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        while self.process and self.process.poll() is None:
            try:
                line = self.process.stdout.readline()
                if not line:
                    break
                # Send back to websocket
                loop.run_until_complete(self.websocket.send_json({
                    "type": "stdout",
                    "text": line
                }))
            except Exception as e:
                break
                
    def read_stderr(self):
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        while self.process and self.process.poll() is None:
            try:
                line = self.process.stderr.readline()
                if not line:
                    break
                loop.run_until_complete(self.websocket.send_json({
                    "type": "stderr",
                    "text": line
                }))
            except Exception as e:
                break

    def write_input(self, data: str):
        if self.process and self.process.stdin:
            self.process.stdin.write(data + "\n")
            self.process.stdin.flush()
            
    def log_command_execution(self, cmd: str, exit_code: int, duration_ms: int, stderr_log: str = None):
        cwd = os.getcwd()
        cmd_id = str(uuid.uuid4())
        
        # Log to list
        self.session_commands.append({
            "command": cmd,
            "exit_code": exit_code,
            "duration_ms": duration_ms,
            "created_at": datetime.now().isoformat()
        })
        
        # Save to database
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO commands (id, command, cwd, exit_code, duration_ms, session_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (cmd_id, cmd, cwd, exit_code, duration_ms, self.session_id, datetime.now().isoformat())
        )
        
        if exit_code != 0 and stderr_log:
            err_id = str(uuid.uuid4())
            cursor.execute(
                "INSERT INTO errors (id, command_id, stderr, error_type, fix_applied, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                (err_id, cmd_id, stderr_log, "Runtime Error", None, datetime.now().isoformat())
            )
            
        conn.commit()
        conn.close()

    def close(self):
        if self.process:
            self.process.terminate()
            
        ended_at = datetime.now().isoformat()
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE sessions SET ended_at = ?, command_count = ?, recording = ? WHERE id = ?",
            (ended_at, len(self.session_commands), json.dumps(self.session_commands), self.session_id)
        )
        conn.commit()
        conn.close()

@app.websocket("/ws/terminal")
async def websocket_terminal(websocket: WebSocket):
    await websocket.accept()
    manager = TerminalManager(websocket)
    manager.start_shell()
    
    # Send a prompt greeting
    await websocket.send_json({
        "type": "stdout",
        "text": "\r\n\x1b[1;36mFlowCore Terminal OS [Version 1.0.0]\x1b[0m\r\n"
    })
    await websocket.send_json({
        "type": "stdout",
        "text": "\x1b[35mCognitive Layer Hook active. Vector prediction engine online.\x1b[0m\r\n\r\n"
    })
    await websocket.send_json({
        "type": "stdout",
        "text": f"PS {os.getcwd()}> "
    })
    
    try:
        current_command = []
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            
            if msg["type"] == "key":
                key = msg["key"]
                
                # Check for Enter key
                if key == "\r" or key == "\n":
                    cmd_str = "".join(current_command).strip()
                    if cmd_str:
                        # Send execution to local shell
                        await websocket.send_json({"type": "stdout", "text": "\r\n"})
                        
                        start_time = datetime.now()
                        
                        # Simulate local execution for PowerShell commands
                        # Running it asynchronously using asyncio.create_subprocess_shell
                        try:
                            # Run powershell command
                            proc = await asyncio.create_subprocess_shell(
                                f"powershell.exe -Command \"{cmd_str}\"",
                                stdout=asyncio.subprocess.PIPE,
                                stderr=asyncio.subprocess.PIPE
                            )
                            stdout_bytes, stderr_bytes = await proc.communicate()
                            exit_code = proc.returncode
                            
                            stdout_str = stdout_bytes.decode('utf-8', errors='ignore')
                            stderr_str = stderr_bytes.decode('utf-8', errors='ignore')
                            
                            # Stream stdout
                            if stdout_str:
                                formatted_out = stdout_str.replace("\n", "\r\n")
                                await websocket.send_json({"type": "stdout", "text": formatted_out})
                                
                            # Stream stderr
                            if stderr_str:
                                formatted_err = f"\x1b[31m{stderr_str}\x1b[0m".replace("\n", "\r\n")
                                await websocket.send_json({"type": "stdout", "text": formatted_err})
                                
                                # Process Error Recovery Toast trigger
                                error_fix = find_error_fix(stderr_str)
                                await websocket.send_json({
                                    "type": "error_toast",
                                    "stderr": stderr_str[:200],
                                    "error_type": error_fix["error_type"],
                                    "fix_suggestion": error_fix["fix_applied"],
                                    "confidence": error_fix["confidence"]
                                })
                                
                            duration = int((datetime.now() - start_time).total_seconds() * 1000)
                            manager.log_command_execution(cmd_str, exit_code, duration, stderr_str if exit_code != 0 else None)
                            
                        except Exception as e:
                            await websocket.send_json({"type": "stdout", "text": f"\r\nExecution failed: {str(e)}\r\n"})
                            manager.log_command_execution(cmd_str, -1, 0, str(e))
                            
                        # Show Next-Command predictions in floating HUD
                        predictions = predict_next_command(cmd_str)
                        await websocket.send_json({
                            "type": "predictions",
                            "predictions": predictions
                        })
                        
                    else:
                        await websocket.send_json({"type": "stdout", "text": "\r\n"})
                        
                    current_command = []
                    await websocket.send_json({
                        "type": "stdout",
                        "text": f"PS {os.getcwd()}> "
                    })
                    
                # Check for Backspace
                elif key == "\x7f" or key == "\x08":
                    if current_command:
                        current_command.pop()
                        # Move cursor back, overwrite with space, move back again
                        await websocket.send_json({"type": "stdout", "text": "\b \b"})
                        
                        # Generate ghost predictions on current text change
                        cur_str = "".join(current_command)
                        if len(cur_str) > 1:
                            preds = predict_next_command(cur_str)
                            if preds and preds[0]["confidence"] > 35:
                                await websocket.send_json({
                                    "type": "ghost",
                                    "prediction": preds[0]["command"][len(cur_str):]
                                })
                            else:
                                await websocket.send_json({"type": "ghost", "prediction": ""})
                        else:
                            await websocket.send_json({"type": "ghost", "prediction": ""})
                            
                # Normal characters
                else:
                    current_command.append(key)
                    await websocket.send_json({"type": "stdout", "text": key})
                    
                    # Compute ghost text suggestion for fish-like autocomplete
                    cur_str = "".join(current_command)
                    if len(cur_str) > 1:
                        preds = predict_next_command(cur_str)
                        if preds and preds[0]["confidence"] > 35:
                            await websocket.send_json({
                                "type": "ghost",
                                "prediction": preds[0]["command"][len(cur_str):]
                            })
                        else:
                            await websocket.send_json({"type": "ghost", "prediction": ""})
                    else:
                        await websocket.send_json({"type": "ghost", "prediction": ""})
                        
            elif msg["type"] == "autocomplete_accept":
                pred_cmd = msg["command"]
                await websocket.send_json({"type": "stdout", "text": pred_cmd[len("".join(current_command)):]})
                current_command = list(pred_cmd)
                
    except WebSocketDisconnect:
        manager.close()
    except Exception as e:
        manager.close()


if __name__ == "__main__":
    # Ensure templates directory exists
    os.makedirs(os.path.join(os.path.dirname(__file__), "templates"), exist_ok=True)
    
    # Check if port is already in use to prevent ugly Errno 10048 stack traces
    import socket
    def is_port_in_use(port: int) -> bool:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            return s.connect_ex(('localhost', port)) == 0
            
    if is_port_in_use(8000):
        print("\n" + "="*70)
        print("🚨 ERROR: Port 8000 is already in use by another program.")
        print("This usually happens if FlowCore is already running in the background.")
        print("To fix this, please close the other terminal running FlowCore,")
        print("or run the following command in PowerShell to force-quit the stuck process:")
        print("  taskkill /F /PID (Get-NetTCPConnection -LocalPort 8000).OwningProcess")
        print("="*70 + "\n")
        sys.exit(1)
        
    print("FlowCore server starting...")
    print("Serving dashboard at: http://127.0.0.1:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000)
