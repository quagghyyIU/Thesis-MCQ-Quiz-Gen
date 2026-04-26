import uuid

from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_register_login_and_protected_route():
    username = f"user_{uuid.uuid4().hex[:10]}"
    password = "password123"

    r = client.post("/api/auth/register", json={"username": username, "password": password})
    assert r.status_code == 200

    r = client.post(
        "/api/auth/login",
        data={"username": username, "password": password},
    )
    assert r.status_code == 200
    token = r.json()["access_token"]

    r = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["username"] == username

    r = client.get("/api/documents/", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert isinstance(r.json(), list)

    r = client.get("/api/documents/")
    assert r.status_code == 401


if __name__ == "__main__":
    test_register_login_and_protected_route()
    print("ok")
