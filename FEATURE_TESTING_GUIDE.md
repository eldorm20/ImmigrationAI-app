# Feature Testing Guide - ImmigrationAI Platform
**Test Date**: December 7, 2025  
**Platform Version**: 2.0 (with AI Docs, Subscriptions, Messaging)

---

## 📋 Test Overview

This guide provides step-by-step instructions to test the 4 major features completed in this session:
1. ✅ AI Document Generation Engine
2. ✅ Subscription Tier System  
3. ✅ Lawyer-Applicant Messaging
4. ✅ Feature Gating Middleware

---

## 🔧 Setup Requirements

### Prerequisites
- Node.js v18+ and npm installed
- PostgreSQL 14+ running with migrations applied
- Redis running (for email queue)
- OpenAI API key (`OPENAI_API_KEY` env var)
- Stripe test keys configured (`STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`)
- AWS S3 credentials (for document storage)

### Quick Start
```bash
# 1. Navigate to project root
cd c:\Users\USER\Documents\ImmigrationAI-app\ImmigrationAI-app-main

# 2. Install dependencies
npm install
cd client && npm install && cd ..

# 3. Run migrations (if not already done)
npm run migrate

# 4. Start development server
npm run dev

# 5. Open browser to http://localhost:5173
```

---

## 🧪 Test Cases

### TEST SUITE 1: AI Document Generation

#### Test 1.1 - Generate Cover Letter
**Objective**: Verify document generation works with valid input

**Steps**:
1. Log in as applicant user
2. Navigate to Dashboard → AI Documents tab
3. Fill form with:
   - Visa Type: "Skilled Worker"
   - Country: "Canada"
   - Target Role: "Senior Software Engineer"
   - Experience: "5 years in cloud infrastructure"
   - Education: "BS Computer Science"
4. Select "Cover Letter" document type
5. Click "Generate" button
6. Wait for completion (30-60 seconds)

**Expected Results** ✅
- Loading spinner appears
- Document generates successfully
- Shows markdown preview of cover letter
- Preview contains applicant's information
- No error messages

**Pass/Fail**: _____

**Notes**: _________________________________

---

#### Test 1.2 - Generate Resume
**Objective**: Verify resume generation adapts content

**Steps**:
1. Continue from Test 1.1
2. Select "Resume" document type
3. Click "Generate"
4. Wait for completion

**Expected Results** ✅
- Document generates with structured format
- Contains sections: Experience, Education, Skills
- Information matches input provided
- Preview renders properly

**Pass/Fail**: _____

**Notes**: _________________________________

---

#### Test 1.3 - Test All Document Types
**Objective**: Verify all 5 document types generate

**Document Types to Test**:
- [ ] Cover Letter (tested above)
- [ ] Resume
- [ ] Statement of Purpose (SOP)
- [ ] Motivation Letter
- [ ] CV (Curriculum Vitae)

**Steps**: Repeat Test 1.1 for each type, changing document type selection

**Expected Results** ✅
- All 5 types generate without errors
- Each type has distinct format and content
- No rate limiting errors
- All complete within 60 seconds

**Pass/Fail**: _____

**Notes**: _________________________________

---

#### Test 1.4 - Test Feature Gating (Subscription Limits)
**Objective**: Verify document generation respects subscription tiers

**Steps**:
1. Log in as Free tier user
2. Set user tier to Free: 2 AI generations/month
3. Generate 2 documents successfully
4. Attempt to generate 3rd document

**Expected Results** ✅
- First 2 documents generate successfully
- 3rd attempt returns 403 Forbidden error
- Error message suggests upgrading to Pro tier
- Clear message: "You've reached your AI document limit. Upgrade to Pro for more."

**Pass/Fail**: _____

**Notes**: _________________________________

---

#### Test 1.5 - Test Document Download
**Objective**: Verify PDF download functionality

**Steps**:
1. Generate a document (Test 1.1)
2. Click "Download as PDF" button
3. Check browser downloads folder

**Expected Results** ✅
- PDF file downloads with proper name
- File opens in PDF reader
- Content matches preview
- No formatting issues in PDF

**Pass/Fail**: _____

**Notes**: _________________________________

---

#### Test 1.6 - Test Error Handling
**Objective**: Verify graceful error handling

**Steps**:
1. Go to AI Documents
2. Clear the form (remove all inputs)
3. Click "Generate"

**Expected Results** ✅
- Validation error appears: "Please fill all required fields"
- Request doesn't reach server
- User can correct and retry

**Pass/Fail**: _____

**Notes**: _________________________________

---

### TEST SUITE 2: Subscription Tier System

#### Test 2.1 - View Available Plans
**Objective**: Verify subscription plans display correctly

**Steps**:
1. Navigate to Account Settings → Subscription
2. Look for "Available Plans" section

