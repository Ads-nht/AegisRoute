# 🗺️ AegisRoute - Interactive Custom Route & Itinerary Planner

[English](README.md) | [Türkçe](README_TR.md)

AegisRoute is a modern, high-performance, single-page web application designed to map, trace, and schedule custom travel routes and itineraries on an interactive map. It dynamically reads route checkpoints, budgets, and coordinates from a simple configuration file (`route.json`), making it instantly customizable for any city or trip.

---

## 🌟 Key Features

- **Interactive Dynamic Mapping:** Built with Leaflet.js and styled with clean CartoDB Voyager tiles. Automatically centers, zooms, and fits coordinates to display the entire route.
- **Dynamic Timeline Schedule:** Renders cards for each stop dynamically showing times, emojis, costs, and descriptions. Clicking cards smoothly focuses and zooms the map onto the target marker.
- **Custom Event Countdown:** Live countdown widget showing the remaining hours, minutes, and seconds to a configured target time (e.g., sunset, flight time, check-in, or event start).
- **Consolidated Budget Tracker:** Dynamically aggregates costs from all stops and displays the total budget instantly.
- **Google Maps Direction Helper:** Each card automatically generates direct Google Maps walking or transit direction URLs based on coordinate parameters.
- **Responsive Mobile Layout:** Optimizes layout dynamically for mobile devices, offering tab switches between map and list views similar to native navigation apps.

---

## 🏗️ How to Configure Your Custom Route

AegisRoute is fully data-driven. Simply edit the [route.json](src/route.json) file in the `src/` directory.

### Configuration Schema (`route.json`):
```json
{
  "config": {
    "title": "AegisRoute",
    "subtitle": "Interactive Custom Route Planner",
    "map_center": [41.0240, 28.9950],
    "map_zoom": 13,
    "countdown_label": "Target Event Time",
    "countdown_target": "20:38",
    "countdown_hour": 20,
    "countdown_minute": 38,
    "footer_text": "Designed for custom route planning. ❤️"
  },
  "itinerary": [
    {
      "id": 1,
      "time": "13:15 - 13:25",
      "title": "First Stop Title",
      "locationName": "Location Name",
      "desc": "Detailed description of what to do at this stop.",
      "cost": 50,
      "costLabel": "~50 USD",
      "emoji": "📍",
      "type": "walk",
      "coords": [41.02758, 29.01518],
      "type_to_next": "walk",
      "path_to_next": [
        [41.02500, 29.01600]
      ]
    }
  ]
}
```

- **`coords`**: The exact latitude and longitude of the marker.
- **`path_to_next`**: Optional intermediate coordinate array for drawing visual paths (e.g. following roads, sea passes, or subways) between the current checkpoint and the next.
- **`type_to_next`**: Can be `walk`, `sea`, `metro`, `drive`, or `none`. Defines the line color and styling drawn to the next point.

---

## 🚀 Execution & Network Setup

### Local Run
1. Go to the project directory:
   ```bash
   cd AegisRoute
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
