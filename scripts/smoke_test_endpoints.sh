#!/usr/bin/env bash
# =============================================================================
# Endpoint smoke test — phase-completion gate
# =============================================================================
# Curls every endpoint in the curated list below. For each: prints
#   METHOD  URL  →  STATUS  (first ~120 bytes of body)
# Exit code 0 only if every endpoint returns its expected status code.
#
# Required env:
#   AUTH_TOKEN   — a valid Supabase JWT. Grab from browser devtools:
#                    localStorage.getItem('sb-<project>-auth-token')
#                    (or dump via /api/auth/token once that exists)
# Optional env:
#   BACKEND_URL  — defaults to http://localhost:8000
#
# Usage:
#   AUTH_TOKEN="eyJ..." ./scripts/smoke_test_endpoints.sh
#   AUTH_TOKEN="eyJ..." BACKEND_URL=http://localhost:8001 ./scripts/smoke_test_endpoints.sh
#
# Phase-completion rule (docs/redesign/phase_completion_checklist.md):
#   Every phase MUST append its new endpoints to SMOKE_ENDPOINTS below and
#   include this script's full output in the phase-done report.
# =============================================================================

set -u  # error on unbound vars; intentionally NOT using set -e so a single
        # failing endpoint doesn't hide the rest of the results

BACKEND_URL="${BACKEND_URL:-http://localhost:8000}"
AUTH_TOKEN="${AUTH_TOKEN:-}"

if [[ -z "$AUTH_TOKEN" ]]; then
  echo "ERROR: AUTH_TOKEN env var is required."
  echo "  Get one from browser devtools (Application → LocalStorage → sb-*-auth-token.access_token)"
  echo "  Then: AUTH_TOKEN=\"eyJ...\" $0"
  exit 2
fi

# Each line: METHOD|PATH|EXPECTED_STATUS_CSV|OPTIONAL_BODY_JSON
# EXPECTED_STATUS_CSV lets us accept more than one status (e.g. 200,404 for
# "OK or no data yet"). Use 200 by default. Some endpoints correctly return
# null or empty — those still count as 200.
#
# Phases add to this list. Do NOT remove entries when endpoints are replaced —
# leave them here with the expected 404/410 so regression catches re-adds.
SMOKE_ENDPOINTS=(
  # --- Health + existing baseline ---
  "GET|/api/health|200|"

  # --- Leads / companies (pre-existing) ---
  "GET|/api/leads|200|"
  "GET|/api/companies|200|"
  "GET|/api/leads/company-view|200|"
  "GET|/api/leads/people-view|200|"

  # --- Pipeline (Phase 2) ---
  "GET|/api/pipeline|200|"
  "GET|/api/pipeline/summary|200|"

  # --- Today page (Phase 1) ---
  "GET|/api/today/champions|200|"
  "GET|/api/goals/current|200|"
  "GET|/api/activity/streak|200|"
  "GET|/api/digests/latest|200,404|"      # legitimately null if no digest generated yet

  # --- Leakage (Phase 2) ---
  "GET|/api/leakage/alerts|200|"

  # --- Dashboard (pre-existing) ---
  "GET|/api/dashboard/stats|200|"
  "GET|/api/dashboard/needs-attention|200|"
  "GET|/api/dashboard/chart-data|200|"

  # --- Email module (pre-existing + ported-from-server.py) ---
  "GET|/api/email/overview|200|"
  "GET|/api/email/tools|200|"
  "GET|/api/email/all/overview|200|"

  # --- Agent / assistant (pre-existing) ---
  "GET|/api/agent/status|200|"

  # --- Integrations (pre-existing) ---
  "GET|/api/integrations/status|200|"
  "GET|/api/notifications|200|"
)

PASS=0
FAIL=0
FAIL_LINES=()

printf "%-6s  %-45s  %-8s  %s\n" "METHOD" "URL" "STATUS" "BODY(≤120B)"
printf -- "-----------------------------------------------------------------------------------------------\n"

for entry in "${SMOKE_ENDPOINTS[@]}"; do
  IFS='|' read -r method path expected body <<< "$entry"
  url="${BACKEND_URL}${path}"

  # Run curl. -s silent, -w adds status on a final line, -o writes body to tmp.
  body_file=$(mktemp)
  if [[ -n "$body" ]]; then
    status=$(curl -s -o "$body_file" -w "%{http_code}" -X "$method" \
      -H "Authorization: Bearer $AUTH_TOKEN" \
      -H "Content-Type: application/json" \
      --data-raw "$body" \
      "$url" || echo "000")
  else
    status=$(curl -s -o "$body_file" -w "%{http_code}" -X "$method" \
      -H "Authorization: Bearer $AUTH_TOKEN" \
      "$url" || echo "000")
  fi

  # Body preview: first 120 bytes, replace newlines with spaces
  preview=$(head -c 120 "$body_file" 2>/dev/null | tr '\r\n' '  ' | tr -s ' ')
  rm -f "$body_file"

  # Check expected status
  IFS=',' read -ra expected_codes <<< "$expected"
  ok=0
  for code in "${expected_codes[@]}"; do
    if [[ "$status" == "$code" ]]; then
      ok=1; break
    fi
  done

  if [[ $ok -eq 1 ]]; then
    PASS=$((PASS+1))
    printf "%-6s  %-45s  \033[32m%-8s\033[0m  %s\n" "$method" "$path" "$status" "${preview:0:120}"
  else
    FAIL=$((FAIL+1))
    FAIL_LINES+=("$method $path expected $expected got $status")
    printf "%-6s  %-45s  \033[31m%-8s\033[0m  %s\n" "$method" "$path" "$status" "${preview:0:120}"
  fi
done

printf -- "-----------------------------------------------------------------------------------------------\n"
echo "PASS: $PASS    FAIL: $FAIL    TOTAL: $((PASS + FAIL))"

if [[ $FAIL -gt 0 ]]; then
  echo
  echo "Failures:"
  for line in "${FAIL_LINES[@]}"; do
    echo "  ✗ $line"
  done
  exit 1
fi

echo "All endpoints healthy."
exit 0
