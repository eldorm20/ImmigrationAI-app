/**
 * Comprehensive Manual QA Testing Checklist
 * Test all features before deploying to production
 */

# ImmigrationAI Platform - QA Testing Checklist

## Phase 1: Authentication & Authorization

### User Registration
- [ ] Register with valid email
- [ ] Register with existing email (should fail)
- [ ] Register with invalid email format (should fail)
- [ ] Verify email verification link is sent
- [ ] Confirm email verification works
- [ ] Check password strength validation

### User Login
- [ ] Login with valid credentials
- [ ] Login with invalid credentials (should fail)
- [ ] Login with unverified email (should fail appropriately)
- [ ] "Remember me" functionality
- [ ] "Forgot password" flow
- [ ] Password reset email received
- [ ] Password reset link works

### Role-Based Access
- [ ] Applicant can access client dashboard
- [ ] Applicant cannot access lawyer dashboard (403)
- [ ] Lawyer can access lawyer dashboard
- [ ] Lawyer can access client features
- [ ] Admin can access all features

## Phase 2: Client Dashboard

### Application Management
- [ ] Create new application
- [ ] View application list
- [ ] Edit application details
- [ ] Delete application
- [ ] Submit application to lawyer
- [ ] Application status updates correctly

### Roadmap
- [ ] Roadmap loads for application
- [ ] Roadmap items display correctly
- [ ] Mark roadmap item as complete
- [ ] Progress percentage updates
- [ ] Due dates display correctly

### Document Checklist
- [ ] Checklist loads for visa type
- [ ] Required documents marked correctly
- [ ] Upload document via checklist
- [ ] Document links to checklist item
- [ ] Checklist completion percentage updates
- [ ] "Submit to Lawyer" enabled when checklist complete

### Document Upload
- [ ] Upload PDF document
- [ ] Upload image document
- [ ] File size limit enforced
- [ ] File type validation works
- [ ] Document appears in documents list
- [ ] Download uploaded document
- [ ] Delete document

### AI Features
- [ ] AI Chat responds to immigration questions
- [ ] AI Chat responds in selected language (EN, UZ, RU)
- [ ] Generate Motivation Letter
- [ ] Generate CV Enhancement
- [ ] Generate Reference Letter
- [ ] Generate Student Visa Letter
- [ ] Generate Tourist Visa Letter
- [ ] Document generation includes user data
- [ ] Download generated document

### Interview Trainer
- [ ] Generate interview questions for visa type
- [ ] Submit answer to question
- [ ] Receive feedback on answer
- [ ] View score and suggestions
- [ ] Complete interview session

### Gov Checks
- [ ] Search UK company (Companies House)
- [ ] View company details
- [ ] Check Right to Work status
- [ ] Check Immigration Status
- [ ] Error handling for invalid inputs

### Visa Simulator
- [ ] Answer eligibility questions
- [ ] Submit visa prediction
- [ ] View eligibility result
- [ ] View probability score
- [ ] View recommendations

### Translation
- [ ] Translate text EN → UZ
- [ ] Translate text EN → RU  
- [ ] Translate text UZ → EN
- [ ] Translation preserves meaning

## Phase 3: Lawyer Dashboard

### Dashboard Overview
- [ ] Stats load correctly
- [ ] Revenue chart displays
- [ ] Application counts accurate
- [ ] Recent activity shows
- [ ] Policy updates display

### Leads Management
- [ ] View all leads
- [ ] Create new lead
- [ ] Edit lead details
- [ ] Convert lead to application
- [ ] Delete lead
- [ ] Filter leads by stage
- [ ] Sort leads by date/value

### Tasks Management
- [ ] View all tasks
- [ ] Create new task
- [ ] Edit task details
- [ ] Mark task as complete
- [ ] Delete task
- [ ] Filter by status
- [ ] Due date reminders

