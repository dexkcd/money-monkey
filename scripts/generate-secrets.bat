@echo off
REM Generate production secrets script for Windows
REM This script generates secure random values for production deployment

echo Generating production secrets...

REM Generate JWT secret key (64 characters hex)
for /f %%i in ('powershell -command "[System.Web.Security.Membership]::GeneratePassword(64, 0)"') do set JWT_SECRET=%%i

REM Generate database password (32 characters)
for /f %%i in ('powershell -command "[System.Web.Security.Membership]::GeneratePassword(32, 8)"') do set DB_PASSWORD=%%i

REM Create .env.prod file from template
if not exist .env.prod (
    copy .env.prod.example .env.prod
    echo Created .env.prod from template
) else (
    echo Warning: .env.prod already exists. Creating .env.prod.new instead
    copy .env.prod.example .env.prod.new
)

set TARGET_FILE=.env.prod
if exist .env.prod.new set TARGET_FILE=.env.prod.new

REM Replace placeholder values using PowerShell
powershell -command "(Get-Content '%TARGET_FILE%') -replace 'your_secure_database_password_here', '%DB_PASSWORD%' | Set-Content '%TARGET_FILE%'"
powershell -command "(Get-Content '%TARGET_FILE%') -replace 'your_jwt_secret_key_here_minimum_32_characters', '%JWT_SECRET%' | Set-Content '%TARGET_FILE%'"

echo.
echo ✅ Secrets generated successfully!
echo.
echo Generated values:
echo - Database password: %DB_PASSWORD%
echo - JWT secret key: %JWT_SECRET%
echo.
echo ⚠️  IMPORTANT:
echo 1. Update the OPENAI_API_KEY in %TARGET_FILE%
echo 2. Update CORS_ORIGINS and REACT_APP_API_URL with your domain
echo 3. Keep these secrets secure and never commit them to version control
echo 4. Consider using a secrets management service for production
echo.
echo File created: %TARGET_FILE%

pause