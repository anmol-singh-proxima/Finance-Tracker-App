"""Dashboard endpoints (BR-07/08/09)."""

from fastapi.testclient import TestClient


def test_summary_with_zero_data_has_no_div_by_zero(client: TestClient) -> None:
    response = client.get("/api/dashboard/summary")
    assert response.status_code == 200
    body = response.json()
    assert body["roi"] == 0
    assert body["total_expenses_this_period"] == "0"


def test_summary_reflects_created_expense(client: TestClient) -> None:
    client.post("/api/expenses", json={"category": "Food & Dining", "amount": "50.00"})
    response = client.get("/api/dashboard/summary")
    body = response.json()
    assert body["expense_count"] == 1
    assert body["total_expenses_this_period"] == "50.00"


def test_trends_at_max_months_bound(client: TestClient) -> None:
    response = client.get("/api/dashboard/trends", params={"months": 24})
    assert response.status_code == 200
    assert len(response.json()["points"]) == 24


def test_trends_beyond_max_months_is_rejected(client: TestClient) -> None:
    response = client.get("/api/dashboard/trends", params={"months": 25})
    assert response.status_code == 422


def test_trends_default_is_six_months(client: TestClient) -> None:
    response = client.get("/api/dashboard/trends")
    assert len(response.json()["points"]) == 6


def test_breakdown_with_no_expenses_in_range_is_empty_not_error(client: TestClient) -> None:
    response = client.get(
        "/api/dashboard/breakdown",
        params={"date_from": "2020-01-01", "date_to": "2020-01-31"},
    )
    assert response.status_code == 200
    assert response.json()["items"] == []


def test_breakdown_percentages_reflect_relative_spend(client: TestClient) -> None:
    client.post("/api/expenses", json={"category": "Food & Dining", "amount": "60.00"})
    client.post("/api/expenses", json={"category": "Shopping", "amount": "40.00"})
    response = client.get("/api/dashboard/breakdown")
    items = response.json()["items"]
    assert len(items) == 2
    percentages = sorted(item["percentage"] for item in items)
    assert percentages == [40.0, 60.0]
