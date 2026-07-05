# Changelog — AegisRoute

## [Unreleased]
### Security
- Default bind address changed to `127.0.0.1`; Docker maps to localhost only
- Shared route links are read-only; authenticated save required for edits
- Image upload requires Bearer token
- Optional `DISABLE_REGISTRATION` env flag

### Changed
- Docs sanitized: removed personal route data and local filesystem paths

## [1.2.0] - 2026-06-19
### Changed
- Route editor, user accounts, SQLite persistence, and share links added
- Polyline and timeline rendering improvements

## [1.0.0] - 2026-06-18
### Added
- Initial release: Leaflet map, timeline, budget tracker, countdown widget
- Poka-yoke: offline fallback, port auto-scan, layer fail-safe
