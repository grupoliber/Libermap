/**
 * Libermap v2 - Lógica principal da aplicação
 * Menu lateral, dashboard, CRUD, Box Editor, toolbar, sidebar com abas
 */

// ===== TOAST NOTIFICATIONS =====
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ===== APP STATE =====
const AppState = {
    currentView: 'map',
    selectedElement: null,
    addMode: false,
    stats: {},
};

// ===== MAIN INIT =====
document.addEventListener('DOMContentLoaded', async () => {
    // Init map
    LiberMap.init('map');

    // Load data
    const counts = await LiberMap.loadElements();
    const cableStats = await LiberMap.loadCables();

    AppState.stats = { ...counts, cables: cableStats.count, totalLength: cableStats.totalLength };
    updateDashboardStats();

    // Init Lucide icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    // Double click to finish cable/measure
    LiberMap.map.on('dblclick', (e) => {
        L.DomEvent.stopPropagation(e);
        if (LiberMap.drawingMode === 'cable') {
            LiberMap.finishCableDraw();
        } else if (LiberMap.drawingMode === 'measure') {
            LiberMap.finishMeasure();
        }
    });

    initMenuNavigation();
    initToolbar();
    initSidebar();
    initModals();
});

// ===== MENU NAVIGATION =====
function initMenuNavigation() {
    const menuItems = document.querySelectorAll('.menu-item[data-view]');
    const menuToggle = document.getElementById('btn-menu-toggle');

    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            const view = item.dataset.view;

            // Update active state
            menuItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            switchView(view);
        });
    });

    // Menu toggle (collapse/expand)
    menuToggle.addEventListener('click', () => {
        document.getElementById('left-menu').classList.toggle('collapsed');
    });

    // Close view buttons
    document.querySelectorAll('.btn-close-view').forEach(btn => {
        btn.addEventListener('click', () => switchView('map'));
    });
}

function switchView(view) {
    AppState.currentView = view;

    // Hide all panels
    document.getElementById('dashboard-view').classList.add('hidden');
    document.getElementById('crud-view').classList.add('hidden');

    // Reset menu active
    document.querySelectorAll('.menu-item[data-view]').forEach(i => {
        i.classList.toggle('active', i.dataset.view === view);
    });

    if (view === 'map') {
        // Nothing to show, map is always behind
        return;
    }

    if (view === 'dashboard') {
        document.getElementById('dashboard-view').classList.remove('hidden');
        updateDashboardStats();
        reinitIcons();
        return;
    }

    // CRUD views
    const crudViews = {
        'tipos-caixa': { title: 'Tipos de Caixa', data: getCrudData('box_types') },
        'tipos-cabo': { title: 'Tipos de Cabo', data: getCrudData('cable_types') },
        'tipos-olt': { title: 'Tipos de OLT', data: getCrudData('olt_types') },
        'tipos-splitter': { title: 'Tipos de Splitter', data: getCrudData('splitter_types') },
        'users': { title: 'Usuários', data: getCrudData('users') },
        'projects': { title: 'Projetos', data: getCrudData('projects') },
        'settings': { title: 'Configurações', data: getCrudData('settings') },
    };

    if (crudViews[view]) {
        document.getElementById('crud-view').classList.remove('hidden');
        document.getElementById('crud-title').textContent = crudViews[view].title;
        renderCrudView(crudViews[view]);
        reinitIcons();
    }
}

