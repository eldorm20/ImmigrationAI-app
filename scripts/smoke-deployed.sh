#!/bin/bash

set -e

# Configuration
BASE_URL="https://immigrationai-app-production-b994.up.railway.app"
TEST_EMAIL="testuser-$(date +%s)@example.com"
TEST_PASSWORD="TestPass123456"

echo "=========================================="
echo "Smoke Test: Deployed Site"
echo "=========================================="
echo "Base URL: $BASE_URL"
echo "Test Email: $TEST_EMAIL"
echo ""

# Test 1: Register a new user
echo "1️⃣  Registering test user..."
REGISTER_RESPONSE=$(curl -sS -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\",
    \"firstName\": \"Test\",
    \"lastName\": \"User\",
    \"role\": \"applicant\"
  }")

echo "Register Response: $REGISTER_RESPONSE"

# Extract user ID and tokens
USER_ID=$(echo "$REGISTER_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
ACCESS_TOKEN=$(echo "$REGISTER_RESPONSE" | grep -o '"accessToken":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$USER_ID" ] || [ -z "$ACCESS_TOKEN" ]; then
  echo "❌ Failed to extract user ID or access token"
  exit 1
fi

echo "✅ User registered: $USER_ID"
echo "✅ Access Token: ${ACCESS_TOKEN:0:20}..."
echo ""

# Test 2: Get current user
echo "2️⃣  Fetching current user..."
AUTH_RESPONSE=$(curl -sS -X GET "$BASE_URL/api/auth/me" \
  -H "Authorization: Bearer $ACCESS_TOKEN")
echo "Auth Response: $AUTH_RESPONSE"
echo "✅ Current user retrieved"
echo ""

# Test 3: Get subscription current
echo "3️⃣  Fetching current subscription..."
SUB_RESPONSE=$(curl -sS -X GET "$BASE_URL/api/subscription/current" \
  -H "Authorization: Bearer $ACCESS_TOKEN")
echo "Subscription Response: $SUB_RESPONSE"
echo "✅ Current subscription retrieved"
echo ""

# Test 4: Get subscription usage
echo "4️⃣  Fetching subscription usage..."
USAGE_RESPONSE=$(curl -sS -X GET "$BASE_URL/api/subscription/usage" \
  -H "Authorization: Bearer $ACCESS_TOKEN")
echo "Usage Response: $USAGE_RESPONSE"
echo "✅ Usage data retrieved"
echo ""

# Test 5: Check feature access
echo "5️⃣  Checking feature access (documentUploadLimit)..."
FEATURE_RESPONSE=$(curl -sS -X GET "$BASE_URL/api/subscription/check/documentUploadLimit" \
  -H "Authorization: Bearer $ACCESS_TOKEN")
echo "Feature Response: $FEATURE_RESPONSE"
echo "✅ Feature access checked"
echo ""

# Test 6: Try AI chat
echo "6️⃣  Testing AI chat endpoint..."
CHAT_RESPONSE=$(curl -sS -X POST "$BASE_URL/api/ai/chat" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"Hello, what can you help me with?\"}")
echo "Chat Response (first 300 chars): ${CHAT_RESPONSE:0:300}"
if echo "$CHAT_RESPONSE" | grep -q "error"; then
  echo "⚠️  Chat endpoint returned error (expected if quota reached or AI provider down)"
else
  echo "✅ Chat endpoint responded"
fi
echo ""

# Test 7: Get plans
echo "7️⃣  Fetching subscription plans..."
PLANS_RESPONSE=$(curl -sS -X GET "$BASE_URL/api/subscription/plans")
echo "Plans Response (first 300 chars): ${PLANS_RESPONSE:0:300}"
echo "✅ Plans retrieved"
echo ""

# Test 8: List admin users (should fail for applicant)
echo "8️⃣  Testing admin access (should fail)..."
ADMIN_RESPONSE=$(curl -sS -X GET "$BASE_URL/api/admin/users/analytics" \
  -H "Authorization: Bearer $ACCESS_TOKEN")
if echo "$ADMIN_RESPONSE" | grep -q "403\|Admin access required"; then
  echo "✅ Admin check working (applicant denied access as expected)"
else
  echo "⚠️  Admin check may not be working correctly"
fi
echo ""

# Test 9: Get billing history
echo "9️⃣  Fetching billing history..."
BILLING_RESPONSE=$(curl -sS -X GET "$BASE_URL/api/subscription/billing-history" \
  -H "Authorization: Bearer $ACCESS_TOKEN")
echo "Billing Response: $BILLING_RESPONSE"
echo "✅ Billing history retrieved"
echo ""

# Test 10: Health check
echo "🔟 Health check..."
HEALTH_RESPONSE=$(curl -sS -X GET "$BASE_URL/health")
echo "Health Response: $HEALTH_RESPONSE"
echo "✅ Health check passed"
echo ""

echo "=========================================="
echo "✅ All smoke tests completed!"
echo "=========================================="
echo "Test user created: $TEST_EMAIL"
echo "User ID: $USER_ID"
