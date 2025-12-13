# Manual QA Checklist — ImmigrationAI

Follow these steps for a thorough manual QA sweep of the production/staging platform.
Mark each step Pass/Fail and include notes/screenshots when failing.

1) Public pages
- Visit `/` (home), `/features`, `/pricing`, `/blog`, `/research`, `/help`, `/contact`, `/privacy`, `/terms`.
- Verify pages load within reasonable time (under 5s) and core content is visible.
- Check header/footer links navigate correctly.

2) Accessibility
- Main landmark present, primary `h1` visible on key pages.
- Keyboard navigation: tab through header links and main CTAs.
- Images have `alt` attributes where appropriate.

3) Authentication
- Sign in as client (use test credentials or staging account): confirm dashboard loads.
- Sign in as lawyer: confirm lawyer UI (Cases/Clients) accessible.
- Attempt to access `/dashboard` when logged out — expect redirect to `/auth` or 401 for API calls.

4) Eligibility assessment
- Start assessment from home; answer questions; ensure progress/steps work.
- Submit (if staging/testing) and verify result contains approval probability and recommendations.

5) AI Chat
- Open chat widget, send question about documents/visa, expect non-empty, relevant response.

6) Document upload & analysis
- Upload a small PDF and verify analysis/feedback appears.
- Verify uploaded document is listed in user documents and download link (if provided) works.

7) Case management (lawyer)
- Create a new case (use staging/test account), verify it appears in list, view details.

8) Contact form
- Validate form shows errors on empty submit and success message on valid submit (use test email). DO NOT run on production inbox unless allowed.

9) Security & session
- Ensure sensitive API endpoints require Authorization header.
- Confirm session cookies have secure flags and HttpOnly where appropriate.

10) Performance & Errors
- Check browser console for JS errors on key pages.
- Run a Lighthouse report on home and features pages.

Notes
- Use test/staging accounts where possible. Do not run destructive tests on production accounts without consent.
- For automated runs, set `ALLOW_SUBMIT=1` to enable submit actions; otherwise tests will not modify data.
