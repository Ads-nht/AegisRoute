# Walkthrough: AegisRoute Initial Release

AegisRoute is an interactive route planner with a Leaflet map, timeline checklist, budget panel, and live countdown widget.

## Accomplished Work

Standard project layout with `/src`, `/docs`, and bilingual README files.

### File Structure
- `README.md` / `README.tr.md` — Project overview and setup
- `requirements.txt` — Zero external Python dependencies
- `src/server.py` — Lightweight HTTP server with SQLite auth
- `src/index.html`, `style.css`, `app.js` — Frontend SPA
- `docs/` — Changelog, roadmap, usage guide

## Poka-Yoke Enhancements

1. **Offline & CDN fallback** — Timeline stays usable if the map fails to load
2. **Layer fail-safe** — Clicking a timeline card re-enables hidden map layers
3. **Countdown robustness** — Safe fallback for clock sync issues
4. **Port scan protection** — Auto-finds next free port if 8080 is taken

## Running Locally

```bash
python src/server.py
```

Open `http://127.0.0.1:8080` (default bind is localhost only).

## Docker

```bash
docker compose up -d
```

Accessible at `http://127.0.0.1:8888` (not exposed to LAN by default).