**Expected Results** ✅
- Shows 3 tiers: Free ($0), Pro ($29/month), Premium ($79/month)
- Each tier shows:
  - Price
  - Feature list (uploads, generations, consultations, support)
  - "Current Plan" badge on active tier
  - "Upgrade" button on other tiers

**Pass/Fail**: _____

**Screenshot**: _____________________

**Notes**: _________________________________

---

#### Test 2.2 - Check Current Subscription
**Objective**: Verify current tier displays correctly

**Steps**:
1. Navigate to Account Settings → Subscription
2. Look for "Your Plan" section

**Expected Results** ✅
- Shows current plan name
- Shows usage (e.g., "2 of 5 uploads used")
- Shows renewal date
- Shows feature limits

**Pass/Fail**: _____

**Notes**: _________________________________

---

#### Test 2.3 - Test Feature Gating
**Objective**: Verify disabled features show upgrade prompts

**Steps**:
1. Create Free tier test account
2. Try to upload 6th document (limit is 5)
3. Try to generate 3rd AI document (limit is 2)
4. Try to book 2nd consultation (limit is 1)

**Expected Results** ✅
- Each action blocked with clear message
- Message explains limit: "You've used 5 of 5 uploads"
- Shows upgrade option with pricing
- Links to subscription upgrade page

**Pass/Fail**: _____

**Notes**: _________________________________

---

#### Test 2.4 - Test Subscription Upgrade (Stripe)
**Objective**: Verify upgrade flow works with Stripe

**Steps**:
1. Free tier user clicks "Upgrade to Pro"
2. Stripe payment modal appears
3. Use Stripe test card: `4242 4242 4242 4242`
4. Fill test details:
   - Expiry: 12/25
   - CVC: 123
5. Complete payment

**Expected Results** ✅
- Payment processes successfully
- User tier changes to "Pro" in database
- Confirmation email sent
- Limits updated (50 uploads, 20 generations, etc.)
- Dashboard shows new plan

**Pass/Fail**: _____

**Notes**: _________________________________

---

#### Test 2.5 - Test Feature Limit Check API
**Objective**: Verify backend feature checking works

**Steps**:
1. Open browser DevTools → Network tab
2. Log in as Free user
3. Try to generate AI document
4. Watch network request to `/api/subscription/check/aiDocumentGenerations`

**Expected Results** ✅
- Request returns HTTP 200
- Response shows: `{"allowed": true/false, "remaining": 0}`
- If limit reached, request to `/api/ai/documents/generate` fails with 403

**Pass/Fail**: _____

**API Response**: ________________________

**Notes**: _________________________________

---

### TEST SUITE 3: Lawyer-Applicant Messaging

#### Test 3.1 - Send Message
**Objective**: Verify message sending works

**Setup**:
- Create 2 test accounts: 1 applicant, 1 lawyer
- Log in as applicant

**Steps**:
1. Go to Dashboard → Messages tab
2. Search for lawyer name or click "New Message"
3. Select the lawyer
4. Type message: "Hello, I need help with my application"
5. Click "Send"

**Expected Results** ✅
- Message sends immediately
- Appears in conversation thread on right
- Shows timestamp
- Displays as "sent" (checkmark)
- Message persists (reload page, still visible)

**Pass/Fail**: _____

**Notes**: _________________________________

---

#### Test 3.2 - Receive Message Notification
**Objective**: Verify email notification on new message

**Steps**:
1. Continue from Test 3.1
2. Lawyer account should receive email
3. Check email inbox (may be spam folder)

**Expected Results** ✅
- Email arrives within 1 minute
- Subject: "[ImmigrationAI] New message from {Applicant Name}"
- Email contains:
  - Sender name
  - Message preview
  - Link to message in dashboard
  - No sensitive data in email body

**Pass/Fail**: _____

**Email Received**: Yes / No

**Notes**: _________________________________

---

#### Test 3.3 - View Conversation History
**Objective**: Verify message thread loads correctly

**Steps**:
1. Log in as lawyer
2. Navigate to Messages
3. Click on applicant conversation
4. Scroll up to see previous messages

**Expected Results** ✅
- All messages load in order (oldest first)
- Messages show sender avatar/name
- Timestamps visible
- Own messages appear on right (blue)
- Received messages appear on left (gray)
- Can scroll through long conversations

**Pass/Fail**: _____

**Notes**: _________________________________

---

#### Test 3.4 - Mark Message as Read
**Objective**: Verify read status tracking

**Steps**:
1. Log in as applicant
2. Receive message from lawyer
3. Open Messages tab
4. Unread indicator should show (badge with number)
5. Click on conversation
6. Unread badge should disappear

**Expected Results** ✅
- Unread badge shows on conversation list
- Clicking conversation marks all as read
- Unread badge disappears
- API call to `PATCH /api/messages/:id/read` succeeds
- Status persists on refresh

