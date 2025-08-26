# Design Document

## Overview

The Expense Tracker is a full-stack web application that combines modern web technologies with AI capabilities to provide intelligent expense management. The system uses a FastAPI backend for high-performance API services, a React frontend with Tailwind CSS for responsive UI, and OpenAI's GPT-4 Vision API for receipt processing and expense categorization.

The application follows a microservices-inspired architecture with clear separation of concerns, enabling scalability and maintainability. Key features include AI-powered receipt processing, intelligent expense categorization, budget management with real-time notifications, and comprehensive analytics.

## Architecture

### System Architecture

```mermaid
graph TB
    subgraph "Frontend Layer"
        A[React App + Tailwind CSS]
        B[Service Worker]
        C[Push Notification Manager]
    end
    
    subgraph "Backend Layer"
        D[FastAPI Application]
        E[Authentication Service]
        F[Expense Service]
        G[Budget Service]
        H[Notification Service]
        I[Analytics Service]
    end
    
    subgraph "External Services"
        J[OpenAI API]
        K[File Storage]
        L[Push Service]
    end
    
    subgraph "Data Layer"
        M[SQLite Database]
        N[File System]
    end
    
    A --> D
    B --> C
    C --> L
    D --> E
    D --> F
    D --> G
    D --> H
    D --> I
    F --> J
    H --> J
    F --> K
    D --> M
    K --> N
```

### Technology Stack

- **Frontend**: React 18+ with TypeScript, Tailwind CSS, Vite
- **Backend**: FastAPI with Python 3.11+, Pydantic for data validation
- **Database**: PostgreSQL for both development and production
- **Development Environment**: Docker Compose for containerized setup
- **AI Services**: OpenAI GPT-4 Vision API for OCR and categorization
- **File Storage**: Local filesystem with configurable cloud storage support
- **Push Notifications**: Web Push API with service workers

## Components and Interfaces

### Frontend Components

#### Core Components
- **ExpenseUpload**: Handles file upload, camera capture, and drag-and-drop
- **ExpenseList**: Displays expenses with filtering and sorting
- **BudgetManager**: Manages monthly/weekly budgets per category
- **Analytics Dashboard**: Charts and graphs for spending visualization
- **NotificationCenter**: Manages push notification preferences
- **CategoryManager**: Allows editing of expense categories

#### Shared Components
- **FileUploader**: Reusable component for file handling
- **Chart**: Wrapper for chart library (Chart.js/Recharts)
- **Modal**: Generic modal component
- **Toast**: Notification toast system

### Backend Services

#### API Endpoints Structure
```
/api/v1/
├── auth/
│   ├── POST /login
│   ├── POST /register
│   └── POST /logout
├── expenses/
│   ├── GET /expenses
│   ├── POST /expenses
│   ├── PUT /expenses/{id}
│   ├── DELETE /expenses/{id}
│   └── POST /expenses/upload
├── budgets/
│   ├── GET /budgets
│   ├── POST /budgets
│   └── PUT /budgets/{id}
├── categories/
│   ├── GET /categories
│   ├── POST /categories
│   └── PUT /categories/{id}
├── analytics/
│   ├── GET /analytics/spending
│   └── GET /analytics/trends
└── notifications/
    ├── POST /notifications/subscribe
    └── GET /notifications/preferences
```

#### Service Layer Architecture

**ExpenseService**
- Receipt processing and OCR extraction
- OpenAI integration for categorization
- CRUD operations for expenses
- File upload handling

**BudgetService**
- Budget calculation and tracking
- Period management (weekly/monthly)
- Budget violation detection
- Spending aggregation

**NotificationService**
- Push notification management
- Budget alert logic
- Subscription handling
- Message queuing

**AnalyticsService**
- Spending trend analysis
- Chart data preparation
- Report generation
- Data aggregation

## Data Models

### Core Entities

