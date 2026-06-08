# FlowCore PowerShell Cognitive Integration Hook
# Intercepts shell commands, durations, directories, and errors, shipping them to the FlowCore local daemon.

# Load System.Net.Http assembly to ensure HttpClient is available
try {
    Add-Type -AssemblyName System.Net.Http
} catch {
    # Fallback for systems where Add-Type fails
}

$global:flowcore_last_command = $null
$global:flowcore_start_time = $null

# Helper function to render a clean, professional, non-flashy ASCII box with inline color tags
function Show-FlowCoreBox {
    param(
        [string]$Title,
        [string[]]$Lines,
        [string]$Color = "DarkCyan",
        [string]$TitleColor = "White"
    )

    $boxWidth = 70
    $interiorWidth = $boxWidth - 2 # 68

    # Internal helper functions for line wrapping
    function Wrap-PlainText {
        param([string]$Text, [int]$MaxLen)
        if ($Text.Length -le $MaxLen) { return @($Text) }
        $chunks = @()
        $remaining = $Text
        while ($remaining.Length -gt 0) {
            if ($remaining.Length -le $MaxLen) {
                $chunks += $remaining
                $remaining = ""
            } else {
                $wrapIdx = $remaining.Substring(0, $MaxLen).LastIndexOf(" ")
                if ($wrapIdx -gt 10) {
                    $chunks += $remaining.Substring(0, $wrapIdx)
                    $remaining = $remaining.Substring($wrapIdx + 1)
                } else {
                    $chunks += $remaining.Substring(0, $MaxLen)
                    $remaining = $remaining.Substring($MaxLen)
                }
            }
        }
        return $chunks
    }

    function Wrap-TaggedLine {
        param([string]$Line, [int]$MaxLen)
        $visibleText = $Line -replace "<[^>]+>", ""
        if ($visibleText.Length -le $MaxLen) {
            return @($Line)
        }
        if ($Line -match "^<(yellow|red|green|cyan|gray|white|darkcyan|darkred|bold)>(.*?)</\1>$") {
            $tag = $Matches[1]
            $content = $Matches[2]
            $wrappedChunks = Wrap-PlainText -Text $content -MaxLen $MaxLen
            $result = @()
            foreach ($chunk in $wrappedChunks) {
                $result += "<$tag>$chunk</$tag>"
            }
            return $result
        } else {
            return Wrap-PlainText -Text $Line -MaxLen $MaxLen
        }
    }

    # Pre-wrap lines to fit interior width
    $wrappedLines = @()
    foreach ($line in $Lines) {
        $wrappedLines += Wrap-TaggedLine -Line $line -MaxLen ($interiorWidth - 4)
    }

    # Top border
    Write-Host ("+" + ("-" * $interiorWidth) + "+") -ForegroundColor $Color

    # Title line (bold)
    $titleText = "  $Title"
    if ($titleText.Length -gt ($interiorWidth - 2)) {
        $titleText = $titleText.Substring(0, $interiorWidth - 2)
    }
    
    Write-Host "|" -NoNewline -ForegroundColor $Color
    Write-Host "$([char]27)[1m$titleText$([char]27)[0m" -NoNewline -ForegroundColor $TitleColor
    $titlePadding = $interiorWidth - $titleText.Length
    if ($titlePadding -gt 0) {
        Write-Host (" " * $titlePadding) -NoNewline
    }
    Write-Host "|" -ForegroundColor $Color

    # Divider
    Write-Host ("+" + ("-" * $interiorWidth) + "+") -ForegroundColor $Color

    # Content lines
    foreach ($line in $wrappedLines) {
        # Render left border
        Write-Host "|" -NoNewline -ForegroundColor $Color
        Write-Host "  " -NoNewline
        
        # Split string by tags, e.g. <color>text</color>
        $parts = [regex]::Split($line, "(<[^>]+>.*?</[^>]+>)")
        $visibleLength = 2 # for the leading spaces "  "
        
        foreach ($part in $parts) {
            if ($part -match "<(yellow|red|green|cyan|gray|white|darkcyan|darkred|bold)>(.*?)</\1>") {
                $tag = $Matches[1]
                $text = $Matches[2]
                
                $fg = "White"
                $bold = $false
                
                switch ($tag) {
                    "yellow"   { $fg = "Yellow" }
                    "red"      { $fg = "Red" }
                    "green"    { $fg = "Green" }
                    "cyan"     { $fg = "Cyan" }
                    "gray"     { $fg = "Gray" }
                    "white"    { $fg = "White" }
                    "darkcyan" { $fg = "DarkCyan" }
                    "darkred"  { $fg = "DarkRed" }
                    "bold"     { $fg = "White"; $bold = $true }
                }
                
                if ($bold) {
                    Write-Host "$([char]27)[1m$text$([char]27)[0m" -NoNewline -ForegroundColor $fg
                } else {
                    Write-Host $text -NoNewline -ForegroundColor $fg
                }
                
                $visibleLength += $text.Length
            } else {
                # Plain text
                Write-Host $part -NoNewline -ForegroundColor White
                $visibleLength += $part.Length
            }
        }
        
        # Pad remaining space
        $padding = $interiorWidth - $visibleLength
        if ($padding -gt 0) {
            Write-Host (" " * $padding) -NoNewline
        }
        
        # Render right border
        Write-Host "|" -ForegroundColor $Color
    }

    # Bottom border
    Write-Host ("+" + ("-" * $interiorWidth) + "+") -ForegroundColor $Color
}

