import pytest
from fastapi.testclient import TestClient
from synthetic import make_catalog, make_dataset

from laptop_advisor.catalog import get_catalog
from laptop_advisor.main import app
from laptop_advisor.store import get_dataset


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
    app.dependency_overrides[get_catalog] = lambda: cat
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.pop(get_catalog, None)
