@echo off
echo ========================================
echo Git Commit and Push Script
echo ========================================
echo.

cd /d "c:\Users\USER\Documents\ImmigrationAI-app-main"

echo Adding modified files...
git add client\src\lib\i18n.tsx

echo.
echo Committing changes...
git commit -m "Fix console errors and add complete i18n translations (EN/UZ/RU) - Added simulator.options namespace - Added interview.options and translations - Added lawyer.searchPlaceholder - Expanded consultation namespace to 26 properties - Fixed undefined reading 'options' errors"

echo.
echo Pushing to GitHub...
git push origin main

echo.
echo ========================================
echo Done! Changes pushed to GitHub
echo ========================================
pause
