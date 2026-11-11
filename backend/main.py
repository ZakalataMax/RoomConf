import json
import os
import tempfile
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path
from math import hypot
from typing import List, Literal, Optional, Tuple

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field, model_validator

DEFAULT_CORS_ORIGINS = [
    'http://localhost',
    'http://127.0.0.1',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:4173',
    'http://127.0.0.1:4173',
]


def parse_cors_origins(value: Optional[str]) -> List[str]:
    """Parse a comma-separated CORS_ORIGINS value; fall back to local dev origins."""
    if value is None or not value.strip():
        return list(DEFAULT_CORS_ORIGINS)
    return [origin.strip().rstrip('/') for origin in value.split(',') if origin.strip()]


app = FastAPI(title='Room Configurator API', version='1.0.0')

app.add_middleware(
    CORSMiddleware,
    allow_origins=parse_cors_origins(os.getenv('CORS_ORIGINS')),
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)


class _OpenModel(BaseModel):
    # Keep unknown fields (texture, normalMap, normalScale, ...) so stored
    # presets round-trip unchanged.
    model_config = ConfigDict(extra='allow')


class WallMaterial(_OpenModel):
    type: str
    color: str
    roughness: float = Field(ge=0, le=1)


class FloorMaterial(_OpenModel):
    preset: str
    color: Optional[str] = None
    roughness: Optional[float] = Field(default=None, ge=0, le=1)


class Materials(_OpenModel):
    wall: WallMaterial
    floor: FloorMaterial


class LightingParams(_OpenModel):
    intensity: float = Field(ge=0)
    colorTemperature: int = Field(gt=0)
    preset: Optional[Literal['work', 'relax', 'evening']] = None


Coordinate = float  # meters
MAX_COORDINATE = 25.0


class Opening(BaseModel):
    id: str = Field(min_length=1, max_length=100)
    type: Literal['door', 'window']
    offset: float = Field(ge=0)
    width: float = Field(gt=0)
    height: float = Field(gt=0)
    bottom: float = Field(default=0, ge=0)


class GeometryWall(BaseModel):
    id: str = Field(min_length=1, max_length=100)
    start: Tuple[Coordinate, Coordinate]
    openings: List[Opening] = Field(default_factory=list, max_length=6)


class RoomGeometry(BaseModel):
    """Room outline (closed polygon of wall start corners) with door/window openings."""

    ceilingHeight: float = Field(ge=2.2, le=6)
    walls: List[GeometryWall] = Field(min_length=3, max_length=24)

    @model_validator(mode='after')
    def check_walls(self) -> 'RoomGeometry':
        ids = [w.id for w in self.walls]
        if len(set(ids)) != len(ids):
            raise ValueError('wall ids must be unique')
        tolerance = 1e-6
        count = len(self.walls)
        for index, wall in enumerate(self.walls):
            if any(abs(c) > MAX_COORDINATE for c in wall.start):
                raise ValueError(f'wall {wall.id}: coordinates must be within ±{MAX_COORDINATE} m')
            end = self.walls[(index + 1) % count].start
            length = hypot(end[0] - wall.start[0], end[1] - wall.start[1])
            for opening in wall.openings:
                if opening.offset + opening.width > length + tolerance:
                    raise ValueError(f'opening {opening.id} exceeds the length of wall {wall.id}')
                if opening.bottom + opening.height > self.ceilingHeight + tolerance:
                    raise ValueError(f'opening {opening.id} exceeds the ceiling height')
        return self


class RoomPreset(BaseModel):
    id: Optional[str] = None
    name: Optional[str] = None
    materials: Materials
    lighting: LightingParams
    environment: Literal['day', 'sunset', 'night']
    # Optional for backward compatibility: presets saved before geometry editing
    # have no geometry and are rendered with the default room.
    geometry: Optional[RoomGeometry] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None


STORAGE_FILE = Path(os.getenv('STORAGE_FILE', 'data/presets.json'))
STORAGE_FILE.parent.mkdir(parents=True, exist_ok=True)

# Serializes read-modify-write cycles on the JSON file within this process.
_storage_lock = threading.Lock()


def load_presets() -> List[dict]:
    if not STORAGE_FILE.exists():
        return []
    try:
        with open(STORAGE_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        return []


def save_presets(presets: List[dict]) -> None:
    """Atomically replace the storage file: write a temp file, then os.replace()."""
    tmp_path = None
    try:
        STORAGE_FILE.parent.mkdir(parents=True, exist_ok=True)
        fd, tmp_path = tempfile.mkstemp(
            dir=STORAGE_FILE.parent, prefix=f'.{STORAGE_FILE.name}.', suffix='.tmp'
        )
        with os.fdopen(fd, 'w', encoding='utf-8') as f:
            json.dump(presets, f, indent=2)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp_path, STORAGE_FILE)
        tmp_path = None
    except (IOError, OSError) as e:
        raise HTTPException(status_code=500, detail=f'Failed to save presets: {str(e)}')
    finally:
        if tmp_path is not None and os.path.exists(tmp_path):
            os.remove(tmp_path)


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(tzinfo=None).isoformat() + 'Z'


@app.get('/')
async def root():
    return {'message': 'Room Configurator API', 'version': '1.0.0'}


# response_model_exclude_unset: fields absent from a stored preset (e.g. `geometry`
# on presets saved before geometry editing) are omitted instead of returned as null.
@app.get('/presets', response_model=List[RoomPreset], response_model_exclude_unset=True)
async def get_presets():
    try:
        presets = load_presets()
        return presets
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Failed to load presets: {str(e)}')


@app.get('/presets/{preset_id}', response_model=RoomPreset, response_model_exclude_unset=True)
async def get_preset(preset_id: str):
    try:
        presets = load_presets()
        preset = next((p for p in presets if p.get('id') == preset_id), None)
        if not preset:
            raise HTTPException(status_code=404, detail=f'Preset {preset_id} not found')
        return preset
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Failed to load preset: {str(e)}')


@app.post('/presets', response_model=RoomPreset, response_model_exclude_unset=True)
async def create_preset(preset: RoomPreset):
    try:
        if not preset.id:
            preset.id = str(uuid.uuid4())

        now = _utc_now_iso()
        if not preset.createdAt:
            preset.createdAt = now
        preset.updatedAt = now

        preset_dict = preset.model_dump()
        if preset_dict.get('geometry') is None:
            preset_dict.pop('geometry', None)

        with _storage_lock:
            presets = load_presets()
            presets.append(preset_dict)
            save_presets(presets)

        return preset_dict
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Failed to create preset: {str(e)}')


if __name__ == '__main__':
    import uvicorn

    uvicorn.run(app, host='0.0.0.0', port=8000)
