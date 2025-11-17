import os
import pytest
import asyncio
from fastapi.testclient import TestClient

# --- 1. Test Credentials (Make sure these match your DB initialization in backend/server.py) ---
LAWYER_CREDENTIALS = {
    "username": "lawyer@jis.system",
    "password": "password123"
}

REGISTRAR_CREDENTIALS = {
    "username": "registrar@jis.system",
    "password": "password123"
}

# --- 2. Environment Setup (Points to the MongoDB running on your host:27017) ---
os.environ.setdefault("MONGODB_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "test_jis")

# Import your FastAPI app here
from backend.server import app # Adjust import path as necessary

# --- 3. Event Loop Fix (Crucial for FastAPI/Motor async tests) ---
@pytest.fixture(scope="session")
def event_loop():
    """Redefine the event_loop fixture to be session-scoped."""
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
    
    yield loop
    loop.close()

# --- 4. Main Test Client Fixture ---
@pytest.fixture(scope="session")
def client():
    """Provides a TestClient instance for making API requests."""
    with TestClient(app) as tc:
        yield tc

# --- 5. Authentication Header Fixtures (Fixes 'fixture not found' errors) ---
@pytest.fixture(scope="session")
def lawyer_headers(client):
    """Logs in the lawyer user and returns the Authorization headers."""
    response = client.post("/auth/login", data=LAWYER_CREDENTIALS)
    
    if response.status_code != 200:
        pytest.fail(f"Lawyer login failed during test setup. Status: {response.status_code}, Body: {response.text}")
        
    token = response.json().get("access_token")
    if not token:
        pytest.fail("Lawyer login did not return an access token.")
        
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="session")
def registrar_headers(client):
    """Logs in the registrar user and returns the Authorization headers."""
    response = client.post("/auth/login", data=REGISTRAR_CREDENTIALS)
    
    if response.status_code != 200:
        pytest.fail(f"Registrar login failed during test setup. Status: {response.status_code}, Body: {response.text}")
    
    token = response.json().get("access_token")
    if not token:
        pytest.fail("Registrar login did not return an access token.")

    return {"Authorization": f"Bearer {token}"}