#!/usr/bin/env bash
# Test the break-task edge function against the live Supabase project.
#
# Usage:
#   ./test.sh <email> <password>
#
# The script signs in, grabs a JWT, then runs three test scenarios:
#   1. Clear task  → should return subtasks immediately
#   2. Vague task  → should ask a clarifying question
#   3. Multi-turn  → sends the initial vague message + a clarifying reply,
#                    should return subtasks on the second call

set -euo pipefail

SUPABASE_URL="https://zcandnsadkibuenvypdu.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjYW5kbnNhZGtpYnVlbnZ5cGR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1NTM3ODksImV4cCI6MjA5MTEyOTc4OX0.wwdi0XI67DJSy6o7bAB8GLYTNhxmfAaifYTfKQCxQdo"
FUNC_URL="${SUPABASE_URL}/functions/v1/break-task"

EMAIL="${1:-}"
PASSWORD="${2:-}"

if [[ -z "$EMAIL" || -z "$PASSWORD" ]]; then
  echo "Usage: $0 <email> <password>"
  exit 1
fi

# ── Sign in ────────────────────────────────────────────────────────────────────
echo "→ Signing in as $EMAIL…"
AUTH_RESP=$(curl -s -X POST \
  "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
  -H "apikey: ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}")

JWT=$(echo "$AUTH_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('access_token',''))" 2>/dev/null)

if [[ -z "$JWT" ]]; then
  echo "✗ Sign-in failed. Response:"
  echo "$AUTH_RESP" | python3 -m json.tool 2>/dev/null || echo "$AUTH_RESP"
  exit 1
fi
echo "✓ Signed in"
echo ""

# ── Helper ─────────────────────────────────────────────────────────────────────
call() {
  local label="$1"
  local payload="$2"
  echo "── $label ──────────────────────────────────"
  echo "Request:"
  echo "$payload" | python3 -m json.tool
  echo ""
  echo "Response:"
  curl -s -X POST "$FUNC_URL" \
    -H "Authorization: Bearer ${JWT}" \
    -H "Content-Type: application/json" \
    -d "$payload" | python3 -m json.tool
  echo ""
}

# ── Test 1: Clear task → expect subtasks right away ───────────────────────────
call "1. Clear task (should return subtasks)" \
  '{"taskName":"Write a weekly team update email","taskMinutes":20}'

# ── Test 2: Vague task → expect a clarifying question ─────────────────────────
call "2. Vague task (should ask a question)" \
  '{"taskName":"Do the thing","taskMinutes":45}'

# ── Test 3: Multi-turn — vague → answer → subtasks ────────────────────────────
# Step A: send the vague task, get back a question
echo "── 3a. Multi-turn: first call (vague task) ─────────────────"
STEP_A_RESP=$(curl -s -X POST "$FUNC_URL" \
  -H "Authorization: Bearer ${JWT}" \
  -H "Content-Type: application/json" \
  -d '{"taskName":"Prepare for the presentation","taskMinutes":60}')
echo "Response A:"
echo "$STEP_A_RESP" | python3 -m json.tool
echo ""

QUESTION=$(echo "$STEP_A_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('question',''))" 2>/dev/null)
echo "AI asked: $QUESTION"
echo ""

# Step B: reply with context, send full history back
HISTORY='[
  {"role":"user","content":"Task: \"Prepare for the presentation\" (estimated 60 minutes)\n\nHelp me break this down."},
  {"role":"assistant","content":"'"$(echo "$STEP_A_RESP" | python3 -c "import sys,json; print(json.dumps(json.load(sys.stdin)))")"'"},
  {"role":"user","content":"It is a client pitch for a new mobile app. I need slides, a demo script, and to rehearse twice."}
]'

call "3b. Multi-turn: second call (with answer)" \
  "{\"taskName\":\"Prepare for the presentation\",\"taskMinutes\":60,\"history\":${HISTORY}}"

echo "✓ All tests done"