function getCrudData(type) {
    // Dados locais para cadastros (futuramente carregados do Supabase)
    const defaults = {
        box_types: [
            { id: 1, name: 'CTO 1x8', capacity: 8, description: 'Caixa terminal 1x8' },
            { id: 2, name: 'CTO 1x16', capacity: 16, description: 'Caixa terminal 1x16' },
            { id: 3, name: 'CEO 12F', capacity: 12, description: 'Caixa de emenda 12 fibras' },
            { id: 4, name: 'CEO 24F', capacity: 24, description: 'Caixa de emenda 24 fibras' },
        ],
        cable_types: [
            { id: 1, name: 'Drop 1FO', fibers: 1, type: 'drop' },
            { id: 2, name: 'Drop 2FO', fibers: 2, type: 'drop' },
            { id: 3, name: 'Dist. 12FO', fibers: 12, type: 'distribuicao' },
            { id: 4, name: 'Backbone 48FO', fibers: 48, type: 'backbone' },
            { id: 5, name: 'Backbone 72FO', fibers: 72, type: 'backbone' },
        ],
        olt_types: [
            { id: 1, name: 'OLT GPON 8P', ports: 8, brand: 'Huawei' },
            { id: 2, name: 'OLT GPON 16P', ports: 16, brand: 'ZTE' },
        ],
        splitter_types: [
            { id: 1, name: 'Splitter 1:8', ratio: '1:8' },
            { id: 2, name: 'Splitter 1:16', ratio: '1:16' },
            { id: 3, name: 'Splitter 1:32', ratio: '1:32' },
        ],
        users: [],
        projects: [],
        settings: [],
    };
    return defaults[type] || [];
}

function renderCrudView(config) {
    const content = document.getElementById('crud-content');
    const data = config.data;

    if (!data || data.length === 0) {
        content.innerHTML = '<div class="crud-empty"><p>Nenhum registro encontrado.</p><p style="margin-top:8px;font-size:12px;">Clique em "Novo" para adicionar.</p></div>';
        return;
    }

    const cols = Object.keys(data[0]);
    content.innerHTML = `
        <table class="crud-table">
            <thead>
                <tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr>
            </thead>
            <tbody>
                ${data.map(row => `<tr>${cols.map(c => `<td>${row[c] || '-'}</td>`).join('')}</tr>`).join('')}
            </tbody>
        </table>
    `;
}

// ===== DASHBOARD =====
function updateDashboardStats() {
    const s = AppState.stats;
    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };
    setVal('stat-pops', s.pop || 0);
    setVal('stat-ctos', s.cto || 0);
    setVal('stat-ceos', s.ceo || 0);
    setVal('stat-splitters', s.splitter || 0);
    setVal('stat-cables', s.cables || 0);
    setVal('stat-clients', s.cliente || 0);
    setVal('stat-km', ((s.totalLength || 0) / 1000).toFixed(1) + ' km');
    setVal('stat-occupancy', '—');
}

// ===== TOOLBAR =====
function initToolbar() {
    const btnAdd = document.getElementById('btn-add-element');
    const btnCable = document.getElementById('btn-add-cable');
    const btnMeasure = document.getElementById('btn-measure');
    const btnExport = document.getElementById('btn-export');
    const btnViability = document.getElementById('btn-viability');
    const btnFullscreen = document.getElementById('btn-fullscreen');
    const searchInput = document.getElementById('search-input');

    // Add element mode
    btnAdd.addEventListener('click', () => {
        AppState.addMode = !AppState.addMode;
        btnAdd.classList.toggle('active', AppState.addMode);
        LiberMap.map.getContainer().style.cursor = AppState.addMode ? 'crosshair' : '';

        if (AppState.addMode) {
            // Cancel other modes
            LiberMap.cancelCableDraw();
            btnCable.classList.remove('active');
            showToast('Clique no mapa para posicionar o elemento.', 'info');
        }
    });

    // Map click for add element
    LiberMap.map.on('click', (e) => {
        if (AppState.addMode && !LiberMap.drawingMode) {
            document.getElementById('elem-lat').value = e.latlng.lat;
            document.getElementById('elem-lng').value = e.latlng.lng;
            document.getElementById('modal-element').showModal();
            reinitIcons();

            AppState.addMode = false;
            btnAdd.classList.remove('active');
            LiberMap.map.getContainer().style.cursor = '';
        }
    });

    // Cable drawing
    btnCable.addEventListener('click', () => {
        if (LiberMap.drawingMode === 'cable') {
            LiberMap.finishCableDraw();
            btnCable.classList.remove('active');
        } else {
            AppState.addMode = false;
            btnAdd.classList.remove('active');
            LiberMap.startCableDraw();
            btnCable.classList.add('active');
        }
    });

    // Measure
    btnMeasure.addEventListener('click', () => {
        if (LiberMap.drawingMode === 'measure') {
            LiberMap.finishMeasure();
            LiberMap._clearMeasure();
            btnMeasure.classList.remove('active');
        } else {
            AppState.addMode = false;
            btnAdd.classList.remove('active');
            LiberMap.cancelCableDraw();
            btnCable.classList.remove('active');
            LiberMap.startMeasure();
            btnMeasure.classList.add('active');
        }
    });

    // Export
    btnExport.addEventListener('click', async () => {
        try {
            const data = await api.export.geojson();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'libermap-export.geojson';
            a.click();
            URL.revokeObjectURL(url);
            showToast('Exportação concluída!', 'success');
        } catch (err) {
            showToast('Erro na exportação: ' + err.message, 'error');
        }
    });

    // Viability
    btnViability.addEventListener('click', () => {
        document.getElementById('modal-viability').show();
        reinitIcons();
        document.getElementById('viability-result').innerHTML = '<p class="text-muted">Clique no mapa para selecionar o ponto do cliente e analisar viabilidade.</p>';

        // Temporary click handler for viability
        const handler = (e) => {
            analyzeViability(e.latlng);
            LiberMap.map.off('click', handler);
        };
        LiberMap.map.on('click', handler);
    });

    // Fullscreen
    btnFullscreen.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    });

    // Search filter
    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        if (!term) {
            Object.values(LiberMap.markers).forEach(m => m.setOpacity(1));
            return;
        }
        Object.values(LiberMap.markers).forEach((marker) => {
            const content = marker.getPopup().getContent().toLowerCase();
            marker.setOpacity(content.includes(term) ? 1 : 0.15);
        });
    });
}

