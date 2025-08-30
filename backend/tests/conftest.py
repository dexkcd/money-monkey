"""
Test configuration and fixtures
"""
import asyncio
import os
import pytest
from typing import AsyncGenerator, Generator
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.core.database import get_db, Base
from app.core.deps import get_current_user
from app.models.user import User
from app.models.category import Category
from app.core.security import create_access_token

# Test database URL
TEST_DATABASE_URL = "sqlite:///./test.db"

# Create test engine
engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="function")
def db_session():
    """Create a fresh database session for each test."""
    # Create all tables
    Base.metadata.create_all(bind=engine)
    
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        # Drop all tables after test
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db_session):
    """Create a test client with database dependency override."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    
    with TestClient(app) as test_client:
        yield test_client
    
    app.dependency_overrides.clear()


@pytest.fixture
def test_user(db_session):
    """Create a test user."""
    from app.core.security import get_password_hash
    
    user = User(
        email="test@example.com",
        hashed_password=get_password_hash("testpassword123")
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def auth_headers(test_user):
    """Create authentication headers for test user."""
    access_token = create_access_token(data={"sub": test_user.email})
    return {"Authorization": f"Bearer {access_token}"}


@pytest.fixture
def authenticated_client(client, test_user, auth_headers):
    """Create an authenticated test client."""
    def override_get_current_user():
        return test_user
    
    app.dependency_overrides[get_current_user] = override_get_current_user
    
    # Set headers on client
    client.headers.update(auth_headers)
    
    yield client
    
    app.dependency_overrides.clear()


@pytest.fixture
def default_categories(db_session):
    """Create default expense categories."""
    categories = [
        Category(name="Restaurants", color="#EF4444", is_default=True),
        Category(name="Housing", color="#3B82F6", is_default=True),
        Category(name="Grocery", color="#10B981", is_default=True),
        Category(name="Leisure", color="#8B5CF6", is_default=True),
    ]
    
    for category in categories:
        db_session.add(category)
    
    db_session.commit()
    
    for category in categories:
        db_session.refresh(category)
    
    return categories


@pytest.fixture
def mock_openai_response():
    """Mock OpenAI API response for testing."""
    return {
        "choices": [
            {
                "message": {
                    "content": '{"category": "Restaurants", "confidence": 0.95, "amount": 25.50, "merchant": "Test Restaurant", "date": "2024-01-15"}'
                }
            }
        ]
    }