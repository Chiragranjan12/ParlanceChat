"""Backend tests for Parlance chat application"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s

@pytest.fixture(scope="module")
def admin_token(session):
    resp = session.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@parlance.com", "password": "Admin1234!"})
    assert resp.status_code == 200, f"Admin login failed: {resp.text}"
    return resp.json()["access_token"]

@pytest.fixture(scope="module")
def admin_session(session, admin_token):
    session.headers.update({"Authorization": f"Bearer {admin_token}"})
    return session

# ---- Auth Tests ----
class TestAuth:
    """Auth endpoint tests"""

    def test_register_new_user(self, session):
        # Try register, may already exist
        resp = session.post(f"{BASE_URL}/api/auth/register", json={
            "email": "testuser@parlance.com",
            "username": "testuser",
            "password": "Test1234!"
        })
        assert resp.status_code in [200, 400], f"Unexpected: {resp.text}"
        if resp.status_code == 200:
            data = resp.json()
            assert "user" in data
            assert "access_token" in data
            print("PASS: User registered successfully")
        else:
            print(f"INFO: User already exists - {resp.json().get('detail')}")

    def test_login_admin(self, session):
        resp = session.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@parlance.com", "password": "Admin1234!"})
        assert resp.status_code == 200, f"Login failed: {resp.text}"
        data = resp.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == "admin@parlance.com"
        print("PASS: Admin login successful")

    def test_login_invalid(self, session):
        resp = session.post(f"{BASE_URL}/api/auth/login", json={"email": "wrong@parlance.com", "password": "wrong"})
        assert resp.status_code == 401
        print("PASS: Invalid login rejected")

    def test_get_me(self, admin_session):
        resp = admin_session.get(f"{BASE_URL}/api/auth/me")
        assert resp.status_code == 200
        data = resp.json()
        assert "email" in data
        assert "id" in data
        print(f"PASS: /auth/me returned user {data['email']}")

    def test_brute_force_protection(self, session):
        """5 failed attempts should lock out"""
        for i in range(5):
            session.post(f"{BASE_URL}/api/auth/login", json={"email": "brutetest@parlance.com", "password": "wrong"})
        resp = session.post(f"{BASE_URL}/api/auth/login", json={"email": "brutetest@parlance.com", "password": "wrong"})
        assert resp.status_code == 429, f"Expected 429, got {resp.status_code}"
        print("PASS: Brute force protection working")


# ---- Channel Tests ----
class TestChannels:
    """Channel endpoint tests"""

    def test_list_my_channels(self, admin_session):
        resp = admin_session.get(f"{BASE_URL}/api/channels/mine")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        names = [ch["name"] for ch in data]
        print(f"PASS: My channels: {names}")

    def test_default_channels_exist(self, admin_session):
        resp = admin_session.get(f"{BASE_URL}/api/channels")
        assert resp.status_code == 200
        data = resp.json()
        names = [ch["name"] for ch in data]
        assert "general" in names, f"general not in channels: {names}"
        assert "random" in names, f"random not in channels: {names}"
        print(f"PASS: Default channels exist: {names}")

    def test_create_channel(self, admin_session):
        resp = admin_session.post(f"{BASE_URL}/api/channels", json={
            "name": "test-channel-auto",
            "description": "Test channel",
            "channel_type": "public"
        })
        assert resp.status_code in [200, 400]
        if resp.status_code == 200:
            data = resp.json()
            assert data["name"] == "test-channel-auto"
            print(f"PASS: Channel created: {data['name']}")
        else:
            print(f"INFO: Channel already exists")

    def test_channel_members(self, admin_session):
        # Get general channel id
        resp = admin_session.get(f"{BASE_URL}/api/channels")
        channels = resp.json()
        general = next((ch for ch in channels if ch["name"] == "general"), None)
        assert general is not None
        ch_id = general["id"]
        resp2 = admin_session.get(f"{BASE_URL}/api/channels/{ch_id}/members")
        assert resp2.status_code == 200
        members = resp2.json()
        assert isinstance(members, list)
        print(f"PASS: Channel members list returned {len(members)} members")

    def test_channel_messages(self, admin_session):
        resp = admin_session.get(f"{BASE_URL}/api/channels")
        channels = resp.json()
        general = next((ch for ch in channels if ch["name"] == "general"), None)
        assert general is not None
        ch_id = general["id"]
        # Join first if needed
        admin_session.post(f"{BASE_URL}/api/channels/{ch_id}/join")
        resp2 = admin_session.get(f"{BASE_URL}/api/channels/{ch_id}/messages")
        assert resp2.status_code == 200
        print(f"PASS: Channel messages returned")


# ---- Message Tests ----
class TestMessages:
    """Message endpoint tests"""

    def test_send_message_to_channel(self, admin_session):
        resp = admin_session.get(f"{BASE_URL}/api/channels")
        channels = resp.json()
        general = next((ch for ch in channels if ch["name"] == "general"), None)
        assert general is not None
        ch_id = general["id"]
        resp2 = admin_session.post(f"{BASE_URL}/api/messages", json={
            "content": "TEST_automated test message",
            "room_type": "channel",
            "room_id": ch_id
        })
        assert resp2.status_code == 200, f"Send message failed: {resp2.text}"
        data = resp2.json()
        assert data["content"] == "TEST_automated test message"
        assert "sender" in data
        print(f"PASS: Message sent, id={data.get('id')}")
        return data["id"]

    def test_reaction_to_message(self, admin_session):
        # Get a message to react to
        resp = admin_session.get(f"{BASE_URL}/api/channels")
        channels = resp.json()
        general = next((ch for ch in channels if ch["name"] == "general"), None)
        ch_id = general["id"]
        msgs = admin_session.get(f"{BASE_URL}/api/channels/{ch_id}/messages").json()
        if not msgs:
            pytest.skip("No messages to react to")
        msg_id = msgs[-1]["id"]
        resp2 = admin_session.post(f"{BASE_URL}/api/messages/{msg_id}/reactions", json={"emoji": "👍"})
        assert resp2.status_code == 200
        data = resp2.json()
        assert "action" in data
        print(f"PASS: Reaction toggled: {data}")


# ---- DM Tests ----
class TestDM:
    """DM endpoint tests"""

    def test_list_dms(self, admin_session):
        resp = admin_session.get(f"{BASE_URL}/api/dm/list")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)
        print("PASS: DM list returned")


# ---- User Tests ----
class TestUsers:
    """User endpoint tests"""

    def test_search_users(self, admin_session):
        resp = admin_session.get(f"{BASE_URL}/api/users?q=admin")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) > 0
        print(f"PASS: User search returned {len(data)} results")

    def test_presence(self, admin_session):
        resp = admin_session.get(f"{BASE_URL}/api/presence")
        assert resp.status_code == 200
        print(f"PASS: Presence: {resp.json()}")
