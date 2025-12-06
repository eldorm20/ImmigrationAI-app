# Pre-Deployment Checklist - December 6, 2025

## ✅ BUGS FIXED

- [x] **Authentication Middleware** - Fixed req.user property to include both `id` and `userId`
- [x] **ASK LAWYER Feature** - Added proper tab to dashboard and integrated ConsultationPanel
- [x] **Consultation Routes** - Reordered endpoints so `/available/lawyers` comes before `/:id`
- [x] **Missing endpoints** - Verified all required endpoints exist (auth/me, verify-email, reset-password, delete consultation)

## 🔍 VERIFICATION NEEDED

- [ ] Run `npm install` and `npm run build` to verify no TypeScript errors
- [ ] Test authentication flow (register, login, logout, token refresh)
- [ ] Test Ask Lawyer feature (request consultation, view lawyers, cancel)
- [ ] Test all API endpoints with proper user authentication
- [ ] Test email notifications are being sent
- [ ] Test document upload functionality
- [ ] Test payment/Stripe integration
- [ ] Verify multi-language support works
- [ ] Test dark mode toggle
- [ ] Test responsive design on mobile

## 📋 DATABASE & MIGRATIONS

- [x] Schema includes all required tables (users, applications, documents, consultations, payments, messages, audit_logs, research_articles, refresh_tokens)
- [x] All relationships and constraints defined
- [x] Indexes created for performance
- [ ] Run migrations: `npm run db:migrate`
- [ ] Verify database schema in production database

## 🚀 RAILWAY DEPLOYMENT PREP

- [ ] Set environment variables in Railway:
  - `DATABASE_URL` - From PostgreSQL plugin
  - `REDIS_URL` - From Redis plugin
  - `JWT_SECRET` - Generate new: `openssl rand -base64 32`
  - `REFRESH_SECRET` - Generate new: `openssl rand -base64 32`
  - `APP_URL` - Your Railway domain
  - `NODE_ENV=production`
  - `OPENAI_API_KEY` (if using OpenAI) or `HUGGINGFACE_API_TOKEN` (recommended)
  - `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` (if using payments)
  - `SENDGRID_API_KEY` or `SMTP_*` (for emails)

- [ ] Update GitHub Actions workflow to deploy to Railway
- [ ] Test CI/CD pipeline by pushing to main branch
- [ ] Verify Railway deployment auto-triggers
- [ ] Test deployed application on Railway URL

## 📝 GIT COMMIT

```bash
# Stage all changes
git add .

# Commit with descriptive message
git commit -m "fix: resolve critical authentication and Ask Lawyer bugs

- Fix authentication middleware to set both id and userId on req.user
- Add ASK LAWYER tab to dashboard with ConsultationPanel component
- Reorder consultation routes to fix /available/lawyers endpoint
- Verify all API endpoints exist (auth/me, verify-email, reset-password)
- Verify database schema includes all required tables
- Remove broken request consultation modal

Fixes all critical issues preventing app from working properly."

# Push to main
git push origin main
```

## ✨ FINAL CHECKS BEFORE DEPLOY

1. **Code Quality**
   - [ ] No TypeScript errors
   - [ ] No console.log left in production code
   - [ ] All imports are correct
   - [ ] No unused variables

2. **API Health**
   - [ ] All endpoints respond correctly
   - [ ] Authentication properly validates tokens
   - [ ] Error messages are helpful
   - [ ] Rate limiting is working

3. **Frontend**
   - [ ] All pages load without errors
   - [ ] Navigation works (all tabs, sidebar, buttons)
   - [ ] Forms submit correctly
   - [ ] Loading states show properly
   - [ ] Error messages display

4. **Features**
   - [ ] Registration → Email Verification → Login flow works
   - [ ] Ask Lawyer → Select Lawyer → Submit → Confirmation works
   - [ ] Document Upload works
   - [ ] AI Chat works
   - [ ] Multi-language switching works
   - [ ] Dark/Light mode toggle works

5. **Database**
   - [ ] Users can be created
   - [ ] Consultations can be created and retrieved
   - [ ] Documents can be uploaded
   - [ ] Tokens are stored and retrieved

## 🎯 POST-DEPLOYMENT

- [ ] Test live application on Railway
- [ ] Monitor error logs in Railway
- [ ] Verify emails are being sent
- [ ] Test Stripe webhooks (if applicable)
- [ ] Document any issues found
- [ ] Create monitoring alerts
- [ ] Setup database backups

## 📞 SUPPORT

If issues arise:
1. Check Railway logs: `railway logs`
2. Check Docker logs: `docker logs`
3. Check database connection
4. Verify all environment variables are set
5. Test locally to reproduce issue

---

**Status**: Ready for build and test  
**Last Updated**: December 6, 2025  
**Next Step**: Run `npm run build` to verify no TypeScript errors
