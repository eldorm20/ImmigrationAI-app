# ImmigrationAI - Bug Report & Action Plan
**Date:** December 12, 2025  
**Status:** IN PROGRESS

---

## Issues Reported

Based on user screenshots and feedback, the following issues have been identified:

### ✅ FIXED Issues:

#### 1. Employer Verification Missing from Sidebar
- **Status:** ✅ FIXED
- **Changes Made:**
  - Added `BadgeCheck` icon import to dashboard.tsx
  - Added Employer Verification menu item to sidebar navigation
  - Created `EmployerVerificationView` component
  - Positioned between AI Docs and Documents Upload
- **Commit:** b655350
- **Files Modified:** client/src/pages/dashboard.tsx, client/src/components/layout/Footer.tsx

---

### 🔴 CRITICAL Issues - Remaining:

#### 2. AI Chat - Repetitive Responses (Not Fully Interactive)
- **Location:** client/src/pages/dashboard.tsx - `ChatView` component (line ~638)
- **Issue:** Chat responds with same answer repeatedly, not maintaining conversation context
- **Root Cause:** Likely missing message history or chat session management
- **Action Required:** 
  - Check chat API endpoint for message context handling
  - Verify conversation history is being passed to AI
  - Review ChatView component state management

#### 3. AI Docs - API Error 403 (Forbidden)
- **Location:** client/src/pages/dashboard.tsx - `DocsView` component (line ~363)
- **Issue:** Document generation returns 403 Forbidden
- **Possible Causes:**
  - User role doesn't have permission to generate documents
  - Authentication token missing or invalid
  - Feature gating blocking based on subscription tier
- **Action Required:**
  - Check `/api/ai/documents` endpoint permissions
  - Verify user role and subscription tier
  - Check `featureGating.ts` middleware for document generation restrictions
  - Verify authentication middleware is passing token correctly

#### 4. Documents Upload - API Error 500
- **Location:** client/src/pages/dashboard.tsx - `UploadView` component (line ~762)
- **Issue:** File upload returns 500 Internal Server Error
- **Possible Causes:**
  - File validation failure
  - Storage service error (S3/storage backend)
  - Multer middleware configuration issue
  - File size exceeding limit
- **Files to Check:**
  - server/routes/documents.ts (upload handler)
  - server/lib/storage.ts (file upload logic)
  - server/middleware/validate.ts (file validation)
- **Action Required:**
  - Review upload handler error handling
  - Check storage service connection
  - Verify file size limits in multer config
  - Check server logs for detailed error

#### 5. Ask Lawyer (Consultations) - API Error 404
- **Location:** client/src/pages/dashboard.tsx - `ConsultationPanel` component
- **Issue:** Consultation request endpoint returns 404 Not Found
- **Possible Causes:**
  - Route not registered in backend
  - Endpoint path mismatch between frontend and backend
- **Files to Check:**
  - server/routes/consultations.ts
  - server/routes.ts (router registration)
  - server/index.ts (middleware setup)
- **Action Required:**
  - Verify `/api/consultations` route exists in backend
  - Check route is registered in main router
  - Verify correct HTTP method (POST likely)
  - Check authentication middleware

#### 6. Messages - Empty (No User List, No Realtime Chat)
- **Location:** client/src/components/messaging-panel.tsx (line ~38)
- **Issue:** Messages section shows "No conversations" even when users exist
- **Possible Causes:**
  - WebSocket connection not establishing
  - Participants list not loading from API
  - Real-time messaging service not connected
  - User query endpoint not working
- **Files to Check:**
  - client/src/components/messaging-panel.tsx
  - server/lib/messaging or socket service
  - Socket.io configuration
- **Action Required:**
  - Verify WebSocket connection is established
  - Check participants API endpoint (`/api/messages/participants`)
  - Review socket event listeners
  - Check for CORS issues with WebSocket

#### 7. Subscription Page - Display Issues
- **Location:** client/src/pages/subscription.tsx
- **Issues:**
  - Buttons showing blank text
  - Status not showing current actual status
  - Price field incomplete
- **Possible Causes:**
  - Translation keys missing (already partially fixed)
  - Subscription data not loading from API
  - Null/undefined values in state
- **Action Required:**
  - Verify subscription API endpoint returns correct data
  - Check t.subscription translation keys are complete
  - Add fallback values for missing data
  - Debug subscription state with console logs

#### 8. Footer Pages - Theme Switching to Light Mode
- **Location:** client/src/components/layout/Footer.tsx (links to /privacy, /terms, /contact, /blog)
- **Issue:** Navigating to footer pages switches theme to light mode automatically
- **Possible Causes:**
  - Page component forcing light mode on mount
  - Theme context not persisting across navigation
  - CSS reset removing dark mode classes
  - LocalStorage theme preference not being read