// ===== VIABILITY ANALYSIS =====
function analyzeViability(latlng) {
    const result = LiberMap.findNearestCTO(latlng);
    const container = document.getElementById('viability-result');

    if (!result) {
        container.innerHTML = '<p class="viability-fail">Nenhum CTO encontrado na região.</p>';
        return;
    }

    const distM = result.distance;
    const viable = distM < 3000; // Max 3km

    // Simulated attenuation calc
    const fiberLoss = (distM / 1000) * 0.35; // 0.35 dB/km
    const splitterLoss = 10.5; // 1:8 splitter ~10.5dB
    const connectorLoss = 0.5 * 3; // 3 connectors * 0.5dB
    const totalLoss = fiberLoss + splitterLoss + connectorLoss;
    const budget = 28; // Typical GPON budget
    const margin = budget - totalLoss;

    container.innerHTML = `
        <p class="${viable ? 'viability-ok' : 'viability-fail'}">
            ${viable ? '✓ Viável' : '✗ Inviável'}
        </p>
        <div style="margin-top:12px;">
            <div class="viability-detail"><span>Distância até CTO</span><span>${distM.toFixed(0)}m</span></div>
            <div class="viability-detail"><span>Perda na fibra</span><span>${fiberLoss.toFixed(2)} dB</span></div>
            <div class="viability-detail"><span>Perda splitter (1:8)</span><span>${splitterLoss.toFixed(1)} dB</span></div>
            <div class="viability-detail"><span>Perda conectores</span><span>${connectorLoss.toFixed(1)} dB</span></div>
            <div class="viability-detail"><strong>Atenuação total</strong><strong>${totalLoss.toFixed(2)} dB</strong></div>
            <div class="viability-detail"><span>Budget GPON</span><span>${budget} dB</span></div>
            <div class="viability-detail"><strong>Margem</strong><strong style="color:${margin > 0 ? '#16a34a' : '#dc2626'}">${margin.toFixed(2)} dB</strong></div>
        </div>
    `;

    // Draw line on map
    L.polyline([[latlng.lat, latlng.lng], result.marker.getLatLng()], {
        color: viable ? '#16a34a' : '#dc2626',
        weight: 2,
        dashArray: '8,4',
        opacity: 0.7,
    }).addTo(LiberMap.map);
}

