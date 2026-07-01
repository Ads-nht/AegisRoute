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
let countdownInterval;
let tempMarker = null;

// 1. Fetch Route Configuration and Bootstrap
document.addEventListener('DOMContentLoaded', () => {
    // Set default mobile view class on startup
    if (window.innerWidth <= 768) {
        const appContainer = document.querySelector('.app-container');
        if (appContainer) appContainer.classList.add('show-timeline');
    }

    // Try loading route.json. If it fails, fall back to route_template.json.
    fetch('route.json')
        .then(response => {
            if (!response.ok) {
                throw new Error("route.json not found, loading template...");
            }
            return response.json();
        })
        .catch(() => {
            // Fallback to route_template.json
            return fetch('route_template.json')
                .then(res => res.json());
        })
        .then(data => {
            loadRouteData(data);
        })
        .catch(err => {
            console.error("Failed to load both route.json and route_template.json:", err);
            const warning = document.getElementById('offline-warning-banner');
            if (warning) {
                warning.querySelector('span').innerText = "Rota verileri yüklenemedi. Rota editörünü kullanarak yeni bir rota oluşturabilirsiniz.";
                warning.style.display = 'flex';
            }
            // Initialize empty app modules
            loadRouteData({
                config: {
                    title: "AegisRoute",
                    subtitle: "İnteraktif Rota Planlayıcı",
                    map_center: [41.0240, 28.9950],
                    map_zoom: 13,
                    countdown_label: "Hedef Zaman",
                    countdown_target: "20:00",
                    countdown_hour: 20,
                    countdown_minute: 0,
                    footer_text: "AegisRoute ile kendi rotanızı planlayın."
                },
                itinerary: []
            });
        })
        .finally(() => {
            registerControls();
        });
});

// Load and apply route configuration and list
function loadRouteData(data) {
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

    // Setup JSON editor text area with current data
    const jsonInput = document.getElementById('json-input');
    if (jsonInput) {
        jsonInput.value = JSON.stringify(data, null, 2);
    }

    // Refresh UI Components
    rebuildRouteUI();
    
    // Select first stop if available
    if (itinerary.length > 0) {
        setTimeout(() => {
            selectItineraryItem(itinerary[0].id, false);
        }, 500);
    }
}

// Clear map overlays and rebuild all visual routes
function rebuildRouteUI() {
    clearMapOverlays();
    renderTimeline();
    initMapInstance();
    startSunsetCountdown();
    calculateTotalBudget();
    
    if (mapEnabled) {
        drawRouteMarkers();
        drawRouteLines();
        fitMapBounds();
    }
}

// Clear Leaflet markers and lines
function clearMapOverlays() {
    if (!map) return;
    
    // Clear markers
    for (let id in markers) {
        map.removeLayer(markers[id]);
    }
    markers = {};

    // Clear polylines
    for (let type in polylines) {
        polylines[type].forEach(line => {
            map.removeLayer(line);
        });
        polylines[type] = [];
    }
}

// 2. Initialize Leaflet Map Instance (Singletone-like check)
function initMapInstance() {
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

    if (!map) {
        map = L.map('map', {
            zoomControl: false
        }).setView(center, zoom);
        
        // Custom styled zoom control at bottom-right
        L.control.zoom({
            position: 'bottomright'
        }).addTo(map);

        // Google Maps Roadmap tiles
        L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
            attribution: '&copy; Google Maps',
            maxZoom: 20
        }).addTo(map);

        // Map Click Listener
        map.on('click', handleMapClick);
    } else {
        map.setView(center, zoom);
    }
}

// Map Click Handler for Coordinate Selection
function handleMapClick(e) {
    const modal = document.getElementById('route-editor-modal');
    if (!modal || modal.style.display !== 'flex') return;

    // Auto-fill form fields
    const latInput = document.getElementById('stop-lat');
    const lonInput = document.getElementById('stop-lon');
    if (latInput && lonInput) {
        latInput.value = e.latlng.lat.toFixed(6);
        lonInput.value = e.latlng.lng.toFixed(6);
    }

    // Place stabbing pin marker
    if (tempMarker && map) {
        map.removeLayer(tempMarker);
    }

    const stabIcon = L.divIcon({
        className: 'temp-stab-marker',
        html: '<div class="stab-pin"><i class="fa-solid fa-thumbtack"></i></div>',
        iconSize: [32, 32],
        iconAnchor: [16, 32]
    });

    tempMarker = L.marker(e.latlng, { icon: stabIcon }).addTo(map);
}