**Pass/Fail**: _____

**Notes**: _________________________________

---

#### Test 3.5 - Delete Message
**Objective**: Verify message deletion works

**Steps**:
1. Hover over sent message
2. Click "Delete" button (trash icon)
3. Confirm deletion

**Expected Results** ✅
- Message disappears from conversation
- No longer visible to recipient
- API call returns 200 OK
- Conversation still visible
- Other messages remain

**Pass/Fail**: _____

**Notes**: _________________________________

---

#### Test 3.6 - Message Search (in Conversation List)
**Objective**: Verify ability to search conversations

**Steps**:
1. Messages tab
2. Type lawyer name in search box
3. Watch list filter

**Expected Results** ✅
- Conversation list filters by name
- Finds matching conversations
- Real-time filtering works

**Pass/Fail**: _____

**Notes**: _________________________________

---

#### Test 3.7 - Unread Count
**Objective**: Verify unread message counter

**Steps**:
1. As lawyer, send 3 messages to applicant
2. Log in as applicant
3. Check Messages tab

**Expected Results** ✅
- Conversation shows "3" badge
- Click another feature and return
- Badge still shows 3
- Open conversation, badge becomes 0

**Pass/Fail**: _____

**Notes**: _________________________________

---

### TEST SUITE 4: API Endpoint Verification

#### Test 4.1 - Test All AI Endpoints
**Objective**: Verify API endpoints exist and work

**Using cURL or Postman**:

```bash
# 1. Generate document
POST http://localhost:3000/api/ai/documents/generate
Headers: Authorization: Bearer {TOKEN}
Body:
{
  "type": "cover_letter",
  "visaType": "Skilled Worker",
  "country": "Canada",
  "applicantName": "John Doe",
  "applicantEmail": "john@example.com",
  "targetRole": "Software Engineer",
  "experience": "5 years",
  "education": "BS CS"
}

# Expected: 200 OK with document content
```

**Test Results**:
- [ ] POST /api/ai/documents/generate - Returns 200
- [ ] Response has `title`, `content`, `type`, `generatedAt`
- [ ] Content is valid markdown
- [ ] Takes 30-60 seconds

**Pass/Fail**: _____

**Notes**: _________________________________

---

#### Test 4.2 - Test Subscription Endpoints
**Objective**: Verify all subscription APIs work

```bash
# 1. Get all plans
GET http://localhost:3000/api/subscription/plans
# Expected: 200 OK with array of 3 plans

# 2. Get current subscription
GET http://localhost:3000/api/subscription/current
Headers: Authorization: Bearer {TOKEN}
# Expected: 200 OK with user's current tier and usage

# 3. Check feature access
GET http://localhost:3000/api/subscription/check/aiDocumentGenerations
Headers: Authorization: Bearer {TOKEN}
# Expected: 200 OK with {allowed: true/false}

# 4. Upgrade subscription
POST http://localhost:3000/api/subscription/upgrade
Headers: Authorization: Bearer {TOKEN}
Body:
{
  "stripePriceId": "price_1234567890",
  "paymentMethodId": "pm_1234567890"
}
# Expected: 200 OK with new tier info
```

**Test Results**:
- [ ] GET /api/subscription/plans - 200 OK
- [ ] GET /api/subscription/current - 200 OK
- [ ] GET /api/subscription/check/:feature - 200 OK
- [ ] POST /api/subscription/upgrade - 200 OK
- [ ] All responses properly formatted

**Pass/Fail**: _____

**Notes**: _________________________________

---

#### Test 4.3 - Test Message Endpoints
**Objective**: Verify all message APIs work

```bash
# 1. Send message
POST http://localhost:3000/api/messages
Headers: Authorization: Bearer {TOKEN}
Body:
{
  "recipientId": "user_123",
  "content": "Hello lawyer!"
}
# Expected: 201 Created with message object

# 2. Get conversations
GET http://localhost:3000/api/messages
Headers: Authorization: Bearer {TOKEN}
# Expected: 200 OK with array of conversations

# 3. Get conversation thread
GET http://localhost:3000/api/messages/conversation/user_123
Headers: Authorization: Bearer {TOKEN}
# Expected: 200 OK with array of messages

# 4. Get unread count
GET http://localhost:3000/api/messages/unread/count
Headers: Authorization: Bearer {TOKEN}
# Expected: 200 OK with {unreadCount: number}

# 5. Mark as read
PATCH http://localhost:3000/api/messages/msg_123/read
Headers: Authorization: Bearer {TOKEN}
# Expected: 200 OK

# 6. Delete message
DELETE http://localhost:3000/api/messages/msg_123
Headers: Authorization: Bearer {TOKEN}
# Expected: 200 OK
```