- **Files to Check:**
  - client/src/pages/privacy.tsx
  - client/src/pages/terms.tsx
  - client/src/pages/contact.tsx
  - client/src/pages/blog.tsx
  - client/src/lib/i18n.tsx (theme context)
- **Action Required:**
  - Verify theme persists in localStorage
  - Check each page's root className includes `dark:bg-slate-950`
  - Ensure theme provider wraps all pages
  - Test theme switching before/after navigation

#### 9. Logout Button Placement
- **Location:** client/src/pages/dashboard.tsx (sidebar, bottom left)
- **Issue:** User reports logout button should be consistent across all user roles
- **Current Status:** Already in bottom left of sidebar with proper styling
- **Action Required:**
  - Verify lawyer dashboard and other user dashboards have same logout placement
  - Ensure logout button is visible and accessible to all roles

---

## Investigation & Testing Guide

### To Test AI Chat:
```
1. Open Dashboard > AI Chat
2. Send message: "Help me with UK visa"
3. Observe response
4. Send follow-up: "What about processing time?"
5. Check if response references previous context or repeats same answer
6. Check browser console for API calls and responses
```

### To Test AI Docs:
```
1. Open Dashboard > AI Docs
2. Select document type (Motivation Letter)
3. Fill in form fields
4. Click "Generate"
5. Check browser Network tab for 403 error
6. Check response headers and error details
```

### To Test Document Upload:
```
1. Open Dashboard > Documents
2. Select a PDF file (< 10MB)
3. Click "Choose Files" or drag-drop
4. Monitor Network tab for upload request
5. Check for 500 error and error details
```

### To Test Consultations:
```
1. Open Dashboard > Ask Lawyer
2. Click "Request Consultation"
3. Fill form and submit
4. Check Network tab for 404 error
5. Verify API endpoint path
```

### To Test Messages:
```
1. Open Dashboard > Messages
2. Wait for connection (should see "Connected" message)
3. Check if participant list loads
4. Try sending a message (if test participant available)
5. Check browser Network tab for WebSocket connection
```

---

## Backend API Endpoint Checklist

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/api/ai/documents/generate` | POST | Generate documents | 🔴 403 Error |
| `/api/documents/upload` | POST | Upload files | 🔴 500 Error |
| `/api/consultations` | POST | Create consultation | 🔴 404 Error |
| `/api/messages/participants` | GET | Get conversation participants | ? Unknown |
| `/api/chat/completions` | POST | AI chat responses | ? Unknown (Repetitive) |
| `/api/subscription/current` | GET | Get user subscription | ⚠️ Partial Issue |

---

## Recommended Priority Order

1. **HIGH:** Fix Documents Upload (API 500) - Core feature
2. **HIGH:** Fix AI Docs (API 403) - Core feature  
3. **HIGH:** Fix Ask Lawyer (API 404) - Core feature
4. **MEDIUM:** Fix Messages (No user list) - Communication feature
5. **MEDIUM:** Fix AI Chat (Repetitive) - UX improvement
6. **LOW:** Fix Subscription display - UI polish
7. **LOW:** Fix Footer theme - UX refinement

---

## Files to Review for Backend Issues

```
server/
  ├── routes/
  │   ├── ai.ts          (AI Docs 403)
  │   ├── documents.ts   (Upload 500)
  │   ├── consultations.ts (Ask Lawyer 404)
  │   ├── messages.ts    (Messages empty)
  │   └── chat.ts        (Chat responses)
  ├── middleware/
  │   ├── auth.ts        (Auth issues)
  │   ├── featureGating.ts (403 errors)
  │   └── validate.ts    (File validation)
  └── lib/
      ├── storage.ts     (Upload handling)
      └── messaging.ts   (Real-time messages)
```

---

## Next Steps

1. ✅ Restore Employer Verification - DONE
2. ⏳ Investigate and fix API 403 error (AI Docs)
3. ⏳ Investigate and fix API 500 error (Documents Upload)
4. ⏳ Investigate and fix API 404 error (Ask Lawyer)
5. ⏳ Fix Messages WebSocket connection
6. ⏳ Debug AI Chat repetition
7. ⏳ Fix Subscription data binding
8. ⏳ Fix Footer page theme persistence
9. ⏳ Verify logout button consistency across roles

---

**Note:** Most of these issues appear to be backend API problems rather than frontend UI issues. The frontend components exist but are failing due to backend errors or missing endpoints.

*Report Generated: December 12, 2025*
