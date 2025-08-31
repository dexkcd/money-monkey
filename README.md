# Expense Tracker

An AI-powered expense tracking application built with FastAPI and React.

## Features

- AI-powered receipt processing and expense categorization
- Budget management with real-time notifications
- Comprehensive analytics and spending insights
- Modern web interface with responsive design

## Tech Stack

- **Backend**: FastAPI, PostgreSQL, SQLAlchemy, OpenAI API
- **Frontend**: React, TypeScript, Tailwind CSS, Vite
- **Development**: Docker Compose for containerized development

## Quick Start

### Prerequisites

- Docker and Docker Compose
- OpenAI API key (for AI features)

### Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd expense-tracker
   ```

2. Copy environment files:
   ```bash
   cp .env.example .env
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

3. Update the `.env` files with your configuration:
   - Add your OpenAI API key
   - Update database credentials if needed
   - Set a secure secret key for JWT tokens

4. Start the development environment:
   ```bash
   docker-compose up --build
   ```

5. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

### Development

The development environment includes:
- Hot reloading for both frontend and backend
- PostgreSQL database with persistent storage
- Volume mounts for live code editing

### Environment Variables

See `.env.example` files for all available configuration options.

## Production Deployment

For production deployment, use the dedicated production configuration:

### Quick Production Setup

1. **Generate production secrets:**
   ```bash
   ./scripts/generate-secrets.sh    # Linux/macOS
   scripts\generate-secrets.bat     # Windows
   ```

2. **Configure environment:**
   Edit the generated `.env.prod` file with your OpenAI API key and domain settings.

3. **Deploy:**
   ```bash
   ./scripts/deploy-prod.sh         # Linux/macOS
   scripts\deploy-prod.bat          # Windows
   ```

4. **Verify deployment:**
   - Frontend: http://localhost
   - Health Check: http://localhost/health

### Production Features

- **Optimized Docker builds** with multi-stage builds
- **Nginx reverse proxy** with SSL support and rate limiting
- **Health checks** and monitoring endpoints
- **Database migrations** and default data seeding
- **Security hardening** with non-root containers
- **Comprehensive logging** and error handling

For detailed production deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md).

## Project Structure

```
expense-tracker/
├── backend/                 # FastAPI backend
│   ├── app/                # Application code
│   ├── Dockerfile          # Backend container
│   └── requirements.txt    # Python dependencies
├── frontend/               # React frontend
│   ├── src/               # Source code
│   ├── Dockerfile         # Frontend container
│   └── package.json       # Node.js dependencies
├── docker-compose.yml     # Development environment
└── .env.example          # Environment configuration template
```

## License

MIT License