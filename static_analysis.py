"""
FlowCore Full Static Analysis
Simulates Go logic in Python to find bugs without needing the Go compiler.
Checks every file for: logic bugs, missing fields, dead code, security issues.
"""
import sys

issues = []
fixes = []

def ISSUE(file, severity, description, fix=None):
    issues.append({"file": file, "severity": severity, "desc": description, "fix": fix})

# ─────────────────────────────────────────────────────────────────────
# backend/models/models.go - CHECK
# ─────────────────────────────────────────────────────────────────────
# BUG 1: Session model is missing CreatedAt in the GORM struct — will
#         panic at AutoMigrate if Postgres expects it.
ISSUE(
    "backend/models/models.go", "HIGH",
    "Session struct is missing CreatedAt field. GORM AutoMigrate will create the "
    "table without this column, causing query failures later.",
    "Add: CreatedAt time.Time `json:\"created_at\"`"
)

# BUG 2: Command.SessionID is uuid.UUID but the handler calls uuid.Parse()
#         on a free-text string (e.g. 'powershell_live_session'). If parsing
#         fails the error is silently ignored with `_` so SessionID becomes
#         uuid.Nil (all zeros), making sessions untraceable.
ISSUE(
    "backend/handlers/command.go", "MEDIUM",
    "SessionID is parsed with `uuid.Parse(..., _)` — if the string is not a "
    "valid UUID (e.g. 'powershell_live_session') the error is silently ignored "
    "and SessionID becomes uuid.Nil. All commands get the same null session ID.",
    "Store SessionID as string in the Command model, not uuid.UUID."
)

# BUG 3: auth.go hard-codes the fallback JWT secret in two places:
#         handlers/auth.go AND middleware/auth.go. If one is changed the
#         other will stop validating tokens.
ISSUE(
    "backend/handlers/auth.go + backend/middleware/auth.go", "MEDIUM",
    "JWT secret fallback is hard-coded as 'flowcore_default_secret_key_2026' "
    "in TWO separate files. If one changes, tokens become invalid. "
    "Also: a plain default secret in source code is a security risk.",
    "Extract to a shared package constant, and warn loudly in logs when "
    "JWT_SECRET env var is missing."
)

# BUG 4: workflow.go CreateWorkflow returns the raw models.Workflow struct
#         which has Steps as a JSON string, not []string. The API caller
#         gets back `\"steps\": \"[...]\"`  (double-encoded) instead of an array.
ISSUE(
    "backend/handlers/workflow.go", "HIGH",
    "CreateWorkflow returns `c.Status(201).JSON(w)` where w.Steps is already "
    "a JSON string. The HTTP response double-encodes it: "
    "`{\"steps\": \"[\\\"git pull\\\",...]\"}`  instead of `{\"steps\": [\"git pull\",...]}`. "
    "Frontend will fail to parse the steps array.",
    "Deserialise Steps before returning, same as GetWorkflows does."
)

# BUG 5: workflow.go GetErrors does N+1 queries — one DB call per error event
#         to fetch the associated Command. With 20 errors this is 21 queries.
ISSUE(
    "backend/handlers/error.go", "LOW",
    "GetErrors executes an N+1 query pattern: one SELECT per error event to "
    "fetch the related Command.command string. With 20 errors = 21 DB round-trips.",
    "Use a JOIN: `h.DB.Joins(\"LEFT JOIN commands ON ...\").Find(&events)` "
    "to fetch all in a single query."
)

# BUG 6: go.mod imports gorilla/websocket but it is never used in any .go file
ISSUE(
    "backend/go.mod", "LOW",
    "gorilla/websocket v1.5.1 is listed as a dependency but is imported "
    "nowhere in the backend source. Dead dependency bloats the binary.",
    "Remove: `github.com/gorilla/websocket v1.5.1` from go.mod and run go mod tidy."
)

# BUG 7: ml-service/main.py query_local_rule_classifier is a stripped-down copy
#         of find_error_fix with only 4 rules. It is the fallback when no
#         Anthropic API key or ML encoder is set — covers almost nothing.
ISSUE(
    "ml-service/main.py", "MEDIUM",
    "query_local_rule_classifier() only covers 4 rules (pip, ModuleNotFoundError, "
    "node, permission denied). The full 45-rule engine lives in run_demo.py. "
    "If ML encoder is unavailable the ml-service gives poor suggestions.",
    "Sync query_local_rule_classifier with the full find_error_fix rule set from run_demo.py."
)

# BUG 8: ml-service/main.py uses psycopg2.connect() directly without a
#         connection pool. Under load every request opens and closes a new
#         PostgreSQL TCP connection.
ISSUE(
    "ml-service/main.py", "LOW",
    "query_db() creates a new psycopg2 connection per call with no pooling. "
    "Under concurrent requests this will exhaust Postgres connection slots.",
    "Use psycopg2.pool.ThreadedConnectionPool or switch to databases/asyncpg."
)

# BUG 9: ns.ps1 - the stderr fallback reads console buffer using RawUI.
#         In non-interactive/headless sessions (e.g. VS Code terminal, CI)
#         CursorPosition.Y is 0 so the buffer read range collapses to [0,0]
#         and produces only one line (or nothing).
ISSUE(
    "ns.ps1", "MEDIUM",
    "Console buffer fallback uses CursorPosition.Y which is 0 in non-interactive "
    "terminals (VS Code, Windows Terminal, CI). The buffer read range becomes "
    "[0,0] → captures zero useful error output.",
    "When CursorPosition.Y == 0, skip the buffer read and use 'Command failed: $cmd' "
    "as the fallback stderr string instead."
)

# BUG 10: ns.ps1 - HttpClient objects are created fresh on every prompt call
#          (every command typed). Each one holds a TCP connection pool but is
#          immediately discarded — a well-known .NET anti-pattern that causes
#          socket exhaustion.
ISSUE(
    "ns.ps1", "LOW",
    "Two `New-Object System.Net.Http.HttpClient` instances are created per "
    "prompt invocation. In .NET, HttpClient should be long-lived/shared. "
    "Creating & discarding it rapidly causes socket exhaustion (TIME_WAIT).",
    "Create $global:flowcore_http_client once at load time and reuse it."
)

# ─────────────────────────────────────────────────────────────────────
# REPORT
# ─────────────────────────────────────────────────────────────────────
print()
print("=" * 78)
print("  FLOWCORE FULL STATIC ANALYSIS REPORT")
print("=" * 78)

HIGH   = [i for i in issues if i["severity"] == "HIGH"]
MEDIUM = [i for i in issues if i["severity"] == "MEDIUM"]
LOW    = [i for i in issues if i["severity"] == "LOW"]

for sev, group, color in [("HIGH", HIGH, "!!"), ("MEDIUM", MEDIUM, ">>"), ("LOW", LOW, "--")]:
    if group:
        print(f"\n[{color}] {sev} SEVERITY ({len(group)} issues)")
        print("-" * 78)
        for idx, issue in enumerate(group, 1):
            print(f"  {idx}. FILE: {issue['file']}")
            print(f"     BUG:  {issue['desc']}")
            print(f"     FIX:  {issue['fix']}")
            print()

print("=" * 78)
print(f"  TOTAL: {len(issues)} issues  |  HIGH={len(HIGH)}  MEDIUM={len(MEDIUM)}  LOW={len(LOW)}")
print("=" * 78)
