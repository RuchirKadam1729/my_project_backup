import pytest

@pytest.mark.asyncio
async def test_generate_pending_report_success(client, registrar_headers):
    res = client.post("/api/reports", json={"reportType": "pending"}, headers=registrar_headers)
    assert res.status_code == 200
    body = res.json()
    assert "content" in body and "totalPendingCases" in body["content"]

@pytest.mark.asyncio
async def test_generate_report_forbidden_for_lawyer(client, lawyer_headers):
    res = client.post("/api/reports", json={"reportType": "pending"}, headers=lawyer_headers)
    assert res.status_code == 403