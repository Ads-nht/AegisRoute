// AegisRoute - Interactive Map and Route Schedule Application

// Global State
let itinerary = [];
let appConfig = {};
let map;
let markers = {};
let polylines = {
    walk: [],
    sea: [],
    metro: [],
    drive: []
};
let activeLayers = {
    walk: true,
    sea: true,
    metro: true,
    drive: true
};
let mapEnabled = typeof L !== 'undefined';

// 1. Fetch Route Configuration and Bootstrap
document.addEventListener('DOMContentLoaded', () => {
    // Set default mobile view class on startup
    if (window.innerWidth <= 768) {
        const appContainer = document.querySelector('.app-container');
        if (appContainer) appContainer.classList.add('show-timeline');
    }

    fetch('route.json')
        .then(response => {
            if (!response.ok) {
                throw new Error("HTTP error " + response.status);
            }
            return response.json();
        })
        .then(data => {
            appConfig = data.config || {};
            itinerary = data.itinerary || [];
            
            // Apply configuration dynamically to HTML elements
            document.title = appConfig.title || "AegisRoute";
            
            const titleEl = document.querySelector('.logo-area h1');
            if (titleEl) titleEl.innerText = appConfig.title || "AegisRoute";
            
            const subtitleEl = document.querySelector('.subtitle');
            if (subtitleEl) subtitleEl.innerText = appConfig.subtitle || "Custom Route Planner";
            
            const labelEl = document.querySelector('.stat-label');
            if (labelEl) labelEl.innerText = appConfig.countdown_label || "Hedef Sayaç";
            
            const targetEl = document.querySelector('.stat-value.highlight');
            if (targetEl) targetEl.innerText = appConfig.countdown_target || "00:00";
            
            const footerEl = document.querySelector('.sidebar-footer p');
            if (footerEl) footerEl.innerHTML = appConfig.footer_text || "Designed for custom route planning. ❤️";

            // Initialize app modules
            renderTimeline();
            initMap();
            startSunsetCountdown();
            calculateTotalBudget();
            registerControls();

            // Select the first stop by default as active after map loads
            setTimeout(() => {
                selectItineraryItem(1, false);
            }, 500);
        })
        .catch(err => {
            console.error("Failed to load route.json:", err);
            const warning = document.getElementById('offline-warning-banner');
            if (warning) {
                warning.querySelector('span').innerText = "Rota verileri (route.json) yüklenemedi. Sunucu bağlantınızı kontrol edin.";
                warning.style.display = 'flex';
            }
        });
});

// 2. Initialize Leaflet Map
function initMap() {
    if (!mapEnabled) {
        console.warn("Leaflet is not loaded. Map features are disabled.");
        const warning = document.getElementById('offline-warning-banner');
        if (warning) warning.style.display = 'flex';
        
        const mapSection = document.getElementById('map-section');
        if (mapSection) mapSection.style.display = 'none';
        
        const mapBtn = document.getElementById('btn-show-map');
        if (mapBtn) mapBtn.style.display = 'none';
        
        return;
    }

    const center = appConfig.map_center || [41.0240, 28.9950];
    const zoom = appConfig.map_zoom || 13;

    map = L.map('map', {
        zoomControl: false
    }).setView(center, zoom);
    
    // Custom styled zoom control at bottom-right
    L.control.zoom({
        position: 'bottomright'
    }).addTo(map);

    // CartoDB Voyager tiles (clean, beautiful, neutral colors)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(map);

    // Place Markers and build Paths
    drawRouteMarkers();
    drawRouteLines();
    fitMapBounds();
}

