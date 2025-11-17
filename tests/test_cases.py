import pytest

@pytest.mark.asyncio
async def test_create_case_success(client, registrar_headers):
    payload = {
        "defendantName": "Unit Test Defendant",
        "defendantAddress": "123 Test St",
        "crimeType": "Theft",
        "crimeDate": "2024-01-01",
        "crimeLocation": "Test City",
        "arrestingOfficer": "Officer Test",
        "arrestDate": "2024-01-02",
        "presidingJudge": "Hon. Test",
        "publicProsecutor": "Test PP",
        "startDate": "2024-01-03",
        "expectedCompletionDate": "2024-06-01"
    }
    res = client.post("/api/cases", json=payload, headers=registrar_headers)
    assert res.status_code == 200
    body = res.json()
    assert body["defendantName"] == payload["defendantName"]
    assert body["cin"].startswith("CIN-")

@pytest.mark.asyncio
async def test_create_case_forbidden_for_lawyer(client, lawyer_headers):
    payload = {
        "defendantName": "Bad Attempt",
        "defendantAddress": "X",
        "crimeType": "Y",
        "crimeDate": "2024-01-01",
        "crimeLocation": "Z",
        "arrestingOfficer": "A",
        "arrestDate": "2024-01-02",
        "presidingJudge": "B",
        "publicProsecutor": "C",
        "startDate": "2024-01-03",
        "expectedCompletionDate": "2024-06-01"
    }
    res = client.post("/api/cases", json=payload, headers=lawyer_headers)
    assert res.status_code == 403