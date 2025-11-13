@echo off
REM Generate questions in batches until target is reached
REM Usage: generate-questions.bat [target_count] [batch_size]

setlocal enabledelayedexpansion

REM Configuration
set "API_URL=https://unquizzable.unquizzable-backend.workers.dev/admin/trigger-cron"
set "ADMIN_KEY=sk_admin_7f8e9d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a"

REM Parameters (with defaults)
set TARGET=%1
if "%TARGET%"=="" set TARGET=100

set BATCH_SIZE=%2
if "%BATCH_SIZE%"=="" set BATCH_SIZE=10

echo ========================================
echo Quiz Question Generation Script
echo ========================================
echo Target: %TARGET% questions
echo Batch size: %BATCH_SIZE% per run
echo ========================================
echo.

REM Calculate number of runs needed
set /a RUNS=%TARGET%/%BATCH_SIZE%
set /a REMAINDER=%TARGET% %% %BATCH_SIZE%

if %REMAINDER% GTR 0 set /a RUNS=%RUNS%+1

echo Will run %RUNS% batches to reach target
echo.

set TOTAL_GENERATED=0
set RUN_NUM=0

:loop
if %RUN_NUM% GEQ %RUNS% goto end

set /a RUN_NUM=%RUN_NUM%+1
set /a REMAINING=%TARGET%-%TOTAL_GENERATED%

REM For last run, only generate remaining amount
if %REMAINING% LSS %BATCH_SIZE% (
    set CURRENT_BATCH=%REMAINING%
) else (
    set CURRENT_BATCH=%BATCH_SIZE%
)

echo.
echo [%RUN_NUM%/%RUNS%] Generating %CURRENT_BATCH% questions...
echo ----------------------------------------

REM Call the API
curl -X POST "%API_URL%" ^
  -H "Authorization: Bearer %ADMIN_KEY%" ^
  -H "Content-Type: application/json" ^
  -d "{\"count\":%CURRENT_BATCH%}" ^
  -w "\nHTTP Status: %%{http_code}\nTime: %%{time_total}s\n"

if errorlevel 1 (
    echo ERROR: Request failed!
    echo Waiting 10 seconds before retry...
    timeout /t 10 /nobreak >nul
    goto loop
)

REM Parse response to get actual inserted count
REM Note: This is a simple approach; for production, use jq or similar
set /a TOTAL_GENERATED=%TOTAL_GENERATED%+%CURRENT_BATCH%

echo.
echo Progress: %TOTAL_GENERATED%/%TARGET% questions generated
echo ----------------------------------------

REM Wait a bit between requests to avoid rate limiting
if %RUN_NUM% LSS %RUNS% (
    echo Waiting 5 seconds before next batch...
    timeout /t 5 /nobreak >nul
)

goto loop

:end
echo.
echo ========================================
echo Generation Complete!
echo Total generated: %TOTAL_GENERATED% questions
echo ========================================
echo.

REM Verify in database
echo Checking database...
wrangler d1 execute unquizzable-db --remote --command "SELECT COUNT(*) as total_base, (SELECT COUNT(*) FROM question_translation) as total_translations FROM question_base"

endlocal