// ===== SIDEBAR =====
function initSidebar() {
    const sidebar = document.getElementById('sidebar');
    const btnClose = document.getElementById('btn-close-sidebar');
    const btnTrace = document.getElementById('btn-trace');
    const btnBoxEditor = document.getElementById('btn-box-editor');
    const tabBtns = document.querySelectorAll('.tab-btn');

    btnClose.addEventListener('click', () => sidebar.classList.add('hidden'));

    // Tab switching
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
            document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
        });
    });

    // Trace
    btnTrace.addEventListener('click', () => {
        if (AppState.selectedElement) {
            traceElement(AppState.selectedElement.id);
        }
    });

    // Box Editor
    btnBoxEditor.addEventListener('click', () => {
        if (AppState.selectedElement) {
            openBoxEditor(AppState.selectedElement);
        }
    });

    // Edit/Delete element
    document.getElementById('btn-edit-element').addEventListener('click', () => {
        if (AppState.selectedElement) {
            showToast('Edição em desenvolvimento', 'warning');
        }
    });

    document.getElementById('btn-delete-element').addEventListener('click', async () => {
        if (!AppState.selectedElement) return;
        if (!confirm(`Excluir ${AppState.selectedElement.name}?`)) return;
        try {
            await api.elements.delete(AppState.selectedElement.id);
            const marker = LiberMap.markers[AppState.selectedElement.id];
            if (marker) {
                LiberMap.map.removeLayer(marker);
                delete LiberMap.markers[AppState.selectedElement.id];
            }
            sidebar.classList.add('hidden');
            showToast('Elemento excluído.', 'success');
        } catch (err) {
            showToast('Erro ao excluir: ' + err.message, 'error');
        }
    });
}

// Element click handler
window.onElementClick = (element) => {
    AppState.selectedElement = element;
    const sidebar = document.getElementById('sidebar');

    // Badge
    const badge = document.getElementById('sidebar-badge');
    badge.textContent = LiberMap.typeNames[element.type] || element.type;
    const badgeColors = {
        pop: '#2563eb', cto: '#16a34a', ceo: '#d97706',
        splitter: '#7c3aed', poste: '#6b7280', cliente: '#0ea5e9',
    };
    badge.style.background = (badgeColors[element.type] || '#6b7280') + '20';
    badge.style.color = badgeColors[element.type] || '#6b7280';

    // Title
    document.getElementById('sidebar-title').textContent = element.name;

    // Properties tab
    document.getElementById('sidebar-content').innerHTML = `
        <div class="detail-row"><span class="label">Status</span><span class="value">${element.status || 'active'}</span></div>
        <div class="detail-row"><span class="label">Endereço</span><span class="value">${element.address || '—'}</span></div>
        <div class="detail-row"><span class="label">Área</span><span class="value">${element.area || '—'}</span></div>
        <div class="detail-row"><span class="label">Capacidade</span><span class="value">${element.capacity || '—'}</span></div>
        <div class="detail-row"><span class="label">Lat/Lng</span><span class="value">${element.location ? element.location.lat.toFixed(5) + ', ' + element.location.lng.toFixed(5) : '—'}</span></div>
        <div class="detail-row"><span class="label">Criado em</span><span class="value">${element.created_at ? new Date(element.created_at).toLocaleDateString('pt-BR') : '—'}</span></div>
    `;

    // Fibers tab
    renderFibersTab(element);

    // History tab
    document.getElementById('sidebar-history').innerHTML = `
        <p style="color:#64748b;font-size:13px;padding:8px 0;">Histórico de alterações será implementado em breve.</p>
    `;

    // Show sidebar, reset to props tab
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.tab-btn[data-tab="props"]').classList.add('active');
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById('tab-props').classList.add('active');

    sidebar.classList.remove('hidden');
    reinitIcons();
};

