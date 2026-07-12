"""BR-13 / TR-DAT-01: a user must never be able to see or modify another
user's data. Missing-or-not-yours is always 404, never 403 — the two cases
are deliberately indistinguishable (see app/core/errors.py's NotFoundError
docstring)."""

from fastapi.testclient import TestClient

from tests.integration.conftest import OTHER_USER_SUB, as_user


def test_expense_created_by_one_user_is_404_for_another(client: TestClient) -> None:
    created = client.post(
        "/api/expenses", json={"category": "Food & Dining", "amount": "10.00"}
    ).json()

    with as_user(OTHER_USER_SUB):
        get_response = client.get(f"/api/expenses/{created['id']}")
        update_response = client.put(f"/api/expenses/{created['id']}", json={"amount": "999.00"})
        delete_response = client.delete(f"/api/expenses/{created['id']}")

    assert get_response.status_code == 404
    assert update_response.status_code == 404
    assert delete_response.status_code == 404


def test_expense_not_visible_in_other_users_list(client: TestClient) -> None:
    client.post("/api/expenses", json={"category": "Food & Dining", "amount": "10.00"})

    with as_user(OTHER_USER_SUB):
        response = client.get("/api/expenses")

    assert response.json()["total"] == 0
    assert response.json()["items"] == []


def test_investment_created_by_one_user_is_404_for_another(client: TestClient) -> None:
    created = client.post(
        "/api/investments",
        json={
            "name": "Index Fund",
            "type": "ETF",
            "amount": "1000.00",
            "current_value": "1100.00",
            "purchase_date": "2026-01-01",
        },
    ).json()

    with as_user(OTHER_USER_SUB):
        get_response = client.get(f"/api/investments/{created['id']}")
        delete_response = client.delete(f"/api/investments/{created['id']}")

    assert get_response.status_code == 404
    assert delete_response.status_code == 404


def test_dashboard_summary_is_isolated_per_user(client: TestClient) -> None:
    client.post("/api/expenses", json={"category": "Food & Dining", "amount": "500.00"})

    with as_user(OTHER_USER_SUB):
        response = client.get("/api/dashboard/summary")

    assert response.json()["expense_count"] == 0
    assert response.json()["total_expenses_this_period"] == "0"
