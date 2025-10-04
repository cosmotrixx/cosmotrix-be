# Cosmotrix AI API Test Script
$baseUrl = "https://cosmotrix-ifuigoqhr-kyomotos-projects.vercel.app"

Write-Host "🧪 Testing Cosmotrix AI API Endpoints" -ForegroundColor Green
Write-Host "Base URL: $baseUrl" -ForegroundColor Cyan
Write-Host ""

# Test 1: Health Check
Write-Host "1️⃣ Testing Health Endpoint..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$baseUrl/api/health" -Method GET
    Write-Host "✅ Health Check: $($health.status)" -ForegroundColor Green
    Write-Host "   Model: $($health.model)" -ForegroundColor Gray
    Write-Host "   Memory: $($health.memory)" -ForegroundColor Gray
}
catch {
    Write-Host "❌ Health Check Failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 2: Simple Chat
Write-Host "2️⃣ Testing Simple Chat..." -ForegroundColor Yellow
try {
    $chatBody = @{
        message = "Hello! Can you tell me what you are?"
        thread_id = "test-$(Get-Random)"
    } | ConvertTo-Json

    $chatResponse = Invoke-RestMethod -Uri "$baseUrl/api/simple-chat" -Method POST -Body $chatBody -ContentType "application/json"
    Write-Host "✅ Simple Chat Response:" -ForegroundColor Green
    Write-Host "   Thread ID: $($chatResponse.thread_id)" -ForegroundColor Gray
    Write-Host "   Response: $($chatResponse.response.Substring(0, [Math]::Min(100, $chatResponse.response.Length)))..." -ForegroundColor Gray
}
catch {
    Write-Host "❌ Simple Chat Failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 3: Summarization
Write-Host "3️⃣ Testing Summarization..." -ForegroundColor Yellow
try {
    $summaryBody = @{
        message = "Artificial intelligence and machine learning are revolutionizing industries across the globe. From healthcare diagnostics to autonomous vehicles, AI systems are becoming increasingly sophisticated. Natural language processing allows computers to understand and generate human language, while computer vision enables machines to interpret visual information. The rapid advancement in AI technology is creating new opportunities and challenges for society."
        thread_id = "summary-$(Get-Random)"
    } | ConvertTo-Json

    $summaryResponse = Invoke-RestMethod -Uri "$baseUrl/api/summarize" -Method POST -Body $summaryBody -ContentType "application/json"
    Write-Host "✅ Summarization Response:" -ForegroundColor Green
    Write-Host "   Summary: $($summaryResponse.summary)" -ForegroundColor Gray
}
catch {
    Write-Host "❌ Summarization Failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 4: Code Explanation
Write-Host "4️⃣ Testing Code Explanation..." -ForegroundColor Yellow
try {
    $codeBody = @{
        message = "function quickSort(arr) { if (arr.length <= 1) return arr; const pivot = arr[0]; const left = arr.slice(1).filter(x => x < pivot); const right = arr.slice(1).filter(x => x >= pivot); return [...quickSort(left), pivot, ...quickSort(right)]; }"
        thread_id = "code-$(Get-Random)"
    } | ConvertTo-Json

    $codeResponse = Invoke-RestMethod -Uri "$baseUrl/api/code/explain" -Method POST -Body $codeBody -ContentType "application/json"
    Write-Host "✅ Code Explanation Response:" -ForegroundColor Green
    Write-Host "   Explanation: $($codeResponse.explanation.Substring(0, [Math]::Min(150, $codeResponse.explanation.Length)))..." -ForegroundColor Gray
}
catch {
    Write-Host "❌ Code Explanation Failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 5: Full Chat with Memory
Write-Host "5️⃣ Testing Full Chat with Memory..." -ForegroundColor Yellow
try {
    $threadId = "memory-test-$(Get-Random)"
    
    # First message
    $fullChatBody1 = @{
        messages = @(
            @{ role = "user"; content = "My name is Alex and I love programming." }
        )
        thread_id = $threadId
        temperature = 0.7
    } | ConvertTo-Json -Depth 3

    $fullChatResponse1 = Invoke-RestMethod -Uri "$baseUrl/api/chat" -Method POST -Body $fullChatBody1 -ContentType "application/json"
    Write-Host "✅ First Chat Message:" -ForegroundColor Green
    Write-Host "   Response: $($fullChatResponse1.response.Substring(0, [Math]::Min(100, $fullChatResponse1.response.Length)))..." -ForegroundColor Gray
    
    Start-Sleep -Seconds 2
    
    # Second message to test memory
    $fullChatBody2 = @{
        messages = @(
            @{ role = "user"; content = "What's my name and what do I love?" }
        )
        thread_id = $threadId
    } | ConvertTo-Json -Depth 3

    $fullChatResponse2 = Invoke-RestMethod -Uri "$baseUrl/api/chat" -Method POST -Body $fullChatBody2 -ContentType "application/json"
    Write-Host "✅ Memory Test Response:" -ForegroundColor Green
    Write-Host "   Response: $($fullChatResponse2.response)" -ForegroundColor Gray
}
catch {
    Write-Host "❌ Full Chat Failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

Write-Host "🎉 API Testing Complete!" -ForegroundColor Green
Write-Host "Visit the web interface at: $baseUrl" -ForegroundColor Cyan