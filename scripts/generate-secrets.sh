#!/bin/bash

# Generate production secrets script
# This script generates secure random values for production deployment

set -e

echo "Generating production secrets..."

# Generate JWT secret key (64 characters)
JWT_SECRET=$(openssl rand -hex 32)

# Generate database password (32 characters)
DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)

# Create .env.prod file from template
if [ ! -f .env.prod ]; then
    cp .env.prod.example .env.prod
    echo "Created .env.prod from template"
else
    echo "Warning: .env.prod already exists. Creating .env.prod.new instead"
    cp .env.prod.example .env.prod.new
fi

TARGET_FILE=".env.prod"
if [ -f .env.prod.new ]; then
    TARGET_FILE=".env.prod.new"
fi

# Replace placeholder values
sed -i "s/your_secure_database_password_here/$DB_PASSWORD/g" "$TARGET_FILE"
sed -i "s/your_jwt_secret_key_here_minimum_32_characters/$JWT_SECRET/g" "$TARGET_FILE"

echo ""
echo "✅ Secrets generated successfully!"
echo ""
echo "Generated values:"
echo "- Database password: $DB_PASSWORD"
echo "- JWT secret key: $JWT_SECRET"
echo ""
echo "⚠️  IMPORTANT:"
echo "1. Update the OPENAI_API_KEY in $TARGET_FILE"
echo "2. Update CORS_ORIGINS and REACT_APP_API_URL with your domain"
echo "3. Keep these secrets secure and never commit them to version control"
echo "4. Consider using a secrets management service for production"
echo ""
echo "File created: $TARGET_FILE"