// 3. Draw Markers with custom CSS classes & emojis
function drawRouteMarkers() {
    if (!mapEnabled || !map) return;
    itinerary.forEach(item => {
        const typeClass = `marker-${item.type}`;
        
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

        const marker = L.marker(item.coords, { icon: customIcon }).addTo(map);
        
        const popupContent = `
            <div class="custom-popup-content">
                <span class="popup-time">${item.time}</span>
                <h4 class="popup-title">${item.emoji} ${item.title}</h4>
                <p class="popup-desc">${item.desc}</p>
            </div>
        `;
        marker.bindPopup(popupContent);
        
        markers[item.id] = marker;

        marker.on('click', () => {
            selectItineraryItem(item.id, false);
        });
    });
}

// 4. Draw Polylines dynamically
function drawRouteLines() {
    if (!mapEnabled || !map) return;
    
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
    if (!mapEnabled || !map || itinerary.length === 0) return;
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

    if (countdownInterval) clearInterval(countdownInterval);

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
    countdownInterval = setInterval(updateCountdown, 1000);
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
    
    if (itinerary.length === 0) {
        container.innerHTML = `
            <div class="empty-timeline-info" style="padding: 30px; text-align: center; color: var(--text-muted);">
                <i class="fa-solid fa-map-pin" style="font-size: 28px; margin-bottom: 12px; display: block; color: var(--primary-teal);"></i>
                <p>Henüz durak eklenmemiş. Rota Editörünü kullanarak hemen bir durak ekleyin!</p>
            </div>
        `;
        return;
    }
    
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

    // Add special "Add Stop Card" at the end of the timeline list
    const addCard = document.createElement('div');
    addCard.className = 'timeline-card add-stop-card';
    addCard.innerHTML = `
        <div class="card-icon-wrapper">
            <span><i class="fa-solid fa-plus"></i></span>
        </div>
        <div class="card-body">
            <h3>Yeni Durak Ekle</h3>
            <p>Rotanıza yeni bir durak veya harita checkpoint'i eklemek için tıklayın.</p>
        </div>
    `;
    addCard.addEventListener('click', () => {
        const modal = document.getElementById('route-editor-modal');
        if (modal) {
            modal.style.display = 'flex';
            const currentData = { config: appConfig, itinerary: itinerary };
            const jsonInput = document.getElementById('json-input');
            if (jsonInput) jsonInput.value = JSON.stringify(currentData, null, 2);
        }
    });
    container.appendChild(addCard);
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
    if (mapEnabled && map) {
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

// 10. Register Filters, Button Controls and Modal Handlers
function registerControls() {
    // Recenter
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

    // --- ROTA EDİTÖRÜ MODAL ETKİLEŞİMLERİ ---
    const modal = document.getElementById('route-editor-modal');
    const openBtn = document.getElementById('btn-open-editor');
    const closeBtn = document.getElementById('btn-close-editor');
    const tabFormBtn = document.getElementById('tab-btn-form');
    const tabJsonBtn = document.getElementById('tab-btn-json');
    const tabFormContent = document.getElementById('tab-content-form');
    const tabJsonContent = document.getElementById('tab-content-json');
    const addForm = document.getElementById('add-stop-form');
    const applyJsonBtn = document.getElementById('btn-apply-json');
    const exportJsonBtn = document.getElementById('btn-export-json');
    const clearRouteBtn = document.getElementById('btn-clear-route');
    const fileUploadInput = document.getElementById('file-upload');
    const triggerUploadBtn = document.getElementById('btn-trigger-upload');

    // Helper to clear temporary pin
    function clearTempMarker() {
        if (tempMarker && map) {
            map.removeLayer(tempMarker);
            tempMarker = null;
        }
    }

    // Open/Close Modal
    if (openBtn && modal) {
        openBtn.addEventListener('click', () => {
            modal.style.display = 'flex';
            // Pre-fill JSON area with current config + itinerary
            const currentData = { config: appConfig, itinerary: itinerary };
            const jsonInput = document.getElementById('json-input');
            if (jsonInput) jsonInput.value = JSON.stringify(currentData, null, 2);
        });
    }

    if (closeBtn && modal) {
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
            clearTempMarker();
        });
    }

    // Modal click backdrop close
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
                clearTempMarker();
            }
        });
    }

    // Tab Switching
    if (tabFormBtn && tabJsonBtn && tabFormContent && tabJsonContent) {
        tabFormBtn.addEventListener('click', () => {
            tabFormBtn.classList.add('active');
            tabJsonBtn.classList.remove('active');
            tabFormContent.classList.add('active');
            tabJsonContent.classList.remove('active');
        });

        tabJsonBtn.addEventListener('click', () => {
            tabJsonBtn.classList.add('active');
            tabFormBtn.classList.remove('active');
            tabJsonContent.classList.add('active');
            tabFormContent.classList.remove('active');
        });
    }

    // Submit stop via form
    if (addForm) {
        addForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const nextId = itinerary.length > 0 ? Math.max(...itinerary.map(item => item.id)) + 1 : 1;
            const newStop = {
                id: nextId,
                time: document.getElementById('stop-time').value,
                title: document.getElementById('stop-title').value,
                locationName: document.getElementById('stop-location').value,
                desc: document.getElementById('stop-title').value + " durağında durulacak.",
                cost: parseFloat(document.getElementById('stop-cost').value) || 0,
                costLabel: (parseFloat(document.getElementById('stop-cost').value) || 0) + " TL",
                emoji: document.getElementById('stop-emoji').value || "📍",
                type: document.getElementById('stop-type').value,
                coords: [
                    parseFloat(document.getElementById('stop-lat').value),
                    parseFloat(document.getElementById('stop-lon').value)
                ],
                type_to_next: "walk",
                path_to_next: []
            };

            itinerary.push(newStop);
            rebuildRouteUI();
            addForm.reset();
            clearTempMarker();
            
            // Switch view to show the newly added stop
            selectItineraryItem(newStop.id, true);
            alert("Durak başarıyla eklendi!");
        });
    }

    // Apply custom pasted JSON
    if (applyJsonBtn) {
        applyJsonBtn.addEventListener('click', () => {
            const jsonText = document.getElementById('json-input').value;
            try {
                const parsed = JSON.parse(jsonText);
                if (!parsed.itinerary || !Array.isArray(parsed.itinerary)) {
                    throw new Error("Geçersiz şema: 'itinerary' dizisi bulunamadı.");
                }
                loadRouteData(parsed);
                modal.style.display = 'none';
                alert("Rota JSON şeması başarıyla uygulandı!");
            } catch (err) {
                alert("JSON ayrıştırma hatası: " + err.message);
            }
        });
    }

    // Trigger local file upload
    if (triggerUploadBtn && fileUploadInput) {
        triggerUploadBtn.addEventListener('click', () => {
            fileUploadInput.click();
        });
    }

    if (fileUploadInput) {
        fileUploadInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const parsed = JSON.parse(event.target.result);
                    loadRouteData(parsed);
                    modal.style.display = 'none';
                    alert("Dosya başarıyla yüklendi ve uygulandı!");
                } catch (err) {
                    alert("JSON Dosyası okuma hatası: " + err.message);
                }
            };
            reader.readAsText(file);
        });
    }

    // Export/Download JSON file
    if (exportJsonBtn) {
        exportJsonBtn.addEventListener('click', () => {
            const currentData = { config: appConfig, itinerary: itinerary };
            const jsonString = JSON.stringify(currentData, null, 2);
            const blob = new Blob([jsonString], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = "route.json";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        });
    }

    // Clear all route checkpoints
    if (clearRouteBtn) {
        clearRouteBtn.addEventListener('click', () => {
            if (confirm("Tüm rotayı ve durakları silmek istediğinize emin misiniz?")) {
                itinerary = [];
                rebuildRouteUI();
                const jsonInput = document.getElementById('json-input');
                if (jsonInput) jsonInput.value = "";
                modal.style.display = 'none';
            }
        });
    }
}