### Time Tracking
- [ ] Create time entry
- [ ] Edit time entry
- [ ] Delete time entry
- [ ] View time summary
- [ ] Filter by date range
- [ ] Mark entries as billed
- [ ] Link to invoice

### Client Management
- [ ] View client list
- [ ] View client details
- [ ] Edit client information
- [ ] View client applications
- [ ] View client documents

### Invoicing
- [ ] Create invoice
- [ ] Edit draft invoice
- [ ] Send invoice to client
- [ ] Mark invoice as paid
- [ ] Download invoice PDF
- [ ] View invoice history

### Consultations
- [ ] View consultation requests
- [ ] Schedule consultation
- [ ] Join video call
- [ ] Complete consultation
- [ ] Add consultation notes
- [ ] Reply to inquiry

### Analytics
- [ ] Revenue chart loads
- [ ] Application status breakdown
- [ ] Time tracking summary
- [ ] Export data as CSV
- [ ] Export data as JSON
- [ ] Date range filters work

## Phase 4: Communication

### Messages
- [ ] Send message to lawyer
- [ ] Receive message from lawyer
- [ ] Message notifications appear
- [ ] Mark message as read
- [ ] View message history

### Notifications
- [ ] Receive email notifications
- [ ] Notification preferences save
- [ ] Unread notifications count
- [ ] Clear notifications

## Phase 5: Payments

### Stripe Integration
- [ ] View subscription plans
- [ ] Select subscription plan
- [ ] Enter payment details
- [ ] Complete payment
- [ ] Subscription status updates
- [ ] Payment history visible
- [ ] Download invoice

### Payment Failures
- [ ] Declined card shows error
- [ ] Retry payment works
- [ ] Cancel subscription

## Phase 6: Mobile Responsiveness

### Mobile Layout (< 768px)
- [ ] Sidebar collapses to hamburger menu
- [ ] Dashboard cards stack vertically
- [ ] Forms are touch-friendly
- [ ] Tables scroll horizontally
- [ ] Buttons are tappable (min 44px)
- [ ] Text is readable (min 16px)

### Tablet Layout (768px - 1024px)
- [ ] Two-column layouts work
- [ ] Sidebar toggles smoothly
- [ ] Charts are readable
- [ ] Navigation is accessible

## Phase 7: Performance

### Load Times
- [ ] Homepage loads < 2s
- [ ] Dashboard loads < 3s
- [ ] Large file upload works
- [ ] AI responses within 5s
- [ ] Translation within 3s

### Error Handling
- [ ] Network failure shows error
- [ ] API timeout shows error
- [ ] 404 pages work
- [ ] 500 errors handled gracefully
- [ ] Form validation errors display

## Phase 8: Security

### Authentication
- [ ] JWT tokens expire correctly
- [ ] Refresh tokens work
- [ ] Logout clears tokens
- [ ] Protected routes redirect to login

### Authorization
- [ ] Cannot access other user's data
- [ ] Cannot edit other user's applications
- [ ] Cannot delete other user's documents
- [ ] Admin-only routes protected

### Input Validation
- [ ] XSS attacks prevented
- [ ] SQL injection prevented
- [ ] File upload restrictions enforced
- [ ] Rate limiting works

## Phase 9: Cross-Browser Testing

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

## Phase 10: Accessibility

- [ ] Keyboard navigation works
- [ ] Screen reader labels present
- [ ] Focus indicators visible
- [ ] Color contrast meets WCAG AA
- [ ] Form errors announced
- [ ] ARIA labels correct

## Deployment Verification

### Production Environment
- [ ] Database migrations run successfully
- [ ] Environment variables set
- [ ] Queue worker running
- [ ] Health check endpoint returns 200
- [ ] Logs are capturing errors
- [ ] AI services accessible
- [ ] Email delivery working
- [ ] File uploads to storage working

## Sign-Off

**Tested by**: _____________  
**Date**: _____________  
**Version**: _____________  
**Critical bugs found**: _____________  
**Approved for production**: [ ] Yes [ ] No