function renderFibersTab(element) {
    const container = document.getElementById('sidebar-fibers');

    // Simulated fiber data based on capacity
    const capacity = element.capacity || 8;
    const fiberColors = ['#3b82f6', '#22c55e', '#ef4444', '#f97316', '#eab308', '#8b5cf6', '#06b6d4', '#ec4899', '#6b7280', '#84cc16', '#14b8a6', '#f43f5e'];
    const statuses = ['available', 'used', 'available', 'used', 'available', 'available', 'reserved', 'broken'];

    let html = '';
    for (let i = 0; i < capacity; i++) {
        const color = fiberColors[i % fiberColors.length];
        const status = statuses[i % statuses.length];
        const statusLabel = { available: 'Livre', used: 'Em uso', reserved: 'Reservada', broken: 'Quebrada' };
        html += `
            <div class="fiber-item">
                <div class="fiber-dot" style="background:${color}"></div>
                <span class="fiber-number">${i + 1}</span>
                <span style="flex:1;font-size:12px;color:#64748b;">Fibra ${i + 1}</span>
                <span class="fiber-status ${status}">${statusLabel[status]}</span>
            </div>
        `;
    }
    container.innerHTML = html || '<p style="color:#64748b;font-size:13px;padding:8px 0;">Nenhuma fibra associada.</p>';
}

// ===== TRACE =====
async function traceElement(elementId) {
    try {
        const trace = await api.trace.fromElement(elementId);
        const content = document.getElementById('sidebar-content');
        content.innerHTML += `
            <div style="margin-top:16px;padding-top:12px;border-top:1px solid #e2e8f0;">
                <h4 style="font-size:13px;font-weight:600;margin-bottom:8px;">Rastreamento de Fibra</h4>
                <div class="detail-row"><span class="label">Distância</span><span class="value">${trace.total_distance_m?.toFixed(0) || '?'}m</span></div>
                <div class="detail-row"><span class="label">Splitters</span><span class="value">${trace.total_splitters || 0}</span></div>
                <div class="detail-row"><span class="label">Fusões</span><span class="value">${trace.total_fusions || 0}</span></div>
            </div>
        `;
        showToast('Rastreamento concluído', 'success');
    } catch (err) {
        showToast('Erro no rastreamento: ' + err.message, 'error');
    }
}

// ===== BOX EDITOR =====
function openBoxEditor(element) {
    const modal = document.getElementById('modal-box-editor');
    document.getElementById('box-editor-title').textContent = element.name;

    // Render fibers
    const capacity = element.capacity || 8;
    const fiberColors = ['#3b82f6', '#22c55e', '#ef4444', '#f97316', '#eab308', '#8b5cf6', '#06b6d4', '#ec4899', '#6b7280', '#84cc16', '#14b8a6', '#f43f5e'];
    const statuses = ['available', 'used', 'available', 'used', 'available', 'available', 'reserved', 'broken'];
    const statusColors = { available: '#22c55e', used: '#3b82f6', reserved: '#eab308', broken: '#ef4444' };

    let inputHtml = '', outputHtml = '';
    for (let i = 0; i < capacity; i++) {
        const color = fiberColors[i % fiberColors.length];
        const status = statuses[i % statuses.length];
        inputHtml += `<div class="fiber-slot" data-fiber="${i}"><div class="fiber-color-dot" style="background:${color}"></div><span>${i+1}</span></div>`;
        outputHtml += `<div class="fiber-slot" data-fiber="${i}"><div class="fiber-color-dot" style="background:${statusColors[status]}"></div><span>Saída ${i+1}</span></div>`;
    }

    document.getElementById('box-input-fibers').innerHTML = inputHtml;
    document.getElementById('box-output-fibers').innerHTML = outputHtml;

    // Draw canvas diagram
    drawBoxDiagram(capacity, fiberColors, statuses, statusColors);

    modal.showModal();
    reinitIcons();
}

