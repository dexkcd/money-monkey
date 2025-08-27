# Project Structure

## Root Directory
```
expense-tracker/
├── backend/                 # FastAPI backend application
├── frontend/                # React frontend application
├── scripts/                 # Development helper scripts
├── docker-compose.yml       # Container orchestration
├── .env.example            # Environment template
└── README.md               # Project documentation
```

## Backend Structure (`backend/`)
```
backend/
├── app/
│   ├── api/
│   │   └── v1/             # API version 1 routes
│   │       ├── expenses.py # Expense endpoints
│   │       └── categories.py # Category endpoints
│   ├── core/               # Core functionality
│   │   └── deps.py         # Dependencies (auth, db)
│   ├── models/             # SQLAlchemy database models
│   ├── schemas/            # Pydantic request/response schemas
│   ├── services/           # Business logic layer
│   │   ├── expense.py      # Expense business logic
│   │   ├── category.py     # Category business logic
│   │   ├── openai_service.py # AI integration
│   │   └── file_upload.py  # File handling
│   └── main.py             # FastAPI application entry
├── alembic/                # Database migrations
├── uploads/                # File storage (development)
├── Dockerfile              # Container definition
└── requirements.txt        # Python dependencies
```

## Frontend Structure (`frontend/`)
```
frontend/
├── src/
│   ├── components/         # Reusable React components
│   ├── pages/              # Page-level components
│   ├── hooks/              # Custom React hooks
│   ├── services/           # API client functions
│   ├── types/              # TypeScript type definitions
│   ├── utils/              # Utility functions
│   ├── App.tsx             # Main application component
│   └── main.tsx            # Application entry point
├── public/                 # Static assets
├── Dockerfile              # Container definition
└── package.json            # Node.js dependencies
```

## Key Conventions

### Backend
- **API Routes**: Organized by version (`/api/v1/`) and resource
- **Services**: Business logic separated from API controllers
- **Models**: Database entities using SQLAlchemy declarative base
- **Schemas**: Pydantic models for request/response validation
- **Dependencies**: Centralized in `core/deps.py` for reuse

### Frontend
- **Components**: Functional components with TypeScript
- **Styling**: Tailwind CSS utility classes
- **State Management**: React hooks and context
- **API Integration**: Axios-based service layer

### File Organization
- Group related functionality together
- Separate concerns (API, business logic, data models)
- Use clear, descriptive naming conventions
- Keep configuration files at appropriate levels