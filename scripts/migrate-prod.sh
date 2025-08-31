#!/bin/bash

# Production database migration script
# This script handles database migrations and seeding for production deployment

set -e

echo "🚀 Starting production database migration..."

# Check if .env.prod exists
if [ ! -f .env.prod ]; then
    echo "❌ Error: .env.prod file not found!"
    echo "Please run ./scripts/generate-secrets.sh first"
    exit 1
fi

# Load environment variables
source .env.prod

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
docker-compose -f docker-compose.prod.yml exec postgres pg_isready -U $POSTGRES_USER -d $POSTGRES_DB

# Run database migrations
echo "📊 Running database migrations..."
docker-compose -f docker-compose.prod.yml exec backend alembic upgrade head

# Seed default data
echo "🌱 Seeding default data..."
docker-compose -f docker-compose.prod.yml exec backend python -c "
import asyncio
from app.core.database import get_db
from app.services.category import CategoryService
from app.models.category import Category
from sqlalchemy.orm import Session

async def seed_categories():
    db = next(get_db())
    category_service = CategoryService()
    
    # Check if default categories exist
    existing_categories = db.query(Category).filter(Category.is_default == True).count()
    
    if existing_categories == 0:
        print('Creating default categories...')
        default_categories = [
            {'name': 'Restaurants', 'color': '#EF4444', 'is_default': True},
            {'name': 'Housing', 'color': '#3B82F6', 'is_default': True},
            {'name': 'Grocery', 'color': '#10B981', 'is_default': True},
            {'name': 'Leisure', 'color': '#8B5CF6', 'is_default': True},
            {'name': 'Transportation', 'color': '#F59E0B', 'is_default': True},
            {'name': 'Healthcare', 'color': '#EC4899', 'is_default': True},
            {'name': 'Utilities', 'color': '#6B7280', 'is_default': True},
            {'name': 'Shopping', 'color': '#F97316', 'is_default': True}
        ]
        
        for cat_data in default_categories:
            category = Category(**cat_data)
            db.add(category)
        
        db.commit()
        print(f'Created {len(default_categories)} default categories')
    else:
        print(f'Default categories already exist ({existing_categories} found)')
    
    db.close()

asyncio.run(seed_categories())
"

echo "✅ Production database migration completed successfully!"
echo ""
echo "Next steps:"
echo "1. Verify the application is running: docker-compose -f docker-compose.prod.yml ps"
echo "2. Check application health: curl http://localhost/health"
echo "3. View logs: docker-compose -f docker-compose.prod.yml logs -f"