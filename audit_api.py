"""FlowCore Live API Audit - tests every endpoint against the running daemon"""
import sys

try:
    import requests
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "requests", "-q"])
    import requests

BASE = "http://127.0.0.1:8000"

tests = [
    ("GET",  "/api/commands",           None),
    ("GET",  "/api/workflows",          None),
    ("GET",  "/api/errors",             None),
    ("GET",  "/api/analytics/summary",  None),
    ("GET",  "/api/analytics/heatmap",  None),
    ("GET",  "/api/analytics/velocity", None),
    ("GET",  "/",                       None),
    ("POST", "/api/errors/resolve",     {"stderr": "ModuleNotFoundError: No module named 'numpy'"}),
    ("POST", "/api/errors/resolve",     {"stderr": "npm : The term 'npm' is not recognized as the name of a cmdlet"}),
    ("POST", "/api/errors/resolve",     {"stderr": "fatal: not a git repository"}),
    ("POST", "/api/errors/resolve",     {"stderr": "PermissionError: [Errno 13] Permission denied: 'file.txt'"}),
    ("POST", "/api/errors/resolve",     {"stderr": "SyntaxError: invalid syntax"}),
    ("POST", "/api/errors/resolve",     {"stderr": "ZeroDivisionError: division by zero"}),
    ("POST", "/api/errors/resolve",     {"stderr": "Command failed: python -c \"import tensorflow\""}),
    ("POST", "/api/errors/resolve",     {"stderr": "docker : The term 'docker' is not recognized"}),
    ("POST", "/api/commands",           {"command": "git status", "cwd": "C:\\test", "exit_code": 0, "duration_ms": 100, "session_id": "audit"}),
    ("POST", "/api/workflows",          {"name": "Audit Workflow", "steps": ["git pull", "npm install", "npm run dev"]}),
]

all_ok = True
results = []

for method, path, body in tests:
    try:
        if method == "GET":
            r = requests.get(BASE + path, timeout=3)
        else:
            r = requests.post(BASE + path, json=body, timeout=3)
        ok = r.status_code < 300
        if not ok:
            all_ok = False
        tag = "OK  " if ok else "FAIL"

        # For error resolve endpoints, show what fix was returned
        extra = ""
        if path == "/api/errors/resolve" and ok:
            data = r.json()
            extra = f' | {data.get("error_type")} ({data.get("confidence")}%)'

        results.append(f"[{tag}] {method:4} {path:35} -> HTTP {r.status_code}{extra}")
    except Exception as e:
        results.append(f"[FAIL] {method:4} {path:35} -> {e}")
        all_ok = False

print()
print("=" * 75)
print("  FLOWCORE LIVE API AUDIT RESULTS")
print("=" * 75)
for r in results:
    print(r)
print("=" * 75)
print()
print("FINAL RESULT:", "ALL 17 ENDPOINTS PASSED" if all_ok else "SOME ENDPOINTS FAILED")
print()
sys.exit(0 if all_ok else 1)
