"""Expense CRUD — happy path + validation/pagination edge cases. BR-13
cross-user isolation is covered separately in test_cross_user_isolation.py."""

from typing import Any

from fastapi.testclient import TestClient


def _create_expense(client: TestClient, **overrides: Any) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "category": "Food & Dining",
        "amount": "12.50",
        "description": "Lunch",
    }
    payload.update(overrides)
    response = client.post("/api/expenses", json=payload)
    assert response.status_code == 201, response.text
    body: dict[str, Any] = response.json()
    return body


def test_create_expense_defaults_date_to_today(client: TestClient) -> None:
    created = _create_expense(client)
    assert created["category"] == "Food & Dining"
    assert created["amount"] == "12.50"
    assert created["date"] is not None
    assert "user_id" not in created


def test_get_expense_by_id(client: TestClient) -> None:
    created = _create_expense(client)
    response = client.get(f"/api/expenses/{created['id']}")
    assert response.status_code == 200
    assert response.json()["id"] == created["id"]


def test_get_nonexistent_expense_returns_404(client: TestClient) -> None:
    response = client.get("/api/expenses/00000000-0000-0000-0000-000000000000")
    assert response.status_code == 404


def test_list_expenses_returns_created_items(client: TestClient) -> None:
    _create_expense(client, category="Food & Dining")
    _create_expense(client, category="Shopping")
    response = client.get("/api/expenses")
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 2
    assert len(body["items"]) == 2


def test_list_expenses_filters_by_category(client: TestClient) -> None:
    _create_expense(client, category="Food & Dining")
    _create_expense(client, category="Shopping")
    response = client.get("/api/expenses", params={"category": "Shopping"})
    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["category"] == "Shopping"


def test_list_expenses_filters_by_date_range(client: TestClient) -> None:
    _create_expense(client, date="2026-01-15")
    _create_expense(client, date="2026-06-15")
    response = client.get(
        "/api/expenses", params={"date_from": "2026-01-01", "date_to": "2026-01-31"}
    )
    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["date"] == "2026-01-15"


def test_partial_update_only_changes_given_field(client: TestClient) -> None:
    created = _create_expense(client)
    response = client.put(f"/api/expenses/{created['id']}", json={"amount": "99.99"})
    assert response.status_code == 200
    updated = response.json()
    assert updated["amount"] == "99.99"
    assert updated["category"] == created["category"]
    assert updated["description"] == created["description"]


def test_update_nonexistent_expense_returns_404(client: TestClient) -> None:
    response = client.put(
        "/api/expenses/00000000-0000-0000-0000-000000000000", json={"amount": "1.00"}
    )
    assert response.status_code == 404


def test_delete_then_get_returns_404(client: TestClient) -> None:
    created = _create_expense(client)
    delete_response = client.delete(f"/api/expenses/{created['id']}")
    assert delete_response.status_code == 200
    assert delete_response.json() == {"success": True}

    get_response = client.get(f"/api/expenses/{created['id']}")
    assert get_response.status_code == 404


def test_delete_nonexistent_expense_returns_404(client: TestClient) -> None:
    response = client.delete("/api/expenses/00000000-0000-0000-0000-000000000000")
    assert response.status_code == 404


def test_create_with_zero_amount_is_rejected(client: TestClient) -> None:
    response = client.post("/api/expenses", json={"category": "Food & Dining", "amount": "0"})
    assert response.status_code == 422


def test_create_with_negative_amount_is_rejected(client: TestClient) -> None:
    response = client.post("/api/expenses", json={"category": "Food & Dining", "amount": "-5"})
    assert response.status_code == 422


def test_create_with_missing_category_is_rejected(client: TestClient) -> None:
    response = client.post("/api/expenses", json={"amount": "10.00"})
    assert response.status_code == 422


def test_create_with_unknown_category_is_rejected(client: TestClient) -> None:
    response = client.post(
        "/api/expenses", json={"category": "Not A Real Category", "amount": "10.00"}
    )
    assert response.status_code == 422


def test_create_with_oversized_description_is_rejected(client: TestClient) -> None:
    response = client.post(
        "/api/expenses",
        json={"category": "Food & Dining", "amount": "1.00", "description": "x" * 1001},
    )
    assert response.status_code == 422


def test_create_with_malformed_date_is_rejected(client: TestClient) -> None:
    response = client.post(
        "/api/expenses",
        json={"category": "Food & Dining", "amount": "1.00", "date": "not-a-date"},
    )
    assert response.status_code == 422


def test_pagination_page_beyond_data_returns_empty_not_error(client: TestClient) -> None:
    _create_expense(client)
    response = client.get("/api/expenses", params={"page": 5, "page_size": 20})
    assert response.status_code == 200
    body = response.json()
    assert body["items"] == []
    assert body["total"] == 1


def test_pagination_oversized_page_size_is_rejected(client: TestClient) -> None:
    response = client.get("/api/expenses", params={"page_size": 101})
    assert response.status_code == 422


def test_pagination_defaults(client: TestClient) -> None:
    response = client.get("/api/expenses")
    body = response.json()
    assert body["page"] == 1
    assert body["page_size"] == 20
