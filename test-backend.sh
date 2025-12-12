#!/bin/bash

# ImmigrationAI Backend API Testing Script
# Tests all core endpoints to verify backend functionality

set -e

# Configuration
API_URL="${API_URL:-https://immigrationai-app-production-b994.up.railway.app}"
TOKEN="${TOKEN:-}"  # Set via environment variable
VERBOSE="${VERBOSE:-false}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;36m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# Test result tracking
log_pass() {
  echo -e "${GREEN}✓ PASS${NC}: $1"
  ((PASSED++))
}

log_fail() {
  echo -e "${RED}✗ FAIL${NC}: $1"
  ((FAILED++))
}

log_warn() {
  echo -e "${YELLOW}⚠ WARN${NC}: $1"
  ((WARNINGS++))
}

log_info() {
  echo -e "${BLUE}ℹ INFO${NC}: $1"
}

echo "========================================="
echo "ImmigrationAI Backend API Test Suite"
echo "========================================="
echo "API URL: $API_URL"
echo "Auth Token: ${TOKEN:0:20}..."
echo ""

# Function to make API requests
call_api() {
  local method=$1
  local endpoint=$2
  local data=$3
  local auth=$4
  
  if [ "$auth" = "true" ]; then
    curl -s -X $method \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "$data" \
      "$API_URL$endpoint"
  else
    curl -s -X $method \
      -H "Content-Type: application/json" \
      -d "$data" \
      "$API_URL$endpoint"
  fi
}

# ===== HEALTH CHECKS =====
echo -e "\n${BLUE}=== HEALTH CHECKS ===${NC}"

# Test /health endpoint
response=$(curl -s "$API_URL/health")
if echo "$response" | grep -q '"status"'; then
  log_pass "/health endpoint responding"
  echo "  Response: $(echo $response | jq -r '.status')"
  
  if echo "$response" | grep -q '"database":"connected"'; then
    log_pass "Database connected"
  else
    log_warn "Database not connected"
  fi
  
  if echo "$response" | grep -q '"redis":"connected"'; then
    log_pass "Redis connected"
  else
    log_warn "Redis not connected"
  fi
else
  log_fail "/health endpoint not responding"
fi

# ===== AI PROVIDER STATUS =====
echo -e "\n${BLUE}=== AI PROVIDER STATUS ===${NC}"

if [ -z "$TOKEN" ]; then
  log_warn "No auth token provided. Skipping authenticated endpoints."
  log_info "To test AI endpoints, set TOKEN environment variable: export TOKEN=your_jwt_token"
