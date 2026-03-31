/**
 * Libermap v2 - Módulo do Mapa (Leaflet)
 * Inclui: marcadores, cabos, desenho de polyline, medição, viabilidade
 */

const LiberMap = {
    map: null,
    layers: {},
    markers: {},
    cables: {},
    drawingMode: null, // null, 'cable', 'measure'
    drawPoints: [],
    drawLine: null,
    drawMarkers: [],
    measureLine: null,
    measureMarkers: [],

    // Cores por tipo de elemento
    colors: {
        pop: '#2563eb',
        cto: '#16a34a',
        ceo: '#d97706',
        splitter: '#7c3aed',
        poste: '#6b7280',
        cliente: '#0ea5e9',
    },

    // Labels por tipo
    labels: {
        pop: 'P',
        cto: 'C',
        ceo: 'E',
        splitter: 'S',
        poste: '●',
        cliente: 'U',
    },

    // Nomes legíveis
    typeNames: {
        pop: 'POP',
        cto: 'CTO',
        ceo: 'Caixa de Emenda',
        splitter: 'Splitter',
        poste: 'Poste',
        cliente: 'Cliente',
    },

    /**
     * Inicializa o mapa
     */
    init(containerId, options = {}) {
        const defaultCenter = [options.lat || -14.79, options.lng || -39.27];
        const defaultZoom = options.zoom || 14;

        this.map = L.map(containerId, {
            center: defaultCenter,
            zoom: defaultZoom,
            zoomControl: false,
        });

        // Zoom control no canto direito
        L.control.zoom({ position: 'bottomright' }).addTo(this.map);

        // Tile layers
        const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap | Libermap',
            maxZoom: 19,
        });

        const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: '&copy; Esri | Libermap',
            maxZoom: 19,
        });

        osm.addTo(this.map);

        // Layer groups por tipo de elemento
        Object.keys(this.colors).forEach((type) => {
            this.layers[type] = L.layerGroup().addTo(this.map);
        });
        this.layers.cables = L.layerGroup().addTo(this.map);

        // Controle de camadas
        const baseMaps = {
            'Mapa': osm,
            'Satélite': satellite,
        };
        const overlays = {
            'POPs': this.layers.pop,
            'CTOs': this.layers.cto,
            'Caixas de Emenda': this.layers.ceo,
            'Splitters': this.layers.splitter,
            'Postes': this.layers.poste,
            'Clientes': this.layers.cliente,
            'Cabos': this.layers.cables,
        };

        L.control.layers(baseMaps, overlays, { position: 'topright' }).addTo(this.map);

        // Escala
        L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(this.map);

        // Clique no mapa (para drawing modes)
        this.map.on('click', (e) => this._onMapClick(e));
        this.map.on('mousemove', (e) => this._onMapMouseMove(e));

        return this;
    },

    /**
     * Cria ícone customizado para um tipo de elemento
     */
    createIcon(type) {
        const color = this.colors[type] || '#6b7280';
        const label = this.labels[type] || '?';
        return L.divIcon({
            className: '',
            html: `<div class="element-marker marker-${type}">${label}</div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
            popupAnchor: [0, -16],
        });
    },

    /**
     * Adiciona um elemento no mapa
     */
    addElement(element) {
        if (!element.location && !(element.lat && element.lng)) return;

        const lat = element.location ? element.location.lat : element.lat;
        const lng = element.location ? element.location.lng : element.lng;
        if (!lat || !lng) return;

        element.location = { lat, lng };
        const icon = this.createIcon(element.type);

        const marker = L.marker([lat, lng], { icon })
            .bindPopup(`
                <strong>${element.name}</strong><br>
                <small style="color:#64748b">${this.typeNames[element.type] || element.type}</small><br>
                ${element.address ? element.address + '<br>' : ''}
                ${element.area ? '<em>Área: ' + element.area + '</em>' : ''}
            `)
            .on('click', () => {
                if (typeof window.onElementClick === 'function') {
                    window.onElementClick(element);
                }
            });

        if (this.layers[element.type]) {
            marker.addTo(this.layers[element.type]);
        }
        this.markers[element.id] = marker;
        return marker;
    },

    /**
     * Adiciona um cabo (linha) no mapa
     */
    addCable(cable) {
        if (!cable.path) return;

        const cableColors = {
            backbone: '#ef4444',
            distribuicao: '#f97316',
            drop: '#22c55e',
        };

        const color = cableColors[cable.cable_type] || '#6b7280';
        const weight = cable.cable_type === 'backbone' ? 4 : cable.cable_type === 'distribuicao' ? 3 : 2;

        const polyline = L.polyline(cable.path, {
            color,
            weight,
            opacity: 0.85,
        }).bindPopup(`
            <strong>${cable.name || 'Cabo'}</strong><br>
            <small style="color:#64748b">${cable.cable_type || 'N/A'}</small><br>
            Fibras: ${cable.fiber_count || '?'}<br>
            Comprimento: ${cable.length_meters ? cable.length_meters.toFixed(0) + 'm' : 'N/A'}
        `);

        polyline.on('click', () => {
            if (typeof window.onCableClick === 'function') {
                window.onCableClick(cable);
            }
        });

        polyline.addTo(this.layers.cables);
        this.cables[cable.id] = polyline;
        return polyline;
    },

    /**
     * Carrega todos os elementos do backend
     */
    async loadElements(filters = {}) {
        try {
            const elements = await supabase.rpc('get_elements_with_coords', {
                p_area: filters.area || null,
            });
            const counts = { pop: 0, cto: 0, ceo: 0, splitter: 0, poste: 0, cliente: 0 };
            elements.forEach((el) => {
                if (el.lat && el.lng) {
                    el.location = { lat: el.lat, lng: el.lng };
                }
                this.addElement(el);
                if (counts.hasOwnProperty(el.type)) counts[el.type]++;
            });
            return counts;
        } catch (err) {
            console.error('Erro ao carregar elementos:', err);
            return {};
        }
    },

    /**
     * Carrega cabos do backend
     */
    async loadCables(filters = {}) {
        try {
            const cables = await api.cables.list(filters);
            let totalLength = 0;
            cables.forEach((cable) => {
                // Parse PostGIS geometry to [[lat,lng],...] if needed
                if (cable.path && typeof cable.path === 'string') {
                    cable.path = this._parseGeometry(cable.path);
                } else if (cable.path && cable.path.type === 'LineString') {
                    // GeoJSON format: coordinates are [lng, lat]
                    cable.path = cable.path.coordinates.map(c => [c[1], c[0]]);
                }
                this.addCable(cable);
                totalLength += parseFloat(cable.length_meters) || 0;
            });
            return { count: cables.length, totalLength };
        } catch (err) {
            console.error('Erro ao carregar cabos:', err);
            return { count: 0, totalLength: 0 };
        }
    },

    /**
     * Parse PostGIS WKT/EWKT geometry string to [[lat,lng],...] array
     */
    _parseGeometry(geomStr) {
        // Handle SRID=4326;LINESTRING(...) or LINESTRING(...)
        const match = geomStr.match(/LINESTRING\s*\(([^)]+)\)/i);
        if (match) {
            return match[1].split(',').map(pair => {
                const [lng, lat] = pair.trim().split(/\s+/).map(Number);
                return [lat, lng];
            });
        }
        return [];
    },

    // ===== ELEMENT PROXIMITY DETECTION =====

    /**
     * Find the nearest element to a given lat/lng within a threshold (meters)
     */
    findNearestElement(latlng, thresholdMeters = 50) {
        let nearest = null;
        let minDist = Infinity;
        Object.entries(this.markers).forEach(([id, marker]) => {
            const markerLatLng = marker.getLatLng();
            const dist = this.map.distance(latlng, markerLatLng);
            if (dist < minDist && dist <= thresholdMeters) {
                minDist = dist;
                nearest = { id: parseInt(id), latlng: markerLatLng, distance: dist };
            }
        });
        return nearest;
    },

    // ===== CABLE DRAWING =====

    startCableDraw() {
        this.drawingMode = 'cable';
        this.drawPoints = [];
        this._clearDrawing();
        this.map.getContainer().style.cursor = 'crosshair';
        showToast('Clique no mapa para desenhar o cabo. Duplo-clique para finalizar.', 'info');
    },

    finishCableDraw() {
        if (this.drawPoints.length < 2) {
            showToast('Desenhe pelo menos 2 pontos para o cabo.', 'warning');
            return null;
        }

        const path = this.drawPoints.map(p => [p.lat, p.lng]);
        const lengthM = this._calculatePathLength(this.drawPoints);

        this.drawingMode = null;
        this.map.getContainer().style.cursor = '';

        // Detect nearest elements at start and end points
        const startPoint = this.drawPoints[0];
        const endPoint = this.drawPoints[this.drawPoints.length - 1];
        const nearStart = this.findNearestElement(startPoint, 80);
        const nearEnd = this.findNearestElement(endPoint, 80);

        // Populate cable modal
        document.getElementById('cable-length').value = lengthM.toFixed(0) + 'm';
        document.getElementById('cable-path-data').value = JSON.stringify(path);

        // Populate element_from / element_to dropdowns
        this._populateElementSelect('cable-element-from', nearStart ? nearStart.id : '');
        this._populateElementSelect('cable-element-to', nearEnd ? nearEnd.id : '');

        document.getElementById('modal-cable').showModal();
        if (typeof reinitIcons === 'function') reinitIcons();

        return { path, length: lengthM };
    },

    /**
     * Populate a select element with all map elements
     */
    _populateElementSelect(selectId, selectedId) {
        const select = document.getElementById(selectId);
        if (!select) return;
        // Keep the first option (placeholder)
        select.innerHTML = '<option value="">— Nenhum —</option>';
        // Get all elements from markers and sort by name
        const elements = [];
        Object.entries(this.markers).forEach(([id, marker]) => {
            const popup = marker.getPopup();
            const content = popup ? popup.getContent() : '';
            const nameMatch = content.match(/<strong>([^<]+)<\/strong>/);
            const name = nameMatch ? nameMatch[1] : `Elemento #${id}`;
            elements.push({ id, name });
        });
        elements.sort((a, b) => a.name.localeCompare(b.name));
        elements.forEach(el => {
            const opt = document.createElement('option');
            opt.value = el.id;
            opt.textContent = el.name;
            if (String(el.id) === String(selectedId)) opt.selected = true;
            select.appendChild(opt);
        });
    },

    cancelCableDraw() {
        this.drawingMode = null;
        this.drawPoints = [];
        this._clearDrawing();
        this.map.getContainer().style.cursor = '';
    },

    // ===== MEASURE MODE =====

    startMeasure() {
        this.drawingMode = 'measure';
        this.measureMarkers = [];
        this._clearMeasure();
        this.map.getContainer().style.cursor = 'crosshair';
        showToast('Clique nos pontos para medir. Duplo-clique para finalizar.', 'info');
    },

    finishMeasure() {
        this.drawingMode = null;
        this.map.getContainer().style.cursor = '';
    },

    // ===== INTERNAL DRAWING HANDLERS =====

    _onMapClick(e) {
        if (this.drawingMode === 'cable') {
            this.drawPoints.push(e.latlng);
            this._updateDrawLine();
            // Vertex marker
            const m = L.circleMarker(e.latlng, {
                radius: 5,
                color: '#2563eb',
                fillColor: '#ffffff',
                fillOpacity: 1,
                weight: 2,
            }).addTo(this.map);
            this.drawMarkers.push(m);
        } else if (this.drawingMode === 'measure') {
            this.drawPoints.push(e.latlng);
            this._updateMeasureLine();
            const m = L.circleMarker(e.latlng, {
                radius: 4,
                color: '#dc2626',
                fillColor: '#ffffff',
                fillOpacity: 1,
                weight: 2,
            }).addTo(this.map);
            this.measureMarkers.push(m);

            if (this.drawPoints.length >= 2) {
                const dist = this._calculatePathLength(this.drawPoints);
                showToast(`Distância: ${dist.toFixed(0)}m`, 'info');
            }
        }
    },

    _onMapMouseMove(e) {
        if (this.drawingMode === 'cable' && this.drawPoints.length > 0) {
            const pts = [...this.drawPoints.map(p => [p.lat, p.lng]), [e.latlng.lat, e.latlng.lng]];
            if (this.drawLine) {
                this.drawLine.setLatLngs(pts);
            } else {
                this.drawLine = L.polyline(pts, { color: '#2563eb', weight: 3, dashArray: '8,6', opacity: 0.7 }).addTo(this.map);
            }
        }
    },

    _updateDrawLine() {
        const pts = this.drawPoints.map(p => [p.lat, p.lng]);
        if (this.drawLine) {
            this.drawLine.setLatLngs(pts);
        } else {
            this.drawLine = L.polyline(pts, { color: '#2563eb', weight: 3, dashArray: '8,6', opacity: 0.7 }).addTo(this.map);
        }
    },

    _updateMeasureLine() {
        const pts = this.drawPoints.map(p => [p.lat, p.lng]);
        if (this.measureLine) {
            this.measureLine.setLatLngs(pts);
        } else {
            this.measureLine = L.polyline(pts, { color: '#dc2626', weight: 2, dashArray: '6,4', opacity: 0.8 }).addTo(this.map);
        }
    },

    _clearDrawing() {
        if (this.drawLine) { this.map.removeLayer(this.drawLine); this.drawLine = null; }
        this.drawMarkers.forEach(m => this.map.removeLayer(m));
        this.drawMarkers = [];
    },

    _clearMeasure() {
        if (this.measureLine) { this.map.removeLayer(this.measureLine); this.measureLine = null; }
        this.measureMarkers.forEach(m => this.map.removeLayer(m));
        this.measureMarkers = [];
        this.drawPoints = [];
    },

    _calculatePathLength(points) {
        let total = 0;
        for (let i = 1; i < points.length; i++) {
            const a = L.latLng(points[i-1]);
            const b = L.latLng(points[i]);
            total += a.distanceTo(b);
        }
        return total;
    },

    // ===== UTILITIES =====

    clearAll() {
        Object.values(this.layers).forEach((layer) => layer.clearLayers());
        this.markers = {};
        this.cables = {};
    },

    focusElement(elementId) {
        const marker = this.markers[elementId];
        if (marker) {
            this.map.setView(marker.getLatLng(), 17);
            marker.openPopup();
        }
    },

    /**
     * Encontra o CTO mais próximo de um ponto (para viabilidade)
     */
    findNearestCTO(latlng) {
        let nearest = null;
        let minDist = Infinity;

        Object.values(this.markers).forEach((marker) => {
            const dist = latlng.distanceTo(marker.getLatLng());
            if (dist < minDist) {
                minDist = dist;
                nearest = marker;
            }
        });

        return nearest ? { marker: nearest, distance: minDist } : null;
    },
};
