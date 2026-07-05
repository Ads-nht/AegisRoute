# AegisRoute — Interactive Route & Itinerary Planner

[English](README.md) | [Türkçe](README.tr.md)

AegisRoute is a single-page web application for planning, visualizing, and sharing travel routes on an interactive map. Stops, budgets, transport legs, and checklists are driven by a JSON schema (`route.json`) and can be edited in the browser or persisted per user in SQLite.

---

## Key Features

- **Interactive map** — Leaflet.js with CartoDB Voyager tiles; auto-fit bounds, layered polylines (walk, sea, metro, drive), and stop markers
- **Timeline & checklists** — Per-stop cards with times, costs, descriptions, and Obsidian-style markdown tasks (`- [ ]` / `- [x]`)
- **Live countdown** — Configurable target time widget (sunset, event start, etc.) with safe fallbacks
- **Budget tracker** — Aggregates stop costs into a running total
- **Route editor** — Add stops, paste/load JSON, export `route.json`, and search places (Google Maps POI with Nominatim fallback)
- **User accounts** — Register/login, save multiple routes, share read-only links via share tokens
- **Resilience** — Offline map fallback keeps the timeline usable; auto port scan if 8080 is busy
- **Security** — PBKDF2 password hashing, rate limiting, CSRF checks, path traversal protection, magic-byte image validation

---

## Architecture

| Layer | Stack |
|-------|-------|
| Frontend | HTML, CSS, JavaScript, Leaflet.js, Font Awesome |
| Backend | Python 3 stdlib (`http.server`), SQLite |
| Deployment | Docker Compose (recommended) or local Python |

```
src/
├── server.py      # REST API + static file server
├── app.js         # Map, timeline, editor UI
├── index.html
├── style.css
└── route.json     # Default route template
```

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/register`, `/api/login` | User authentication |
| GET | `/api/my-routes` | List saved routes (Bearer token) |
| POST | `/api/save-route` | Create or update a route |
| GET | `/api/shared-route?token=` | Load a shared route |
| GET | `/api/search?q=` | Place search |
| POST | `/api/upload` | Image upload (PNG/JPEG/WebP) |

---

## Quick Start

### Docker (recommended)

```bash
docker compose up -d
```

Open [http://localhost:8888](http://localhost:8888)

Persistent data (database + uploads) is stored in `./data/`.

### Local Python

```bash
pip install -r requirements.txt
python src/server.py
```

Open [http://localhost:8080](http://localhost:8080) (auto-increments if the port is taken).

---

## Configuration

Edit stops and legs in the UI, or modify `src/route.json` directly. Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `AEGIS_DB_PATH` | `src/aegis.db` | SQLite database path |
| `AEGIS_UPLOAD_DIR` | `src/uploads` | Uploaded image directory |

---

## License

MIT License
