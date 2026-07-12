"""Category endpoints (BR-03, BR-18): listing, typed CRUD, single-level
hierarchy, and safe deletion."""

from typing import Any

from fastapi.testclient import TestClient

from tests.integration.conftest import OTHER_USER_SUB, as_user


def _create(client: TestClient, **payload: Any) -> dict[str, Any]:
    response = client.post("/api/categories", json=payload)
    assert response.status_code == 201, response.text
    body: dict[str, Any] = response.json()
    return body


def test_list_categories_includes_predefined(client: TestClient) -> None:
    response = client.get("/api/categories")
    assert response.status_code == 200
    categories = response.json()
    predefined_names = {c["name"] for c in categories if c["is_predefined"]}
    assert "Food & Dining" in predefined_names


def test_create_custom_category(client: TestClient) -> None:
    response = client.post("/api/categories", json={"name": "Pet Supplies"})
    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Pet Supplies"
    assert body["is_predefined"] is False


def test_create_duplicate_custom_category_is_rejected(client: TestClient) -> None:
    client.post("/api/categories", json={"name": "Pet Supplies"})
    response = client.post("/api/categories", json={"name": "pet supplies"})
    assert response.status_code == 409


def test_create_category_colliding_with_predefined_is_rejected(client: TestClient) -> None:
    response = client.post("/api/categories", json={"name": "food & dining"})
    assert response.status_code == 409


def test_custom_category_not_visible_to_other_user(client: TestClient) -> None:
    client.post("/api/categories", json={"name": "My Private Category"})

    with as_user(OTHER_USER_SUB):
        response = client.get("/api/categories")

    names = {c["name"] for c in response.json()}
    assert "My Private Category" not in names


def test_list_filters_by_type(client: TestClient) -> None:
    response = client.get("/api/categories", params={"type": "investment"})
    assert response.status_code == 200
    categories = response.json()
    assert categories, "predefined investment categories should be seeded"
    assert all(c["type"] == "investment" for c in categories)
    assert "Stocks" in {c["name"] for c in categories}


def test_same_name_allowed_across_types(client: TestClient) -> None:
    # "Other" is predefined for both types; a custom name may also repeat
    # across types without colliding.
    _create(client, name="Miscellaneous", type="expense")
    created = _create(client, name="Miscellaneous", type="investment")
    assert created["type"] == "investment"


def test_create_subcategory_and_single_level_limit(client: TestClient) -> None:
    parent = _create(client, name="Subscriptions")
    child = _create(client, name="Netflix", parent_id=parent["id"])
    assert child["parent_id"] == parent["id"]

    # A subcategory cannot itself be a parent (single-level hierarchy).
    response = client.post("/api/categories", json={"name": "Netflix 4K", "parent_id": child["id"]})
    assert response.status_code == 422


def test_create_subcategory_with_type_mismatch_is_rejected(client: TestClient) -> None:
    parent = _create(client, name="Brokers", type="investment")
    response = client.post(
        "/api/categories", json={"name": "Streaming", "type": "expense", "parent_id": parent["id"]}
    )
    assert response.status_code == 422


def test_rename_propagates_to_expenses(client: TestClient) -> None:
    category = _create(client, name="Snacks")
    client.post("/api/expenses", json={"category": "Snacks", "amount": "5.00"})

    response = client.put(f"/api/categories/{category['id']}", json={"name": "Treats"})
    assert response.status_code == 200
    assert response.json()["linked_count"] == 1

    expenses = client.get("/api/expenses").json()["items"]
    assert expenses[0]["category"] == "Treats"


def test_update_predefined_category_is_rejected(client: TestClient) -> None:
    predefined = next(c for c in client.get("/api/categories").json() if c["is_predefined"])
    response = client.put(f"/api/categories/{predefined['id']}", json={"name": "Hijacked"})
    assert response.status_code == 409


def test_update_cannot_make_category_its_own_parent(client: TestClient) -> None:
    category = _create(client, name="Loop")
    response = client.put(f"/api/categories/{category['id']}", json={"parent_id": category["id"]})
    assert response.status_code == 422


def test_delete_unused_category_succeeds(client: TestClient) -> None:
    category = _create(client, name="Fleeting")
    assert client.delete(f"/api/categories/{category['id']}").status_code == 204
    assert client.get(f"/api/categories/{category['id']}").status_code == 404


def test_delete_category_in_use_is_rejected_with_count(client: TestClient) -> None:
    category = _create(client, name="Groceries Run")
    client.post("/api/expenses", json={"category": "Groceries Run", "amount": "10.00"})

    response = client.delete(f"/api/categories/{category['id']}")
    assert response.status_code == 409
    assert "1 existing expense record" in response.json()["detail"]


def test_delete_parent_with_subcategories_is_rejected(client: TestClient) -> None:
    parent = _create(client, name="Travel Plans")
    _create(client, name="Flights", parent_id=parent["id"])

    response = client.delete(f"/api/categories/{parent['id']}")
    assert response.status_code == 409
    assert "subcategories" in response.json()["detail"]


def test_delete_predefined_category_is_rejected(client: TestClient) -> None:
    predefined = next(c for c in client.get("/api/categories").json() if c["is_predefined"])
    assert client.delete(f"/api/categories/{predefined['id']}").status_code == 409


def test_other_users_custom_category_is_unreachable(client: TestClient) -> None:
    category = _create(client, name="Mine Only")

    with as_user(OTHER_USER_SUB):
        assert client.get(f"/api/categories/{category['id']}").status_code == 404
        assert (
            client.put(f"/api/categories/{category['id']}", json={"name": "Stolen"}).status_code
            == 404
        )
        assert client.delete(f"/api/categories/{category['id']}").status_code == 404


def test_expense_cannot_use_investment_category(client: TestClient) -> None:
    response = client.post("/api/expenses", json={"category": "Stocks", "amount": "10.00"})
    assert response.status_code == 422


def test_investment_requires_valid_investment_category(client: TestClient) -> None:
    response = client.post(
        "/api/investments",
        json={
            "name": "X",
            "type": "not-a-category",
            "amount": "100",
            "current_value": "100",
            "purchase_date": "2026-01-01",
        },
    )
    assert response.status_code == 422
