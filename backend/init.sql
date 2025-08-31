-- Production database initialization script
-- This script sets up the initial database structure and default data

-- Create database if it doesn't exist (handled by Docker)
-- CREATE DATABASE IF NOT EXISTS expense_tracker_prod;

-- Set timezone
SET timezone = 'UTC';

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Insert default categories
-- This will be handled by the application migration system
-- but we can prepare the structure here

-- Create a function to insert default categories if they don't exist
CREATE OR REPLACE FUNCTION insert_default_categories()
RETURNS void AS $$
BEGIN
    -- This function will be called after the application starts
    -- and creates the necessary tables through Alembic migrations
    RAISE NOTICE 'Database initialized. Default categories will be seeded by the application.';
END;
$$ LANGUAGE plpgsql;

-- Log initialization
DO $$
BEGIN
    RAISE NOTICE 'Production database initialization completed at %', NOW();
END $$;