**Test Results**:
- [ ] POST /api/messages - 201 Created
- [ ] GET /api/messages - 200 OK
- [ ] GET /api/messages/conversation/:userId - 200 OK
- [ ] GET /api/messages/unread/count - 200 OK
- [ ] PATCH /api/messages/:id/read - 200 OK
- [ ] DELETE /api/messages/:id - 200 OK

**Pass/Fail**: _____

**Notes**: _________________________________

---

### TEST SUITE 5: Database Verification

#### Test 5.1 - Check Migrations Applied
**Objective**: Verify all database tables exist

```bash
# Connect to PostgreSQL
psql -U postgres -d immigration_ai

# Run these queries:
\dt  # List all tables
SELECT * FROM users LIMIT 1;
SELECT * FROM consultations LIMIT 1;
SELECT * FROM messages LIMIT 1;
SELECT * FROM documents LIMIT 1;
SELECT * FROM research_articles LIMIT 1;

# Check users table has metadata column
\d users
# Should show: metadata | jsonb
```

**Expected Results** ✅
- [ ] All 10+ tables exist
- [ ] `users` table has `metadata` JSONB column
- [ ] `messages` table exists with correct schema
- [ ] No migration errors in logs

**Pass/Fail**: _____

**Notes**: _________________________________

---

#### Test 5.2 - Verify User Subscription Data
**Objective**: Check subscription tier is stored

```bash
# In PostgreSQL:
SELECT id, email, metadata FROM users 
WHERE metadata->>'subscriptionTier' IS NOT NULL;

# Should return users with tier info
SELECT metadata->'subscriptionTier' as tier FROM users LIMIT 1;
# Result: "Pro" or "Free" or "Premium"
```

**Expected Results** ✅
- [ ] Users have subscription tier in metadata
- [ ] Tier values are "Free", "Pro", or "Premium"
- [ ] Upgrade updates the metadata

**Pass/Fail**: _____

**Notes**: _________________________________

---

## 📊 Test Results Summary

### Test Suite 1: AI Documents
| Test | Status | Notes |
|------|--------|-------|
| 1.1 - Generate Cover Letter | ⬜ | |
| 1.2 - Generate Resume | ⬜ | |
| 1.3 - Test All Types | ⬜ | |
| 1.4 - Feature Gating | ⬜ | |
| 1.5 - PDF Download | ⬜ | |
| 1.6 - Error Handling | ⬜ | |

**Suite 1 Score**: ___/6 passed

---

### Test Suite 2: Subscriptions
| Test | Status | Notes |
|------|--------|-------|
| 2.1 - View Plans | ⬜ | |
| 2.2 - Current Subscription | ⬜ | |
| 2.3 - Feature Gating | ⬜ | |
| 2.4 - Stripe Upgrade | ⬜ | |
| 2.5 - Feature Check API | ⬜ | |

**Suite 2 Score**: ___/5 passed

---

### Test Suite 3: Messaging
| Test | Status | Notes |
|------|--------|-------|
| 3.1 - Send Message | ⬜ | |
| 3.2 - Email Notification | ⬜ | |
| 3.3 - Conversation History | ⬜ | |
| 3.4 - Mark as Read | ⬜ | |
| 3.5 - Delete Message | ⬜ | |
| 3.6 - Search | ⬜ | |
| 3.7 - Unread Count | ⬜ | |

**Suite 3 Score**: ___/7 passed

---

### Test Suite 4: APIs
| Test | Status | Notes |
|------|--------|-------|
| 4.1 - AI Endpoints | ⬜ | |
| 4.2 - Subscription Endpoints | ⬜ | |
| 4.3 - Message Endpoints | ⬜ | |

**Suite 4 Score**: ___/3 passed

---

### Test Suite 5: Database
| Test | Status | Notes |
|------|--------|-------|
| 5.1 - Migrations | ⬜ | |
| 5.2 - Subscription Data | ⬜ | |

**Suite 5 Score**: ___/2 passed

---

## 🎯 Overall Results

**Total Tests**: 29  
**Passed**: ___  
**Failed**: ___  
**Skipped**: ___  

**Pass Rate**: _____%

### Verdict
- [ ] ✅ READY FOR PRODUCTION
- [ ] ⚠️ READY WITH FIXES
- [ ] ❌ NOT READY

---

## 🐛 Bugs Found

| ID | Severity | Description | Status |
|----|----------|-------------|--------|
| | | | |
| | | | |

---

## ✅ Sign-Off

**Tested By**: ___________________  
**Date**: ___________________  
**Environment**: Staging / Production  
**Notes**: _____________________________________

---

## 📞 Support

For issues during testing:
1. Check server logs: `npm run logs`
2. Check browser console for errors
3. Verify database connections
4. Check environment variables are set
5. Contact: support@immigrationai.com
