#!/bin/bash
# Generate questions in batches until target is reached
# Usage: ./generate-questions.sh [target_count] [batch_size]

# Configuration
API_URL="https://unquizzable.unquizzable-backend.workers.dev/admin/trigger-cron"
ADMIN_KEY="sk_admin_7f8e9d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a"

# Parameters (with defaults)
TARGET=${1:-100}
BATCH_SIZE=${2:-10}

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================"
echo "Quiz Question Generation Script"
echo "========================================"
echo "Target: $TARGET questions"
echo "Batch size: $BATCH_SIZE per run"
echo "========================================"
echo ""

# Calculate number of runs needed
RUNS=$(( (TARGET + BATCH_SIZE - 1) / BATCH_SIZE ))

echo "Will run $RUNS batches to reach target"
echo ""

TOTAL_GENERATED=0
RUN_NUM=0

while [ $RUN_NUM -lt $RUNS ]; do
    RUN_NUM=$((RUN_NUM + 1))
    REMAINING=$((TARGET - TOTAL_GENERATED))

    # For last run, only generate remaining amount
    if [ $REMAINING -lt $BATCH_SIZE ]; then
        CURRENT_BATCH=$REMAINING
    else
        CURRENT_BATCH=$BATCH_SIZE
    fi

    echo ""
    echo -e "${BLUE}[$RUN_NUM/$RUNS]${NC} Generating $CURRENT_BATCH questions..."
    echo "----------------------------------------"

    # Call the API and capture response
    RESPONSE=$(curl -s -X POST "$API_URL" \
      -H "Authorization: Bearer $ADMIN_KEY" \
      -H "Content-Type: application/json" \
      -d "{\"count\":$CURRENT_BATCH}" \
      -w "\n%{http_code}\n%{time_total}")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n 2 | head -n 1)
    TIME_TAKEN=$(echo "$RESPONSE" | tail -n 1)
    BODY=$(echo "$RESPONSE" | head -n -2)

    # Check for errors
    if [ "$HTTP_CODE" != "200" ]; then
        echo -e "${RED}ERROR: Request failed with HTTP $HTTP_CODE${NC}"
        echo "Response: $BODY"
        echo "Waiting 10 seconds before retry..."
        sleep 10
        RUN_NUM=$((RUN_NUM - 1))
        continue
    fi

    echo "$BODY"
    echo ""
    echo -e "${GREEN}✓${NC} HTTP Status: $HTTP_CODE | Time: ${TIME_TAKEN}s"

    # Try to parse inserted count from JSON response
    INSERTED=$(echo "$BODY" | grep -o '"inserted":[0-9]*' | grep -o '[0-9]*')

    if [ -n "$INSERTED" ]; then
        TOTAL_GENERATED=$((TOTAL_GENERATED + INSERTED))
        echo -e "${YELLOW}Progress: $TOTAL_GENERATED/$TARGET questions generated${NC}"
    else
        TOTAL_GENERATED=$((TOTAL_GENERATED + CURRENT_BATCH))
        echo -e "${YELLOW}Progress: ~$TOTAL_GENERATED/$TARGET questions (estimated)${NC}"
    fi

    echo "----------------------------------------"

    # Wait a bit between requests to avoid rate limiting
    if [ $RUN_NUM -lt $RUNS ]; then
        echo "Waiting 5 seconds before next batch..."
        sleep 5
    fi
done

echo ""
echo "========================================"
echo -e "${GREEN}Generation Complete!${NC}"
echo "Total generated: $TOTAL_GENERATED questions"
echo "========================================"
echo ""

# Verify in database
echo "Checking database..."
cd "$(dirname "$0")"
wrangler d1 execute unquizzable-db --remote --command "SELECT COUNT(*) as total_base, (SELECT COUNT(*) FROM question_translation) as total_translations FROM question_base"

echo ""
echo -e "${GREEN}✓ Done!${NC}"
