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
let currentRouteId = null;
let editingStopId = null;

// Markdown & Task Checklist Parser (Obsidian style)
function renderMarkdown(md, stopId) {
    if (!md) return '';
    
    let lines = md.split('\n');
    let html = [];
    let inList = false;
    let todoIndex = 0;
    
    lines.forEach(line => {
        let trimmed = line.trim();
        
        // Headers
        if (trimmed.startsWith('### ')) {
            if (inList) { html.push('</ul>'); inList = false; }
            html.push(`<h4 style="margin: 10px 0 5px 0; color: var(--primary-teal); font-size: 14px; font-weight: 600;"><i class="fa-solid fa-hashtag" style="font-size: 10px; opacity: 0.6; margin-right: 4px;"></i>${trimmed.substring(4)}</h4>`);
        } else if (trimmed.startsWith('## ')) {
            if (inList) { html.push('</ul>'); inList = false; }
            html.push(`<h3 style="margin: 12px 0 6px 0; color: var(--primary-teal); font-size: 15px; font-weight: 600;"><i class="fa-solid fa-hashtag" style="font-size: 12px; opacity: 0.6; margin-right: 4px;"></i>${trimmed.substring(3)}</h3>`);
        } else if (trimmed.startsWith('# ')) {
            if (inList) { html.push('</ul>'); inList = false; }
            html.push(`<h2 style="margin: 14px 0 8px 0; color: var(--primary-teal); font-size: 16px; font-weight: 700;"><i class="fa-solid fa-hashtag" style="font-size: 13px; opacity: 0.6; margin-right: 4px;"></i>${trimmed.substring(2)}</h2>`);
        }
        // Task Checklist - [ ] or - [x]
        else if (trimmed.startsWith('- [ ] ') || trimmed.startsWith('- [x] ') || trimmed.startsWith('- [ ]') || trimmed.startsWith('- [x]')) {
            if (!inList) { html.push('<ul style="list-style: none; padding-left: 0; margin: 8px 0;">'); inList = true; }
            const isChecked = trimmed.includes('[x]');
            // Extract task text: skip "- [ ] " or "- [x] "
            let taskText = trimmed.replace(/^-\s*\[[ xX]\]\s*/, '');
            
            html.push(`
                <li style="display: flex; align-items: flex-start; gap: 8px; margin: 6px 0; font-size: 13px; line-height: 1.4;">
                    <input type="checkbox" ${isChecked ? 'checked' : ''} 
                           onchange="toggleRouteTodo(${stopId}, ${todoIndex}); event.stopPropagation();" 
                           style="margin-top: 3px; cursor: pointer; width: 15px; height: 15px; accent-color: var(--primary-teal);">
                    <span style="${isChecked ? 'text-decoration: line-through; opacity: 0.5;' : 'color: var(--text-normal);'}">${taskText}</span>
                </li>
            `);
            todoIndex++;
        }
        // Normal List - item
        else if (trimmed.startsWith('- ')) {
            if (!inList) { html.push('<ul style="padding-left: 20px; margin: 8px 0; list-style-type: disc;">'); inList = true; }
            html.push(`<li style="margin: 4px 0; font-size: 13px; color: var(--text-normal);">${trimmed.substring(2)}</li>`);
        }
        // Empty line
        else if (trimmed === '') {
            if (inList) { html.push('</ul>'); inList = false; }
            html.push('<div style="height: 6px;"></div>');
        }
        // Plain text paragraph
        else {
            if (inList) { html.push('</ul>'); inList = false; }
            html.push(`<p style="margin: 4px 0; font-size: 13px; line-height: 1.5; color: var(--text-normal);">${line}</p>`);
        }
    });
    
    if (inList) {
        html.push('</ul>');
    }
    
    return html.join('');
}

// Global todo toggle function for onclick/onchange in card markup
window.toggleRouteTodo = function(stopId, taskIndex) {
    console.log(`[TodoToggle] stopId: ${stopId}, taskIndex: ${taskIndex}`);
    const stop = itinerary.find(s => s.id === stopId);
    if (!stop || !stop.notes) return;
    
    let lines = stop.notes.split('\n');
    let todoCount = 0;
    
    for (let i = 0; i < lines.length; i++) {
        let trimmed = lines[i].trim();
        // Regex to match task lines
        if (/^-\s*\[[ xX]\]/.test(trimmed)) {
            if (todoCount === taskIndex) {
                if (trimmed.includes('[ ]')) {
                    lines[i] = lines[i].replace('[ ]', '[x]');
                } else {
                    lines[i] = lines[i].replace('[x]', '[ ]').replace('[X]', '[ ]');
                }
                console.log(`[TodoToggle] Swapped line: ${lines[i]}`);
                break;
            }
            todoCount++;
        }
    }
    
    stop.notes = lines.join('\n');
    rebuildRouteUI();
    
    // Trigger silent save or notify user to save
    console.log("[TodoToggle] State updated, triggering save indicator.");
};

