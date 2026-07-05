"""Category endpoints (BR-03)."""

from fastapi.testclient import TestClient

from tests.integration.conftest import OTHER_USER_SUB, as_user


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
