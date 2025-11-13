# Question Generation Scripts

Scripts to bulk-generate quiz questions by repeatedly calling the cron endpoint.

## Files

- `generate-questions.bat` - Windows batch script (CMD)
- `generate-questions.ps1` - PowerShell script (Windows PowerShell/PowerShell Core)
- `generate-questions.sh` - Bash script (Linux/Mac/WSL)

## Usage

### Windows CMD

```cmd
cd quiz-app-backend

# Generate 100 questions (default: 10 per batch)
generate-questions.bat

# Generate 500 questions with 20 per batch
generate-questions.bat 500 20

# Generate 50 questions with 5 per batch
generate-questions.bat 50 5
```

### PowerShell

```powershell
cd quiz-app-backend

# Generate 100 questions (default: 10 per batch)
.\generate-questions.ps1

# Generate 500 questions with 20 per batch
.\generate-questions.ps1 -Target 500 -BatchSize 20

# Generate 50 questions with 5 per batch
.\generate-questions.ps1 -Target 50 -BatchSize 5

# Or using positional parameters
.\generate-questions.ps1 500 20
```

### Linux/Mac/WSL (Bash)

```bash
cd quiz-app-backend

# Make executable (first time only)
chmod +x generate-questions.sh

# Generate 100 questions (default: 10 per batch)
./generate-questions.sh

# Generate 500 questions with 20 per batch
./generate-questions.sh 500 20

# Generate 50 questions with 5 per batch
./generate-questions.sh 50 5
```

## Parameters

1. **TARGET_COUNT** (default: 100)
   - Total number of base questions to generate
   - Each base question includes 3 translations (en, ru, es)
   - Total translations = TARGET_COUNT × 3

2. **BATCH_SIZE** (default: 10)
   - Number of questions per API call
   - Smaller batches = more reliable, but slower
   - Larger batches = faster, but may timeout

## Features

- ✅ **Progress tracking** - Shows current progress after each batch
- ✅ **Error handling** - Retries failed requests automatically
- ✅ **Rate limiting** - Waits 5 seconds between batches
- ✅ **Database verification** - Checks final count after completion
- ✅ **Colored output** (PowerShell and bash) - Easy to read status

## Examples

### Quick test (10 questions)
```cmd
# CMD
generate-questions.bat 10 10

# PowerShell
.\generate-questions.ps1 -Target 10 -BatchSize 10
```

### Medium batch (100 questions, ~10-15 minutes)
```cmd
# CMD
generate-questions.bat 100 10

# PowerShell
.\generate-questions.ps1 -Target 100 -BatchSize 10
```

### Large batch (500 questions, ~1 hour)
```cmd
# CMD
generate-questions.bat 500 20

# PowerShell
.\generate-questions.ps1 -Target 500 -BatchSize 20
```

### Overnight run (2000 questions, ~3-4 hours)
```cmd
# CMD
generate-questions.bat 2000 25

# PowerShell
.\generate-questions.ps1 -Target 2000 -BatchSize 25
```

## Time Estimates

- **10 questions**: ~30-40 seconds per batch
- **100 questions**: ~10-15 minutes (10 batches)
- **500 questions**: ~50-60 minutes (50 batches)
- **1000 questions**: ~2 hours (100 batches)

## Output

Each successful batch will show:
```json
{
  "ok": true,
  "requested": 10,
  "parsed": 30,
  "inserted": 10,
  "complete": 10,
  "incomplete": 0
}
```

- **requested**: Number of base questions requested
- **parsed**: Total items parsed (base × 3 languages)
- **inserted**: Actual base questions inserted
- **complete**: Questions with all 3 translations
- **incomplete**: Questions skipped due to missing translations

## Troubleshooting

### Script hangs
- Check your internet connection
- Verify API endpoint is accessible
- Try smaller batch sizes

### "ERROR: Request failed"
- Check ADMIN_KEY is correct in the script
- Verify worker is deployed: `wrangler deployments list`
- Check logs: `wrangler tail`

### Fewer questions than expected
- Some questions may be duplicates (automatically skipped)
- Check logs for "Skipped: X duplicates, Y incomplete"

### OpenAI rate limits
- Reduce BATCH_SIZE to 5-10
- Add longer waits between batches (increase sleep time)

## Cost Estimation

Approximate costs per 100 base questions (300 total with translations):

- **Generation** (gpt-4o-mini): ~$0.15-0.30
- **Translation** (gpt-3.5-turbo): ~$0.01-0.02
- **Total per 100**: ~$0.20

For 10,000 questions: ~$20
For 100,000 questions: ~$200
