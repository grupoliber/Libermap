/**
 * Libermap - Módulo do Mapa (Leaflet)
 */

const LiberMap = {
    map: null,
    layers: {},
    markers: {},

    // Cores por tipo de elemento
    colors: {
        pop: '#2563eb',
        cto: '#16a34a',
        ceo: '#eab308',
        splitter: '#8b5cf6',
        poste: '#6b7280',
    },

    // Labels por tipo
    labels: {
        pop: 'P',
        cto: 'C',
        ceo: 'E',
        splitter: 'S',
        poste: '●',
    },

    /**
     * Inicializa o mapa
     */
    init(containerId, options = {}) {
        const defaultCenter = [
            options.lat || -14.79,
            options.lng || -39.27,
        ];
        const defaultZoom = options.zoom || 14;

        this.map = L.map(containerId, {
            center: defaultCenter,
            zoom: defaultZoom,
            zoomControl: true,
        });

        // Tile layer (OpenStreetMap)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors | Libermap',
            maxZoom: 19,
        }).addTo(this.map);

        // Camadas por tipo de elemento
        Object.keys(this.colors).forEach((type) => {
            this.layers[type] = L.layerGroup().addTo(this.map);
        });
        this.layers.cables = L.layerGroup().addTo(this.map);

        // Controle de camadas
        L.control.layers(null, {
            'POPs': this.layers.pop,
            'CTOs': this.layers.cto,
            'Caixas de Emenda': this.layers.ceo,
            'Splitters': this.layers.splitter,
            'Postes': this.layers.poste,
            'Cabos': this.layers.cables,
        }).addTo(this.map);

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
        if (!element.location) return;

        const { lat, lng } = element.location;
        const icon = this.createIcon(element.type);

        const marker = L.marker([lat, lng], { icon })
            .bindPopup(`
                <strong>${element.name}</strong><br>
                <small>${element.type.toUpperCase()}</small><br>
                ${element.address || ''}<br>
                <em>Área: ${element.area || 'N/A'}</em>
            `)
            .on('click', () => {
                if (typeof onElementClick === 'function') {
                    onElementClick(element);
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

        const polyline = L.polyline(cable.path, {
            color,
            weight: cable.cable_type === 'backbone' ? 4 : 2,
            opacity: 0.8,
        }).bindPopup(`
            <strong>${cable.name || 'Cabo'}</strong><br>
            Tipo: ${cable.cable_type}<br>
            Fibras: ${cable.fiber_count}<br>
            Comprimento: ${cable.length_meters ? cable.length_meters.toFixed(0) + 'm' : 'N/A'}
        `);

        polyline.addTo(this.layers.cables);
        return polyline;
    },

    /**
     * Carrega todos os elementos do backend (Supabase RPC com coords)
     */
    async loadElements(filters = {}) {
        try {
            const elements = await supabase.rpc('get_elements_with_coords', {
                p_area: filters.area || null,
            });
            elements.forEach((el) => {
                if (el.lat && el.lng) {
                    el.location = { lat: el.lat, lng: el.lng };
                }
                this.addElement(el);
            });
        } catch (err) {
            console.error('Erro ao carregar elementos:', err);
        }
    },

    /**
     * Carrega cabos do backend
     */
    async loadCables(filters = {}) {
        try {
            const cables = await api.cables.list(filters);
            cables.forEach((cable) => this.addCable(cable));
        } catch (err) {
            console.error('Erro ao carregar cabos:', err);
        }
    },

    /**
     * Limpa todos os marcadores
     */
    clearAll() {
        Object.values(this.layers).forEach((layer) => layer.clearLayers());
        this.markers = {};
    },

    /**
     * Centraliza em um elemento
     */
    focusElement(elementId) {
        const marker = this.markers[elementId];
        if (marker) {
            this.map.setView(marker.getLatLng(), 17);
            marker.openPopup();
        }
    },
};
