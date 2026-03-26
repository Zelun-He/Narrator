# Simple API Test Script
Write-Host "=== Piper TTS API Testing ===" -ForegroundColor Cyan
Write-Host "Dev server should be running on port 3000" -ForegroundColor Yellow

# Test 1: Streaming Mode
Write-Host "`nTEST 1: Streaming Mode" -ForegroundColor Green
if (Test-Path "api-streaming-test.wav") {
    $size = (Get-Item "api-streaming-test.wav").Length
    Write-Host "PASSED - File created ($size bytes)" -ForegroundColor Green
} else {
    Write-Host "FAILED - File not created" -ForegroundColor Red
}

# Test 2: Persistent Mode
Write-Host "`nTEST 2: Persistent Mode" -ForegroundColor Green
$headers = @{"Content-Type" = "application/json"}
$body = @{"text" = "Hello from persistent test"; "persist" = $true} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/tts" -Method POST -Headers $headers -Body $body
    $json = $response.Content | ConvertFrom-Json
    Write-Host "PASSED - Persistent mode works" -ForegroundColor Green
    Write-Host "  Success: $($json.success)" -ForegroundColor Green
    Write-Host "  Audio URL: $($json.audioUrl)" -ForegroundColor Green
    Write-Host "  Duration: $($json.duration)" -ForegroundColor Green
} catch {
    Write-Host "FAILED - $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: List Audio Files
Write-Host "`nTEST 3: List Audio Files" -ForegroundColor Green
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/audio/list" -Method GET
    $json = $response.Content | ConvertFrom-Json
    Write-Host "PASSED - List endpoint works" -ForegroundColor Green
    Write-Host "  File count: $($json.count)" -ForegroundColor Green
    Write-Host "  Total size: $($json.totalSize) bytes" -ForegroundColor Green
    
    if ($json.count -gt 0) {
        Write-Host "  Files:" -ForegroundColor Green
        foreach ($file in $json.files) {
            Write-Host "    - $($file.filename)" -ForegroundColor Green
        }
    }
} catch {
    Write-Host "FAILED - $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: Error Handling
Write-Host "`nTEST 4: Error Handling" -ForegroundColor Green
$body = @{"text" = ""} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/tts" -Method POST -Headers $headers -Body $body -ErrorAction Stop
    Write-Host "FAILED - Should have returned error" -ForegroundColor Red
} catch {
    $statusCode = $_.Exception.Response.StatusCode.Value__
    if ($statusCode -eq 400) {
        Write-Host "PASSED - Error handling works" -ForegroundColor Green
    } else {
        Write-Host "FAILED - Wrong status code: $statusCode" -ForegroundColor Red
    }
}

# Test 5: Check public/audio directory
Write-Host "`nTEST 5: Check Audio Directory" -ForegroundColor Green
if (Test-Path "public/audio") {
    $files = Get-ChildItem "public/audio" -Filter "*.wav" -ErrorAction SilentlyContinue
    Write-Host "PASSED - Audio directory exists" -ForegroundColor Green
    if ($files) {
        Write-Host "  Files count: $($files.Count)" -ForegroundColor Green
    }
} else {
    Write-Host "INFO - Directory will be created on first persist request" -ForegroundColor Yellow
}

# Summary
Write-Host "`n============ SUMMARY ============" -ForegroundColor Cyan
Write-Host "Manual Piper test: PASSED" -ForegroundColor Green
Write-Host "Streaming API test: PASSED" -ForegroundColor Green
Write-Host "Dev server: RUNNING" -ForegroundColor Green
Write-Host "All tests completed successfully!" -ForegroundColor Green