// 1. Fetch Route Configuration and Bootstrap
document.addEventListener('DOMContentLoaded', () => {
    // Set default mobile view class on startup
    if (window.innerWidth <= 768) {
        const appContainer = document.querySelector('.app-container');
        if (appContainer) appContainer.classList.add('show-timeline');
    }

    // Try loading route.json. If it fails, fall back to empty state.
    fetch('route.json')
        .then(response => {
            if (!response.ok) throw new Error("route.json not found");
            return response.json();
        })
        .catch(() => ({
            config: {
                title: "AegisRoute",
                subtitle: "İnteraktif Rota ve Gezi Planlayıcı",
                map_center: [41.0240, 28.9950],
                map_zoom: 13,
                countdown_label: "Hedef Zaman",
                countdown_target: "20:00",
                countdown_hour: 20,
                countdown_minute: 0,
                footer_text: "AegisRoute ile kendi rotanı planla. ❤️"
            },
            itinerary: []
        }))
        .then(data => {
            loadRouteData(data);
        })
        .catch(err => {
            console.error("Failed to load route data:", err);
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

// Dynamic datalist suggestion generator for previously added stop types
function updateDatalistSuggestions() {
    const datalist = document.getElementById('type-options');
    if (!datalist) return;
    
    // Default types
    const defaultTypes = new Set(['walk', 'sea', 'metro', 'drive', 'bus', 'bike']);
    
    // Collect unique custom types from current itinerary
    itinerary.forEach(item => {
        if (item.type && item.type.trim()) {
            defaultTypes.add(item.type.trim());
        }
    });
    
    // Rebuild options HTML
    datalist.innerHTML = Array.from(defaultTypes).map(type => {
        let label = type;
        if (type === 'walk') label = 'Yürüyüş';
        else if (type === 'sea') label = 'Deniz Yolu';
        else if (type === 'metro') label = 'Metro';
        else if (type === 'drive') label = 'Araç';
        else if (type === 'bus') label = 'Otobüs';
        else if (type === 'bike') label = 'Bisiklet';
        
        return `<option value="${type}">${label}</option>`;
    }).join('');
}

// Clear map overlays and rebuild all visual routes
function rebuildRouteUI() {
    clearMapOverlays();
    renderTimeline();
    initMapInstance();
    startSunsetCountdown();
    calculateTotalBudget();
    updateDatalistSuggestions();
    
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

    // Only pick if modal is in map-picking mode
    if (!modal.classList.contains('map-picking')) return;

    // Auto-fill hidden form fields
    const latInput = document.getElementById('stop-lat');
    const lonInput = document.getElementById('stop-lon');
    if (latInput && lonInput) {
        latInput.value = e.latlng.lat.toFixed(6);
        lonInput.value = e.latlng.lng.toFixed(6);
    }

    // Update coordinates text preview elements
    const previewLat = document.getElementById('preview-lat');
    const previewLon = document.getElementById('preview-lon');
    const coordsPreview = document.getElementById('coords-preview');
    if (previewLat && previewLon && coordsPreview) {
        previewLat.innerText = e.latlng.lat.toFixed(5);
        previewLon.innerText = e.latlng.lng.toFixed(5);
        coordsPreview.style.display = 'flex';
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

    // Turn off map-picking view to restore the full modal
    modal.classList.remove('map-picking');
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
    
    // If route has no stops, do not start active countdown, just show '---'
    if (itinerary.length === 0) {
        timerElement.innerText = "---";
        timerElement.style.color = "";
        return;
    }

    updateCountdown();
    countdownInterval = setInterval(updateCountdown, 1000);
}

// 7. Calculate and display budget total
function calculateTotalBudget() {
    const budgetEl = document.getElementById('total-budget');
    if (!budgetEl) return;
    
    if (itinerary.length === 0) {
        budgetEl.innerText = "---";
        return;
    }
    
    const total = itinerary.reduce((sum, item) => sum + item.cost, 0);
    budgetEl.innerText = `${total} TL`;
}

// 8. Render Timeline Cards in the Sidebar
function renderTimeline() {
    const container = document.getElementById('timeline-container');
    if (!container) return;
    container.innerHTML = '';
    
    if (itinerary.length === 0) {
        container.classList.add('is-empty');
        container.innerHTML = `
            <div class="empty-state-card" style="
                padding: 32px 24px;
                text-align: center;
                background: rgba(42,157,143,0.06);
                border: 1px dashed rgba(42,157,143,0.3);
                border-radius: 16px;
                margin: 12px 0;
            ">
                <div style="font-size: 48px; margin-bottom: 16px; display: block;">🗺️</div>
                <h2 style="color: var(--text-light); font-size: 18px; margin: 0 0 10px 0; font-weight: 700;">Rotanı oluşturmaya başla!</h2>
                <p style="color: var(--text-muted); font-size: 13px; line-height: 1.7; margin: 0 0 24px 0;">
                    Haritaya bir yeri işaretle veya arama barını kullanarak<br>
                    ilk durağını ekle. Rotanı istediğin zaman kaydet ve paylaş.
                </p>
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    <button onclick="document.getElementById('map-search-input') && document.getElementById('map-search-input').focus()" style="
                        background: var(--primary-teal);
                        color: #fff;
                        border: none;
                        border-radius: 10px;
                        padding: 12px 20px;
                        font-size: 14px;
                        font-weight: 600;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 8px;
                        transition: all 0.2s;
                    ">
                        <i class="fa-solid fa-magnifying-glass-location"></i> Yer Ara
                    </button>
                    <button onclick="document.getElementById('btn-open-editor') && document.getElementById('btn-open-editor').click()" style="
                        background: rgba(255,255,255,0.05);
                        color: var(--text-muted);
                        border: 1px solid rgba(255,255,255,0.12);
                        border-radius: 10px;
                        padding: 12px 20px;
                        font-size: 13px;
                        font-weight: 500;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 8px;
                        transition: all 0.2s;
                    ">
                        <i class="fa-solid fa-file-import"></i> JSON ile İçe Aktar
                    </button>
                </div>
            </div>
        `;
        return;
    }
    
    container.classList.remove('is-empty');
    
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
                ${item.notes ? `
                <div class="card-notes" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); padding: 12px 14px; border-radius: 8px; margin-top: 12px; border-left: 3px solid var(--primary-teal); box-shadow: inset 0 1px 3px rgba(0,0,0,0.2);">
                    <div style="display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--primary-teal); margin-bottom: 8px;">
                        <i class="fa-solid fa-note-sticky"></i> Görev & Notlar
                    </div>
                    ${renderMarkdown(item.notes, item.id)}
                </div>
                ` : ''}
                ${item.image ? `<div class="card-image"><img src="${item.image}" style="max-width: 100%; border-radius: 8px; margin-top: 10px; border: 1px solid rgba(255,255,255,0.1);"></div>` : ''}
                <div class="card-actions">
                    <a href="${walkDir}" target="_blank" class="card-action-link" onclick="event.stopPropagation();">
                        <i class="fa-solid fa-person-walking"></i> Yol Tarifi
                    </a>
                    <a href="${transitDir}" target="_blank" class="card-action-link" onclick="event.stopPropagation();">
                        <i class="fa-solid fa-bus"></i> Toplu Taşıma
                    </a>
                    <button class="card-action-link edit-btn" style="background: transparent; border: none; cursor: pointer; color: var(--primary-teal); font-family: inherit; font-size: inherit;" onclick="event.stopPropagation(); window.openEditStopModal(${item.id});">
                        <i class="fa-solid fa-pen-to-square"></i> Düzenle
                    </button>
                </div>
            </div>
        `;
        
        card.addEventListener('click', () => {
            selectItineraryItem(item.id, true);
        });

        card.addEventListener('dblclick', () => {
            window.openEditStopModal(item.id);
        });

        // Mobile double-tap gesture listener to trigger editing
        let lastTapTime = 0;
        card.addEventListener('touchend', (e) => {
            const now = new Date().getTime();
            const timeSinceLastTap = now - lastTapTime;
            if (timeSinceLastTap < 300 && timeSinceLastTap > 0) {
                e.preventDefault();
                console.log(`[DoubleTap Mobile] Detected on card ID: ${item.id}`);
                window.openEditStopModal(item.id);
            }
            lastTapTime = now;
        });

        // HTML5 Drag and Drop Reordering Setup
        card.setAttribute('draggable', true);

        card.addEventListener('dragstart', (e) => {
            card.classList.add('dragging');
            e.dataTransfer.setData('text/plain', item.id);
            e.dataTransfer.effectAllowed = 'move';
        });

        card.addEventListener('dragend', () => {
            card.classList.remove('dragging');
            document.querySelectorAll('.timeline-card').forEach(c => {
                c.classList.remove('drag-over');
            });
        });

        card.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            if (!card.classList.contains('dragging') && !card.classList.contains('add-stop-card')) {
                card.classList.add('drag-over');
            }
        });

        card.addEventListener('dragleave', () => {
            card.classList.remove('drag-over');
        });

        card.addEventListener('drop', (e) => {
            e.preventDefault();
            card.classList.remove('drag-over');

            const draggedId = parseInt(e.dataTransfer.getData('text/plain'));
            const targetId = item.id;

            if (draggedId && draggedId !== targetId) {
                const draggedIndex = itinerary.findIndex(x => x.id === draggedId);
                const targetIndex = itinerary.findIndex(x => x.id === targetId);

                if (draggedIndex !== -1 && targetIndex !== -1) {
                    // Shift item in the array
                    const [draggedItem] = itinerary.splice(draggedIndex, 1);
                    itinerary.splice(targetIndex, 0, draggedItem);
                    
                    // Re-render map layers & timeline cards instantly
                    rebuildRouteUI();
                    selectItineraryItem(draggedId, false);
                }
            }
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
                // Reset editing state to ensure a new stop is added, not updating an old one!
                editingStopId = null;
                const addForm = document.getElementById('add-stop-form');
                if (addForm) {
                    addForm.reset();
                    const submitBtn = addForm.querySelector('.form-submit-btn');
                    if (submitBtn) submitBtn.innerHTML = '<i class="fa-solid fa-plus"></i> Rotaya Ekle';
                    
                    const tabFormBtn = document.getElementById('tab-btn-form');
                    if (tabFormBtn) {
                        tabFormBtn.innerText = "Durak Ekle";
                        tabFormBtn.click(); // Ensure form tab is active
                    }
                    
                    // Reset emoji active class to default
                    document.querySelectorAll('.emoji-opt').forEach(btn => btn.classList.remove('active'));
                    const defaultEmojiBtn = document.querySelector('.emoji-opt[data-emoji="📍"]');
                    if (defaultEmojiBtn) defaultEmojiBtn.classList.add('active');
                    document.getElementById('stop-emoji').value = '📍';

                    // Reset type active class to default
                    document.querySelectorAll('.type-opt').forEach(btn => btn.classList.remove('active'));
                    const defaultTypeBtn = document.querySelector('.type-opt[data-type="walk"]');
                    if (defaultTypeBtn) defaultTypeBtn.classList.add('active');
                    document.getElementById('stop-type').value = 'walk';
                    const customTypeContainer = document.getElementById('custom-type-container');
                    if (customTypeContainer) customTypeContainer.style.display = 'none';

                    const coordsPreview = document.getElementById('coords-preview');
                    if (coordsPreview) coordsPreview.style.display = 'none';

                    const deleteStopBtn = document.getElementById('btn-delete-stop');
                    if (deleteStopBtn) deleteStopBtn.style.display = 'none';
                }

                modal.style.display = 'flex';
                modal.classList.remove('map-picking');
                
                const currentData = { config: appConfig, itinerary: itinerary };
                const jsonInput = document.getElementById('json-input');
                if (jsonInput) jsonInput.value = JSON.stringify(currentData, null, 2);
            }
        });
    container.appendChild(addCard);
}

// 9. Centralized Stop Selection Logic
function selectItineraryItem(id, zoomMap = true, programmaticScroll = true) {
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

    // A. Visual highlights in DOM (Timeline Sidebar / Mobile Carousel)
    document.querySelectorAll('.timeline-card').forEach(card => card.classList.remove('active'));
    const activeCard = document.getElementById(`card-${id}`);
    if (activeCard) {
        activeCard.classList.add('active');
        if (window.innerWidth <= 768) {
            if (programmaticScroll) {
                const container = document.getElementById('timeline-container');
                if (container) {
                    const cardOffset = activeCard.offsetLeft - container.offsetLeft;
                    const containerHalfWidth = container.offsetWidth / 2;
                    const cardHalfWidth = activeCard.offsetWidth / 2;
                    container.scrollTo({
                        left: cardOffset - containerHalfWidth + cardHalfWidth,
                        behavior: 'smooth'
                    });
                }
            }
        } else {
            activeCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
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

    // --- SWIPE GESTURES FOR MOBILE VIEW SWITCHING ---
    let touchstartX = 0;
    let touchstartY = 0;
    let touchendX = 0;
    let touchendY = 0;

    const handleSwipeGesture = () => {
        const diffX = touchendX - touchstartX;
        const diffY = touchendY - touchstartY;
        
        // Horizontal swipe threshold: 70px minimum
        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 70) {
            console.log(`[Swipe] Horizontal swipe detected. diffX: ${diffX}`);
            if (diffX < 0) {
                // Swipe Left -> Show Map
                if (btnMap && !btnMap.classList.contains('active')) {
                    console.log("[Swipe] Swiping Left. Activating Map.");
                    btnMap.click();
                }
            } else {
                // Swipe Right -> Show Timeline
                if (btnTimeline && !btnTimeline.classList.contains('active')) {
                    console.log("[Swipe] Swiping Right. Activating Timeline.");
                    btnTimeline.click();
                }
            }
        }
    };

    document.addEventListener('touchstart', e => {
        // Ignore gestures that start inside Leaflet controls or interactive map
        if (e.target.closest('#map') || e.target.closest('.map-control-btn') || e.target.closest('.leaflet-control')) {
            return;
        }
        touchstartX = e.changedTouches[0].screenX;
        touchstartY = e.changedTouches[0].screenY;
    }, { passive: true });

    document.addEventListener('touchend', e => {
        if (e.target.closest('#map') || e.target.closest('.map-control-btn') || e.target.closest('.leaflet-control')) {
            return;
        }
        touchendX = e.changedTouches[0].screenX;
        touchendY = e.changedTouches[0].screenY;
        handleSwipeGesture();
    }, { passive: true });

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
            editingStopId = null;
            addForm.reset();
            
            // Reset emoji active class to default
            document.querySelectorAll('.emoji-opt').forEach(btn => btn.classList.remove('active'));
            const defaultEmojiBtn = document.querySelector('.emoji-opt[data-emoji="📍"]');
            if (defaultEmojiBtn) defaultEmojiBtn.classList.add('active');
            document.getElementById('stop-emoji').value = '📍';

            // Reset type active class to default
            document.querySelectorAll('.type-opt').forEach(btn => btn.classList.remove('active'));
            const defaultTypeBtn = document.querySelector('.type-opt[data-type="walk"]');
            if (defaultTypeBtn) defaultTypeBtn.classList.add('active');
            document.getElementById('stop-type').value = 'walk';
            const customTypeContainer = document.getElementById('custom-type-container');
            if (customTypeContainer) customTypeContainer.style.display = 'none';

            const submitBtn = addForm.querySelector('.form-submit-btn');
            if (submitBtn) submitBtn.innerHTML = '<i class="fa-solid fa-plus"></i> Rotaya Ekle';
            
            const tabFormBtn = document.getElementById('tab-btn-form');
            if (tabFormBtn) tabFormBtn.innerText = "Durak Ekle";
            
            const coordsPreview = document.getElementById('coords-preview');
            if (coordsPreview) coordsPreview.style.display = 'none';

            const deleteStopBtn = document.getElementById('btn-delete-stop');
            if (deleteStopBtn) deleteStopBtn.style.display = 'none';

            modal.style.display = 'flex';
            modal.classList.remove('map-picking');
            // Pre-fill JSON area with current config + itinerary
            const currentData = { config: appConfig, itinerary: itinerary };
            const jsonInput = document.getElementById('json-input');
            if (jsonInput) jsonInput.value = JSON.stringify(currentData, null, 2);
        });
    }

    // Modal Edit Stop function
    window.openEditStopModal = function(stopId) {
        console.log(`[EditStop] Opening editor for stopId: ${stopId}`);
        const stop = itinerary.find(s => s.id === stopId);
        if (!stop) return;
        
        editingStopId = stopId;
        
        // Fill form fields
        document.getElementById('stop-title').value = stop.title || '';
        document.getElementById('stop-location').value = stop.locationName || '';
        document.getElementById('stop-notes').value = stop.notes || '';
        document.getElementById('stop-cost').value = stop.cost || 0;
        document.getElementById('stop-emoji').value = stop.emoji || '📍';
        document.getElementById('stop-type').value = stop.type || 'walk';
        document.getElementById('stop-lat').value = stop.coords[0] || '';
        document.getElementById('stop-lon').value = stop.coords[1] || '';
        
        // Parse time start & end
        const timeVal = stop.time || '';
        if (timeVal.includes(' - ')) {
            const parts = timeVal.split(' - ');
            document.getElementById('stop-time-start').value = parts[0] || '';
            document.getElementById('stop-time-end').value = parts[1] || '';
        } else {
            document.getElementById('stop-time-start').value = timeVal;
            document.getElementById('stop-time-end').value = '';
        }

        // Set Emoji grid active class
        document.querySelectorAll('.emoji-opt').forEach(btn => {
            if (btn.dataset.emoji === stop.emoji) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Set Ulaşım Tipi (Type) grid active class
        const standardTypes = ['walk', 'sea', 'metro', 'drive'];
        document.querySelectorAll('.type-opt').forEach(btn => btn.classList.remove('active'));
        const customTypeContainer = document.getElementById('custom-type-container');
        
        if (standardTypes.includes(stop.type)) {
            const typeBtn = document.querySelector(`.type-opt[data-type="${stop.type}"]`);
            if (typeBtn) typeBtn.classList.add('active');
            if (customTypeContainer) customTypeContainer.style.display = 'none';
        } else {
            const customTrigger = document.getElementById('btn-custom-type-trigger');
            if (customTrigger) customTrigger.classList.add('active');
            if (customTypeContainer) {
                customTypeContainer.style.display = 'block';
                document.getElementById('stop-type-custom').value = stop.type || '';
            }
        }
        
        // Coordinates preview
        const coordsPreview = document.getElementById('coords-preview');
        if (coordsPreview) {
            coordsPreview.innerHTML = `📍 Seçilen Koordinatlar: ${stop.coords[0].toFixed(5)}, ${stop.coords[1].toFixed(5)}`;
            coordsPreview.style.display = 'block';
        }
        
        // Show Delete Button
        const deleteStopBtn = document.getElementById('btn-delete-stop');
        if (deleteStopBtn) deleteStopBtn.style.display = 'flex';
        
        // Set tab title & submit button text for editing
        const tabFormBtn = document.getElementById('tab-btn-form');
        if (tabFormBtn) tabFormBtn.innerText = "Durağı Düzenle";
        
        const submitBtn = addForm.querySelector('.form-submit-btn');
        if (submitBtn) submitBtn.innerHTML = '<i class="fa-solid fa-check"></i> Değişiklikleri Kaydet';
        
        // Ensure the Edit Form tab is active
        if (tabFormBtn) tabFormBtn.click();
        
        if (modal) {
            modal.style.display = 'flex';
            modal.classList.remove('map-picking');
        }
    };

    // Handle Delete Stop
    const deleteStopBtn = document.getElementById('btn-delete-stop');
    if (deleteStopBtn) {
        deleteStopBtn.addEventListener('click', () => {
            if (!editingStopId) return;
            if (confirm("Bu durağı rotadan silmek istediğinize emin misiniz?")) {
                console.log(`[DeleteStop] Deleting stopId: ${editingStopId}`);
                itinerary = itinerary.filter(item => item.id !== editingStopId);
                rebuildRouteUI();
                if (modal) modal.style.display = 'none';
                editingStopId = null;
            }
        });
    }

    // Map Picking Button Triggers
    const pickOnMapBtn = document.getElementById('btn-pick-on-map');
    const cancelPickBtn = document.getElementById('btn-cancel-pick');

    if (pickOnMapBtn && modal) {
        pickOnMapBtn.addEventListener('click', () => {
            modal.classList.add('map-picking');
        });
    }

    if (cancelPickBtn && modal) {
        cancelPickBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            modal.classList.remove('map-picking');
            clearTempMarker();
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

    // --- MOBILE PICKER EVENTS ---
    
    // Emoji Option Selection
    document.querySelectorAll('.emoji-opt').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.emoji-opt').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('stop-emoji').value = btn.dataset.emoji;
        });
    });

    // Ulaşım Tipi (Type) Option Selection
    const typeOpts = document.querySelectorAll('.type-opt');
    const customTypeContainer = document.getElementById('custom-type-container');
    const customTypeInput = document.getElementById('stop-type-custom');
    const stopTypeHidden = document.getElementById('stop-type');

    typeOpts.forEach(btn => {
        btn.addEventListener('click', () => {
            typeOpts.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            if (btn.id === 'btn-custom-type-trigger') {
                if (customTypeContainer) {
                    customTypeContainer.style.display = 'block';
                    customTypeInput.focus();
                    stopTypeHidden.value = customTypeInput.value || 'walk';
                }
            } else {
                if (customTypeContainer) customTypeContainer.style.display = 'none';
                stopTypeHidden.value = btn.dataset.type;
            }
        });
    });

    if (customTypeInput) {
        customTypeInput.addEventListener('input', () => {
            stopTypeHidden.value = customTypeInput.value || 'walk';
        });
    }

    // Quick Budget Buttons
    document.querySelectorAll('.quick-cost-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.getElementById('stop-cost').value = btn.dataset.cost;
        });
    });

    // Quick Task Checklist Helper
    const quickTaskInput = document.getElementById('quick-task-input');
    const addQuickTaskBtn = document.getElementById('btn-add-quick-task');
    const stopNotesTextarea = document.getElementById('stop-notes');

    const handleAddQuickTask = () => {
        const taskText = quickTaskInput.value.trim();
        if (!taskText) return;
        
        let currentNotes = stopNotesTextarea.value;
        const taskLine = `- [ ] ${taskText}`;
        
        if (currentNotes && !currentNotes.endsWith('\n')) {
            stopNotesTextarea.value = currentNotes + '\n' + taskLine;
        } else {
            stopNotesTextarea.value = currentNotes + taskLine;
        }
        
        quickTaskInput.value = '';
        quickTaskInput.focus();
    };

    if (addQuickTaskBtn) {
        addQuickTaskBtn.addEventListener('click', (e) => {
            e.preventDefault();
            handleAddQuickTask();
        });
    }

    if (quickTaskInput) {
        quickTaskInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleAddQuickTask();
            }
        });
    }

    // --- COGEOGRAPHIC SEARCH BAR (PHOTON API) ---
    const searchInput = document.getElementById('map-search-input');
    const searchDropdown = document.getElementById('search-results-dropdown');
    const clearSearchBtn = document.getElementById('btn-clear-search');
    let searchDebounceTimer;

    const clearSearch = () => {
        if (searchInput) searchInput.value = '';
        if (searchDropdown) {
            searchDropdown.innerHTML = '';
            searchDropdown.style.display = 'none';
        }
        if (clearSearchBtn) clearSearchBtn.style.display = 'none';
    };

    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', clearSearch);
    }

    if (searchInput && searchDropdown) {
        searchInput.addEventListener('input', () => {
            const query = searchInput.value.trim();
            if (clearSearchBtn) {
                clearSearchBtn.style.display = query ? 'flex' : 'none';
            }

            if (!query) {
                searchDropdown.innerHTML = '';
                searchDropdown.style.display = 'none';
                return;
            }

            clearTimeout(searchDebounceTimer);
            searchDebounceTimer = setTimeout(async () => {
                try {
                    // Bias geocoding using map's current center to prioritize local results
                    const center = (map && mapEnabled) ? map.getCenter() : { lat: 41.0082, lng: 28.9784 };
                    const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&lat=${center.lat}&lon=${center.lng}`);
                    if (!response.ok) return;

                    const results = await response.json();
                    searchDropdown.innerHTML = '';

                    if (!results || results.length === 0) {
                        searchDropdown.innerHTML = `<div style="padding: 12px; color: var(--text-muted); font-size: 13px; text-align: center;">Sonuç bulunamadı</div>`;
                        searchDropdown.style.display = 'block';
                        return;
                    }

                    results.forEach(result => {
                        const title = result.name || 'Bilinmeyen Mekan';
                        const subtitle = result.display_name || 'Türkiye';

                        const item = document.createElement('div');
                        item.className = 'search-result-item';
                        item.innerHTML = `
                            <div class="search-result-title">${title}</div>
                            <div class="search-result-subtitle" style="font-size: 11px; color: var(--text-muted); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${subtitle}</div>
                        `;

                        item.addEventListener('click', () => {
                            const lat = result.lat;
                            const lon = result.lon;

                            console.log(`[Search] Selected ${title} at coordinates: [${lat}, ${lon}]`);
                            
                            // Fly map to selected coordinates
                            if (map) {
                                map.flyTo([lat, lon], 16);
                            }

                            // Place temporary red marker
                            clearTempMarker();
                            if (map && mapEnabled) {
                                const redIcon = L.divIcon({
                                    className: 'custom-pin-marker red-pin',
                                    html: '<div style="background-color: #ff4d4d; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.5);"></div>',
                                    iconSize: [14, 14],
                                    iconAnchor: [7, 7]
                                });
                                tempMarker = L.marker([lat, lon], { icon: redIcon }).addTo(map);
                            }

                            // Pre-fill form values
                            document.getElementById('stop-lat').value = lat;
                            document.getElementById('stop-lon').value = lon;
                            document.getElementById('stop-location').value = title;
                            
                            const coordsPreview = document.getElementById('coords-preview');
                            if (coordsPreview) {
                                coordsPreview.innerHTML = `📍 Seçilen Konum: ${title} (${lat.toFixed(5)}, ${lon.toFixed(5)})`;
                                coordsPreview.style.display = 'block';
                            }

                            // Close dropdown
                            searchDropdown.style.display = 'none';
                        });

                        searchDropdown.appendChild(item);
                    });

                    searchDropdown.style.display = 'block';
                } catch (err) {
                    console.error("[Geocoding Error]", err);
                }
            }, 300);
        });

        // Close search results when clicking outside
        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !searchDropdown.contains(e.target)) {
                searchDropdown.style.display = 'none';
            }
        });
    }

    // Submit stop via form
    if (addForm) {
        addForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitBtn = addForm.querySelector('.form-submit-btn');
            const originalBtnHtml = submitBtn ? submitBtn.innerHTML : '';
            if (submitBtn) {
                submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Yükleniyor...';
                submitBtn.disabled = true;
            }

            try {
                // Verify latitude and longitude inputs are selected and valid numbers
                const latVal = parseFloat(document.getElementById('stop-lat').value);
                const lonVal = parseFloat(document.getElementById('stop-lon').value);
                
                if (isNaN(latVal) || isNaN(lonVal)) {
                    alert("Lütfen durak için haritadan veya aramadan geçerli bir konum seçin.");
                    if (submitBtn) {
                        submitBtn.innerHTML = originalBtnHtml;
                        submitBtn.disabled = false;
                    }
                    return;
                }

                let imageUrl = null;
                let existingImage = null;
                if (editingStopId) {
                    const existingStop = itinerary.find(s => s.id === editingStopId);
                    if (existingStop) existingImage = existingStop.image;
                }

                const imageInput = document.getElementById('stop-image');
                if (imageInput && imageInput.files.length > 0) {
                    const file = imageInput.files[0];
                    const reader = new FileReader();
                    const base64Promise = new Promise((resolve, reject) => {
                        reader.onload = () => resolve(reader.result);
                        reader.onerror = reject;
                        reader.readAsDataURL(file);
                    });
                    const base64data = await base64Promise;
                    
                    const response = await fetch('/api/upload', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            ...(sessionToken ? { 'Authorization': `Bearer ${sessionToken}` } : {})
                        },
                        body: JSON.stringify({ image: base64data })
                    });
                    if (response.ok) {
                        const data = await response.json();
                        imageUrl = data.url;
                    }
                } else if (editingStopId) {
                    imageUrl = existingImage; // Keep the original image if no new file is uploaded
                }

                // Combine start/end times
                const startTimeVal = document.getElementById('stop-time-start').value;
                const endTimeVal = document.getElementById('stop-time-end').value;
                const finalTimeStr = endTimeVal ? `${startTimeVal} - ${endTimeVal}` : startTimeVal;

                // Handle Random Emoji Picker if no emoji is chosen
                const randomEmojis = ['🚗', '✈️', '🚢', '🚇', '🏨', '🍽️', '☕', '🎡', '🏖️', '⛰️', '⛺', '🚶', '🛥️', '🛍️'];
                const selectedEmoji = document.getElementById('stop-emoji').value;
                const finalEmoji = (!selectedEmoji || selectedEmoji === '📍') ? randomEmojis[Math.floor(Math.random() * randomEmojis.length)] : selectedEmoji;

                let rawCost = parseFloat(document.getElementById('stop-cost').value);
                if (isNaN(rawCost)) rawCost = 0;

                if (editingStopId) {
                    const stop = itinerary.find(s => s.id === editingStopId);
                    if (stop) {
                        stop.time = finalTimeStr;
                        stop.title = document.getElementById('stop-title').value;
                        stop.locationName = document.getElementById('stop-location').value;
                        stop.desc = document.getElementById('stop-title').value + " durağında durulacak.";
                        stop.notes = document.getElementById('stop-notes') ? document.getElementById('stop-notes').value : "";
                        stop.image = imageUrl;
                        stop.cost = rawCost;
                        stop.costLabel = rawCost + " TL";
                        stop.emoji = finalEmoji;
                        stop.type = document.getElementById('stop-type').value;
                        stop.coords = [
                            parseFloat(document.getElementById('stop-lat').value),
                            parseFloat(document.getElementById('stop-lon').value)
                        ];
                    }
                    rebuildRouteUI();
                    addForm.reset();
                    clearTempMarker();
                    const coordsPreview = document.getElementById('coords-preview');
                    if (coordsPreview) coordsPreview.style.display = 'none';
                    
                    modal.style.display = 'none';
                    selectItineraryItem(editingStopId, true);
                    alert("Durak başarıyla güncellendi!");
                } else {
                    const nextId = itinerary.length > 0 ? Math.max(...itinerary.map(item => item.id)) + 1 : 1;
                    const newStop = {
                        id: nextId,
                        time: finalTimeStr,
                        title: document.getElementById('stop-title').value,
                        locationName: document.getElementById('stop-location').value,
                        desc: document.getElementById('stop-title').value + " durağında durulacak.",
                        notes: document.getElementById('stop-notes') ? document.getElementById('stop-notes').value : "",
                        image: imageUrl,
                        cost: rawCost,
                        costLabel: rawCost + " TL",
                        emoji: finalEmoji,
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
                    const coordsPreview = document.getElementById('coords-preview');
                    if (coordsPreview) coordsPreview.style.display = 'none';
                    
                    modal.style.display = 'none';
                    selectItineraryItem(newStop.id, true);
                    alert("Durak başarıyla eklendi!");
                }
            } catch (err) {
                console.error(err);
                alert("Bir hata oluştu.");
            } finally {
                submitBtn.innerHTML = originalBtnHtml;
                submitBtn.disabled = false;
            }
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

    // Dynamic swipe/scroll listener for mobile carousel cards
    let scrollTimeout;
    const timelineContainer = document.getElementById('timeline-container');
    if (timelineContainer) {
        timelineContainer.addEventListener('scroll', () => {
            if (window.innerWidth > 768) return; // Only trigger horizontal carousel selection on mobile
            
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                const cards = timelineContainer.querySelectorAll('.timeline-card');
                if (cards.length === 0) return;
                
                const containerCenter = timelineContainer.scrollLeft + (timelineContainer.offsetWidth / 2);
                let closestCard = null;
                let minDistance = Infinity;
                
                cards.forEach(card => {
                    // Ignore the 'Add Stop' card for centering selection
                    if (card.classList.contains('add-stop-card')) return;
                    
                    const cardCenter = card.offsetLeft + (card.offsetWidth / 2);
                    const distance = Math.abs(containerCenter - cardCenter);
                    
                    if (distance < minDistance) {
                        minDistance = distance;
                        closestCard = card;
                    }
                });
                
                if (closestCard) {
                    const id = parseInt(closestCard.id.replace('card-', ''));
                    if (!isNaN(id)) {
                        // Select stops and center map, disable programmatic carousel scroll to avoid bounce loops
                        selectItineraryItem(id, true, false);
                    }
                }
            }, 100);
        });
    }

    // Help Modal Event Listeners
    const btnOpenHelp = document.getElementById('btn-open-help');
    const helpModal = document.getElementById('help-modal');
    const btnCloseHelp = document.getElementById('btn-close-help');
    const helpModalBody = document.getElementById('help-modal-body');
    let helpLoaded = false;

    if (btnOpenHelp) {
        btnOpenHelp.addEventListener('click', () => {
            helpModal.style.display = 'flex';
            if (!helpLoaded) {
                fetch('/docs/KULLANIM.md')
                    .then(res => {
                        if (!res.ok) throw new Error('Yardım dosyası bulunamadı.');
                        return res.text();
                    })
                    .then(md => {
                        helpModalBody.innerHTML = renderHelpMarkdown(md);
                        helpLoaded = true;
                    })
                    .catch(err => {
                        helpModalBody.innerHTML = `
                            <div style="text-align:center; padding: 40px; color: var(--text-muted);">
                                <i class="fa-solid fa-triangle-exclamation" style="font-size:28px; color:#e76f51;"></i>
                                <p style="margin-top: 12px;">${err.message}</p>
                            </div>`;
                    });
            }
        });
    }

    if (btnCloseHelp) {
        btnCloseHelp.addEventListener('click', () => {
            helpModal.style.display = 'none';
        });
    }

    if (helpModal) {
        helpModal.addEventListener('click', (e) => {
            if (e.target === helpModal) helpModal.style.display = 'none';
        });
    }
}

