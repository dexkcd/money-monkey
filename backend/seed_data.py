#!/usr/bin/env python3
"""
Seed script to populate the database with default categories.
"""

import sys
from pathlib import Path

# Add the app directory to the Python path
sys.path.append(str(Path(__file__).parent))

from app.core.database import SessionLocal, engine
from app.models import Category, Base

def create_default_categories():
    """Create default expense categories."""
    db = SessionLocal()
    try:
        # Check if default categories already exist
        existing_categories = db.query(Category).filter(Category.is_default == True).count()
        if existing_categories > 0:
            print(f"Default categories already exist ({existing_categories} found). Skipping...")
            return

        # Create default categories
        default_categories = [
            {"name": "Restaurants", "color": "#EF4444", "is_default": True},
            {"name": "Housing", "color": "#3B82F6", "is_default": True},
            {"name": "Grocery", "color": "#10B981", "is_default": True},
            {"name": "Leisure", "color": "#8B5CF6", "is_default": True},
            {"name": "Uncategorized", "color": "#6B7280", "is_default": True},
        ]

        for cat_data in default_categories:
            category = Category(**cat_data)
            db.add(category)

        db.commit()
        print(f"Successfully created {len(default_categories)} default categories.")

    except Exception as e:
        print(f"Error creating default categories: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("Seeding database with default categories...")
    create_default_categories()
    print("Seeding complete.")