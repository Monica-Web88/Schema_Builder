from tests.conftest import register_and_login

SAMPLE_FIELDS = [
    {"id": "full_name", "type": "text", "label": "Full name", "required": True},
    {
        "id": "employer",
        "type": "text",
        "label": "Employer",
        "required": True,
        "conditional": {"field": "employed", "equals": True},
    },
    {"id": "employed", "type": "checkbox", "label": "Currently employed?", "required": False},
]


def test_create_schema_starts_at_version_1(client):
    headers = register_and_login(client)
    resp = client.post("/schemas", json={"name": "intake", "fields": SAMPLE_FIELDS}, headers=headers)
    body = resp.json()
    assert body["version"] == 1
    assert len(body["definition"]) == 3


def test_saving_same_name_increments_version(client):
    headers = register_and_login(client)
    client.post("/schemas", json={"name": "intake", "fields": SAMPLE_FIELDS}, headers=headers)
    resp = client.post(
        "/schemas",
        json={"name": "intake", "fields": SAMPLE_FIELDS[:1]},
        headers=headers,
    )
    assert resp.json()["version"] == 2


def test_old_versions_remain_readable_after_new_version(client):
    headers = register_and_login(client)
    client.post("/schemas", json={"name": "intake", "fields": SAMPLE_FIELDS}, headers=headers)
    client.post("/schemas", json={"name": "intake", "fields": SAMPLE_FIELDS[:1]}, headers=headers)

    v1 = client.get("/schemas/intake/versions/1")
    v2 = client.get("/schemas/intake/versions/2")
    assert v1.status_code == 200 and len(v1.json()["definition"]) == 3
    assert v2.status_code == 200 and len(v2.json()["definition"]) == 1


def test_list_schemas_returns_only_latest_version(client):
    headers = register_and_login(client)
    client.post("/schemas", json={"name": "intake", "fields": SAMPLE_FIELDS}, headers=headers)
    client.post("/schemas", json={"name": "intake", "fields": SAMPLE_FIELDS[:1]}, headers=headers)
    client.post("/schemas", json={"name": "feedback", "fields": SAMPLE_FIELDS[:1]}, headers=headers)

    resp = client.get("/schemas")
    names_to_versions = {row["name"]: row["version"] for row in resp.json()}
    assert names_to_versions == {"intake": 2, "feedback": 1}


def test_get_unknown_schema_returns_404(client):
    resp = client.get("/schemas/does-not-exist")
    assert resp.status_code == 404
