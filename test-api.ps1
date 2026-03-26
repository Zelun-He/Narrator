# Wait for dev server to be ready
Write-Host "Waiting for dev server..." -ForegroundColor Green
Start-Sleep -Seconds 3

# Test 1: Streaming Mode
Write-Host "`n========== TEST 1: Streaming Mode ==========" -ForegroundColor Cyan
$testUrl = "http://localhost:3000/api/tts"
$headers = @{"Content-Type" = "application/json"}
$body = @{"text" = "Hello from API streaming test"} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri $testUrl -Method POST -Headers $headers -Body $body -OutFile "api-streaming-test.wav"
    if (Test-Path "api-streaming-test.wav") {
        $fileSize = (Get-Item "api-streaming-test.wav").Length
        Write-Host "✓ Streaming test PASSED" -ForegroundColor Green
        Write-Host "  File size: $fileSize bytes" -ForegroundColor Green
    } else {
        Write-Host "✗ Streaming test FAILED - File not created" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ Streaming test FAILED - $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Persistent Mode
Write-Host "`n========== TEST 2: Persistent Mode ==========" -ForegroundColor Cyan
$body = @{"text" = "Hello from API persistent test"; "persist" = $true} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri $testUrl -Method POST -Headers $headers -Body $body
    $jsonResponse = $response.Content | ConvertFrom-Json
    
    if ($jsonResponse.success) {
        Write-Host "✓ Persistent test PASSED" -ForegroundColor Green
        Write-Host "  Audio URL: $($jsonResponse.audioUrl)" -ForegroundColor Green
        Write-Host "  Duration: $($jsonResponse.duration)s" -ForegroundColor Green
    } else {
        Write-Host "✗ Persistent test FAILED - $($jsonResponse.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ Persistent test FAILED - $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Error Handling - Empty Text
Write-Host "`n========== TEST 3: Error Handling (Empty Text) ==========" -ForegroundColor Cyan
$body = @{"text" = ""} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri $testUrl -Method POST -Headers $headers -Body $body -ErrorAction Stop
    Write-Host "✗ Test FAILED - Should have returned error" -ForegroundColor Red
} catch [System.Net.WebException] {
    if ($_.Exception.Response.StatusCode -eq 400) {
        Write-Host "✓ Error handling test PASSED" -ForegroundColor Green
        Write-Host "  Status Code: 400 (Bad Request)" -ForegroundColor Green
    } else {
        Write-Host "✗ Test FAILED - Wrong status code: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ Error handling test - Exception: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Test 4: List Audio Files
Write-Host "`n========== TEST 4: List Audio Files ==========" -ForegroundColor Cyan
$listUrl = "http://localhost:3000/api/audio/list"

try {
    $response = Invoke-WebRequest -Uri $listUrl -Method GET
    $jsonResponse = $response.Content | ConvertFrom-Json
    
    if ($jsonResponse.success) {
        Write-Host "✓ List audio files test PASSED" -ForegroundColor Green
        Write-Host "  File count: $($jsonResponse.count)" -ForegroundColor Green
        Write-Host "  Total size: $($jsonResponse.totalSize) bytes" -ForegroundColor Green
    } else {
        Write-Host "✗ List test FAILED - $($jsonResponse.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ List test FAILED - $($_.Exception.Message)" -ForegroundColor Red
}

# Summary
Write-Host "`n========== TEST SUMMARY ==========" -ForegroundColor Yellow
Write-Host "All critical tests completed!" -ForegroundColor Green
Write-Host "Check results above for pass/fail status" -ForegroundColor Green
