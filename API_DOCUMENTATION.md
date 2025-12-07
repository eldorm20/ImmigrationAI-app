# API Documentation - ImmigrationAI Platform
**Last Updated**: December 7, 2025  
**API Version**: 2.0

---

## Table of Contents
1. [AI Documents API](#ai-documents-api)
2. [Subscription API](#subscription-api)
3. [Messaging API](#messaging-api)
4. [Authentication](#authentication)
5. [Error Handling](#error-handling)
6. [Rate Limiting](#rate-limiting)

---

## AI Documents API

### Generate Document
Generate professional visa application documents using AI.

**Endpoint**: `POST /api/ai/documents/generate`

**Authentication**: Required (Bearer Token)

**Request Body**:
```json
{
  "type": "cover_letter|resume|sop|motivation_letter|cv",
  "visaType": "string (e.g., 'Skilled Worker', 'Student', 'Family')",
  "country": "string (e.g., 'Canada', 'UK', 'USA')",
  "applicantName": "string",
  "applicantEmail": "string (email format)",
  "targetRole": "string (optional, for cover letter/resume)",
  "experience": "string (work experience summary)",
  "education": "string (education background)",
  "additionalInfo": "string (optional, any other relevant info)"
}
```

**Request Example**:
```bash
curl -X POST http://localhost:3000/api/ai/documents/generate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "cover_letter",
    "visaType": "Skilled Worker",
    "country": "Canada",
    "applicantName": "John Doe",
    "applicantEmail": "john@example.com",
    "targetRole": "Senior Software Engineer",
    "experience": "5 years building cloud infrastructure",
    "education": "BS in Computer Science"
  }'
```

**Response** (200 OK):
```json
{
  "success": true,
  "document": {
    "id": "doc_uuid",
    "type": "cover_letter",
    "title": "Cover Letter - John Doe",
    "content": "# Cover Letter\n\n[Generated document content in markdown]",
    "visaType": "Skilled Worker",
    "country": "Canada",
    "generatedAt": "2025-12-07T10:30:00Z",
    "tokens_used": 1250,
    "model": "gpt-4o-mini"
  }
}
```

**Response** (403 Forbidden - Limit Exceeded):
```json
{
  "error": "Feature limit exceeded",
  "message": "You've used 2 of 2 AI document generations this month. Upgrade to Pro for more.",
  "tier": "Free",
  "used": 2,
  "limit": 2,
  "upgrade_url": "/subscription?tier=pro"
}
```

**Response** (400 Bad Request):
```json
{
  "error": "Validation error",
  "message": "applicantName is required"
}
```

**Response** (429 Too Many Requests):
```json
{
  "error": "Rate limit exceeded",
  "message": "You're generating documents too quickly. Please wait 60 seconds.",
  "retryAfter": 60
}
```

**Response** (500 Server Error):
```json
{
  "error": "Document generation failed",
  "message": "Failed to generate document. Please try again.",
  "requestId": "req_uuid"
}
```

**Curl Examples by Document Type**:

### Cover Letter
```bash
curl -X POST http://localhost:3000/api/ai/documents/generate \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "cover_letter",
    "visaType": "Skilled Worker",
    "country": "Canada",
    "applicantName": "Jane Smith",
    "applicantEmail": "jane@example.com",
    "targetRole": "Product Manager",
    "experience": "8 years in tech product management",
    "education": "MBA from Stanford University"
  }'
```

### Resume
```bash
curl -X POST http://localhost:3000/api/ai/documents/generate \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "resume",
    "visaType": "Skilled Worker",
    "country": "UK",
    "applicantName": "Ahmed Hassan",
    "applicantEmail": "ahmed@example.com",
    "experience": "3 years - Python developer, 2 years - DevOps engineer",
    "education": "BS Computer Engineering"
  }'
```

### Statement of Purpose (SOP)
```bash
curl -X POST http://localhost:3000/api/ai/documents/generate \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "sop",
    "visaType": "Student",
    "country": "USA",
    "applicantName": "Li Wei",
    "applicantEmail": "li@example.com",
    "targetRole": "Master\''s in Data Science",
    "experience": "2 years data analyst experience",
    "education": "BS Statistics"
  }'
```

---

## Subscription API

### Get All Available Plans

**Endpoint**: `GET /api/subscription/plans`

**Authentication**: Optional (shows same plans for all users)

**Request Example**:
```bash
curl -X GET http://localhost:3000/api/subscription/plans
```

**Response** (200 OK):
```json
{
  "plans": [
    {
      "id": "free",
      "name": "Free",
      "price": 0,
      "currency": "USD",
      "billingPeriod": "month",
      "stripePriceId": null,
      "features": {
        "documentsPerMonth": 5,
        "aiGenerationsPerMonth": 2,
        "consultationsPerMonth": 1,
        "storageGB": 1,
        "supportLevel": "community"
      },
      "description": "Perfect for getting started with immigration planning",
      "limits": {
        "documentUploadSize": "10MB",
        "aiGenerations": 2,
        "consultations": 1
      }
    },
    {
      "id": "pro",
      "name": "Pro",
      "price": 29,
      "currency": "USD",
      "billingPeriod": "month",
      "stripePriceId": "price_pro_123",
      "features": {
        "documentsPerMonth": 50,
        "aiGenerationsPerMonth": 20,
        "consultationsPerMonth": 10,
        "storageGB": 10,
        "supportLevel": "priority_email"
      },
      "description": "For serious visa applicants",
      "limits": {
        "documentUploadSize": "50MB",
        "aiGenerations": 20,
        "consultations": 10
      }
    },
    {
      "id": "premium",
      "name": "Premium",
      "price": 79,
      "currency": "USD",
      "billingPeriod": "month",
      "stripePriceId": "price_premium_123",
      "features": {
        "documentsPerMonth": 200,
        "aiGenerationsPerMonth": 100,
        "consultationsPerMonth": 50,
        "storageGB": 100,
        "supportLevel": "24_7_support",
        "customReports": true,
        "priority": true
      },
      "description": "Complete immigration planning suite",
      "limits": {
        "documentUploadSize": "200MB",
        "aiGenerations": 100,
        "consultations": 50
      }
    }
  ]
}
```

---

### Get Current User Subscription

**Endpoint**: `GET /api/subscription/current`

**Authentication**: Required (Bearer Token)

**Request Example**:
```bash
curl -X GET http://localhost:3000/api/subscription/current \
  -H "Authorization: Bearer {token}"
```

**Response** (200 OK):
```json
{
  "subscription": {
    "userId": "user_uuid",
    "tier": "Pro",
    "status": "active",
    "currentPeriodStart": "2025-12-01",
    "currentPeriodEnd": "2026-01-01",
    "renewalDate": "2026-01-01",
    "price": 29,
    "stripePriceId": "price_pro_123",
    "stripeSubscriptionId": "sub_stripe_123",
    "usage": {
      "documentsUploaded": 23,
      "documentsLimit": 50,
      "aiGenerationsUsed": 8,
      "aiGenerationsLimit": 20,
      "consultationsBooked": 3,
      "consultationsLimit": 10,
      "storageUsedGB": 2.5,
      "storageLimit": 10
    },
    "nextUpgrade": "Premium",
    "upgradePrice": 79
  }
}
```

**Response** (200 OK - Free Tier):
```json
{
  "subscription": {
    "userId": "user_uuid",
    "tier": "Free",
    "status": "active",
    "price": 0,
    "usage": {
      "documentsUploaded": 3,
      "documentsLimit": 5,
      "aiGenerationsUsed": 1,
      "aiGenerationsLimit": 2,
      "consultationsBooked": 0,
      "consultationsLimit": 1,
      "storageUsedGB": 0.5,
      "storageLimit": 1
    }
  }
}
```

---

### Check Feature Access

**Endpoint**: `GET /api/subscription/check/:feature`

**Authentication**: Required (Bearer Token)

**Parameters**:
- `:feature` - Feature to check (string):
  - `aiDocumentGenerations`
  - `documentUpload`
  - `consultationBooking`
  - `advancedAnalytics`
  - `customReports`
  - `prioritySupport`

**Request Examples**:
```bash
# Check if user can generate AI documents
curl -X GET http://localhost:3000/api/subscription/check/aiDocumentGenerations \
  -H "Authorization: Bearer {token}"

# Check if user can upload documents
curl -X GET http://localhost:3000/api/subscription/check/documentUpload \
  -H "Authorization: Bearer {token}"
```

**Response** (200 OK - Feature Allowed):
```json
{
  "feature": "aiDocumentGenerations",
  "allowed": true,
  "remaining": 12,
  "limit": 20,
  "resetsOn": "2026-01-01",
  "tier": "Pro"
}
```

**Response** (200 OK - Feature Denied):
```json
{
  "feature": "customReports",
  "allowed": false,
  "reason": "This feature is only available in Premium tier",
  "currentTier": "Pro",
  "upgradeTo": "Premium",
  "upgradeUrl": "/subscription?tier=premium"
}
```

---

### Upgrade Subscription

**Endpoint**: `POST /api/subscription/upgrade`

**Authentication**: Required (Bearer Token)

**Request Body**:
```json
{
  "stripePriceId": "price_pro_123",
  "paymentMethodId": "pm_stripe_123",
  "couponCode": "SAVE20" (optional)
}
```

**Request Example**:
```bash
curl -X POST http://localhost:3000/api/subscription/upgrade \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "stripePriceId": "price_pro_123",
    "paymentMethodId": "pm_stripe_123"
  }'
```

**Response** (200 OK):
```json
{
  "success": true,
  "subscription": {
    "tier": "Pro",
    "status": "active",
    "price": 29,
    "renewalDate": "2026-01-01",
    "stripeSubscriptionId": "sub_stripe_123"
  },
  "message": "Successfully upgraded to Pro! Your new features are now active."
}
```

**Response** (400 Bad Request - Invalid Payment):
```json
{
  "error": "Payment failed",
  "message": "Your card was declined. Please check your payment details.",
  "code": "card_declined"
}
```

---

## Messaging API

### Send Message

**Endpoint**: `POST /api/messages`

**Authentication**: Required (Bearer Token)

**Request Body**:
```json
{
  "recipientId": "user_uuid",
  "content": "string (1-5000 characters)",
  "conversationId": "uuid (optional, creates new if not provided)"
}
```

**Request Example**:
```bash
curl -X POST http://localhost:3000/api/messages \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "recipientId": "lawyer_uuid",
    "content": "Hello! I need help with my visa application for Canada."
  }'
```

**Response** (201 Created):
```json
{
  "success": true,
  "message": {
    "id": "msg_uuid",
    "conversationId": "conv_uuid",
    "senderId": "user_uuid",
    "recipientId": "lawyer_uuid",
    "content": "Hello! I need help with my visa application for Canada.",
    "isRead": false,
    "createdAt": "2025-12-07T10:30:00Z",
    "updatedAt": "2025-12-07T10:30:00Z"
  },
  "notificationSent": true
}
```

**Response** (400 Bad Request):
```json
{
  "error": "Validation error",
  "message": "Content is required and must be between 1-5000 characters"
}
```

**Response** (404 Not Found):
```json
{
  "error": "Recipient not found",
  "message": "The specified user does not exist"
}
```

---

### List Conversations

**Endpoint**: `GET /api/messages`

**Authentication**: Required (Bearer Token)

**Query Parameters**:
- `limit` - Number of conversations (default: 20, max: 100)
- `offset` - Pagination offset (default: 0)
- `sort` - Sort order: `latest|oldest` (default: latest)

**Request Examples**:
```bash
# Get latest 20 conversations
curl -X GET http://localhost:3000/api/messages \
  -H "Authorization: Bearer {token}"

# Get 50 latest conversations with offset
curl -X GET "http://localhost:3000/api/messages?limit=50&offset=0" \
  -H "Authorization: Bearer {token}"
```

**Response** (200 OK):
```json
{
  "success": true,
  "conversations": [
    {
      "conversationId": "conv_uuid_1",
      "userId": "user_uuid_1",
      "firstName": "John",
      "lastName": "Smith",
      "email": "john@example.com",
      "avatar": "https://example.com/avatar.jpg",
      "role": "lawyer",
      "lastMessage": "I'll help you with the next step...",
      "lastMessageTime": "2025-12-07T10:30:00Z",
      "unreadCount": 2,
      "isOnline": true
    },
    {
      "conversationId": "conv_uuid_2",
      "userId": "user_uuid_2",
      "firstName": "Sarah",
      "lastName": "Johnson",
      "email": "sarah@example.com",
      "avatar": "https://example.com/avatar.jpg",
      "role": "applicant",
      "lastMessage": "Thank you so much for your help!",
      "lastMessageTime": "2025-12-06T15:20:00Z",
      "unreadCount": 0,
      "isOnline": false
    }
  ],
  "total": 15,
  "limit": 20,
  "offset": 0
}
```

---

### Get Conversation Messages

**Endpoint**: `GET /api/messages/conversation/:userId`

**Authentication**: Required (Bearer Token)

**Parameters**:
- `:userId` - UUID of the user to get conversation with

**Query Parameters**:
- `limit` - Number of messages (default: 50, max: 100)
- `offset` - Pagination offset (default: 0)

**Request Example**:
```bash
curl -X GET "http://localhost:3000/api/messages/conversation/user_uuid?limit=50" \
  -H "Authorization: Bearer {token}"
```

**Response** (200 OK):
```json
{
  "success": true,
  "conversationId": "conv_uuid",
  "otherUser": {
    "userId": "user_uuid",
    "firstName": "John",
    "lastName": "Smith",
    "email": "john@example.com",
    "avatar": "https://example.com/avatar.jpg",
    "role": "lawyer"
  },
  "messages": [
    {
      "id": "msg_uuid_1",
      "senderId": "my_uuid",
      "senderName": "Jane Doe",
      "content": "Hi John, can you help me?",
      "isRead": true,
      "createdAt": "2025-12-05T10:00:00Z"
    },
    {
      "id": "msg_uuid_2",
      "senderId": "user_uuid",
      "senderName": "John Smith",
      "content": "Of course! Happy to help.",
      "isRead": true,
      "createdAt": "2025-12-05T10:15:00Z"
    },
    {
      "id": "msg_uuid_3",
      "senderId": "my_uuid",
      "senderName": "Jane Doe",
      "content": "Great! Here's my situation...",
      "isRead": true,
      "createdAt": "2025-12-05T10:30:00Z"
    }
  ],
  "total": 3,
  "limit": 50,
  "offset": 0
}
```

---

### Get Unread Message Count

**Endpoint**: `GET /api/messages/unread/count`

**Authentication**: Required (Bearer Token)

**Request Example**:
```bash
curl -X GET http://localhost:3000/api/messages/unread/count \
  -H "Authorization: Bearer {token}"
```

**Response** (200 OK):
```json
{
  "unreadCount": 5,
  "conversations": [
    {
      "conversationId": "conv_uuid_1",
      "userId": "user_uuid_1",
      "unreadCount": 3,
      "senderName": "John Smith"
    },
    {
      "conversationId": "conv_uuid_2",
      "userId": "user_uuid_2",
      "unreadCount": 2,
      "senderName": "Sarah Johnson"
    }
  ]
}
```

---

### Mark Message as Read

**Endpoint**: `PATCH /api/messages/:id/read`

**Authentication**: Required (Bearer Token)

**Parameters**:
- `:id` - Message UUID

**Request Example**:
```bash
curl -X PATCH http://localhost:3000/api/messages/msg_uuid/read \
  -H "Authorization: Bearer {token}"
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": {
    "id": "msg_uuid",
    "isRead": true,
    "updatedAt": "2025-12-07T10:30:00Z"
  }
}
```

---

### Delete Message

**Endpoint**: `DELETE /api/messages/:id`

**Authentication**: Required (Bearer Token)

**Parameters**:
- `:id` - Message UUID

**Request Example**:
```bash
curl -X DELETE http://localhost:3000/api/messages/msg_uuid \
  -H "Authorization: Bearer {token}"
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Message deleted successfully"
}
```

**Response** (403 Forbidden):
```json
{
  "error": "Forbidden",
  "message": "You can only delete your own messages"
}
```

**Response** (404 Not Found):
```json
{
  "error": "Not found",
  "message": "Message does not exist"
}
```

---

## Authentication

### Bearer Token Format

All authenticated endpoints require this header:

```
Authorization: Bearer {ACCESS_TOKEN}
```

### Getting a Token

**Login Endpoint**: `POST /api/auth/login`

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

**Response**:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "applicant"
  }
}
```

### Token Expiration

- Access tokens expire in **1 hour**
- Refresh tokens expire in **7 days**
- Use refresh token to get new access token

**Refresh Token Endpoint**: `POST /api/auth/refresh`

```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

---

## Error Handling

### Standard Error Response Format

All errors follow this format:

```json
{
  "error": "error_code",
  "message": "Human-readable error message",
  "statusCode": 400,
  "requestId": "req_uuid",
  "timestamp": "2025-12-07T10:30:00Z"
}
```

### HTTP Status Codes

| Code | Meaning | Examples |
|------|---------|----------|
| 200 | OK | Request succeeded |
| 201 | Created | Resource created (message sent) |
| 204 | No Content | Resource deleted |
| 400 | Bad Request | Invalid input, missing fields |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | Feature limit reached, insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate resource |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Server Error | Internal server error |

### Common Errors

#### 401 Unauthorized
```json
{
  "error": "unauthorized",
  "message": "Invalid or expired token. Please login again."
}
```

#### 403 Forbidden - Feature Limit
```json
{
  "error": "feature_limit_exceeded",
  "message": "You've reached your document generation limit. Upgrade to Pro.",
  "limit": 2,
  "used": 2,
  "resetDate": "2026-01-01"
}
```

#### 429 Rate Limited
```json
{
  "error": "rate_limited",
  "message": "You're making requests too quickly. Please wait 60 seconds.",
  "retryAfter": 60
}
```

#### 500 Server Error
```json
{
  "error": "internal_server_error",
  "message": "An unexpected error occurred. Please try again later.",
  "requestId": "req_uuid"
}
```

---

## Rate Limiting

API endpoints have rate limits to prevent abuse:

### Rate Limit Headers

Every response includes rate limit information:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1733604000
```

### Limits by Endpoint

| Endpoint | Limit | Window |
|----------|-------|--------|
| /api/ai/documents/generate | 10 | Per hour |
| /api/messages | 100 | Per hour |
| /api/subscription/upgrade | 5 | Per day |
| Other endpoints | 1000 | Per hour |

### Example Rate Limit Handling

```javascript
// JavaScript/Node.js
const response = await fetch('/api/messages', {
  headers: { 'Authorization': `Bearer ${token}` }
});

const remaining = response.headers.get('X-RateLimit-Remaining');
const reset = response.headers.get('X-RateLimit-Reset');

if (remaining === '0') {
  const resetDate = new Date(reset * 1000);
  console.log(`Rate limit reset at ${resetDate}`);
}
```

---

## Webhook Events

When certain events occur, webhooks are sent to configured endpoints.

### Subscription Webhook

**Event**: `subscription.updated`

**Body**:
```json
{
  "event": "subscription.updated",
  "data": {
    "userId": "user_uuid",
    "tier": "Pro",
    "status": "active",
    "renewalDate": "2026-01-01"
  },
  "timestamp": "2025-12-07T10:30:00Z",
  "signature": "sha256_signature"
}
```

### Message Webhook

**Event**: `message.created`

**Body**:
```json
{
  "event": "message.created",
  "data": {
    "messageId": "msg_uuid",
    "conversationId": "conv_uuid",
    "senderId": "user_uuid_1",
    "recipientId": "user_uuid_2",
    "content": "Message text...",
    "timestamp": "2025-12-07T10:30:00Z"
  },
  "signature": "sha256_signature"
}
```

---

## Testing

### Postman Collection

Import this collection into Postman for easy testing:

1. Download: `postman_collection.json`
2. In Postman: `File` → `Import`
3. Set environment variables:
   - `api_url`: `http://localhost:3000`
   - `token`: Your JWT token
4. Run requests

### cURL Examples

See specific endpoint sections above for cURL examples.

### Integration Testing

```javascript
// Example test using Jest
describe('AI Documents API', () => {
  it('should generate a cover letter', async () => {
    const response = await request(app)
      .post('/api/ai/documents/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({
        type: 'cover_letter',
        visaType: 'Skilled Worker',
        country: 'Canada',
        applicantName: 'John Doe',
        applicantEmail: 'john@example.com',
        experience: '5 years',
        education: 'BS CS'
      });

    expect(response.status).toBe(200);
    expect(response.body.document.type).toBe('cover_letter');
    expect(response.body.document.content).toBeTruthy();
  });
});
```

---

## Versioning

Current API Version: **2.0**

Breaking changes will increment the major version.
Use `X-API-Version` header to request specific version:

```bash
curl -X GET http://localhost:3000/api/messages \
  -H "X-API-Version: 2.0"
```

---

## Support

For API issues:
- Email: api-support@immigrationai.com
- Docs: https://docs.immigrationai.com
- GitHub Issues: https://github.com/immigrationai/app/issues
