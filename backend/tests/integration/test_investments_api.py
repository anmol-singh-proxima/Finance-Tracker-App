"""Investment CRUD — happy path + validation/pagination edge cases."""

from typing import Any

from fastapi.testclient import TestClient


def _create_investment(client: TestClient, **overrides: Any) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "name": "Index Fund",
        "type": "ETF",
        "amount": "1000.00",
        "current_value": "1100.00",
        "purchase_date": "2026-01-01",
    }
    payload.update(overrides)
    response = client.post("/api/investments", json=payload)
    assert response.status_code == 201, response.text
    body: dict[str, Any] = response.json()
    return body


def test_create_investment(client: TestClient) -> None:
    created = _create_investment(client)
    assert created["name"] == "Index Fund"
    assert created["current_value"] == "1100.00"
    assert "user_id" not in created


def test_get_investment_by_id(client: TestClient) -> None:
    created = _create_investment(client)
    response = client.get(f"/api/investments/{created['id']}")
    assert response.status_code == 200


def test_get_nonexistent_investment_returns_404(client: TestClient) -> None:
    response = client.get("/api/investments/00000000-0000-0000-0000-000000000000")
    assert response.status_code == 404


def test_list_investments_filters_by_type(client: TestClient) -> None:
    _create_investment(client, type="ETF")
    _create_investment(client, type="Cryptocurrency")
    response = client.get("/api/investments", params={"type": "Cryptocurrency"})
    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["type"] == "Cryptocurrency"


def test_partial_update_only_changes_given_field(client: TestClient) -> None:
    created = _create_investment(client)
    response = client.put(f"/api/investments/{created['id']}", json={"current_value": "1250.00"})
    assert response.status_code == 200
    updated = response.json()
    assert updated["current_value"] == "1250.00"
    assert updated["name"] == created["name"]


def test_update_nonexistent_investment_returns_404(client: TestClient) -> None:
    response = client.put(
        "/api/investments/00000000-0000-0000-0000-000000000000",
        json={"current_value": "1.00"},
    )
    assert response.status_code == 404


def test_delete_then_get_returns_404(client: TestClient) -> None:
    created = _create_investment(client)
    assert client.delete(f"/api/investments/{created['id']}").status_code == 200
    assert client.get(f"/api/investments/{created['id']}").status_code == 404


def test_delete_nonexistent_investment_returns_404(client: TestClient) -> None:
    response = client.delete("/api/investments/00000000-0000-0000-0000-000000000000")
    assert response.status_code == 404


def test_create_with_zero_amount_is_rejected(client: TestClient) -> None:
    response = client.post(
        "/api/investments",
        json={
            "name": "X",
            "type": "ETF",
            "amount": "0",
            "current_value": "0",
            "purchase_date": "2026-01-01",
        },
    )
    assert response.status_code == 422


def test_create_with_negative_current_value_is_rejected(client: TestClient) -> None:
    response = client.post(
        "/api/investments",
        json={
            "name": "X",
            "type": "ETF",
            "amount": "100",
            "current_value": "-1",
            "purchase_date": "2026-01-01",
        },
    )
    assert response.status_code == 422


def test_create_with_missing_required_field_is_rejected(client: TestClient) -> None:
    response = client.post("/api/investments", json={"name": "X"})
    assert response.status_code == 422


def test_pagination_page_beyond_data_returns_empty(client: TestClient) -> None:
    _create_investment(client)
    response = client.get("/api/investments", params={"page": 5})
    body = response.json()
    assert body["items"] == []
    assert body["total"] == 1
