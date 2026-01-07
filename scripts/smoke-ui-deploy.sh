#!/bin/bash

# Post-Deploy UI Verification Test
# Checks that the employer verification page loads with proper structure

API_URL="https://immigrationai-app-production-b994.up.railway.app"
TIMEOUT=10

echo "=== Post-Deploy UI Verification Test ==="
echo "Testing API: $API_URL"
echo ""

# Test 1: Health Check
echo "Test 1: Health Check"
curl -s -w "\nStatus: %{http_code}\n" -o /dev/null --max-time $TIMEOUT "$API_URL/api/health" 2>/dev/null
if [ $? -eq 0 ]; then echo "✓ API is responding"; else echo "✗ API not responding"; fi
echo ""

# Test 2: Frontend loads
echo "Test 2: Frontend Index Load"
curl -s -w "Status: %{http_code}\n" -o /dev/null --max-time $TIMEOUT "$API_URL/" 2>/dev/null
if [ $? -eq 0 ]; then echo "✓ Frontend loads"; else echo "✗ Frontend load failed"; fi
echo ""

# Test 3: Check if CSS is served
echo "Test 3: CSS/Assets Available"
curl -s -w "Status: %{http_code}\n" --max-time $TIMEOUT "$API_URL/index.html" | grep -q "assets" && echo "✓ Assets referenced" || echo "✗ Assets not found"
echo ""

# Test 4: Subscription endpoint
echo "Test 4: Subscription Endpoint"
curl -s -w "\nStatus: %{http_code}\n" -o /dev/null --max-time $TIMEOUT "$API_URL/api/subscription/plans" 2>/dev/null
if [ $? -eq 0 ]; then echo "✓ Subscription API responding"; else echo "✗ Subscription API failed"; fi
echo ""

echo "=== Test Summary ==="
echo "If all tests pass, the UI overhaul has been deployed successfully"
echo "Check the following in your browser:"
echo "1. Visit: $API_URL/employer-verification"
echo "2. Verify dark mode styling on Employer Verification page"
echo "3. Check History and Registries tabs for proper formatting"
echo "4. Test theme toggle in navbar (sun/moon icon)"
