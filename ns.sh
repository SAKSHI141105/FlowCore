#!/usr/bin/env bash
# FlowCore POSIX Shell Cognitive Integration Hook (Zsh/Bash)
# Intercepts shell commands, durations, directories, and errors, shipping them to the FlowCore local daemon.

flowcore_timestamp_ms() {
    python3 -c 'import time; print(int(time.time() * 1000))' 2>/dev/null || \
    python -c 'import time; print(int(time.time() * 1000))' 2>/dev/null || \
    echo "$(date +%s)000"
}

show_flowcore_box() {
    local title="$1"
    local color="$2"
    local border_ansi=""
    local title_ansi=""
    
    if [ "$color" = "red" ]; then
        border_ansi="\033[31m"
        title_ansi="\033[1;31m"
    else
        border_ansi="\033[36m"
        title_ansi="\033[1;36m"
    fi
    
    local width=70
    local interior=$((width - 2))
    
    # Print top border
    printf "${border_ansi}+"
    for i in $(seq 1 $interior); do printf "-"; done
    printf "+\033[0m\n"
    
    # Print title
    local title_line="  $title"
    local pad=$((interior - ${#title_line}))
    printf "${border_ansi}|${title_ansi}${title_line}\033[0m"
    for i in $(seq 1 $pad); do printf " "; done
    printf "${border_ansi}|\033[0m\n"
    
    # Print divider
    printf "${border_ansi}+"
    for i in $(seq 1 $interior); do printf "-"; done
    printf "+\033[0m\n"
    
    # Print content lines
    shift 2
    for line in "$@"; do
        # Strip ANSI escape codes to calculate visible length
        local visible_line
        visible_line=$(echo -e "$line" | sed 's/\\033\[[0-9;]*m//g' | sed 's/\x1b\[[0-9;]*m//g')
        local visible_len=${#visible_line}
        
        # Word wrapping if text exceeds border width
        if [ $visible_len -gt $((interior - 4)) ]; then
            local max_len=$((interior - 4))
            local plain_text
            plain_text=$(echo -e "$line" | sed 's/\\033\[[0-9;]*m//g' | sed 's/\x1b\[[0-9;]*m//g')
            
            # Wrap plain text into chunks
            local wrapped_chunks
            wrapped_chunks=$(echo "$plain_text" | fold -s -w $max_len)
            
            # Print wrapped green lines (recovery fix)
            echo "$wrapped_chunks" | while read -r chunk; do
                if [ -n "$chunk" ]; then
                    local chunk_len=${#chunk}
                    local pad=$((interior - 2 - chunk_len))
                    printf "${border_ansi}|  \033[1;32m%s\033[0m" "$chunk"
                    for i in $(seq 1 $pad); do printf " "; done
                    printf "${border_ansi}|\033[0m\n"
                fi
            done
        else
            local pad=$((interior - 2 - visible_len))
            printf "${border_ansi}|  \033[0m%b" "$line"
            for i in $(seq 1 $pad); do printf " "; done
            printf "${border_ansi}|\033[0m\n"
        fi
    done
    
    # Print bottom border
    printf "${border_ansi}+"
    for i in $(seq 1 $interior); do printf "-"; done
    printf "+\033[0m\n"
}

ship_telemetry() {
    local cmd="$1"
    local exit_code="$2"
    local dur="$3"
    
    # Build payload using python json dumper
    local payload
    payload=$(python3 -c '
import json, sys
data = {
    "command": sys.argv[1],
    "cwd": sys.argv[2],
    "exit_code": int(sys.argv[3]),
    "duration_ms": int(sys.argv[4]),
    "session_id": "unix_live_session",
    "stderr": ""
}
print(json.dumps(data))
' "$cmd" "$PWD" "$exit_code" "$dur" 2>/dev/null || python -c '
import json, sys
data = {
    "command": sys.argv[1],
    "cwd": sys.argv[2],
    "exit_code": int(sys.argv[3]),
    "duration_ms": int(sys.argv[4]),
    "session_id": "unix_live_session",
    "stderr": ""
}
print(json.dumps(data))
' "$cmd" "$PWD" "$exit_code" "$dur" 2>/dev/null)

    if [ -z "$payload" ]; then
        return
    fi

    # Log command and fetch predictions
    local response
    response=$(curl -s --max-time 1 -X POST -H "Content-Type: application/json" -d "$payload" http://127.0.0.1:8000/api/commands 2>/dev/null)
    
    if [ "$exit_code" -eq 0 ]; then
        if [ -n "$response" ]; then
            local preds
            preds=$(echo "$response" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    for p in data.get('predictions', []):
        print(f\"{p['command']}|{p['confidence']}\")
except:
    pass
" 2>/dev/null || echo "$response" | python -c "
import sys, json
try:
    data = json.load(sys.stdin)
    for p in data.get('predictions', []):
        print(f\"{p['command']}|{p['confidence']}\")
except:
    pass
" 2>/dev/null)
            
            if [ -n "$preds" ]; then
                local lines=()
                lines+=("\033[90mNext command suggestions based on your history:\033[0m")
                lines+=("")
                while IFS= read -r pred; do
                    if [ -n "$pred" ]; then
                        local p_cmd="${pred%%|*}"
                        local p_conf="${pred##*|}"
                        local p_cmd_padded
                        p_cmd_padded=$(printf "%-40s" "$p_cmd")
                        lines+=("\033[1;36m*\033[0m \033[32m${p_cmd_padded}\033[0m \033[90m(${p_conf}% conf)\033[0m")
                    fi
                done <<< "$preds"
                show_flowcore_box "COMMAND AUTO-PREDICT" "cyan" "${lines[@]}"
            fi
        fi
    else
        # Call resolving API for non-zero exit codes
        local err_payload
        err_payload=$(python3 -c '
import json, sys
data = {"stderr": f"Command failed: {sys.argv[1]}"}
print(json.dumps(data))
' "$cmd" 2>/dev/null || python -c '
import json, sys
data = {"stderr": f"Command failed: {sys.argv[1]}"}
print(json.dumps(data))
' "$cmd" 2>/dev/null)

        local err_response
        err_response=$(curl -s --max-time 1 -X POST -H "Content-Type: application/json" -d "$err_payload" http://127.0.0.1:8000/api/errors/resolve 2>/dev/null)
        
        if [ -n "$err_response" ]; then
            local err_type
            err_type=$(echo "$err_response" | python3 -c "import sys, json; print(json.load(sys.stdin).get('error_type', ''))" 2>/dev/null || echo "$err_response" | python -c "import sys, json; print(json.load(sys.stdin).get('error_type', ''))" 2>/dev/null)
            local confidence
            confidence=$(echo "$err_response" | python3 -c "import sys, json; print(json.load(sys.stdin).get('confidence', ''))" 2>/dev/null || echo "$err_response" | python -c "import sys, json; print(json.load(sys.stdin).get('confidence', ''))" 2>/dev/null)
            local source
            source=$(echo "$err_response" | python3 -c "import sys, json; print(json.load(sys.stdin).get('source', ''))" 2>/dev/null || echo "$err_response" | python -c "import sys, json; print(json.load(sys.stdin).get('source', ''))" 2>/dev/null)
            local fix_applied
            fix_applied=$(echo "$err_response" | python3 -c "import sys, json; print(json.load(sys.stdin).get('fix_applied', ''))" 2>/dev/null || echo "$err_response" | python -c "import sys, json; print(json.load(sys.stdin).get('fix_applied', ''))" 2>/dev/null)
            
            if [ -n "$fix_applied" ]; then
                local lines=()
                lines+=("\033[1;31m[!]\033[0m \033[90mCaptured Error:\033[0m \033[1;37m${err_type}\033[0m")
                lines+=("\033[1;31m[!]\033[0m \033[90mConfidence:    \033[0m \033[1;37m${confidence}%\033[0m")
                lines+=("\033[1;31m[!]\033[0m \033[90mSource:        \033[0m \033[1;37m${source}\033[0m")
                lines+=("")
                lines+=("\033[1;33mSUGGESTED RECOVERY FIX:\033[0m")
                lines+=("\033[1;32m${fix_applied}\033[0m")
                
                show_flowcore_box "RUNTIME ERROR CAPTURED" "red" "${lines[@]}"
            fi
        fi
    fi
}

echo ""
echo -e "\033[90m----------------------------------------------------------\033[0m"
echo -e "  \033[1;36mFLOWCORE: AI-Powered Cognitive Shell Hook v1.0.0\033[0m"
echo -e "\033[90m----------------------------------------------------------\033[0m"
echo -e "\033[90mInitializing hooks...\033[0m"

# Shell detection and hook registrations
if [ -n "$ZSH_VERSION" ]; then
    flowcore_preexec() {
        flowcore_last_command="$1"
        flowcore_start_time=$(flowcore_timestamp_ms)
    }
    
    flowcore_precmd() {
        local exit_code=$?
        local end_time
        end_time=$(flowcore_timestamp_ms)
        local cmd="$flowcore_last_command"
        flowcore_last_command=""
        
        if [ -n "$cmd" ]; then
            local dur=0
            if [ -n "$flowcore_start_time" ]; then
                dur=$((end_time - flowcore_start_time))
            fi
            ship_telemetry "$cmd" "$exit_code" "$dur"
        fi
    }
    
    autoload -Uz add-zsh-hook
    add-zsh-hook preexec flowcore_preexec
    add-zsh-hook precmd flowcore_precmd
    echo -e "\033[1;32m[OK] Zsh command hooks registered.\033[0m"
elif [ -n "$BASH_VERSION" ]; then
    flowcore_prompt_command() {
        local exit_code=$?
        local end_time
        end_time=$(flowcore_timestamp_ms)
        # Fetch last command from history
        local cmd
        cmd=$(history 1 | sed 's/^[ ]*[0-9]*[ ]*//')
        
        if [ "$cmd" != "$flowcore_last_logged_cmd" ] && [ -n "$cmd" ]; then
            local dur=0
            if [ -n "$flowcore_start_time" ]; then
                dur=$((end_time - flowcore_start_time))
            fi
            ship_telemetry "$cmd" "$exit_code" "$dur"
            flowcore_last_logged_cmd="$cmd"
        fi
        flowcore_start_time=$(flowcore_timestamp_ms)
    }
    
    PROMPT_COMMAND=flowcore_prompt_command
    echo -e "\033[1;32m[OK] Bash command hooks registered.\033[0m"
else
    echo -e "\033[31m[ERROR] Unsupported shell. FlowCore requires Bash or Zsh.\033[0m"
fi

echo -e "\033[1;32mFlowCore active. Run commands to capture telemetry live!\033[0m"
echo -e "\033[90m----------------------------------------------------------\033[0m"
