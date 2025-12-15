#!/bin/bash

# Comprehensive API Test Suite
# Tests all endpoints for errors and issues

BASE_URL="https://immigrationai-app-production-b994.up.railway.app"
TEST_EMAIL="audit-$(date +%s)@test.com"
TEST_PASSWORD="TestPass123456!"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0
ERRORS=()

# Helper function to test endpoint
test_endpoint() {
  local method=$1
  local endpoint=$2
  local expected_code=$3
  local data=$4
  local auth_token=$5
  
  local cmd="curl -s -w '\n%{http_code}' -X $method '$BASE_URL$endpoint'"
  
  if [ ! -z "$data" ]; then
    cmd="$cmd -H 'Content-Type: application/json' -d '$data'"
  fi
  
  if [ ! -z "$auth_token" ]; then
    cmd="$cmd -H 'Authorization: Bearer $auth_token'"
  fi
  
  local response=$(eval $cmd)
  local http_code=$(echo "$response" | tail -1)
  local body=$(echo "$response" | head -n -1)
  
  if [ "$http_code" = "$expected_code" ]; then
    echo -e "${GREEN}✓${NC} $method $endpoint ($http_code)"
    ((PASSED++))
  else
    echo -e "${RED}✗${NC} $method $endpoint (expected $expected_code, got $http_code)"
    ERRORS+=("$method $endpoint: expected $expected_code, got $http_code - $body")
    ((FAILED++))
  fi
}

echo "=========================================="
echo "ImmigrationAI Comprehensive API Test Suite"
echo "=========================================="
echo "Base URL: $BASE_URL"
echo ""

# Test 1: Health Check
echo "📊 Testing Health & Status Endpoints"
test_endpoint "GET" "/api/health" "200"

# Test 2: Auth Endpoints
echo ""
echo "🔐 Testing Auth Endpoints"

# Register
REGISTER_DATA="{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\",\"firstName\":\"Test\",\"lastName\":\"User\",\"role\":\"applicant\"}"
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "$REGISTER_DATA")

AUTH_TOKEN=$(echo "$REGISTER_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
USER_ID=$(echo "$REGISTER_RESPONSE" | grep -o '"id":"[^"]*' | cut -d'"' -f4 | head -1)

if [ ! -z "$AUTH_TOKEN" ]; then
  echo -e "${GREEN}✓${NC} POST /api/auth/register"
  ((PASSED++))
else
  echo -e "${RED}✗${NC} POST /api/auth/register - No token returned"
  echo "Response: $REGISTER_RESPONSE"
  ((FAILED++))
  ERRORS+=("Register did not return token")
fi

# Login
LOGIN_DATA="{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}"
test_endpoint "POST" "/api/auth/login" "200" "$LOGIN_DATA"

# Get current user
test_endpoint "GET" "/api/auth/me" "200" "" "$AUTH_TOKEN"

# Test 3: Subscription Endpoints
echo ""
echo "💳 Testing Subscription Endpoints"
test_endpoint "GET" "/api/subscription/plans" "200" "" "$AUTH_TOKEN"
test_endpoint "GET" "/api/subscription/current" "200" "" "$AUTH_TOKEN"
test_endpoint "GET" "/api/subscription/usage" "200" "" "$AUTH_TOKEN"
test_endpoint "POST" "/api/subscription/check-feature" "200" "{\"feature\":\"ai_documents\"}" "$AUTH_TOKEN"

# Test 4: Documents Endpoints
echo ""
echo "📄 Testing Document Endpoints"
test_endpoint "GET" "/api/documents" "200" "" "$AUTH_TOKEN"
test_endpoint "GET" "/api/documents/types" "200" "" "$AUTH_TOKEN"

# Test 5: AI Endpoints
echo ""
echo "🤖 Testing AI Endpoints"
test_endpoint "GET" "/api/ai/models" "200" "" "$AUTH_TOKEN"
test_endpoint "POST" "/api/ai/documents/generate" "200" "{\"documentType\":\"cover_letter\",\"context\":{}}" "$AUTH_TOKEN"
test_endpoint "POST" "/api/ai/chat" "200" "{\"message\":\"Hello\"}" "$AUTH_TOKEN"

# Test 6: Applications Endpoints
echo ""
echo "📋 Testing Application Endpoints"
test_endpoint "GET" "/api/applications" "200" "" "$AUTH_TOKEN"
test_endpoint "POST" "/api/applications" "200" "{\"title\":\"Test App\",\"description\":\"Test\"}" "$AUTH_TOKEN"

# Test 7: Notifications Endpoints
echo ""
echo "🔔 Testing Notification Endpoints"
test_endpoint "GET" "/api/notifications" "200" "" "$AUTH_TOKEN"

# Test 8: Settings Endpoints
echo ""
echo "⚙️ Testing Settings Endpoints"
test_endpoint "GET" "/api/settings" "200" "" "$AUTH_TOKEN"
test_endpoint "PUT" "/api/settings" "200" "{\"theme\":\"dark\"}" "$AUTH_TOKEN"

# Test 9: Analytics Endpoints
echo ""
echo "📈 Testing Analytics Endpoints"
test_endpoint "GET" "/api/analytics/dashboard" "200" "" "$AUTH_TOKEN"

# Test 10: Visa Endpoints
echo ""
echo "🛂 Testing Visa Endpoints"
test_endpoint "GET" "/api/visa/countries" "200"
test_endpoint "GET" "/api/visa/requirements" "200"

# Test 11: Research Endpoints
echo ""
echo "🔍 Testing Research Endpoints"
test_endpoint "GET" "/api/research/articles" "200"
test_endpoint "GET" "/api/research/resources" "200"

# Test 12: Messages Endpoints
echo ""
echo "💬 Testing Message Endpoints"
test_endpoint "GET" "/api/messages" "200" "" "$AUTH_TOKEN"
test_endpoint "GET" "/api/messages/conversations" "200" "" "$AUTH_TOKEN"

# Summary
echo ""
echo "=========================================="
echo "📊 Test Summary"
echo "=========================================="
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"

if [ $FAILED -gt 0 ]; then
  echo ""
  echo -e "${RED}Failed Tests:${NC}"
  for error in "${ERRORS[@]}"; do
    echo "  - $error"
  done
fi

echo ""
if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ All tests passed!${NC}"
else
  echo -e "${RED}❌ Some tests failed. Review above.${NC}"
fi
