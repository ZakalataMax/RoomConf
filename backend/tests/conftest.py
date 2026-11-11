import os
import tempfile
from pathlib import Path

import pytest

# Point the app at a throwaway file *before* main is imported, so importing it
# never touches the real backend/data/presets.json.
_session_dir = tempfile.mkdtemp(prefix='roomconf-tests-')
os.environ['STORAGE_FILE'] = str(Path(_session_dir) / 'presets.json')
os.environ.pop('CORS_ORIGINS', None)

import main  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402


@pytest.fixture
def storage_file(tmp_path, monkeypatch) -> Path:
    path = tmp_path / 'presets.json'
    monkeypatch.setattr(main, 'STORAGE_FILE', path)
    return path


@pytest.fixture
def client(storage_file) -> TestClient:
    return TestClient(main.app)


@pytest.fixture
def preset_payload() -> dict:
    return {
        'name': 'Cozy evening',
        'materials': {
            'wall': {
                'type': 'paint',
                'color': '#f5f5f5',
                'roughness': 0.7,
                'texture': '/textures/walls/patina-1000-mm-architextures.jpg',
            },
            'floor': {'preset': 'wood', 'color': '#8b4513', 'roughness': 0.6, 'texture': None},
        },
        'lighting': {'intensity': 0.6, 'colorTemperature': 2500, 'preset': 'evening'},
        'environment': 'sunset',
    }
