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

### Frontend Testing & Quality Assurance

#### Testing Stack
- **Unit/Component Tests**: Vitest + React Testing Library + Jest DOM
- **Integration Tests**: Playwright for cross-browser E2E testing
- **Accessibility Tests**: vitest-axe for WCAG compliance
- **Visual Regression Tests**: Playwright screenshot comparison
- **Test Orchestration**: Custom Node.js test runner for coordinated execution

#### Test Execution Commands
```bash
# Individual test types
npm run test                    # Unit/component tests
npm run test:watch             # Watch mode for development
npm run test:coverage          # Coverage report (80% minimum)
npm run test:e2e               # Integration tests
npm run test:accessibility     # Accessibility compliance
npm run test:visual            # Visual regression tests

# Orchestrated testing (recommended)
npm run test:all               # All tests sequentially
npm run test:all:parallel      # All tests in parallel (faster)
npm run test:runner unit       # Specific test type via runner
node scripts/test-runner.js --all --verbose  # Detailed output
```

#### Testing Process & Best Practices
- **Test-Driven Development**: Write tests before implementing features when possible
- **Component Testing**: Test user behavior, not implementation details
- **Integration Testing**: Verify complete user workflows and API interactions
- **Accessibility First**: Include WCAG compliance checks for all interactive components
- **Visual Consistency**: Use screenshot comparison to catch unintended UI changes
- **Save Test Results**: All test outputs are saved to `test-results/` directory for debugging

#### Test Coverage Requirements
- **Minimum Coverage**: 80% for lines, functions, branches, and statements
- **Component Coverage**: All major components must have comprehensive tests
- **Workflow Coverage**: All user journeys must be tested end-to-end
- **Accessibility Coverage**: All interactive elements must pass axe tests
- **Cross-browser Coverage**: Tests run on Chrome, Firefox, and Safari

#### Implementation Verification Process
1. **Write Component Tests**: Test rendering, interactions, and edge cases
2. **Add Integration Tests**: Verify complete user workflows with Playwright
3. **Include Accessibility Tests**: Ensure WCAG compliance with axe testing
4. **Add Visual Tests**: Capture screenshots for UI consistency
5. **Run Full Test Suite**: Use `npm run test:all:parallel` for comprehensive validation
6. **Review Test Results**: Check `test-results/` directory for detailed logs and coverage reports

#### Debugging & Troubleshooting
- **Component Tests**: Use `npm run test:watch` for development iteration
- **Integration Tests**: Use `npm run test:e2e:ui` for visual debugging
- **Test Failures**: Check saved logs in `test-results/` directory
- **Flaky Tests**: Use proper `waitFor` patterns and stable selectors
- **Performance**: Run tests in parallel for faster feedback cycles

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