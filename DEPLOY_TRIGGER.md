This repository contains runtime fixes and defensive client changes intended to resolve several production crashes and usability issues. 

What I changed (summary):
- Defensive checks for missing/partial API responses (avoid .charAt / .title on undefined)
- Safer i18n usage for the Lawyer dashboard (prefer `t.lawyerDashboard` with fallbacks)
- Fixed a missing `ThemeToggle` import
- Made research listing public and robust to partial items

If you're reading this, you can trigger a redeploy (Railway UI) or use the helper scripts in `tools/deploy/`:
- `railway_set_env.ps1` — prompts for S3/Stripe env vars and runs `railway variables set` commands (requires Railway CLI and login).
- `railway_tail_logs.ps1` — tails Railway logs locally.

To trigger a redeploy via git (forces CI/build):

```pwsh
git commit --allow-empty -m "ci: redeploy after client fixes"
git push origin main
```

After deploy, perform a hard reload in the browser (Ctrl+Shift+R) and verify the pages: `/lawyer`, `/subscription`, `/research`, `/settings`, `/dashboard`.

If issues persist, capture Network responses and Console stack traces and paste them into the issue for further debugging.