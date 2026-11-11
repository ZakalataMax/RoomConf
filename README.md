# Modern Interior Room Configurator

[![CI](https://github.com/ZakalataMax/RoomConf/actions/workflows/ci.yml/badge.svg)](https://github.com/ZakalataMax/RoomConf/actions/workflows/ci.yml)

A 3D room configuration application built with Vue 3, TresJS (Three.js), and FastAPI. This project demonstrates real-world frontend + 3D engineering practices with a clean architecture, type safety, and production deployment capabilities.

## 🎯 Project Overview

This application allows users to configure and visualize interior rooms in real-time 3D. Users can:

- Configure wall and floor materials (PBR materials with color and roughness controls)
- Apply wall and floor textures
- Edit the room geometry: size, ceiling height, rectangle / L-shape, move corners, add (split) and remove walls, add doors and windows
- Adjust lighting (intensity and color temperature)
- Select environment presets (day, sunset, night)
- Use lighting presets (Work, Relax, Evening)
- Save and load room configurations (including geometry) via REST API

## 🏗️ Architecture

### Tech Stack

**Frontend:**
- Vue 3 (Composition API)
- TresJS + @tresjs/cientos (Vue wrapper for Three.js)
- Pinia (State management)
- Vue Router
- TypeScript
- Vite

**Backend:**
- FastAPI
- Python 3.11+
- Pydantic request validation
- JSON file storage with atomic writes (simple persistence)

**Infrastructure:**
- Docker & Docker Compose
- Nginx (production serving)
- Environment-based configuration

### State Architecture

The application follows a strict **unidirectional data flow** pattern:

1. **Pinia Store** is the single source of truth for all configuration state
2. **UI Components** bind reactively to store state
3. **3D Scene Components** watch store state changes and update Three.js objects accordingly
4. **Three.js objects are NEVER mutated directly from UI components**

This architecture ensures:
- Predictable state management
- Easy debugging
- Serializable state for API persistence
- Clear separation of concerns

### Project Structure

```
RoomConf/
├── frontend/
│   ├── public/
│   │   └── textures/         # Wall & floor texture images (served as /textures/...)
│   ├── src/
│   │   ├── api/              # API client functions
│   │   ├── components/
│   │   │   ├── scene/        # 3D scene components (geometry, lighting, environment, renderer)
│   │   │   └── ui/           # UI panels, modals, notifications
│   │   ├── composables/      # Reusable composition functions (texture loading)
│   │   ├── constants/        # Static catalogues (textures)
│   │   ├── router/           # Vue Router configuration
│   │   ├── stores/           # Pinia stores
│   │   ├── types/            # TypeScript type definitions
│   │   ├── utils/            # Pure helpers (geometry math, texture paths)
│   │   ├── views/            # Route views
│   │   ├── App.vue
│   │   └── main.ts
│   ├── vitest.config.ts
│   ├── Dockerfile
│   ├── Dockerfile.dev
│   ├── nginx.conf
│   └── package.json
├── backend/
│   ├── main.py               # FastAPI application
│   ├── requirements.txt
│   ├── requirements-dev.txt  # pytest + httpx
│   ├── tests/                # pytest suite
│   ├── Dockerfile
│   └── data/                 # Preset storage (created at runtime)
├── .github/workflows/ci.yml  # CI: frontend + backend
├── docker-compose.yml        # Production setup
├── docker-compose.dev.yml    # Development setup
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- Node.js 20+ and npm
- Python 3.11+
- Docker and Docker Compose (for containerized deployment)

### Local Development

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:5173`

#### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

The backend API will be available at `http://localhost:8000`

**Note:** Make sure the backend is running before the frontend tries to save/load presets.

### Docker Development

Use docker-compose for a complete development environment:

```bash
docker-compose -f docker-compose.dev.yml up
```

This starts:
- Frontend dev server on `http://localhost:5173` (with hot reload)
- Backend API on `http://localhost:8000` (with auto-reload)

### Production Build

#### Using Docker Compose

```bash
docker-compose up --build
```

This builds and starts:
- Frontend served via Nginx on `http://localhost`
- Backend API on `http://localhost:8000`

#### Manual Build

**Frontend:**
```bash
cd frontend
npm install
npm run build
# Built files are in frontend/dist/
```

**Backend:**
```bash
cd backend
pip install -r requirements.txt
python main.py
```

## 🧪 Tests

**Frontend** (Vitest + Vue Test Utils + jsdom) — stores (incl. geometry and preset round-trip), geometry generator, API client, composables, UI panels and modals, and a check that every texture referenced in code exists in `public/textures`:

```bash
cd frontend
npm install
npm run lint
npm run test         # single run (npm run test:watch for watch mode)
npm run type-check   # vue-tsc, includes the test files
npm run build
```

**Backend** (pytest + FastAPI TestClient) — preset endpoints, geometry validation and backward compatibility, 404/422 handling, CORS configuration, atomic JSON writes. Tests use a temporary storage file and never touch `backend/data/`:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
pytest -v
```

Both suites run on every push / pull request via GitHub Actions (`.github/workflows/ci.yml`).

## 📡 API Endpoints

### GET /presets
Returns all saved presets.

**Response:**
```json
[
  {
    "id": "uuid",
    "materials": {
      "wall": { "type": "paint", "color": "#f5f5f5", "roughness": 0.7 },
      "floor": { "preset": "wood", "color": "#8b4513", "roughness": 0.6 }
    },
    "lighting": {
      "intensity": 1.0,
      "colorTemperature": 6500,
      "preset": null
    },
    "environment": "day",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
]
```

### GET /presets/:id
Returns a specific preset by ID.

**Response:** Same as preset object above

**Errors:**
- `404`: Preset not found

### POST /presets
Creates a new preset.

**Request Body:**
```json
{
  "materials": { ... },
  "lighting": { ... },
  "environment": "day"
}
```

`geometry` is optional. Presets without it (including all presets saved before geometry editing existed) load the default 10x10 m room, and are returned without a `geometry` key:

```json
"geometry": {
  "ceilingHeight": 3,
  "walls": [
    { "id": "wall-1", "start": [-5, -5], "openings": [
      { "id": "door-1", "type": "door", "offset": 1, "width": 0.9, "height": 2.1, "bottom": 0 }
    ] },
    { "id": "wall-2", "start": [5, -5], "openings": [] },
    { "id": "wall-3", "start": [5, 5], "openings": [] },
    { "id": "wall-4", "start": [-5, 5], "openings": [] }
  ]
}
```

Each wall runs from its `start` corner (`[x, z]` in meters) to the next wall's corner; the last wall closes the outline. Opening `offset` is the distance from the wall start to the opening's left edge.

**Response:** Created preset with generated ID and timestamps

**Errors:**
- `422`: Validation error (e.g. missing `materials`, unknown `environment`, roughness outside 0-1, an opening that does not fit its wall)

## 🎨 Features

### Material Configuration

- **Wall Materials:**
  - Color picker
  - Roughness slider (0-1)
  - PBR (MeshStandardMaterial) rendering

- **Floor Materials:**
  - Color picker
  - Roughness slider (0-1)
  - PBR (MeshStandardMaterial) rendering

### Room Geometry

Open the **Geometry** tab in the side panel:

- **Room Shape:** Rectangle or L-shape templates; width / depth (2–30 m) scale the current outline; ceiling height 2.2–6 m
- **Walls:** click a wall in the list or in the 3D view, then edit its start corner, **Split** it into two walls, or **Remove** it (minimum 3 walls)
- **Openings:** **+ Door** / **+ Window** place an opening in the largest free space; offset, width, height and sill are editable
- Invalid input (out-of-range sizes, crossing walls, openings that exceed the wall or overlap) is rejected with a message and the last valid value is kept
- Geometry is persisted in localStorage and stored in presets; wall/floor materials and textures apply to every wall

### Lighting System

- **Intensity Control:** 0-2 range
- **Color Temperature:** 2000K-10000K (Kelvin)
- **Lighting Presets:**
  - **Work:** High intensity (1.2), cool white (6500K)
  - **Relax:** Medium intensity (0.8), warm white (3000K)
  - **Evening:** Low intensity (0.6), very warm (2500K)

### Environment Presets

- **Day:** Bright sky blue background
- **Sunset:** Warm orange background
- **Night:** Deep blue background

### 3D Scene

- Interactive camera controls (OrbitControls)
- Real-time material updates
- Reactive lighting changes
- Environment-based background colors

## 🔧 Configuration

### Environment Variables

**Frontend** (`.env`):
```
VITE_API_BASE_URL=http://localhost:8000
```

**Backend** (environment variables):
```
# Comma-separated list of allowed origins.
# Default: http://localhost, http://localhost:5173, http://localhost:4173 (and 127.0.0.1 variants)
CORS_ORIGINS=https://rooms.example.com
# Path to the JSON storage file (default: data/presets.json)
STORAGE_FILE=data/presets.json
```

Host and port are passed to uvicorn on the command line (see the Dockerfile / docker-compose files).

### Code Quality

- **ESLint** 9 flat config (`eslint-plugin-vue` + `typescript-eslint`)
- **TypeScript** (strict) with `vue-tsc` type-checking
- **Vitest** and **pytest** test suites, run in CI
- **Prettier** for code formatting

```bash
cd frontend
npm run lint        # npm run lint:fix to auto-fix
npm run type-check
npm run format
```

## 🐳 Docker Details

### Production Containers

- **Frontend:** Multi-stage build with Nginx serving static files
- **Backend:** Python 3.11 slim image with FastAPI

### Development Containers

- **Frontend:** Hot-reload Vite dev server
- **Backend:** Auto-reload Uvicorn server

### Volumes

- `backend/data` - Persistent preset storage
- Development containers mount source code for live updates

## 🏛️ Design Decisions

### Why Pinia as Single Source of Truth?

- Clear separation between UI state and 3D scene state
- Serializable state for API persistence
- Reactive updates propagate automatically to 3D scene
- No direct mutation of Three.js objects from UI

### Why TresJS?

- Native Vue 3 Composition API integration
- Reactive Three.js scene management
- Type-safe with TypeScript
- Clean component-based architecture

### Why FastAPI?

- Fast, modern Python web framework
- Automatic API documentation
- Type validation with Pydantic
- Simple to deploy and maintain

### Why JSON File Storage?

- No external database dependency for MVP
- Easy to inspect and backup
- Simple migration path to database later
- Sufficient for preset storage use case

## 🚢 Deployment

### Production Checklist

1. Set environment variables appropriately
2. Build frontend: `npm run build`
3. Configure Nginx (already included in Docker)
4. Ensure backend data directory is writable
5. Use docker-compose for production deployment

### Scaling Considerations

For production at scale, consider:
- Replace JSON storage with PostgreSQL/MongoDB
- Add Redis for caching
- Implement rate limiting
- Add authentication if needed
- Set up proper logging and monitoring
- Use environment-specific Docker images

## 🐛 Troubleshooting

### Frontend can't connect to backend

- Ensure backend is running on correct port
- Check `VITE_API_BASE_URL` matches backend URL
- Make sure the frontend origin is listed in the backend `CORS_ORIGINS` env var (defaults cover local development)

### Presets not saving

- Check backend data directory is writable
- Verify backend logs for errors
- Ensure API endpoint is accessible

### 3D scene not rendering

- Check browser console for errors
- Verify Three.js is loaded correctly
- Ensure TresJS components are properly imported

## 📝 License

This is a portfolio project. Use as reference or starting point for your own projects.

## 🙏 Acknowledgments

- TresJS team for the excellent Vue 3 + Three.js integration
- Three.js community for powerful 3D graphics capabilities
- FastAPI for a modern, fast Python web framework