// 3. Draw Markers with custom CSS classes & emojis
function drawRouteMarkers() {
    if (!mapEnabled) return;
    itinerary.forEach(item => {
        const typeClass = `marker-${item.type}`;
        
        // Custom Leaflet DivIcon
        const customIcon = L.divIcon({
            className: `custom-marker-container ${typeClass}`,
            html: `
                <div class="custom-marker-pin" id="marker-pin-${item.id}">
                    <span class="custom-marker-emoji">${item.emoji}</span>
                </div>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 32],
            popupAnchor: [0, -32]
        });

        // Add Marker
        const marker = L.marker(item.coords, { icon: customIcon }).addTo(map);
        
        // Build Custom HTML Popup
        const popupContent = `
            <div class="custom-popup-content">
                <span class="popup-time">${item.time}</span>
                <h4 class="popup-title">${item.emoji} ${item.title}</h4>
                <p class="popup-desc">${item.desc}</p>
            </div>
        `;
        marker.bindPopup(popupContent);
        
        // Save marker instance
        markers[item.id] = marker;

        // Click handler on marker
        marker.on('click', () => {
            selectItineraryItem(item.id, false);
        });
    });
}

// 4. Draw Polylines dynamically using route.json definitions
function drawRouteLines() {
    if (!mapEnabled) return;
    
    const colors = {
        walk: '#2a9d8f',  // --walking-green
        sea: '#00b4d8',   // --sea-blue
        metro: '#8338ec', // --metro-purple
        drive: '#e76f51'  // custom drive coral
    };

    itinerary.forEach((item, index) => {
        if (!item.type_to_next || item.type_to_next === 'none') return;
        
        const nextItem = itinerary[index + 1];
        if (!nextItem) return;

        const segmentCoords = [item.coords];
        if (item.path_to_next && item.path_to_next.length > 0) {
            segmentCoords.push(...item.path_to_next);
        }
        segmentCoords.push(nextItem.coords);

        const lineType = item.type_to_next;

        const line = L.polyline(segmentCoords, {
            color: colors[lineType] || '#2a9d8f',
            weight: lineType === 'sea' ? 4 : 5,
            opacity: 0.8,
            dashArray: lineType === 'sea' ? '8, 8' : null,
            lineJoin: 'round'
        }).addTo(map);

        if (!polylines[lineType]) {
            polylines[lineType] = [];
        }
        polylines[lineType].push(line);
    });
}

// 5. Fit Map view to include all route markers
function fitMapBounds() {
    if (!mapEnabled || itinerary.length === 0) return;
    const coordsList = itinerary.map(item => item.coords);
    const bounds = L.latLngBounds(coordsList);
    map.fitBounds(bounds, {
        padding: [40, 40],
        maxZoom: 15
    });
}

// 6. Dynamic Countdown calculation
function startSunsetCountdown() {
    const timerElement = document.getElementById('countdown-timer');
    if (!timerElement) return;

    const targetHour = appConfig.countdown_hour !== undefined ? appConfig.countdown_hour : 20;
    const targetMinute = appConfig.countdown_minute !== undefined ? appConfig.countdown_minute : 38;
    
    function updateCountdown() {
        const now = new Date();
        
        let target = new Date();
        target.setHours(targetHour, targetMinute, 0, 0);
        
        if (now > target) {
            target.setDate(target.getDate() + 1);
        }
        
        const diffMs = target - now;
        
        if (diffMs < 0 || isNaN(diffMs)) {
            timerElement.innerText = "Hedef Süre Doldu! 🌅";
            timerElement.style.color = "var(--highlight-gold)";
            return;
        }
        
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
        
        const pad = num => String(num).padStart(2, '0');
        
        timerElement.innerText = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }
    
    updateCountdown();
    setInterval(updateCountdown, 1000);
}

// 7. Calculate and display budget total
function calculateTotalBudget() {
    const total = itinerary.reduce((sum, item) => sum + item.cost, 0);
    const budgetEl = document.getElementById('total-budget');
    if (budgetEl) budgetEl.innerText = `${total} TL`;
}

// 8. Render Timeline Cards in the Sidebar
function renderTimeline() {
    const container = document.getElementById('timeline-container');
    if (!container) return;
    container.innerHTML = '';
    
    itinerary.forEach(item => {
        const card = document.createElement('div');
        card.className = `timeline-card type-${item.type}`;
        card.id = `card-${item.id}`;
        
        const walkDir = `https://www.google.com/maps/dir/?api=1&destination=${item.coords[0]},${item.coords[1]}&travelmode=walking`;
        const transitDir = `https://www.google.com/maps/dir/?api=1&destination=${item.coords[0]},${item.coords[1]}&travelmode=transit`;
        
        card.innerHTML = `
            <div class="card-icon-wrapper">
                <span>${item.emoji}</span>
            </div>
            <div class="card-body">
                <div class="card-header-info">
                    <span class="card-time">${item.time}</span>
                    <span class="card-cost"><i class="fa-solid fa-tag"></i> ${item.costLabel}</span>
                </div>
                <h3>${item.title}</h3>
                <p>${item.desc}</p>
                <div class="card-actions">
                    <a href="${walkDir}" target="_blank" class="card-action-link" onclick="event.stopPropagation();">
                        <i class="fa-solid fa-person-walking"></i> Yol Tarifi
                    </a>
                    <a href="${transitDir}" target="_blank" class="card-action-link" onclick="event.stopPropagation();">
                        <i class="fa-solid fa-bus"></i> Toplu Taşıma
                    </a>
                </div>
            </div>
        `;
        
        card.addEventListener('click', () => {
            selectItineraryItem(item.id, true);
        });
        
        container.appendChild(card);
    });
}

// 9. Centralized Stop Selection Logic
function selectItineraryItem(id, zoomMap = true) {
    const selectedItem = itinerary.find(item => item.id === id);
    if (!selectedItem) return;

    // Auto re-enable filtered layer if selected
    if (mapEnabled) {
        let typeToEnable = selectedItem.type;
        if (typeToEnable === 'highlight') typeToEnable = 'sea';
        
        if (activeLayers[typeToEnable] === false) {
            let btnId = '';
            if (typeToEnable === 'walk') btnId = 'toggle-layer-walking';
            else if (typeToEnable === 'sea') btnId = 'toggle-layer-sea';
            else if (typeToEnable === 'metro') btnId = 'toggle-layer-metro';
            else if (typeToEnable === 'drive') btnId = 'toggle-layer-drive';
            
            const btn = document.getElementById(btnId);
            if (btn) {
                btn.click();
            }
        }
    }

    // A. Visual highlights in DOM (Timeline Sidebar)
    document.querySelectorAll('.timeline-card').forEach(card => card.classList.remove('active'));
    const activeCard = document.getElementById(`card-${id}`);
    if (activeCard) {
        activeCard.classList.add('active');
        activeCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // B. Visual highlights in Leaflet Map Markers
    if (mapEnabled) {
        document.querySelectorAll('.custom-marker-pin').forEach(pin => pin.classList.remove('active'));
        const activePin = document.getElementById(`marker-pin-${id}`);
        if (activePin) {
            activePin.classList.add('active');
        }

        // C. Open Marker Popup and Zoom
        const marker = markers[id];
        if (marker) {
            if (zoomMap) {
                map.setView(selectedItem.coords, 16);
            }
            marker.openPopup();
        }
    }

    // D. Update Floating Action Card on Map
    const floatCard = document.getElementById('floating-stop-card');
    const floatTime = document.getElementById('float-time');
    const floatBadge = document.getElementById('float-badge');
    const floatTitle = document.getElementById('float-title');
    const floatDesc = document.getElementById('float-desc');
    const floatWalk = document.getElementById('float-walk-link');
    const floatTransit = document.getElementById('float-transit-link');

    if (floatCard && floatTime && floatBadge && floatTitle && floatDesc && floatWalk && floatTransit) {
        floatTime.innerText = selectedItem.time;
        floatBadge.innerHTML = `<span>${selectedItem.emoji}</span>`;
        floatTitle.innerText = selectedItem.title;
        floatDesc.innerText = selectedItem.desc;
        
        floatWalk.href = `https://www.google.com/maps/dir/?api=1&destination=${selectedItem.coords[0]},${selectedItem.coords[1]}&travelmode=walking`;
        floatTransit.href = `https://www.google.com/maps/dir/?api=1&destination=${selectedItem.coords[0]},${selectedItem.coords[1]}&travelmode=transit`;
        
        floatCard.style.display = 'block';
    }
}

// 10. Register Filters and Button Controls
function registerControls() {
    const recenterBtn = document.getElementById('recenter-map');
    if (recenterBtn) {
        recenterBtn.addEventListener('click', () => {
            fitMapBounds();
        });
    }

    const toggleLayer = (type, btnId) => {
        const btn = document.getElementById(btnId);
        if (!btn) return;
        btn.addEventListener('click', () => {
            if (!mapEnabled) return;
            activeLayers[type] = !activeLayers[type];
            
            // Toggle Polyline lines
            if (polylines[type]) {
                polylines[type].forEach(line => {
                    if (activeLayers[type]) {
                        map.addLayer(line);
                    } else {
                        map.removeLayer(line);
                    }
                });
            }

            // Toggle Markers
            itinerary.forEach(item => {
                if (item.type === type || (type === 'sea' && item.type === 'highlight')) {
                    const marker = markers[item.id];
                    if (marker) {
                        if (activeLayers[type]) {
                            map.addLayer(marker);
                        } else {
                            map.removeLayer(marker);
                        }
                    }
                }
            });

            if (activeLayers[type]) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    };

    toggleLayer('walk', 'toggle-layer-walking');
    toggleLayer('sea', 'toggle-layer-sea');
    toggleLayer('metro', 'toggle-layer-metro');

    // Mobile View Switching
    const appContainer = document.querySelector('.app-container');
    const btnTimeline = document.getElementById('btn-show-timeline');
    const btnMap = document.getElementById('btn-show-map');

    if (btnTimeline && appContainer) {
        btnTimeline.addEventListener('click', () => {
            appContainer.className = 'app-container show-timeline';
            btnTimeline.classList.add('active');
            if (btnMap) btnMap.classList.remove('active');
        });
    }

    if (btnMap && appContainer) {
        btnMap.addEventListener('click', () => {
            if (!mapEnabled) return;
            appContainer.className = 'app-container show-map';
            btnMap.classList.add('active');
            if (btnTimeline) btnTimeline.classList.remove('active');
            
            setTimeout(() => {
                map.invalidateSize();
            }, 100);
        });
    }
}
