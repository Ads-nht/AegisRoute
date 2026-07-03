# 🗺️ AegisRoute - Interactive Custom Route & Itinerary Planner

[English](README.md) | [Türkçe](README_TR.md)

AegisRoute is a modern, high-performance, single-page web application designed to map, trace, and schedule custom travel routes and itineraries on an interactive map. It dynamically reads route checkpoints, budgets, and coordinates from a simple configuration file (`route.json`), making it instantly customizable for any city or trip.

---

## 🌟 Key Features

- **Interactive Dynamic Mapping:** Built with Leaflet.js and Google Maps roadmap tiles. Automatically centers, zooms, and fits coordinates to display the entire route.
- **Dynamic Timeline Schedule & Task Checklists:** Renders cards for each stop dynamically showing times, costs, Obsidian-style markdown checklist items (`- [ ] Tasks`), and descriptions. Double-clicking timeline cards triggers instant editing.
- **Custom Event Countdown:** Live countdown widget showing the remaining hours, minutes, and seconds to a configured target time (e.g., sunset, flight time, check-in, or event start). Automatically falls back to `---` when the route is empty.
- **Consolidated Budget Tracker:** Dynamically aggregates costs from all stops and displays the total budget instantly.
- **Google Maps Direction Helper:** Each card automatically generates direct Google Maps walking or transit direction URLs based on coordinate parameters.
- **Help Center Modal:** Clean Help button integrated into the sidebar menu, rendering the Turkish usage guide dynamically from `docs/KULLANIM.md` directly in the UI.
- **Responsive Mobile Layout:** Optimizes layout dynamically for mobile devices, offering tab switches between map and list views similar to native navigation apps.

---

## 🏗️ How to Configure Your Custom Route

You can configure, edit, or create new routes directly in the web browser using the **Route Editor & JSON Loader** modal:
1. Click the **"Rotayı Düzenle / JSON Yükle"** button in the sidebar.
2. Under the **"Durak Ekle"** tab, fill in the form with stop names, coordinates (latitude/longitude), cost, emojis, and transport types. It will immediately add the checkpoint and redraw the map paths.
3. Under the **"JSON Yapıştır / Yükle"** tab, you can paste a complete JSON configuration or choose a local `.json` file to apply it.
4. Click **"Rotayı İndir (route.json)"** to export your configured itinerary as a `route.json` file.

---

## 🚀 Execution & Deployment

### 1. Docker Setup (Recommended)

Run the application inside a container using docker-compose. All source files and docs are bind-mounted for live-reload without rebuilding.

```bash
# Start the container (accessible on port 8888 by default)
docker compose up -d
```

Open your browser and navigate to:
- [http://localhost:8888](http://localhost:8888)

### 2. Local Run (Python)

1. Install requirements:
   ```bash
   pip install -r requirements.txt
   ```
2. Start the local server:
   ```bash
   python src/server.py
   ```
3. Open your browser and navigate to:
   - [http://localhost:8080](http://localhost:8080)

---

## 📄 License

This project is licensed under the MIT License.
