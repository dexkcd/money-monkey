#!/bin/bash

# Development helper script for Expense Tracker

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
}

# Setup environment files
setup_env() {
    print_status "Setting up environment files..."
    
    if [ ! -f .env ]; then
        cp .env.example .env
        print_status "Created .env from .env.example"
    fi
    
    if [ ! -f backend/.env ]; then
        cp backend/.env.example backend/.env
        print_status "Created backend/.env from backend/.env.example"
    fi
    
    if [ ! -f frontend/.env ]; then
        cp frontend/.env.example frontend/.env
        print_status "Created frontend/.env from frontend/.env.example"
    fi
    
    print_warning "Please update the .env files with your configuration before starting the services."
}

# Start development environment
start() {
    check_docker
    print_status "Starting development environment..."
    docker-compose up --build
}

# Stop development environment
stop() {
    print_status "Stopping development environment..."
    docker-compose down
}

# Clean up development environment
clean() {
    print_status "Cleaning up development environment..."
    docker-compose down -v --remove-orphans
    docker system prune -f
}

# Show logs
logs() {
    docker-compose logs -f "${2:-}"
}

# Show help
help() {
    echo "Expense Tracker Development Helper"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  setup     Setup environment files"
    echo "  start     Start development environment"
    echo "  stop      Stop development environment"
    echo "  clean     Clean up development environment"
    echo "  logs      Show logs (optional service name)"
    echo "  help      Show this help message"
}

# Main script logic
case "${1:-help}" in
    setup)
        setup_env
        ;;
    start)
        start
        ;;
    stop)
        stop
        ;;
    clean)
        clean
        ;;
    logs)
        logs "$@"
        ;;
    help|*)
        help
        ;;
esac