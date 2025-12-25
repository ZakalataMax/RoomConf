from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import json
import os
from pathlib import Path

app = FastAPI(title='Room Configurator API', version='1.0.0')

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],  # In production, specify actual origins
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

# Data models
class WallMaterial(BaseModel):
    type: str
    color: str
    roughness: float


class FloorMaterial(BaseModel):
    preset: str
    color: Optional[str] = None
    roughness: Optional[float] = None


class LightingParams(BaseModel):
    intensity: float
    colorTemperature: int
    preset: Optional[str] = None


class RoomPreset(BaseModel):
    id: Optional[str] = None
    name: Optional[str] = None
    materials: dict
    lighting: dict
    environment: str
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None


# Storage file
STORAGE_DIR = Path('data')
STORAGE_DIR.mkdir(exist_ok=True)
STORAGE_FILE = STORAGE_DIR / 'presets.json'


def load_presets() -> List[dict]:
    """Load presets from JSON file"""
    if not STORAGE_FILE.exists():
        return []
    try:
        with open(STORAGE_FILE, 'r') as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        return []


def save_presets(presets: List[dict]) -> None:
    """Save presets to JSON file"""
    try:
        with open(STORAGE_FILE, 'w') as f:
            json.dump(presets, f, indent=2)
    except IOError as e:
        raise HTTPException(status_code=500, detail=f'Failed to save presets: {str(e)}')


@app.get('/')
async def root():
    return {'message': 'Room Configurator API', 'version': '1.0.0'}


@app.get('/presets', response_model=List[RoomPreset])
async def get_presets():
    """Get all presets"""
    try:
        presets = load_presets()
        return presets
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Failed to load presets: {str(e)}')


@app.get('/presets/{preset_id}', response_model=RoomPreset)
async def get_preset(preset_id: str):
    """Get a specific preset by ID"""
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


@app.post('/presets', response_model=RoomPreset)
async def create_preset(preset: RoomPreset):
    """Create a new preset"""
    try:
        presets = load_presets()
        
        # Generate ID if not provided
        if not preset.id:
            import uuid
            preset.id = str(uuid.uuid4())
        
        # Set timestamps
        now = datetime.utcnow().isoformat() + 'Z'
        if not preset.createdAt:
            preset.createdAt = now
        preset.updatedAt = now
        
        # Convert to dict
        preset_dict = preset.model_dump()
        
        # Add to list
        presets.append(preset_dict)
        
        # Save
        save_presets(presets)
        
        return preset_dict
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Failed to create preset: {str(e)}')


if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='0.0.0.0', port=8000)