else
  response=$(call_api "GET" "/api/ai/status" "" "true")
  
  if echo "$response" | grep -q '"providers"'; then
    log_pass "/api/ai/status endpoint responding"
    
    if echo "$response" | grep -q '"local":.*"enabled":true'; then
      log_pass "Local AI (Ollama) available"
    else
      log_warn "Local AI (Ollama) NOT available - AI features will fail"
    fi
    
    if echo "$response" | grep -q '"huggingface":.*"enabled":true'; then
      log_pass "HuggingFace available as fallback"
    else
      log_info "HuggingFace not configured - add HUGGINGFACE_API_TOKEN for backup"
    fi
  else
    log_fail "/api/ai/status endpoint failed"
  fi
  
  # ===== AI ENDPOINTS =====
  echo -e "\n${BLUE}=== AI ENDPOINTS ===${NC}"
  
  # Test /api/ai/chat
  response=$(call_api "POST" "/api/ai/chat" '{"message":"What visas are available?"}' "true")
  
  if echo "$response" | grep -q '"reply"'; then
    log_pass "/api/ai/chat responding"
  elif echo "$response" | grep -q '503'; then
    log_fail "/api/ai/chat returned 503 - AI provider not available"
  elif echo "$response" | grep -q '500'; then
    log_fail "/api/ai/chat returned 500 - check logs"
  else
    log_warn "/api/ai/chat unexpected response"
  fi
  
  # Test /api/ai/translate
  response=$(call_api "POST" "/api/ai/translate" '{"fromLang":"en","toLang":"de","text":"Hello"}' "true")
  
  if echo "$response" | grep -q '"translation"'; then
    log_pass "/api/ai/translate responding"
  elif echo "$response" | grep -q '503'; then
    log_fail "/api/ai/translate returned 503 - AI provider not available"
  else
    log_warn "/api/ai/translate unexpected response"
  fi
  
  # ===== SUBSCRIPTION ENDPOINTS =====
  echo -e "\n${BLUE}=== SUBSCRIPTION ENDPOINTS ===${NC}"
  
  # Test /api/subscription/plans
  response=$(call_api "GET" "/api/subscription/plans" "" "true")
  
  if echo "$response" | grep -q '"plans"'; then
    log_pass "/api/subscription/plans responding"
    plan_count=$(echo "$response" | jq '.plans | length')
    log_info "Found $plan_count subscription plans"
  else
    log_fail "/api/subscription/plans not responding"
  fi
  
  # Test /api/subscription/current
  response=$(call_api "GET" "/api/subscription/current" "" "true")
  
  if echo "$response" | grep -q '"tier"'; then
    log_pass "/api/subscription/current responding"
    tier=$(echo "$response" | jq -r '.tier')
    log_info "Current tier: $tier"
  else
    log_fail "/api/subscription/current not responding"
  fi
  
  # ===== CONSULTATIONS ENDPOINTS =====
  echo -e "\n${BLUE}=== CONSULTATIONS ENDPOINTS ===${NC}"
  
  # Test /api/consultations GET (list consultations)
  response=$(call_api "GET" "/api/consultations" "" "true")
  
  if echo "$response" | grep -q '\[\|{'; then
    log_pass "/api/consultations GET responding"
    if echo "$response" | grep -q '^\[\]'; then
      log_info "No consultations found (empty array)"
    fi
  else
    log_fail "/api/consultations GET not responding"
  fi
  
  # Test /api/consultations/available/lawyers
  response=$(call_api "GET" "/api/consultations/available/lawyers" "" "true")
  
  if echo "$response" | grep -q '\[\|{'; then
    log_pass "/api/consultations/available/lawyers responding"
    if echo "$response" | grep -q '^\[\]'; then
      log_warn "No lawyers found in database - consultations feature needs seed data"
    else
      lawyer_count=$(echo "$response" | jq '. | length')
      log_info "Found $lawyer_count available lawyers"
    fi
  else
    log_fail "/api/consultations/available/lawyers not responding"
  fi
  
  # ===== RESEARCH ENDPOINTS =====
  echo -e "\n${BLUE}=== RESEARCH ENDPOINTS ===${NC}"
  
  response=$(call_api "GET" "/api/research?search=visa" "" "false")
  
  if echo "$response" | grep -q '"items"'; then
    log_pass "/api/research responding"
  else
    log_warn "/api/research unexpected response"
  fi
  
  # ===== DOCUMENTS ENDPOINTS =====
  echo -e "\n${BLUE}=== DOCUMENTS ENDPOINTS ===${NC}"
  
  log_info "Document upload test requires multipart file upload"
  log_info "Manual test: curl -X POST -H 'Authorization: Bearer TOKEN' -F 'file=@test.pdf' $API_URL/api/documents/upload"
fi

# ===== SUMMARY =====
echo -e "\n${BLUE}=========================================${NC}"
echo -e "${BLUE}TEST SUMMARY${NC}"
echo -e "${BLUE}=========================================${NC}"
echo -e "${GREEN}Passed:${NC} $PASSED"
echo -e "${RED}Failed:${NC} $FAILED"
echo -e "${YELLOW}Warnings:${NC} $WARNINGS"

if [ $FAILED -eq 0 ]; then
  echo -e "\n${GREEN}✓ All tests passed!${NC}"
  exit 0
else
  echo -e "\n${RED}✗ Some tests failed. Check configuration.${NC}"
  exit 1
fi
