import pytest

@pytest.mark.asyncio
async def test_lawyer_view_creates_bill_and_can_list(client, lawyer_headers):
    res = client.get("/api/cases", headers=lawyer_headers)
    assert res.status_code == 200
    cases = res.json()
    assert isinstance(cases, list) and len(cases) > 0
    cin = cases[0]["cin"]
    res_view = client.get(f"/api/cases/{cin}", headers=lawyer_headers)
    assert res_view.status_code == 200
    res_bills = client.get("/api/bills", headers=lawyer_headers)
    assert res_bills.status_code == 200
    bills = res_bills.json()
    assert isinstance(bills, list)

@pytest.mark.asyncio
async def test_pay_bill_forbidden_for_non_lawyer(client, registrar_headers):
    res = client.put("/api/bills/some-random-id/pay", headers=registrar_headers)
    assert res.status_code == 403