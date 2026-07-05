# Implementation Plan: AegisRoute

Interactive single-page route planner with Leaflet map, timeline, budget tracker, Google Maps direction links, and a live countdown widget.

## Design Goals

- JSON-driven route configuration (`route.json`)
- No map API keys required (Leaflet + open tile layers)
- Mobile-first responsive layout
- Self-hosted; data stays on your machine

## Proposed Components

### `src/server.py`
Lightweight HTTP server with SQLite auth. Defaults to `127.0.0.1` bind address.

### `src/index.html`
Page skeleton: top bar, timeline sidebar, map container, budget summary.

### `src/style.css`
Dark-mode glassmorphic layout with transport-type color coding.

### `src/app.js`
Map markers, polylines, countdown, timeline interactions, route editor.

## Security Considerations

- Bind to localhost by default; expose via reverse proxy only when needed
- Shared links are read-only
- Authenticated upload and save endpoints
- Optional registration disable via `DISABLE_REGISTRATION`