function drawBoxDiagram(capacity, fiberColors, statuses, statusColors) {
    const canvas = document.getElementById('box-canvas');
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;

    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = '#fafbfc';
    ctx.fillRect(0, 0, W, H);

    // Box outline
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, W - 40, H - 40);

    // Title inside box
    ctx.fillStyle = '#64748b';
    ctx.font = '12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Diagrama Interno', W / 2, 42);

    const startY = 60;
    const endY = H - 40;
    const spacing = Math.min(30, (endY - startY) / capacity);

    for (let i = 0; i < capacity; i++) {
        const y = startY + i * spacing + spacing / 2;
        const color = fiberColors[i % fiberColors.length];
        const status = statuses[i % statuses.length];
        const sColor = statusColors[status];

        // Input fiber line
        ctx.beginPath();
        ctx.moveTo(30, y);
        ctx.lineTo(W / 2 - 20, y);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Fusion/connection point
        ctx.beginPath();
        ctx.arc(W / 2, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#1e293b';
        ctx.fill();

        // Output fiber line
        ctx.beginPath();
        ctx.moveTo(W / 2 + 20, y);
        ctx.lineTo(W - 30, y);
        ctx.strokeStyle = sColor;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Input dot
        ctx.beginPath();
        ctx.arc(30, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        // Output dot
        ctx.beginPath();
        ctx.arc(W - 30, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = sColor;
        ctx.fill();
    }
}

document.getElementById('btn-close-box-editor')?.addEventListener('click', () => {
    document.getElementById('modal-box-editor').close();
});

document.getElementById('btn-box-cancel')?.addEventListener('click', () => {
    document.getElementById('modal-box-editor').close();
});

document.getElementById('btn-box-save')?.addEventListener('click', () => {
    showToast('Alterações salvas no Box Editor.', 'success');
    document.getElementById('modal-box-editor').close();
});

// ===== MODALS =====
function initModals() {
    const modalElement = document.getElementById('modal-element');
    const formElement = document.getElementById('form-element');
    const btnCancel = document.getElementById('btn-cancel-element');
    const modalCable = document.getElementById('modal-cable');
    const formCable = document.getElementById('form-cable');

    // Cancel element modal
    btnCancel.addEventListener('click', () => modalElement.close());

    // Save element
    formElement.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            type: document.getElementById('elem-type').value,
            name: document.getElementById('elem-name').value,
            address: document.getElementById('elem-address').value || null,
            area: document.getElementById('elem-area').value || null,
            capacity: parseInt(document.getElementById('elem-capacity').value) || null,
            description: document.getElementById('elem-notes').value || null,
            location: {
                lat: parseFloat(document.getElementById('elem-lat').value),
                lng: parseFloat(document.getElementById('elem-lng').value),
            },
        };

        try {
            const element = await api.elements.create(data);
            LiberMap.addElement(element);
            modalElement.close();
            formElement.reset();
            showToast(`${data.name} criado com sucesso!`, 'success');

            // Update stats
            if (AppState.stats[data.type] !== undefined) {
                AppState.stats[data.type]++;
            }
        } catch (err) {
            showToast('Erro ao criar elemento: ' + err.message, 'error');
        }
    });

    // Save cable
    formCable.addEventListener('submit', async (e) => {
        e.preventDefault();
        const pathData = JSON.parse(document.getElementById('cable-path-data').value || '[]');
        // Convert [lat, lng] array to PostGIS EWKT format: SRID=4326;LINESTRING(lng lat, lng lat, ...)
        const wktCoords = pathData.map(p => `${p[1]} ${p[0]}`).join(', ');
        const pathWKT = `SRID=4326;LINESTRING(${wktCoords})`;
        const data = {
            name: document.getElementById('cable-name').value,
            cable_type: document.getElementById('cable-type').value,
            fiber_count: parseInt(document.getElementById('cable-fibers').value),
            length_meters: parseFloat(document.getElementById('cable-length').value) || 0,
            path: pathWKT,
        };

        try {
            const cable = await api.cables.create(data);
            LiberMap.addCable({ ...data, id: cable?.id || Date.now() });
            LiberMap._clearDrawing();
            modalCable.close();
            formCable.reset();
            showToast(`Cabo ${data.name} criado!`, 'success');
            AppState.stats.cables = (AppState.stats.cables || 0) + 1;
        } catch (err) {
            showToast('Erro ao criar cabo: ' + err.message, 'error');
        }
    });
}

// Cancel cable draw from modal
window.cancelCableDraw = function() {
    LiberMap.cancelCableDraw();
    document.getElementById('modal-cable').close();
    document.getElementById('btn-add-cable')?.classList.remove('active');
};

// ===== UTIL =====
function reinitIcons() {
    if (typeof lucide !== 'undefined') {
        setTimeout(() => lucide.createIcons(), 50);
    }
}
