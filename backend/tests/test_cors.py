import importlib

import pytest
from fastapi.testclient import TestClient

import main


@pytest.mark.parametrize('value', [None, '', '   '])
def test_parse_cors_origins_defaults_to_local_dev(value):
    origins = main.parse_cors_origins(value)
    assert origins == main.DEFAULT_CORS_ORIGINS
    assert 'http://localhost:5173' in origins
    assert '*' not in origins


def test_parse_cors_origins_splits_and_trims():
    value = ' https://rooms.example.com/ ,http://localhost:5173,, '
    assert main.parse_cors_origins(value) == ['https://rooms.example.com', 'http://localhost:5173']


def _preflight(client, origin):
    return client.options(
        '/presets',
        headers={'Origin': origin, 'Access-Control-Request-Method': 'POST'},
    )


def test_default_config_allows_vite_dev_origin_only(storage_file):
    client = TestClient(main.app)
    allowed = _preflight(client, 'http://localhost:5173')
    assert allowed.status_code == 200
    assert allowed.headers['access-control-allow-origin'] == 'http://localhost:5173'

    denied = _preflight(client, 'https://evil.example.com')
    assert denied.status_code == 400
    assert 'access-control-allow-origin' not in denied.headers


def test_cors_origins_env_var_is_applied(monkeypatch, storage_file):
    monkeypatch.setenv('CORS_ORIGINS', 'https://rooms.example.com')
    try:
        reloaded = importlib.reload(main)
        client = TestClient(reloaded.app)
        assert _preflight(client, 'https://rooms.example.com').status_code == 200
        assert _preflight(client, 'http://localhost:5173').status_code == 400
    finally:
        monkeypatch.delenv('CORS_ORIGINS')
        importlib.reload(main)
