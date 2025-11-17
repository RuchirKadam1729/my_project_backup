import pytest

@pytest.mark.asyncio
async def test_login_success(client):
    res = client.post("/api/auth/login", json={"username": "registrar@test.com", "password": "password"})
    assert res.status_code == 200
    body = res.json()
    assert "token" in body and isinstance(body["token"], str) and len(body["token"]) > 0