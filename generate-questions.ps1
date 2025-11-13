# Generate questions in batches until target is reached
# Usage: .\generate-questions.ps1 [-Target 100] [-BatchSize 10]

param(
    [int]$Target = 100,
    [int]$BatchSize = 10
)

# Configuration
$ApiUrl = "https://unquizzable.unquizzable-backend.workers.dev/admin/trigger-cron"
$AdminKey = "sk_admin_7f8e9d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Quiz Question Generation Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Target: $Target questions"
Write-Host "Batch size: $BatchSize per run"
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Calculate number of runs needed
$Runs = [Math]::Ceiling($Target / $BatchSize)
Write-Host "Will run $Runs batches to reach target"
Write-Host ""

$TotalGenerated = 0
$RunNum = 0

while ($RunNum -lt $Runs) {
    $RunNum++
    $Remaining = $Target - $TotalGenerated

    # For last run, only generate remaining amount
    if ($Remaining -lt $BatchSize) {
        $CurrentBatch = $Remaining
    } else {
        $CurrentBatch = $BatchSize
    }

    Write-Host ""
    Write-Host "[$RunNum/$Runs] Generating $CurrentBatch questions..." -ForegroundColor Blue
    Write-Host "----------------------------------------"

    # Prepare request
    $Headers = @{
        "Authorization" = "Bearer $AdminKey"
        "Content-Type" = "application/json"
    }

    $Body = @{
        count = $CurrentBatch
    } | ConvertTo-Json

    try {
        # Measure time
        $Stopwatch = [System.Diagnostics.Stopwatch]::StartNew()

        # Call the API
        $Response = Invoke-RestMethod -Uri $ApiUrl -Method Post -Headers $Headers -Body $Body

        $Stopwatch.Stop()
        $TimeTaken = [math]::Round($Stopwatch.Elapsed.TotalSeconds, 2)

        # Display response
        $Response | ConvertTo-Json -Depth 5
        Write-Host ""
        Write-Host "✓ Request completed | Time: ${TimeTaken}s" -ForegroundColor Green

        # Try to parse inserted count from response
        if ($Response.inserted) {
            $TotalGenerated += $Response.inserted
            Write-Host "Progress: $TotalGenerated/$Target questions generated" -ForegroundColor Yellow
        } else {
            $TotalGenerated += $CurrentBatch
            Write-Host "Progress: ~$TotalGenerated/$Target questions (estimated)" -ForegroundColor Yellow
        }

    } catch {
        Write-Host "ERROR: Request failed!" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
        Write-Host "Waiting 10 seconds before retry..." -ForegroundColor Yellow
        Start-Sleep -Seconds 10
        $RunNum--
        continue
    }

    Write-Host "----------------------------------------"

    # Wait a bit between requests to avoid rate limiting
    if ($RunNum -lt $Runs) {
        Write-Host "Waiting 5 seconds before next batch..."
        Start-Sleep -Seconds 5
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Generation Complete!" -ForegroundColor Green
Write-Host "Total generated: $TotalGenerated questions"
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Verify in database
Write-Host "Checking database..."
Push-Location $PSScriptRoot
wrangler d1 execute unquizzable-db --remote --command "SELECT COUNT(*) as total_base, (SELECT COUNT(*) FROM question_translation) as total_translations FROM question_base"
Pop-Location

Write-Host ""
Write-Host "✓ Done!" -ForegroundColor Green
