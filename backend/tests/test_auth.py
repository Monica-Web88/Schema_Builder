from tests.conftest import register_and_login


def test_register_and_login(client):
    resp = client.post(
        "/auth/register", json={"username": "alice", "password": "pw12345", "role": "viewer"}
    )
    assert resp.status_code == 200
    assert resp.json()["role"] == "viewer"

    resp = client.post("/auth/token", data={"username": "alice", "password": "pw12345"})
    assert resp.status_code == 200
    assert "access_token" in resp.json()


def test_login_with_wrong_password_fails(client):
    client.post("/auth/register", json={"username": "bob", "password": "pw12345", "role": "viewer"})
    resp = client.post("/auth/token", data={"username": "bob", "password": "wrong"})
    assert resp.status_code == 401


def test_viewer_cannot_create_schema(client):
    headers = register_and_login(client, username="viewer1", role="viewer")
    resp = client.post("/schemas", json={"name": "onboarding", "fields": []}, headers=headers)
    assert resp.status_code == 403


def test_author_can_create_schema(client):
    headers = register_and_login(client, username="author1", role="author")
    resp = client.post("/schemas", json={"name": "onboarding", "fields": []}, headers=headers)
    assert resp.status_code == 200
    assert resp.json()["version"] == 1


def test_admin_can_create_schema(client):
    headers = register_and_login(client, username="admin1", role="admin")
    resp = client.post("/schemas", json={"name": "onboarding", "fields": []}, headers=headers)
    assert resp.status_code == 200


def test_unauthenticated_request_rejected(client):
    resp = client.post("/schemas", json={"name": "onboarding", "fields": []})
    assert resp.status_code == 401
