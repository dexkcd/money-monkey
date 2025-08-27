# Technology Stack

## Backend
- **Framework**: FastAPI with Python 3.x
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Authentication**: JWT tokens with python-jose
- **AI Integration**: OpenAI API for receipt processing
- **File Handling**: Pillow for image processing
- **Migration**: Alembic for database migrations

## Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for development and bundling
- **Styling**: Tailwind CSS for utility-first styling
- **HTTP Client**: Axios for API communication
- **Routing**: React Router DOM

## Development Environment
- **Containerization**: Docker Compose for local development
- **Database**: PostgreSQL 15 in container
- **Hot Reload**: Enabled for both frontend and backend

## Common Commands

### Development Setup
```bash
# Initial setup
scripts\dev.bat setup

# Start development environment
scripts\dev.bat start
# OR
docker-compose up --build

# Stop services
scripts\dev.bat stop
# OR
docker-compose down

# View logs
scripts\dev.bat logs [service-name]
```

### Frontend Commands
```bash
# In frontend directory
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Run ESLint
npm run preview      # Preview production build
```

### Backend Commands
```bash
# Database migrations (run inside backend container)
docker-compose exec backend alembic upgrade head
docker-compose exec backend alembic revision --autogenerate -m "message"

# Access backend container shell
docker-compose exec backend bash

# Install new Python packages (rebuild container after)
docker-compose exec backend pip install package-name
docker-compose up --build backend  # Rebuild after adding to requirements.txt
```

## Architecture Patterns
- **Service Layer**: Business logic separated into service classes
- **Repository Pattern**: Database operations abstracted through SQLAlchemy models
- **Dependency Injection**: FastAPI's dependency system for database sessions and auth
- **API Versioning**: Routes organized under `/api/v1/` prefix