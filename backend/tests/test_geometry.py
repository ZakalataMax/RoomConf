import copy
import json

import pytest


@pytest.fixture
def geometry() -> dict:
    return {
        'ceilingHeight': 2.8,
        'walls': [
            {
                'id': 'wall-1',
                'start': [-5, -5],
                'openings': [
                    {'id': 'door-1', 'type': 'door', 'offset': 1, 'width': 0.9, 'height': 2.1, 'bottom': 0}
                ],
            },
            {'id': 'wall-2', 'start': [5, -5], 'openings': []},
            {'id': 'wall-3', 'start': [5, 0], 'openings': []},
            {'id': 'wall-4', 'start': [0, 0], 'openings': []},
            {
                'id': 'wall-5',
                'start': [0, 5],
                'openings': [
                    {'id': 'win-1', 'type': 'window', 'offset': 1.5, 'width': 1.2, 'height': 1.2, 'bottom': 0.9}
                ],
            },
            {'id': 'wall-6', 'start': [-5, 5], 'openings': []},
        ],
    }


def test_preset_with_geometry_round_trips(client, preset_payload, geometry):
    created = client.post('/presets', json={**preset_payload, 'geometry': geometry})
    assert created.status_code == 200
    assert created.json()['geometry'] == {
        **geometry,
        'walls': [{**w, 'start': [float(c) for c in w['start']]} for w in geometry['walls']],
    }

    fetched = client.get(f"/presets/{created.json()['id']}").json()
    assert fetched == created.json()
    assert len(fetched['geometry']['walls']) == 6


def test_opening_bottom_defaults_to_zero(client, preset_payload, geometry):
    del geometry['walls'][0]['openings'][0]['bottom']
    body = client.post('/presets', json={**preset_payload, 'geometry': geometry}).json()
    assert body['geometry']['walls'][0]['openings'][0]['bottom'] == 0


def test_presets_without_geometry_keep_their_shape(client, preset_payload, storage_file):
    created = client.post('/presets', json=preset_payload).json()
    assert 'geometry' not in created
    assert 'geometry' not in json.loads(storage_file.read_text(encoding='utf-8'))[0]
    assert 'geometry' not in client.get(f"/presets/{created['id']}").json()
    assert 'geometry' not in client.get('/presets').json()[0]


def test_legacy_and_new_presets_are_listed_together(client, storage_file, preset_payload, geometry):
    legacy = {
        **copy.deepcopy(preset_payload),
        'id': 'legacy',
        'createdAt': '2025-12-24T10:00:00Z',
        'updatedAt': '2025-12-24T10:00:00Z',
    }
    storage_file.write_text(json.dumps([legacy]), encoding='utf-8')
    client.post('/presets', json={**preset_payload, 'geometry': geometry})

    listed = client.get('/presets').json()
    assert [('geometry' in p) for p in listed] == [False, True]
    assert listed[0]['materials']['wall']['texture'] == preset_payload['materials']['wall']['texture']


def _mutate(geometry, fn):
    data = copy.deepcopy(geometry)
    fn(data)
    return data


@pytest.mark.parametrize(
    'mutation',
    [
        pytest.param(lambda g: g.update(ceilingHeight=10), id='ceiling-too-high'),
        pytest.param(lambda g: g.update(walls=g['walls'][:2]), id='too-few-walls'),
        pytest.param(lambda g: g['walls'][1].update(start=[5]), id='bad-corner'),
        pytest.param(lambda g: g['walls'][1].update(start=[50, -5]), id='corner-out-of-range'),
        pytest.param(lambda g: g['walls'][1].update(id='wall-1'), id='duplicate-wall-id'),
        pytest.param(lambda g: g['walls'][0]['openings'][0].update(type='portal'), id='unknown-opening-type'),
        pytest.param(lambda g: g['walls'][0]['openings'][0].update(offset=9.5), id='opening-past-wall-end'),
        pytest.param(lambda g: g['walls'][0]['openings'][0].update(height=3), id='opening-above-ceiling'),
        pytest.param(lambda g: g['walls'][0]['openings'][0].update(width=0), id='zero-width-opening'),
    ],
)
def test_invalid_geometry_is_rejected(client, storage_file, preset_payload, geometry, mutation):
    response = client.post('/presets', json={**preset_payload, 'geometry': _mutate(geometry, mutation)})
    assert response.status_code == 422
    assert not storage_file.exists()
