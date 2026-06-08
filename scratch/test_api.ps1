$payload = @{
    command = "git status"
    cwd = "C:\Users\shubh\Desktop\Neuro-Shell"
    exit_code = 0
    duration_ms = 150
    session_id = "powershell_live_session"
    stderr = ""
}
$jsonBody = $payload | ConvertTo-Json -Compress
Write-Host "Sending payload: $jsonBody"

try {
    $client = New-Object System.Net.Http.HttpClient
    $content = New-Object System.Net.Http.StringContent($jsonBody, [System.Text.Encoding]::UTF8, "application/json")
    $response = $client.PostAsync("http://localhost:8000/api/commands", $content).Result
    
    Write-Host "Status Code: $($response.StatusCode) ($([int]$response.StatusCode))"
    $respContent = $response.Content.ReadAsStringAsync().Result
    Write-Host "Response Content: $respContent"
} catch {
    Write-Host "Error: $_"
}
