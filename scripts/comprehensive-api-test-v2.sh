#!/bin/bash

# Improved Comprehensive API Test Suite
# Tests all endpoints with proper token handling

BASE_URL="https://immigrationai-app-production-b994.up.railway.app"
TEST_EMAIL="audit-$(date +%s)@test.com"
TEST_PASSWORD="TestPass123456!"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0
ERRORS=()

test_endpoint() {
  local method=$1
  local endpoint=$2
  local expected_code=$3
  local data=$4
  local auth_token=$5
  local description=$6
  
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
    echo -e "${GREEN}✓${NC} $method $endpoint ($http_code) - $description"
    ((PASSED++))
    echo "$body"
  else
    echo -e "${RED}✗${NC} $method $endpoint (expected $expected_code, got $http_code) - $description"
    ERRORS+=("$method $endpoint: expected $expected_code, got $http_code")
    ((FAILED++))
    echo "Response: $body"
  fi
  echo ""
}

echo "=========================================="
echo "ImmigrationAI API Test Suite (Improved)"
echo "=========================================="
echo "Base URL: $BASE_URL"
echo ""

# Step 1: Register new user
echo -e "${BLUE}Step 1: Register User${NC}"
REGISTER_DATA="{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\",\"firstName\":\"Test\",\"lastName\":\"User\",\"role\":\"applicant\"}"
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "$REGISTER_DATA")

echo "Register Response: $REGISTER_RESPONSE"
AUTH_TOKEN=$(echo "$REGISTER_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
USER_ID=$(echo "$REGISTER_RESPONSE" | grep -o '"id":"[^"]*' | cut -d'"' -f4 | head -1)

if [ ! -z "$AUTH_TOKEN" ]; then
  echo -e "${GREEN}✓${NC} Got auth token: ${AUTH_TOKEN:0:20}..."
  ((PASSED++))
else
  echo -e "${RED}✗${NC} Register did not return token"
  ((FAILED++))
fi
echo ""

# Step 2: Test protected endpoints with token
echo -e "${BLUE}Step 2: Test Protected Endpoints${NC}"

test_endpoint "GET" "/api/auth/me" "200" "" "$AUTH_TOKEN" "Get current user"
test_endpoint "GET" "/api/subscription/current" "200" "" "$AUTH_TOKEN" "Get subscription"
test_endpoint "GET" "/api/subscription/usage" "200" "" "$AUTH_TOKEN" "Get usage stats"
test_endpoint "GET" "/api/subscription/check/ai_documents" "200" "" "$AUTH_TOKEN" "Check feature access"
test_endpoint "GET" "/api/documents" "200" "" "$AUTH_TOKEN" "List documents"
test_endpoint "GET" "/api/applications" "200" "" "$AUTH_TOKEN" "List applications"
test_endpoint "GET" "/api/notifications" "200" "" "$AUTH_TOKEN" "Get notifications"
test_endpoint "GET" "/api/users/settings" "200" "" "$AUTH_TOKEN" "Get user settings"
test_endpoint "GET" "/api/messages" "200" "" "$AUTH_TOKEN" "Get messages"

# Step 3: Test public endpoints
echo -e "${BLUE}Step 3: Test Public Endpoints${NC}"

test_endpoint "GET" "/api/subscription/plans" "200" "" "" "Get subscription plans"
test_endpoint "GET" "/api/visa/countries" "200" "" "" "Get visa countries"
test_endpoint "GET" "/api/visa/requirements" "200" "" "" "Get visa requirements"
test_endpoint "GET" "/api/research/articles" "200" "" "" "Get research articles"
test_endpoint "GET" "/api/research/resources" "200" "" "" "Get research resources"

# Summary
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
  exit 0
else
  echo -e "${RED}❌ $FAILED tests failed${NC}"
  exit 1
fi