# Auto-start FlowCore Daemon if not running
$port = 8000
$isPortOpen = $false
try {
    $client = New-Object System.Net.Sockets.TcpClient("127.0.0.1", $port)
    if ($client.Connected) {
        $isPortOpen = $true
        $client.Close()
    }
} catch {
    $isPortOpen = $false
}

if (-not $isPortOpen) {
    Write-Host "FlowCore Daemon is offline. Starting background service silently..." -ForegroundColor Gray
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    $pythonExec = if (Get-Command "pythonw" -ErrorAction SilentlyContinue) { "pythonw" } else { "python" }
    Start-Process -FilePath $pythonExec -ArgumentList "$scriptDir\run_demo.py" -WindowStyle Hidden -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

Write-Host ""
Write-Host "----------------------------------------------------------" -ForegroundColor Gray
Write-Host "  FLOWCORE: AI-Powered Cognitive Shell Hook v1.0.0" -ForegroundColor DarkCyan
Write-Host "----------------------------------------------------------" -ForegroundColor Gray
Write-Host "Initializing hooks..." -ForegroundColor Gray

# 1. PSReadLine Command Handler
# Fires the moment Enter is pressed, capturing the command line and start timestamp.
try {
    $null = Get-Module -Name PSReadLine -ErrorAction SilentlyContinue
    Set-PSReadLineOption -AddToHistoryHandler {
        param($line)
        $global:flowcore_last_command = $line
        $global:flowcore_start_time = Get-Date
        try { $error.Clear() } catch {}
        return $true # Continue adding to PSReadLine history normally
    }
    Write-Host "[OK] PSReadLine command listener registered." -ForegroundColor Green
} catch {
    Write-Host "[WARNING] PSReadLine module not found. Capture will fall back to prompt history." -ForegroundColor Yellow
}

# 2. Prompt Interceptor
# Replaces prompt function to calculate duration, exit codes, and retrieve stderr details.
if ($null -eq (Get-Command -Name original_prompt -ErrorAction SilentlyContinue)) {
    # Check if a custom prompt exists, write it as original_prompt
    if (Test-Path Function:\prompt) {
        $originalPromptScript = Get-Content Function:\prompt
        Set-Item -Path Function:\original_prompt -Value $originalPromptScript
    } else {
        # Default prompt fallback
        function original_prompt { "PS $((Get-Location).Path)> " }
    }
}

function prompt {
    $last_exit = $?
    $last_code = $global:LastExitCode
    $curr_time = Get-Date
    
    # Calculate execution time
    $dur = 0
    if ($global:flowcore_start_time -ne $null) {
        $dur = [int]((New-TimeSpan -Start $global:flowcore_start_time -End $curr_time).TotalMilliseconds)
    }
    
    # Capture command details
    $cmd = $global:flowcore_last_command
    if ($null -eq $cmd -or $cmd -eq "") {
        # Slower fallback: fetch from standard PS history
        $hist = Get-History -Count 1
        if ($hist) {
            $cmd = $hist.CommandLine
            $dur = [int]($hist.EndExecutionTime - $hist.StartExecutionTime).TotalMilliseconds
        }
    }
    
    # Reset tracking variables
    $global:flowcore_last_command = $null
    $global:flowcore_start_time = $null
    
    # Process and ship telemetry if a command was run
    if ($null -ne $cmd -and $cmd.Trim() -ne "") {
        $exit_code = 0
        $stderr_text = ""
        
        # If command failed
        if (-not $last_exit) {
            $exit_code = if ($null -ne $last_code) { $last_code } else { 1 }
            # Extract last error message
            if ($error.Count -gt 0) {
                $stderr_text = $error[0].ToString()
            }
        }
        
        # Build telemetry payload
        $payload = @{
            command = $cmd
            cwd = (Get-Location).Path
            exit_code = $exit_code
            duration_ms = $dur
            session_id = "powershell_live_session"
            stderr = $stderr_text
        }
        
        # Convert to JSON representation
        $jsonBody = $payload | ConvertTo-Json -Compress
        
        # Call API to log command and fetch predictions
        try {
            # Use HttpClientHandler with UseProxy=$false to bypass auto-proxy detection (makes call <5ms)
            $handler = New-Object System.Net.Http.HttpClientHandler
            $handler.UseProxy = $false
            $client = New-Object System.Net.Http.HttpClient($handler)
            $client.Timeout = [System.TimeSpan]::FromMilliseconds(1000)
            $content = New-Object System.Net.Http.StringContent($jsonBody, [System.Text.Encoding]::UTF8, "application/json")
            
            $postTask = $client.PostAsync("http://127.0.0.1:8000/api/commands", $content)
            if ($postTask.Wait(1000)) {
                $response = $postTask.Result
                if ($response.IsSuccessStatusCode) {
                    $readTask = $response.Content.ReadAsStringAsync()
                    if ($readTask.Wait(500)) {
                        $jsonStr = $readTask.Result
                        $res = ConvertFrom-Json $jsonStr
                        
                        # Show predictions if successful command and predictions exist
                        if ($exit_code -eq 0 -and $null -ne $res -and $null -ne $res.predictions -and $res.predictions.Count -gt 0) {
                            $predLines = @()
                            $predLines += "<gray>Next command suggestions based on your history:</gray>"
                            $predLines += ""
                            foreach ($pred in $res.predictions) {
                                $confText = "$($pred.confidence)%"
                                $predLines += "<cyan>*</cyan> <green>$($pred.command.PadRight(40))</green> <gray>($confText conf)</gray>"
                            }
                            Show-FlowCoreBox -Title "COMMAND AUTO-PREDICT" -Lines $predLines -Color "DarkCyan" -TitleColor "Cyan"
                        }
                    }
                }
            }
        } catch {
            # Silently ignore connection failures if daemon server is offline
        }

        # Process and resolve error if the command failed
        if ($exit_code -ne 0) {
            # Fallback if no specific stderr text in variable
            $search_stderr = $stderr_text
            if ($null -eq $search_stderr -or $search_stderr.Trim() -eq "") {
                $search_stderr = "Command failed: $cmd"
            }

            $errPayload = @{
                stderr = $search_stderr
            }
            $errJson = $errPayload | ConvertTo-Json -Compress

            try {
                $handler = New-Object System.Net.Http.HttpClientHandler
                $handler.UseProxy = $false
                $client = New-Object System.Net.Http.HttpClient($handler)
                $client.Timeout = [System.TimeSpan]::FromMilliseconds(1000)
                $errContent = New-Object System.Net.Http.StringContent($errJson, [System.Text.Encoding]::UTF8, "application/json")

                $postTask = $client.PostAsync("http://127.0.0.1:8000/api/errors/resolve", $errContent)
                if ($postTask.Wait(1000)) {
                    $response = $postTask.Result
                    if ($response.IsSuccessStatusCode) {
                        $readTask = $response.Content.ReadAsStringAsync()
                        if ($readTask.Wait(500)) {
                            $resJson = $readTask.Result
                            $fixData = ConvertFrom-Json $resJson
                            if ($null -ne $fixData -and $null -ne $fixData.fix_applied) {
                                $errLines = @()
                                $errLines += "<red>[!]</red> <gray>Captured Error:</gray> <white>$($fixData.error_type)</white>"
                                $errLines += "<red>[!]</red> <gray>Confidence:    </gray> <white>$($fixData.confidence)%</white>"
                                $errLines += "<red>[!]</red> <gray>Source:        </gray> <white>$($fixData.source)</white>"
                                $errLines += ""
                                $errLines += "<yellow>SUGGESTED RECOVERY FIX:</yellow>"
                                $errLines += "<green>$($fixData.fix_applied)</green>"
                                Show-FlowCoreBox -Title "RUNTIME ERROR CAPTURED" -Lines $errLines -Color "DarkRed" -TitleColor "Red"
                            }
                        }
                    }
                }
            } catch {
                # Silently ignore connection failures if daemon server is offline
            }
        }
    }
    
    # Render the original prompt interface
    original_prompt
}

Write-Host "[OK] Prompt completion listener registered." -ForegroundColor Green
Write-Host "FlowCore active. Run commands to capture telemetry live!" -ForegroundColor Green
Write-Host "----------------------------------------------------------" -ForegroundColor Gray
