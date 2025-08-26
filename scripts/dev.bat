@echo off
setlocal enabledelayedexpansion

REM Development helper script for Expense Tracker (Windows)

set "command=%1"

if "%command%"=="" set "command=help"

goto %command% 2>nul || goto help

:setup
echo [INFO] Setting up environment files...
if not exist .env (
    copy .env.example .env >nul
    echo [INFO] Created .env from .env.example
)
if not exist backend\.env (
    copy backend\.env.example backend\.env >nul
    echo [INFO] Created backend\.env from backend\.env.example
)
if not exist frontend\.env (
    copy frontend\.env.example frontend\.env >nul
    echo [INFO] Created frontend\.env from frontend\.env.example
)
echo [WARNING] Please update the .env files with your configuration before starting the services.
goto end

:start
echo [INFO] Starting development environment...
docker-compose up --build
goto end

:stop
echo [INFO] Stopping development environment...
docker-compose down
goto end

:clean
echo [INFO] Cleaning up development environment...
docker-compose down -v --remove-orphans
docker system prune -f
goto end

:logs
docker-compose logs -f %2
goto end

:help
echo Expense Tracker Development Helper
echo.
echo Usage: %0 [command]
echo.
echo Commands:
echo   setup     Setup environment files
echo   start     Start development environment
echo   stop      Stop development environment
echo   clean     Clean up development environment
echo   logs      Show logs (optional service name)
echo   help      Show this help message
goto end

:end