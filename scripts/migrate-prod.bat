@echo off
REM Production database migration script for Windows
REM This script handles database migrations and seeding for production deployment

echo 🚀 Starting production database migration...

REM Check if .env.prod exists
if not exist .env.prod (
    echo ❌ Error: .env.prod file not found!
    echo Please run scripts\generate-secrets.bat first
    exit /b 1
)

REM Wait for database to be ready
echo ⏳ Waiting for database to be ready...
docker-compose -f docker-compose.prod.yml exec postgres pg_isready -U %POSTGRES_USER% -d %POSTGRES_DB%

REM Run database migrations
echo 📊 Running database migrations...
docker-compose -f docker-compose.prod.yml exec backend alembic upgrade head

REM Seed default data
echo 🌱 Seeding default data...
docker-compose -f docker-compose.prod.yml exec backend python -c "import asyncio; from app.core.database import get_db; from app.services.category import CategoryService; from app.models.category import Category; from sqlalchemy.orm import Session; async def seed_categories(): db = next(get_db()); existing_categories = db.query(Category).filter(Category.is_default == True).count(); print(f'Found {existing_categories} existing default categories'); db.close(); asyncio.run(seed_categories())"

echo ✅ Production database migration completed successfully!
echo.
echo Next steps:
echo 1. Verify the application is running: docker-compose -f docker-compose.prod.yml ps
echo 2. Check application health: curl http://localhost/health
echo 3. View logs: docker-compose -f docker-compose.prod.yml logs -f

pause