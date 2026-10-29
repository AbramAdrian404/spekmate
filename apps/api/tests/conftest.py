import os

# The suite runs against the bundled JSON unless a test builds its own database-backed app. An empty value switches
# the database off; without this line the app would create a SQLite file in apps/api/.data on import.
os.environ["DATABASE_URL"] = ""

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from synthetic import make_catalog, make_dataset  # noqa: E402

from laptop_advisor.catalog import get_catalog  # noqa: E402
from laptop_advisor.main import app  # noqa: E402
from laptop_advisor.routes import current_catalog  # noqa: E402
from laptop_advisor.store import get_dataset  # noqa: E402


@pytest.fixture(scope="session")
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture(scope="session")
def real_ds():
    return get_dataset()


@pytest.fixture(scope="session")
def real_catalog():
    return get_catalog()


@pytest.fixture()
def ds():
    return make_dataset()


@pytest.fixture()
def catalog():
    return make_catalog()


@pytest.fixture()
def synthetic_client():
    """The real app, but serving the made-up dataset."""
    cat = make_catalog()
    app.dependency_overrides[current_catalog] = lambda: cat
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.pop(current_catalog, None)
