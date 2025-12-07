#!/bin/bash
# Authentication Testing Script for Railway Deployment
# Run these commands to verify the login fix is working

APP_URL="https://your-app.railway.app"  # Replace with your actual Railway URL
TEST_EMAIL="test$(date +%s)@example.com"
TEST_PASSWORD="TestPassword123"

echo "================================"
echo "ImmigrationAI Authentication Test"
echo "================================"
echo ""
echo "App URL: $APP_URL"
echo "Test Email: $TEST_EMAIL"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check response
check_response() {
  local status=$1
  local expected=$2
  if [ "$status" = "$expected" ]; then
    echo -e "${GREEN}✓ Success ($status)${NC}"
    return 0
  else
    echo -e "${RED}✗ Failed (got $status, expected $expected)${NC}"
    return 1
  fi
}

echo "Test 1: Health Check"
echo "-------------------"
response=$(curl -s -w "\n%{http_code}" "$APP_URL/health")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)
echo "HTTP Status: $http_code"
echo "Response: $body"
check_response "$http_code" "200" && echo "" || (echo ""; exit 1)

echo "Test 2: User Registration"
echo "------------------------"
response=$(curl -s -w "\n%{http_code}" -X POST "$APP_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\",
    \"firstName\": \"Test\",
    \"role\": \"applicant\"
  }")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)
echo "HTTP Status: $http_code"
echo "Response:"
echo "$body" | jq '.' 2>/dev/null || echo "$body"
check_response "$http_code" "201" && echo "" || (echo ""; exit 1)

# Extract tokens from registration response
accessToken=$(echo "$body" | jq -r '.accessToken // empty')
refreshToken=$(echo "$body" | jq -r '.refreshToken // empty')

if [ -z "$accessToken" ]; then
  echo -e "${YELLOW}Warning: Could not extract accessToken from registration response${NC}"
  echo "Skipping token-dependent tests"
  echo ""
else
  echo -e "${GREEN}Tokens obtained:${NC}"
  echo "Access Token (first 20 chars): ${accessToken:0:20}..."
  echo ""

  echo "Test 3: Get Current User (with token)"
  echo "--------------------------------------"
  response=$(curl -s -w "\n%{http_code}" -X GET "$APP_URL/api/auth/me" \
    -H "Authorization: Bearer $accessToken")
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)
  echo "HTTP Status: $http_code"
  echo "Response:"
  echo "$body" | jq '.' 2>/dev/null || echo "$body"
  check_response "$http_code" "200" && echo "" || (echo ""; exit 1)

  echo "Test 4: Get Current User (without token - should fail)"
  echo "-------------------------------------------------------"
  response=$(curl -s -w "\n%{http_code}" -X GET "$APP_URL/api/auth/me")
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)
  echo "HTTP Status: $http_code"
  check_response "$http_code" "401" && echo "" || (echo ""; exit 1)

  echo "Test 5: Logout"
  echo "--------------"
  response=$(curl -s -w "\n%{http_code}" -X POST "$APP_URL/api/auth/logout" \
    -H "Authorization: Bearer $accessToken" \
    -H "Content-Type: application/json" \
    -d "{\"refreshToken\": \"$refreshToken\"}")
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)
  echo "HTTP Status: $http_code"
  echo "Response: $body"
  check_response "$http_code" "200" && echo "" || (echo ""; exit 1)
fi

echo "Test 6: Login (create new session)"
echo "----------------------------------"
response=$(curl -s -w "\n%{http_code}" -X POST "$APP_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\"
  }")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)
echo "HTTP Status: $http_code"
echo "Response:"
echo "$body" | jq '.' 2>/dev/null || echo "$body"
check_response "$http_code" "200" && echo "" || (echo ""; exit 1)

echo "================================"
echo "All tests completed!"
echo "================================"
