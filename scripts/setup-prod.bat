@echo off
REM Production setup script for Windows
REM This script guides through the complete production setup process

echo 🚀 Expense Tracker Production Setup
echo ===================================
echo.

echo This script will guide you through setting up the Expense Tracker application for production.
echo.

echo Step 1: Generate production secrets
echo -----------------------------------
echo This will create secure passwords and JWT secrets for production use.
echo.
pause
call scripts\generate-secrets.bat

echo.
echo Step 2: Configure environment
echo ----------------------------
echo Please edit the .env.prod file and:
echo 1. Add your OpenAI API key
echo 2. Update CORS_ORIGINS with your domain
echo 3. Update REACT_APP_API_URL with your domain
echo.
echo Opening .env.prod file...
notepad .env.prod
echo.
echo Have you finished configuring the environment file? (Press any key when ready)
pause >nul

echo.
echo Step 3: Deploy application
echo -------------------------
echo This will build and start all services in production mode.
echo.
pause
call scripts\deploy-prod.bat

echo.
echo 🎉 Production setup completed!
echo.
echo Your application should now be running at:
echo   Frontend: http://localhost
echo   API: http://localhost/api/v1
echo   Health Check: http://localhost/health
echo.
echo For more information, see DEPLOYMENT.md
echo.
pause