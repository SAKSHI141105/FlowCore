import os
import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any

try:
    from sentence_transformers import SentenceTransformer
    from sklearn.cluster import DBSCAN
    import psycopg2
    from psycopg2.extras import RealDictCursor
except ImportError:
    # Safe import warning for development environments
    print("Warning: Heavy ML dependencies are not yet installed. Please run pip install -r requirements.txt")

app = FastAPI(title="FlowCore ML Service", version="1.0.0")

# Initialize embedding model (MiniLM-L6 maps strings to 384-dimensional vector spaces)
model_name = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
encoder = None

def get_encoder():
    global encoder
    if encoder is None:
        try:
            encoder = SentenceTransformer(model_name)
        except Exception as e:
            print(f"Error loading SentenceTransformer: {e}")
    return encoder

# PostgreSQL connection string
DB_URL = os.getenv("DATABASE_URL", "host=localhost user=postgres password=postgres dbname=flowcore port=5432 sslmode=disable")

def query_db(query: str, params: tuple = ()):
    try:
        conn = psycopg2.connect(DB_URL, cursor_factory=RealDictCursor)
        cursor = conn.cursor()
        cursor.execute(query, params)
        if query.strip().upper().startswith("SELECT"):
            result = cursor.fetchall()
        else:
            conn.commit()
            result = None
        cursor.close()
        conn.close()
        return result
    except Exception as e:
        print(f"Database query error: {e}")
        return []

class PredictRequest(BaseModel):
    command: str
    session_id: str

class ErrorRequest(BaseModel):
    stderr: str

@app.post("/api/ml/predict")
def predict_next(payload: PredictRequest):
    enc = get_encoder()
    if not enc:
        raise HTTPException(status_code=500, detail="Embedding encoder unavailable")

    # Vectorize input command
    cmd_vector = enc.encode(payload.command).tolist()

    # Search for nearest neighbors using pgvector cosine distance operator (<=>)
    query = """
        SELECT command, exit_code, created_at, (embedding <=> %s::vector) as distance
        FROM commands
        ORDER BY distance ASC
        LIMIT 10
    """
    matches = query_db(query, (cmd_vector,))
    
    # Simple probability distribution
    results = []
    seen = set()
    for row in matches:
        cmd_str = row["command"].strip()
        if cmd_str not in seen and cmd_str != payload.command:
            seen.add(cmd_str)
            confidence = max(10.0, float(100.0 - (row["distance"] * 100.0)))
            results.append({
                "command": cmd_str,
                "confidence": round(confidence, 1)
            })
            if len(results) >= 5:
                break
                
    return {"predictions": results}

import urllib.request
import urllib.error
import json

def query_claude_ai(stderr_text: str) -> Dict[str, Any]:
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        return query_local_rule_classifier(stderr_text)
        
    url = "https://api.anthropic.com/v1/messages"
    headers = {
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "claude-3-haiku-20240307",
        "max_tokens": 150,
        "system": "You are the FlowCore Cognitive AI Assistant. Analyze this terminal stderr and output a concise, single-sentence resolution command or explanation to fix it. Keep it extremely brief, actionable, and formatted like: 'Run: <command>'.",
        "messages": [
            {
                "role": "user",
                "content": f"Analyze this error: {stderr_text}"
            }
        ]
    }
    
    try:
        req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers=headers)
        with urllib.request.urlopen(req, timeout=3) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            ai_text = res_data["content"][0]["text"].strip()
            return {
                "error_type": "AI Classified Failure",
                "fix_applied": ai_text,
                "confidence": 92.0,
                "source": "Anthropic Claude API"
            }
    except Exception as e:
        print(f"Claude API request failed: {e}")
        return query_local_rule_classifier(stderr_text)

def query_local_rule_classifier(stderr_text: str) -> Dict[str, Any]:
    fix_suggestion = "Verify PATH variables and check package dependencies."
    err_type = "Unresolved Error"
    
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
    elif "permission denied" in lower_stderr:
        err_type = "Permission Denied"
        fix_suggestion = "Run console command as Administrator."
        
    return {
        "error_type": err_type,
        "fix_applied": fix_suggestion,
        "confidence": 75.0,
        "source": "Rule Classifier Fallback"
    }

@app.post("/api/ml/resolve-error")
def resolve_error(payload: ErrorRequest):
    enc = get_encoder()
    if not enc:
        return query_claude_ai(payload.stderr)

    err_vector = enc.encode(payload.stderr).tolist()

    # Query the pgvector similarity in errors database table
    query = """
        SELECT error_type, fix_applied, (embedding <=> %s::vector) as distance
        FROM errors
        WHERE fix_applied IS NOT NULL
        ORDER BY distance ASC
        LIMIT 1
    """
    matches = query_db(query, (err_vector,))

    if matches and matches[0]["distance"] < 0.45:
        match = matches[0]
        confidence = float(100.0 - (match["distance"] * 100.0))
        return {
            "error_type": match["error_type"],
            "fix_applied": match["fix_applied"],
            "confidence": round(confidence, 1),
            "source": "pgvector Database"
        }
        
    # Return AI-generated response on mismatch
    return query_claude_ai(payload.stderr)

@app.post("/api/ml/mine-workflows")
def mine_workflows():
    # Fetch all commands sequentially
    query = "SELECT command FROM commands ORDER BY created_at ASC"
    rows = query_db(query)
    
    if len(rows) < 10:
        return {"suggested_workflows": []}

    commands = [row["command"].strip() for row in rows]
    enc = get_encoder()
    if not enc:
         raise HTTPException(status_code=500, detail="Embedding encoder unavailable")
         
    # Embed all commands to perform DBSCAN clustering
    embeddings = enc.encode(commands)
    
    # Run DBSCAN (eps: distance threshold, min_samples: repeat frequency)
    dbscan = DBSCAN(eps=0.25, min_samples=3, metric="cosine")
    dbscan.fit(embeddings)
    
    labels = dbscan.labels_
    clusters = {}
    
    # Collect indices of matching commands
    for idx, label in enumerate(labels):
        if label != -1: # Filter noise
            if label not in clusters:
                clusters[label] = []
            clusters[label].append(commands[idx])
            
    suggestions = []
    for label, cmds in clusters.items():
        # Get most common sequence structures
        counts = {}
        for i in range(len(cmds) - 2):
            seq = tuple(cmds[i:i+3])
            counts[seq] = counts.get(seq, 0) + 1
            
        for seq, count in counts.items():
            if count >= 3:
                suggestions.append({
                    "steps": list(seq),
                    "count": count,
                    "suggested_name": f"Cluster-{label} Sequence"
                })

    return {"suggested_workflows": suggestions}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
