#!/bin/bash

# Production deployment script
# This script handles the complete production deployment process

set -e

echo "🚀 Starting production deployment..."

# Configuration
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.prod"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if Docker is installed and running
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed or not in PATH"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running"
        exit 1
    fi
    
    # Check if Docker Compose is available
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed or not in PATH"
        exit 1
    fi
    
    # Check if environment file exists
    if [ ! -f "$ENV_FILE" ]; then
        log_error "Environment file $ENV_FILE not found!"
        log_info "Please run ./scripts/generate-secrets.sh first"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Build and deploy
deploy() {
    log_info "Building and deploying services..."
    
    # Pull latest images for base images
    log_info "Pulling base images..."
    docker-compose -f "$COMPOSE_FILE" pull postgres nginx
    
    # Build application images
    log_info "Building application images..."
    docker-compose -f "$COMPOSE_FILE" build --no-cache
    
    # Start services
    log_info "Starting services..."
    docker-compose -f "$COMPOSE_FILE" up -d
    
    # Wait for services to be healthy
    log_info "Waiting for services to be healthy..."
    sleep 30
    
    # Check service health
    check_health
}

# Health check
check_health() {
    log_info "Performing health checks..."
    
    # Check if all services are running
    if ! docker-compose -f "$COMPOSE_FILE" ps | grep -q "Up"; then
        log_error "Some services are not running"
        docker-compose -f "$COMPOSE_FILE" ps
        exit 1
    fi
    
    # Check application health endpoint
    max_attempts=30
    attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s http://localhost/health > /dev/null; then
            log_success "Application health check passed"
            break
        else
            log_info "Health check attempt $attempt/$max_attempts failed, retrying in 10 seconds..."
            sleep 10
            ((attempt++))
        fi
    done
    
    if [ $attempt -gt $max_attempts ]; then
        log_error "Application health check failed after $max_attempts attempts"
        log_info "Checking service logs..."
        docker-compose -f "$COMPOSE_FILE" logs --tail=50
        exit 1
    fi
}

# Run database migrations
migrate_database() {
    log_info "Running database migrations..."
    
    # Wait for database to be ready
    docker-compose -f "$COMPOSE_FILE" exec -T postgres pg_isready -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-expense_tracker}"
    
    # Run migrations
    docker-compose -f "$COMPOSE_FILE" exec -T backend alembic upgrade head
    
    log_success "Database migrations completed"
}

# Seed default data
seed_data() {
    log_info "Seeding default data..."
    
    docker-compose -f "$COMPOSE_FILE" exec -T backend python -c "
import asyncio
from app.core.database import get_db
from app.models.category import Category

def seed_categories():
    db = next(get_db())
    try:
        existing_categories = db.query(Category).filter(Category.is_default == True).count()
        
        if existing_categories == 0:
            print('Creating default categories...')
            default_categories = [
                Category(name='Restaurants', color='#EF4444', is_default=True),
                Category(name='Housing', color='#3B82F6', is_default=True),
                Category(name='Grocery', color='#10B981', is_default=True),
                Category(name='Leisure', color='#8B5CF6', is_default=True),
                Category(name='Transportation', color='#F59E0B', is_default=True),
                Category(name='Healthcare', color='#EC4899', is_default=True),
                Category(name='Utilities', color='#6B7280', is_default=True),
                Category(name='Shopping', color='#F97316', is_default=True)
            ]
            
            for category in default_categories:
                db.add(category)
            
            db.commit()
            print(f'Created {len(default_categories)} default categories')
        else:
            print(f'Default categories already exist ({existing_categories} found)')
    finally:
        db.close()

seed_categories()
"
    
    log_success "Default data seeding completed"
}

# Show deployment status
show_status() {
    log_info "Deployment Status:"
    echo ""
    
    # Show running services
    echo "Running Services:"
    docker-compose -f "$COMPOSE_FILE" ps
    echo ""
    
    # Show application info
    echo "Application URLs:"
    echo "  Frontend: http://localhost"
    echo "  API: http://localhost/api/v1"
    echo "  Health Check: http://localhost/health"
    echo ""
    
    # Show useful commands
    echo "Useful Commands:"
    echo "  View logs: docker-compose -f $COMPOSE_FILE logs -f"
    echo "  Stop services: docker-compose -f $COMPOSE_FILE down"
    echo "  Restart services: docker-compose -f $COMPOSE_FILE restart"
    echo "  Update deployment: ./scripts/deploy-prod.sh"
    echo ""
}

# Cleanup function
cleanup() {
    if [ $? -ne 0 ]; then
        log_error "Deployment failed!"
        log_info "Checking service logs..."
        docker-compose -f "$COMPOSE_FILE" logs --tail=50
    fi
}

# Set trap for cleanup
trap cleanup EXIT

# Main deployment process
main() {
    echo "🚀 Expense Tracker Production Deployment"
    echo "========================================"
    echo ""
    
    check_prerequisites
    deploy
    migrate_database
    seed_data
    show_status
    
    log_success "Production deployment completed successfully! 🎉"
}

# Parse command line arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "health")
        check_health
        ;;
    "migrate")
        migrate_database
        ;;
    "seed")
        seed_data
        ;;
    "status")
        show_status
        ;;
    *)
        echo "Usage: $0 [deploy|health|migrate|seed|status]"
        echo ""
        echo "Commands:"
        echo "  deploy  - Full deployment (default)"
        echo "  health  - Check application health"
        echo "  migrate - Run database migrations only"
        echo "  seed    - Seed default data only"
        echo "  status  - Show deployment status"
        exit 1
        ;;
esac