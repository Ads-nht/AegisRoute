# Implementation Plan: Nazen Rota (İstanbul Date Planner Web App)

An interactive, responsive single-page web application to visualize the custom date itinerary with Nazen in Istanbul. The application will feature a Leaflet-based map, a glassmorphic timeline, a budget tracker, Google Maps direction triggers, and a live countdown to the 20:38 sunset at the Maiden's Tower (Kız Kulesi).

## User Review Required

> [!NOTE]
> **Map Coordinates & Navigation:**
> The plan maps out 16 coordinate waypoints across Karaköy, Galata, Üsküdar, and Maltepe. Since standard Google Maps restricts multi-transit routing (combining walking, ferries, boats, and metro in a single line) and limits stops, this app will construct and render these segments using custom visual polyline styles on Leaflet.js (free, no API keys needed).
> 
> Direct deep-links to Google Maps will be placed on each card so the user can easily launch walking or transit directions from their current location to each stop.

> [!IMPORTANT]
> **Mobile Optimization:**
> The interface will prioritize a premium mobile-first view (with a swipeable or collapsible timeline drawer) because the user will likely view this itinerary on a phone while walking around Karaköy and Üsküdar.

## Proposed Changes

We will create a new project folder under `Projeler/Nazen_Rota/` consisting of:
- A custom, lightweight Python local web server `server.py` (consistent with the user's `Nazen_Oyun` project).
- `index.html` containing the semantic layout, Leaflet CDN links, and modern Outfit font styles.
- `style.css` containing premium glassmorphism styling, a curated color palette (midnight dark, soft rose, sea blue), and smooth transition effects.
- `app.js` holding the geographic coordinates, polyline drawers, the live sunset countdown, and timeline event handlers.

---

### [Nazen Rota Project Component]

#### [NEW] [server.py](file:///home/ads/Antigravity/Projeler/Nazen_Rota/src/server.py)
A lightweight HTTP server supporting CORS and range queries to run on `http://localhost:8080` (or local network IP to access via phone on the same Wi-Fi).

#### [NEW] [index.html](file:///home/ads/Antigravity/Projeler/Nazen_Rota/src/index.html)
The page skeleton with HTML5 semantic components:
- Top bar with date header, live clock, and Maiden's Tower Sunset Countdown.
- Side drawer (timeline pane) containing individual route cards with description, time slot, emoji, cost info, and "Open in Maps" links.
- Map container (`#map`) filling the rest of the layout.
- Cost summary banner showing Total Budget.

#### [NEW] [style.css](file:///home/ads/Antigravity/Projeler/Nazen_Rota/src/style.css)
Premium layout styling:
- CSS variables for clean design tokens (e.g., `--bg-card: rgba(26, 26, 36, 0.75)`, `--accent-rose: #ff477e`, `--sea-blue: #00b4d8`, `--walking-green: #2a9d8f`, `--metro-purple: #7209b7`).
- Glassmorphism effects using CSS `backdrop-filter: blur(12px)`.
- Responsive Grid: Side-by-side panel layout on desktop; overlays with swipe-to-show features on mobile.
- Custom stylized map popups and custom scrollbars.

#### [NEW] [app.js](file:///home/ads/Antigravity/Projeler/Nazen_Rota/src/app.js)
The core client-side controller:
- Initializing Leaflet map with CartoDB Voyager map tiles (neutral colors, very clean, shows English/Turkish names).
- Iterating through the 16 itinerary waypoints to place markers styled with custom colored pins and emojis.
- Drawing stylized lines (polylines) with different color codes for sea crossings (blue), walking routes (green), and metro lines (purple).
- Dynamically calculating the Maiden's Tower sunset countdown (relative to current date at 20:38:00).
- Registering interactive triggers: hovering or clicking a timeline card centers the map, increases marker size, and opens its popup.

---

## Verification Plan

### Manual Verification
1. Launch `python3 server.py` and access the page on Chrome/Firefox.
2. Verify visual appearance: glassmorphism panels, map marker emojis, and colored route polylines.
3. Test responsiveness: resize the window to simulate mobile viewports.
4. Verify click behaviors: clicking a timeline item should focus and open the map popup.
5. Verify countdown timer calculations.
6. Verify direct Google Maps links launch correct coordinates.