```python
# User Model
class User(BaseModel):
    id: int
    email: str
    created_at: datetime
    preferences: UserPreferences

# Expense Model
class Expense(BaseModel):
    id: int
    user_id: int
    amount: Decimal
    description: str
    category_id: int
    date: date
    receipt_url: Optional[str]
    ai_confidence: Optional[float]
    created_at: datetime
    updated_at: datetime

# Category Model
class Category(BaseModel):
    id: int
    name: str
    color: str
    is_default: bool
    user_id: Optional[int]  # None for default categories

# Budget Model
class Budget(BaseModel):
    id: int
    user_id: int
    category_id: int
    amount: Decimal
    period_type: BudgetPeriod  # WEEKLY, MONTHLY
    start_date: date
    end_date: date
    created_at: datetime

# Receipt Processing Model
class ReceiptData(BaseModel):
    raw_text: str
    extracted_amount: Optional[Decimal]
    extracted_date: Optional[date]
    extracted_merchant: Optional[str]
    suggested_category: str
    confidence_score: float
```

### Database Schema

```sql
-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Categories table
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) DEFAULT '#6B7280',
    is_default BOOLEAN DEFAULT FALSE,
    user_id INTEGER REFERENCES users(id)
);

-- Expenses table
CREATE TABLE expenses (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    category_id INTEGER NOT NULL REFERENCES categories(id),
    expense_date DATE NOT NULL,
    receipt_url VARCHAR(500),
    ai_confidence DECIMAL(3,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Budgets table
CREATE TABLE budgets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    category_id INTEGER NOT NULL REFERENCES categories(id),
    amount DECIMAL(10,2) NOT NULL,
    period_type VARCHAR(10) NOT NULL CHECK (period_type IN ('WEEKLY', 'MONTHLY')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Docker Compose Development Environment

The development environment will use Docker Compose to orchestrate the following services:

```yaml
# docker-compose.yml structure
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: expense_tracker
      POSTGRES_USER: dev_user
      POSTGRES_PASSWORD: dev_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql://dev_user:dev_password@postgres:5432/expense_tracker
      OPENAI_API_KEY: ${OPENAI_API_KEY}
    depends_on:
      - postgres
    volumes:
      - ./backend:/app
      - uploads:/app/uploads

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      REACT_APP_API_URL: http://localhost:8000
    volumes:
      - ./frontend:/app
      - /app/node_modules

volumes:
  postgres_data:
  uploads:
```

## Error Handling

### API Error Responses
- **400 Bad Request**: Invalid input data, validation errors
- **401 Unauthorized**: Authentication required
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource not found
- **422 Unprocessable Entity**: Pydantic validation errors
- **429 Too Many Requests**: Rate limiting
- **500 Internal Server Error**: Server errors
- **503 Service Unavailable**: External service failures (OpenAI API)

### Error Handling Strategy
- Centralized error handling middleware in FastAPI
- Structured error responses with error codes and messages
- Graceful degradation for AI service failures
- Retry logic for transient failures
- User-friendly error messages in the frontend
- Logging and monitoring for debugging

### OpenAI API Error Handling
- Fallback to manual categorization when API is unavailable
- Retry mechanism with exponential backoff
- Rate limiting compliance
- Cost monitoring and budget controls

## Testing Strategy

### Backend Testing
- **Unit Tests**: Individual service and utility functions
- **Integration Tests**: API endpoints with database interactions
- **Contract Tests**: OpenAI API integration testing
- **Performance Tests**: Load testing for file upload endpoints

### Frontend Testing
- **Component Tests**: React component testing with React Testing Library
- **Integration Tests**: User flow testing with Cypress
- **Visual Regression Tests**: Screenshot comparison testing
- **Accessibility Tests**: WCAG compliance testing

### Test Data Management
- Factory pattern for test data generation
- Database seeding for consistent test environments
- Mock services for external API dependencies
- Automated test data cleanup

### Continuous Integration
- Automated testing on pull requests
- Code coverage reporting (minimum 80%)
- Linting and formatting checks
- Security vulnerability scanning
- Performance regression testing

## Security Considerations

### Authentication & Authorization
- JWT-based authentication with refresh tokens
- Password hashing using bcrypt
- Role-based access control (future enhancement)
- Session management and timeout

### Data Protection
- Input validation and sanitization
- SQL injection prevention with parameterized queries
- XSS protection with content security policy
- File upload validation and virus scanning
- Secure file storage with access controls

### API Security
- Rate limiting to prevent abuse
- CORS configuration for frontend access
- API key management for OpenAI integration
- Request/response logging for audit trails

### Privacy Compliance
- Data encryption at rest and in transit
- User data deletion capabilities
- Privacy policy compliance
- Minimal data collection principles