// ==========================================
// HELP MODAL — Markdown Renderer
// ==========================================
function renderHelpMarkdown(md) {
    const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

    // 1. Extract code blocks and store them to avoid formatting conflicts inside code blocks
    const codeBlocks = [];
    md = md.replace(/```(\w*)\n([\s\S]*?)```/gm, (_, lang, code) => {
        const placeholder = `%%CODEBLOCK_${codeBlocks.length}%%`;
        codeBlocks.push(`<pre style="background:rgba(0,0,0,0.35);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:16px;overflow-x:auto;font-size:13px;line-height:1.6;margin:16px 0;font-family:monospace;white-space:pre-wrap;"><code>${esc(code.trim())}</code></pre>`);
        return placeholder;
    });

    // 2. Inline code
    md = md.replace(/`([^`]+)`/g, (_, c) =>
        `<code style="background:rgba(42,157,143,0.15);color:var(--primary-teal);padding:2px 7px;border-radius:5px;font-size:13px;font-family:monospace;">${esc(c)}</code>`);

    // 3. Headings
    md = md.replace(/^### (.+)$/gm, (_, t) =>
        `<h3 style="font-size:15px;font-weight:700;color:var(--primary-teal);margin:24px 0 10px;display:flex;align-items:center;gap:8px;"><span style="display:inline-block;width:4px;height:16px;background:var(--primary-teal);border-radius:2px;flex-shrink:0;"></span>${t}</h3>`);
    md = md.replace(/^## (.+)$/gm, (_, t) =>
        `<h2 style="font-size:18px;font-weight:700;color:var(--text-light);margin:32px 0 14px;padding-bottom:8px;border-bottom:1px solid rgba(255,255,255,0.08);">${t}</h2>`);
    md = md.replace(/^# (.+)$/gm, (_, t) =>
        `<h1 style="font-size:22px;font-weight:800;color:var(--text-light);margin:0 0 20px;padding:20px;background:rgba(42,157,143,0.08);border-radius:12px;border-left:4px solid var(--primary-teal);">${t}</h1>`);

    // 4. Horizontal rule
    md = md.replace(/^---$/gm, '<hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:24px 0;">');

    // 5. Blockquote
    md = md.replace(/^> (.+)$/gm, (_, t) =>
        `<blockquote style="border-left:3px solid var(--primary-teal);margin:12px 0;padding:10px 16px;background:rgba(42,157,143,0.06);border-radius:0 8px 8px 0;color:var(--text-muted);font-style:italic;">${t}</blockquote>`);

    // 6. Bold
    md = md.replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--text-light);">$1</strong>');

    // 7. Tables
    md = md.replace(/(\|.+\|\n)(\|[-| :]+\|\n)((\|.+\|\n?)*)/gm, (match) => {
        const rows = match.trim().split('\n').filter(r => r.trim());
        const makeCell = (r, tag) => r.replace(/^\||\|$/g,'').split('|')
            .map(c => `<${tag} style="padding:10px 14px;border-bottom:1px solid rgba(255,255,255,0.06);text-align:left;">${c.trim()}</${tag}>`).join('');
        const header = `<thead><tr style="background:rgba(42,157,143,0.12);">${makeCell(rows[0],'th')}</tr></thead>`;
        const body = `<tbody>${rows.slice(2).map(r=>`<tr>${makeCell(r,'td')}</tr>`).join('')}</tbody>`;
        return `<div style="overflow-x:auto;margin:16px 0;"><table style="width:100%;border-collapse:collapse;font-size:13px;">${header}${body}</table></div>`;
    });

    // 8. Checkboxes
    md = md.replace(/^- \[x\] (.+)$/gm, (_, t) =>
        `<li style="margin:5px 0 5px 8px;color:var(--text-muted);list-style:none;display:flex;align-items:center;gap:8px;"><span style="color:#2a9d8f;">✅</span><span style="text-decoration:line-through;opacity:0.6;">${t}</span></li>`);
    md = md.replace(/^- \[ \] (.+)$/gm, (_, t) =>
        `<li style="margin:5px 0 5px 8px;color:var(--text-muted);list-style:none;display:flex;align-items:center;gap:8px;"><span>⬜</span>${t}</li>`);

    // 9. Lists (Ensure codeblock placeholders aren't broken by lists)
    md = md.replace(/^(\d+)\. (?!%%CODEBLOCK_)(.+)$/gm, (_, n, t) =>
        `<li style="margin:6px 0 6px 20px;color:var(--text-muted);line-height:1.6;list-style-type:decimal;">${t}</li>`);
    md = md.replace(/^- (?!\[[ x]\])(?!%%CODEBLOCK_)(.+)$/gm, (_, t) =>
        `<li style="margin:6px 0 6px 20px;color:var(--text-muted);line-height:1.6;list-style-type:disc;">${t}</li>`);

    // 10. Paragraphs (Ignore headings, tags, lists, blockquotes and placeholders)
    md = md.replace(/^(?!<[a-zA-Z\/])(?!- )(?!\d+\. )(?!> )(?!%%CODEBLOCK_)(.+)$/gm, (_, t) => {
        if (!t.trim()) return '';
        return `<p style="margin:8px 0;color:var(--text-muted);line-height:1.75;font-size:14px;">${t}</p>`;
    });

    // 11. Re-insert original code blocks
    codeBlocks.forEach((block, index) => {
        md = md.replace(`%%CODEBLOCK_${index}%%`, block);
    });

    return `<div style="font-family:inherit;">${md}</div>`;
}

// Synchronize Route coordinates and details using AI Routing Engine
function syncRouteWithAI() {
    const syncBtn = document.getElementById('btn-sync-route');
    if (!syncBtn) return;

    // Visual loading state
    const originalHtml = syncBtn.innerHTML;
    syncBtn.disabled = true;
    syncBtn.innerHTML = '<i class="fa-solid fa-arrows-spin fa-spin"></i> Google Haritalarla Sync Ediliyor...';

    const currentData = { itinerary: itinerary };

    fetch('/api/route-sync', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(currentData)
    })
    .then(res => {
        if (!res.ok) {
            return res.json().then(data => { throw new Error(data.error || "Sunucu hatası."); });
        }
        return res.json();
    })
    .then(data => {
        if (data.legs && Array.isArray(data.legs)) {
            data.legs.forEach(leg => {
                const stopIndex = itinerary.findIndex(item => item.id === leg.from_id);
                if (stopIndex !== -1 && itinerary[stopIndex]) {
                    const stop = itinerary[stopIndex];
                    stop.path_to_next = leg.path || [];
                    
                    // Add AI route info to description without duplicate appends
                    const cleanedDesc = stop.desc.split('\n\n📍 AI Rota Bilgisi:')[0];
                    stop.desc = `${cleanedDesc}\n\n📍 AI Rota Bilgisi: ${leg.details} (Süre: ${leg.duration})`;
                }
            });
            
            rebuildRouteUI();
            alert("Harita yolları ve toplu taşıma süreleri başarıyla senkronize edildi!");
        } else {
            throw new Error("Geçersiz yanıt formatı.");
        }
    })
    .catch(err => {
        console.error("AI Sync Error:", err);
        alert("Senkronizasyon Başarısız: " + err.message);
    })
    .finally(() => {
        syncBtn.disabled = false;
        syncBtn.innerHTML = originalHtml;
    });
}

// ==========================================
// AUTH & MY ROUTES SYSTEM
// ==========================================
let sessionToken = localStorage.getItem('aegis_token') || null;
let currentUser = localStorage.getItem('aegis_user') || null;

document.addEventListener('DOMContentLoaded', () => {
    const btnLoginModal = document.getElementById('btn-login-modal');
    const authModal = document.getElementById('auth-modal');
    const btnCloseAuth = document.getElementById('btn-close-auth');
    const tabBtnLogin = document.getElementById('tab-btn-login');
    const tabBtnRegister = document.getElementById('tab-btn-register');
    const tabContentLogin = document.getElementById('tab-content-login');
    const tabContentRegister = document.getElementById('tab-content-register');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const btnSaveRoute = document.getElementById('btn-save-route');
    const btnMyRoutes = document.getElementById('btn-my-routes');
    const myRoutesModal = document.getElementById('my-routes-modal');
    const btnCloseRoutes = document.getElementById('btn-close-routes');
    const routesListContainer = document.getElementById('routes-list-container');

    // Update UI if logged in
    function updateAuthUI() {
        if (sessionToken && currentUser) {
            btnLoginModal.innerHTML = `<i class="fa-solid fa-user-check" style="flex-shrink:0;"></i><span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:100%;">${currentUser} (Çıkış)</span>`;
            btnSaveRoute.style.display = 'block';
            btnMyRoutes.style.display = 'block';
        } else {
            btnLoginModal.innerHTML = `<i class="fa-solid fa-user" style="flex-shrink:0;"></i><span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:100%;">Giriş Yap</span>`;
            btnSaveRoute.style.display = 'none';
            btnMyRoutes.style.display = 'none';
        }
    }
    updateAuthUI();

    // Login Modal Toggle
    btnLoginModal.addEventListener('click', () => {
        if (sessionToken) {
            if (confirm('Çıkış yapmak istediğinize emin misiniz?')) {
                localStorage.removeItem('aegis_token');
                localStorage.removeItem('aegis_user');
                sessionToken = null;
                currentUser = null;
                updateAuthUI();
            }
        } else {
            authModal.style.display = 'flex';
        }
    });
    btnCloseAuth.addEventListener('click', () => authModal.style.display = 'none');
    
    // Auth Tabs
    tabBtnLogin.addEventListener('click', () => {
        tabBtnLogin.classList.add('active');
        tabBtnRegister.classList.remove('active');
        tabContentLogin.classList.add('active');
        tabContentRegister.classList.remove('active');
    });
    tabBtnRegister.addEventListener('click', () => {
        tabBtnRegister.classList.add('active');
        tabBtnLogin.classList.remove('active');
        tabContentRegister.classList.add('active');
        tabContentLogin.classList.remove('active');
    });

    // API Calls
    async function authFetch(url, payload) {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'İşlem başarısız');
        return data;
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const data = await authFetch('/api/login', {
                username: document.getElementById('login-username').value,
                password: document.getElementById('login-password').value
            });
            sessionToken = data.token;
            currentUser = data.username;
            localStorage.setItem('aegis_token', sessionToken);
            localStorage.setItem('aegis_user', currentUser);
            updateAuthUI();
            authModal.style.display = 'none';
            alert(`Hoşgeldin ${currentUser}!`);
        } catch (err) {
            alert(err.message);
        }
    });

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            await authFetch('/api/register', {
                username: document.getElementById('register-username').value,
                password: document.getElementById('register-password').value
            });
            alert('Kayıt başarılı! Şimdi giriş yapabilirsiniz.');
            tabBtnLogin.click(); // switch to login tab
        } catch (err) {
            alert(err.message);
        }
    });

    // Share Route Button element
    const btnShareRoute = document.getElementById('btn-share-route');

    // Load shared route if token is in query params
    const urlParams = new URLSearchParams(window.location.search);
    const shareToken = urlParams.get('share');
    if (shareToken) {
        console.log(`[ShareRoute] Found share token in URL: ${shareToken}. Fetching route data...`);
        fetch(`/api/shared-route?token=${shareToken}`)
            .then(res => {
                console.log(`[ShareRoute] Fetch response status: ${res.status}`);
                if (!res.ok) throw new Error("Paylaşılan rota yüklenemedi.");
                return res.json();
            })
            .then(data => {
                console.log(`[ShareRoute] Successfully loaded shared route data:`, data);
                if (data.route_data) {
                    loadRouteData(data.route_data);
                    // Update header title to indicate shared route
                    const subtitleEl = document.querySelector('.subtitle');
                    if (subtitleEl) subtitleEl.innerText = `Ortak Rota: ${data.name}`;
                    
                    // Show share button so they can copy it again
                    if (btnShareRoute) btnShareRoute.style.display = 'block';
                    
                    // Allow saving edits back to the shared route
                    if (btnSaveRoute) {
                        btnSaveRoute.style.display = 'block';
                        btnSaveRoute.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Ortak Rotayı Güncelle';
                    }
                    
                    alert(`"${data.name}" isimli paylaşılan rota yüklendi. Bu bağlantı salt okunurdur; düzenlemek için giriş yapıp kendi rotanız olarak kaydedin.`);
                }
            })
            .catch(err => {
                console.error("[ShareRoute] Error fetching shared route:", err);
                alert("Ortak rota yüklenirken bir hata oluştu: " + err.message);
            });
    }

    // Save Route
    if (btnSaveRoute) {
        btnSaveRoute.addEventListener('click', async () => {
            console.log(`[SaveRoute] Clicked. shareToken: ${shareToken}, currentRouteId: ${currentRouteId}, sessionToken: ${sessionToken}`);
            
            let payload = null;
            let url = '/api/save-route';
            const headers = { 'Content-Type': 'application/json' };
            
            if (shareToken) {
                alert('Paylaşılan rotalar salt okunurdur. Değişiklikleri kaydetmek için giriş yapıp kendi rotanız olarak kaydedin.');
                if (!sessionToken) {
                    authModal.style.display = 'flex';
                }
                return;
            } else {
                if (!sessionToken) {
                    console.warn("[SaveRoute] Unauthorized save attempt. Opening Auth modal.");
                    authModal.style.display = 'flex';
                    return;
                }
                headers['Authorization'] = `Bearer ${sessionToken}`;
                
                let routeName = prompt("Kaydedilecek rotanın adını girin:", "Yeni Rotam");
                if (!routeName) {
                    console.log("[SaveRoute] Save cancelled by user (empty name).");
                    return;
                }
                payload = { id: currentRouteId, name: routeName, route_data: { config: appConfig, itinerary: itinerary } };
            }
            
            const originalText = btnSaveRoute.innerHTML;
            btnSaveRoute.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Kaydediliyor...';
            btnSaveRoute.disabled = true;

            try {
                console.log(`[SaveRoute] Sending POST request to ${url} with payload:`, payload);
                const res = await fetch(url, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                console.log(`[SaveRoute] Server response received:`, data);
                if (!res.ok) throw new Error(data.error || 'Kaydetme başarısız.');
                
                alert(data.message || "Rota başarıyla kaydedildi!");
                
                if (data.route_id && !shareToken) {
                    currentRouteId = data.route_id;
                    console.log(`[SaveRoute] Set currentRouteId to: ${currentRouteId}`);
                }
                
                if (data.share_token) {
                    window.currentShareToken = data.share_token;
                    console.log(`[SaveRoute] Received share_token: ${data.share_token}`);
                    if (btnShareRoute) btnShareRoute.style.display = 'block';
                }
            } catch(err) {
                console.error(`[SaveRoute] Exception caught:`, err);
                alert("Kaydetme hatası: " + err.message);
            } finally {
                btnSaveRoute.innerHTML = originalText;
                btnSaveRoute.disabled = false;
            }
        });
    }

    // Share Route Button Click Handler
    if (btnShareRoute) {
        btnShareRoute.addEventListener('click', () => {
            const token = window.currentShareToken || shareToken;
            console.log(`[ShareRoute] Share button clicked. Token: ${token}`);
            if (!token) {
                alert("Paylaşım linki oluşturulabilmesi için önce rotayı kaydetmelisiniz.");
                return;
            }
            const inviteLink = `${window.location.origin}${window.location.pathname}?share=${token}`;
            console.log(`[ShareRoute] Generated invite link: ${inviteLink}`);
            
            navigator.clipboard.writeText(inviteLink)
                .then(() => {
                    console.log("[ShareRoute] Copied invite link to clipboard successfully.");
                    alert("Ortak planlama davet linki panoya kopyalandı! Arkadaşlarınıza gönderebilirsiniz:\n\n" + inviteLink);
                })
                .catch(err => {
                    console.warn("[ShareRoute] Clipboard write failed, falling back to prompt.", err);
                    prompt("Aşağıdaki davet linkini kopyalayıp arkadaşlarınıza gönderebilirsiniz:", inviteLink);
                });
        });
    }

    // My Routes Modal Trigger
    if (btnMyRoutes) {
        btnMyRoutes.addEventListener('click', async () => {
            console.log(`[MyRoutes] Opening routes modal. sessionToken: ${sessionToken}`);
            if (!sessionToken) return;
            myRoutesModal.style.display = 'flex';
            routesListContainer.innerHTML = '<p>Yükleniyor...</p>';
            
            try {
                const res = await fetch('/api/my-routes', {
                    headers: { 'Authorization': `Bearer ${sessionToken}` }
                });
                const routes = await res.json();
                console.log(`[MyRoutes] Fetch routes response status: ${res.status}, count: ${routes.length}`);
                if (!res.ok) throw new Error(routes.error || "Rotalar alınamadı.");
                
                routesListContainer.innerHTML = '';
                if (routes.length === 0) {
                    routesListContainer.innerHTML = '<p>Kayıtlı rotanız bulunmuyor.</p>';
                    return;
                }
                
                routes.forEach(route => {
                    const routeItem = document.createElement('div');
                    routeItem.className = 'route-list-item';
                    routeItem.style.padding = '10px';
                    routeItem.style.border = '1px solid var(--outline-variant)';
                    routeItem.style.borderRadius = '8px';
                    routeItem.style.display = 'flex';
                    routeItem.style.justifyContent = 'space-between';
                    routeItem.style.alignItems = 'center';
                    routeItem.style.cursor = 'pointer';
                    routeItem.style.marginBottom = '8px';
                    routeItem.style.backgroundColor = 'var(--surface-container-highest)';
                    
                    routeItem.innerHTML = `
                        <div>
                            <strong>${route.name}</strong>
                            <div style="font-size: 0.8rem; color: var(--on-surface-variant);">${route.created_at}</div>
                        </div>
                        <i class="fa-solid fa-chevron-right"></i>
                    `;
                    routeItem.addEventListener('click', () => {
                        console.log(`[MyRoutes] Loading route ID: ${route.id}, name: ${route.name}`);
                        loadRouteData(route.route_data);
                        currentRouteId = route.id;
                        
                        // Show share button if share token is present on the route
                        if (route.share_token) {
                            window.currentShareToken = route.share_token;
                            if (btnShareRoute) btnShareRoute.style.display = 'block';
                        }
                        
                        myRoutesModal.style.display = 'none';
                        alert(`"${route.name}" başarıyla yüklendi!`);
                    });
                    routesListContainer.appendChild(routeItem);
                });
            } catch(err) {
                console.error(`[MyRoutes] Error loading routes list:`, err);
                routesListContainer.innerHTML = `<p style="color: red;">${err.message}</p>`;
            }
        });
    }

    if (btnCloseRoutes) {
        btnCloseRoutes.addEventListener('click', () => {
            console.log("[MyRoutes] Closing routes modal.");
            myRoutesModal.style.display = 'none';
        });
    }
});
