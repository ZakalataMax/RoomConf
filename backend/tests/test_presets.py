import copy
import json
import re
from concurrent.futures import ThreadPoolExecutor

import pytest

import main

ISO_UTC = re.compile(r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$')


def test_root(client):
    response = client.get('/')
    assert response.status_code == 200
    assert response.json() == {'message': 'Room Configurator API', 'version': '1.0.0'}


def test_list_is_empty_without_storage_file(client, storage_file):
    assert not storage_file.exists()
    response = client.get('/presets')
    assert response.status_code == 200
    assert response.json() == []


def test_create_assigns_id_and_timestamps(client, preset_payload):
    response = client.post('/presets', json=preset_payload)
    assert response.status_code == 200
    body = response.json()
    assert body['id']
    assert ISO_UTC.match(body['createdAt'])
    assert body['updatedAt'] == body['createdAt']
    assert body['name'] == 'Cozy evening'
    assert body['environment'] == 'sunset'
    assert body['lighting'] == {'intensity': 0.6, 'colorTemperature': 2500, 'preset': 'evening'}


def test_create_preserves_extra_material_fields(client, preset_payload):
    preset_payload['materials']['wall']['normalScale'] = 1
    body = client.post('/presets', json=preset_payload).json()
    assert body['materials']['wall']['texture'] == '/textures/walls/patina-1000-mm-architextures.jpg'
    assert body['materials']['wall']['normalScale'] == 1
    assert body['materials']['floor']['texture'] is None


def test_create_keeps_client_supplied_id_and_created_at(client, preset_payload):
    preset_payload.update({'id': 'my-id', 'createdAt': '2024-01-01T00:00:00Z'})
    body = client.post('/presets', json=preset_payload).json()
    assert body['id'] == 'my-id'
    assert body['createdAt'] == '2024-01-01T00:00:00Z'
    assert body['updatedAt'] != '2024-01-01T00:00:00Z'


def test_created_preset_is_listed_and_fetchable(client, preset_payload):
    created = client.post('/presets', json=preset_payload).json()

    listed = client.get('/presets').json()
    assert [p['id'] for p in listed] == [created['id']]

    fetched = client.get(f"/presets/{created['id']}")
    assert fetched.status_code == 200
    assert fetched.json() == created


def test_get_unknown_preset_returns_404(client, preset_payload):
    client.post('/presets', json=preset_payload)
    response = client.get('/presets/does-not-exist')
    assert response.status_code == 404
    assert response.json() == {'detail': 'Preset does-not-exist not found'}


def test_existing_legacy_records_are_served(client, storage_file):
    legacy = [
        {
            'id': 'old',
            'name': 'Old',
            'materials': {
                'wall': {'type': 'paint', 'color': '#fff', 'roughness': 1},
                'floor': {'preset': 'wood', 'color': '#000', 'roughness': 0},
            },
            'lighting': {'intensity': 1, 'colorTemperature': 6500, 'preset': None},
            'environment': 'day',
            'createdAt': '2025-12-24T10:00:00Z',
            'updatedAt': '2025-12-24T10:00:00Z',
        }
    ]
    storage_file.write_text(json.dumps(legacy), encoding='utf-8')
    response = client.get('/presets/old')
    assert response.status_code == 200
    assert response.json()['materials']['wall']['color'] == '#fff'


def _without(payload, *path):
    data = copy.deepcopy(payload)
    target = data
    for key in path[:-1]:
        target = target[key]
    del target[path[-1]]
    return data


def _with(payload, value, *path):
    data = copy.deepcopy(payload)
    target = data
    for key in path[:-1]:
        target = target[key]
    target[path[-1]] = value
    return data


@pytest.mark.parametrize(
    'mutate',
    [
        pytest.param(lambda p: _without(p, 'materials'), id='missing-materials'),
        pytest.param(lambda p: _without(p, 'materials', 'wall'), id='missing-wall'),
        pytest.param(lambda p: _without(p, 'lighting', 'intensity'), id='missing-intensity'),
        pytest.param(lambda p: _with(p, 'midnight', 'environment'), id='unknown-environment'),
        pytest.param(lambda p: _with(p, 1.5, 'materials', 'wall', 'roughness'), id='roughness-too-high'),
        pytest.param(lambda p: _with(p, 'party', 'lighting', 'preset'), id='unknown-lighting-preset'),
        pytest.param(lambda p: _with(p, 'warm', 'lighting', 'colorTemperature'), id='non-numeric-temperature'),
    ],
)
def test_invalid_payloads_are_rejected_with_422(client, storage_file, preset_payload, mutate):
    response = client.post('/presets', json=mutate(preset_payload))
    assert response.status_code == 422
    assert not storage_file.exists(), 'invalid payloads must not be persisted'


def test_corrupt_storage_file_is_treated_as_empty(client, storage_file):
    storage_file.write_text('{ not valid json', encoding='utf-8')
    assert client.get('/presets').json() == []


def test_writes_keep_file_valid_json_and_leave_no_temp_files(client, storage_file, preset_payload):
    def create(i):
        payload = dict(preset_payload, name=f'preset-{i}')
        return client.post('/presets', json=payload).status_code

    with ThreadPoolExecutor(max_workers=8) as pool:
        statuses = list(pool.map(create, range(25)))

    assert statuses == [200] * 25
    stored = json.loads(storage_file.read_text(encoding='utf-8'))
    assert sorted(p['name'] for p in stored) == sorted(f'preset-{i}' for i in range(25))
    assert len({p['id'] for p in stored}) == 25
    assert [f.name for f in storage_file.parent.iterdir()] == ['presets.json']


def test_failed_write_keeps_previous_file_intact(client, storage_file, preset_payload, monkeypatch):
    client.post('/presets', json=preset_payload)
    before = storage_file.read_text(encoding='utf-8')

    def broken_dump(*args, **kwargs):
        args[1].write('[{"truncated":')
        raise IOError('disk full')

    monkeypatch.setattr(main.json, 'dump', broken_dump)
    response = client.post('/presets', json=preset_payload)

    assert response.status_code == 500
    assert 'disk full' in response.json()['detail']
    assert storage_file.read_text(encoding='utf-8') == before
    assert [f.name for f in storage_file.parent.iterdir()] == ['presets.json']
