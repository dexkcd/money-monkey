@echo off
REM Production deployment script for Windows
REM This script handles the complete production deployment process

setlocal enabledelayedexpansion

echo 🚀 Starting production deployment...

REM Configuration
set COMPOSE_FILE=docker-compose.prod.yml
set ENV_FILE=.env.prod

REM Check prerequisites
echo ℹ️  Checking prerequisites...

REM Check if Docker is installed and running
docker info >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker is not installed or not running
    exit /b 1
)

REM Check if Docker Compose is available
docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker Compose is not installed
    exit /b 1
)

REM Check if environment file exists
if not exist %ENV_FILE% (
    echo ❌ Environment file %ENV_FILE% not found!
    echo ℹ️  Please run scripts\generate-secrets.bat first
    exit /b 1
)

echo ✅ Prerequisites check passed

REM Build and deploy
echo ℹ️  Building and deploying services...

REM Pull latest images for base images
echo ℹ️  Pulling base images...
docker-compose -f %COMPOSE_FILE% pull postgres nginx

REM Build application images
echo ℹ️  Building application images...
docker-compose -f %COMPOSE_FILE% build --no-cache

REM Start services
echo ℹ️  Starting services...
docker-compose -f %COMPOSE_FILE% up -d

REM Wait for services to be healthy
echo ℹ️  Waiting for services to be healthy...
timeout /t 30 /nobreak >nul

REM Check application health endpoint
echo ℹ️  Performing health checks...
set /a attempt=1
set /a max_attempts=30

:health_check_loop
curl -f -s http://localhost/health >nul 2>&1
if not errorlevel 1 (
    echo ✅ Application health check passed
    goto health_check_done
)

echo ℹ️  Health check attempt !attempt!/!max_attempts! failed, retrying in 10 seconds...
timeout /t 10 /nobreak >nul
set /a attempt+=1

if !attempt! leq !max_attempts! goto health_check_loop

echo ❌ Application health check failed after !max_attempts! attempts
echo ℹ️  Checking service logs...
docker-compose -f %COMPOSE_FILE% logs --tail=50
exit /b 1

:health_check_done

REM Run database migrations
echo ℹ️  Running database migrations...
docker-compose -f %COMPOSE_FILE% exec -T backend alembic upgrade head
echo ✅ Database migrations completed

REM Seed default data
echo ℹ️  Seeding default data...
docker-compose -f %COMPOSE_FILE% exec -T backend python -c "from app.core.database import get_db; from app.models.category import Category; db = next(get_db()); existing = db.query(Category).filter(Category.is_default == True).count(); print(f'Found {existing} default categories'); db.close()"
echo ✅ Default data seeding completed

REM Show deployment status
echo ℹ️  Deployment Status:
echo.
echo Running Services:
docker-compose -f %COMPOSE_FILE% ps
echo.
echo Application URLs:
echo   Frontend: http://localhost
echo   API: http://localhost/api/v1
echo   Health Check: http://localhost/health
echo.
echo Useful Commands:
echo   View logs: docker-compose -f %COMPOSE_FILE% logs -f
echo   Stop services: docker-compose -f %COMPOSE_FILE% down
echo   Restart services: docker-compose -f %COMPOSE_FILE% restart
echo   Update deployment: scripts\deploy-prod.bat
echo.

echo ✅ Production deployment completed successfully! 🎉

pause