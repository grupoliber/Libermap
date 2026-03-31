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
    editingElementId: null,
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

    // Edit element
    document.getElementById('btn-edit-element').addEventListener('click', () => {
        if (!AppState.selectedElement) return;
        const el = AppState.selectedElement;

        // Populate modal with current values
        document.getElementById('elem-type').value = el.type || 'cto';
        document.getElementById('elem-name').value = el.name || '';
        document.getElementById('elem-address').value = el.address || '';
        document.getElementById('elem-area').value = el.area || '';
        document.getElementById('elem-capacity').value = el.capacity || '';
        const modelField = document.getElementById('elem-model');
        if (modelField) modelField.value = el.metadata?.model || '';
        document.getElementById('elem-notes').value = el.description || '';
        document.getElementById('elem-lat').value = el.location?.lat || el.lat || '';
        document.getElementById('elem-lng').value = el.location?.lng || el.lng || '';

        // Set modal to edit mode
        AppState.editingElementId = el.id;
        const modalTitle = document.querySelector('#modal-element .modal-header h2');
        modalTitle.textContent = 'Editar Elemento';
        const submitBtn = document.querySelector('#modal-element button[type="submit"]');
        submitBtn.textContent = 'Salvar Alterações';

        document.getElementById('modal-element').showModal();
        reinitIcons();
    });

    // Delete element with dependency check
    document.getElementById('btn-delete-element').addEventListener('click', async () => {
        if (!AppState.selectedElement) return;
        const elId = AppState.selectedElement.id;
        const elName = AppState.selectedElement.name;

        try {
            // Check for cables connected to this element
            const cablesFrom = await supabase.request('GET', 'cables', {
                filters: { element_from_id: `eq.${elId}` },
                select: 'id,name'
            });
            const cablesTo = await supabase.request('GET', 'cables', {
                filters: { element_to_id: `eq.${elId}` },
                select: 'id,name'
            });
            const connectedCables = [...(cablesFrom || []), ...(cablesTo || [])];

            // Check for splitters in this element
            const splitters = await supabase.request('GET', 'splitters', {
                filters: { element_id: `eq.${elId}` },
                select: 'id'
            });

            // Check for fusions in this element
            const fusions = await supabase.request('GET', 'fusions', {
                filters: { element_id: `eq.${elId}` },
                select: 'id'
            });

            const deps = [];
            if (connectedCables.length > 0) {
                const cableNames = connectedCables.map(c => c.name || `#${c.id}`).join(', ');
                deps.push(`${connectedCables.length} cabo(s): ${cableNames}`);
            }
            if (splitters && splitters.length > 0) {
                deps.push(`${splitters.length} splitter(s)`);
            }
            if (fusions && fusions.length > 0) {
                deps.push(`${fusions.length} fusão(ões)`);
            }

            if (deps.length > 0) {
                showToast(`Não é possível excluir "${elName}". Existem conexões ativas:\n• ${deps.join('\n• ')}\n\nRemova as conexões antes de excluir.`, 'error');
                return;
            }

            // No dependencies — confirm and delete
            if (!confirm(`Tem certeza que deseja excluir "${elName}"? Esta ação não pode ser desfeita.`)) return;

            await api.elements.delete(elId);
            const marker = LiberMap.markers[elId];
            if (marker) {
                LiberMap.map.removeLayer(marker);
                delete LiberMap.markers[elId];
            }
            sidebar.classList.add('hidden');
            showToast(`"${elName}" excluído com sucesso.`, 'success');

            // Update stats
            const elType = AppState.selectedElement.type;
            if (AppState.stats[elType] !== undefined) {
                AppState.stats[elType]--;
            }
            AppState.selectedElement = null;
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

    // Properties tab — basic info
    document.getElementById('sidebar-content').innerHTML = `
        <div class="detail-row"><span class="label">Status</span><span class="value">${element.status || 'active'}</span></div>
        <div class="detail-row"><span class="label">Endereço</span><span class="value">${element.address || '—'}</span></div>
        <div class="detail-row"><span class="label">Área</span><span class="value">${element.area || '—'}</span></div>
        <div class="detail-row"><span class="label">Capacidade</span><span class="value">${element.capacity || '—'}</span></div>
        <div class="detail-row"><span class="label">Lat/Lng</span><span class="value">${element.location ? element.location.lat.toFixed(5) + ', ' + element.location.lng.toFixed(5) : '—'}</span></div>
        <div class="detail-row"><span class="label">Criado em</span><span class="value">${element.created_at ? new Date(element.created_at).toLocaleDateString('pt-BR') : '—'}</span></div>
        <div id="sidebar-cables-section" style="margin-top:12px;padding-top:12px;border-top:1px solid #e2e8f0;">
            <p style="color:#94a3b8;font-size:12px;">Carregando conexões...</p>
        </div>
    `;

    // Load real cable connections for this element
    loadElementConnections(element.id);

    // Fibers tab — load real data
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

// Load cables connected to an element and show in the sidebar
async function loadElementConnections(elementId) {
    const section = document.getElementById('sidebar-cables-section');
    if (!section) return;

    try {
        const cablesFrom = await supabase.request('GET', 'cables', {
            filters: { element_from_id: `eq.${elementId}` },
            select: 'id,name,cable_type,fiber_count,length_meters,element_to_id'
        });
        const cablesTo = await supabase.request('GET', 'cables', {
            filters: { element_to_id: `eq.${elementId}` },
            select: 'id,name,cable_type,fiber_count,length_meters,element_from_id'
        });

        const allCables = [];
        (cablesFrom || []).forEach(c => allCables.push({ ...c, direction: 'saída', connectedTo: c.element_to_id }));
        (cablesTo || []).forEach(c => allCables.push({ ...c, direction: 'entrada', connectedTo: c.element_from_id }));

        if (allCables.length === 0) {
            section.innerHTML = `
                <h4 style="font-size:13px;font-weight:600;margin-bottom:6px;color:#334155;">
                    <i data-lucide="cable" style="width:14px;height:14px;display:inline;vertical-align:middle;"></i> Cabos Conectados
                </h4>
                <p style="color:#94a3b8;font-size:12px;">Nenhum cabo conectado a este elemento.</p>
            `;
            reinitIcons();
            return;
        }

        // Resolve connected element names
        const elementNames = {};
        for (const cable of allCables) {
            if (cable.connectedTo && !elementNames[cable.connectedTo]) {
                try {
                    const el = await supabase.request('GET', 'elements', {
                        filters: { id: `eq.${cable.connectedTo}` },
                        select: 'id,name,type',
                        single: true
                    });
                    elementNames[cable.connectedTo] = el ? el.name : `#${cable.connectedTo}`;
                } catch { elementNames[cable.connectedTo] = `#${cable.connectedTo}`; }
            }
        }

        const cableTypeLabels = { backbone: 'Backbone', distribuicao: 'Distribuição', drop: 'Drop' };
        const cableTypeColors = { backbone: '#ef4444', distribuicao: '#f97316', drop: '#22c55e' };

        let html = `<h4 style="font-size:13px;font-weight:600;margin-bottom:8px;color:#334155;">
            <i data-lucide="cable" style="width:14px;height:14px;display:inline;vertical-align:middle;"></i> Cabos Conectados (${allCables.length})
        </h4>`;

        allCables.forEach(cable => {
            const color = cableTypeColors[cable.cable_type] || '#6b7280';
            const typeLabel = cableTypeLabels[cable.cable_type] || cable.cable_type;
            const connName = cable.connectedTo ? elementNames[cable.connectedTo] || `#${cable.connectedTo}` : 'Sem destino';
            const arrow = cable.direction === 'saída' ? '→' : '←';
            html += `
                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:8px 10px;margin-bottom:6px;cursor:pointer;" onclick="window.onCableDetailClick && window.onCableDetailClick(${cable.id})">
                    <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
                        <span style="width:8px;height:8px;border-radius:50%;background:${color};display:inline-block;"></span>
                        <strong style="font-size:13px;">${cable.name || 'Cabo #' + cable.id}</strong>
                        <span style="font-size:11px;color:#94a3b8;margin-left:auto;">${typeLabel}</span>
                    </div>
                    <div style="font-size:12px;color:#64748b;">
                        ${arrow} ${connName} · ${cable.fiber_count || '?'} fibras · ${cable.length_meters ? parseFloat(cable.length_meters).toFixed(0) + 'm' : '?'}
                    </div>
                </div>
            `;
        });

        section.innerHTML = html;
        reinitIcons();
    } catch (err) {
        section.innerHTML = `<p style="color:#ef4444;font-size:12px;">Erro ao carregar conexões: ${err.message}</p>`;
    }
}

// Load real fiber data for cables connected to this element
async function renderFibersTab(element) {
    const container = document.getElementById('sidebar-fibers');
    container.innerHTML = '<p style="color:#94a3b8;font-size:12px;padding:8px 0;">Carregando fibras...</p>';

    try {
        // Get cables connected to this element
        const cablesFrom = await supabase.request('GET', 'cables', {
            filters: { element_from_id: `eq.${element.id}` },
            select: 'id,name,cable_type,fiber_count'
        });
        const cablesTo = await supabase.request('GET', 'cables', {
            filters: { element_to_id: `eq.${element.id}` },
            select: 'id,name,cable_type,fiber_count'
        });
        const allCables = [...(cablesFrom || []), ...(cablesTo || [])];

        if (allCables.length === 0) {
            container.innerHTML = '<p style="color:#94a3b8;font-size:13px;padding:8px 0;">Nenhum cabo conectado — sem fibras para exibir.</p>';
            return;
        }

        const fiberColorMap = {
            verde: '#22c55e', amarelo: '#eab308', branco: '#d1d5db', azul: '#3b82f6',
            vermelho: '#ef4444', violeta: '#8b5cf6', marrom: '#92400e', rosa: '#ec4899',
            preto: '#1e293b', cinza: '#6b7280', laranja: '#f97316', aqua: '#06b6d4'
        };
        const statusLabels = { available: 'Livre', used: 'Em uso', reserved: 'Reservada', broken: 'Quebrada' };
        const cableTypeColors = { backbone: '#ef4444', distribuicao: '#f97316', drop: '#22c55e' };

        let html = '';

        for (const cable of allCables) {
            const cableColor = cableTypeColors[cable.cable_type] || '#6b7280';
            html += `<div style="margin-bottom:12px;">
                <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;padding-bottom:4px;border-bottom:1px solid #e2e8f0;">
                    <span style="width:8px;height:8px;border-radius:50%;background:${cableColor};display:inline-block;"></span>
                    <strong style="font-size:13px;">${cable.name || 'Cabo #' + cable.id}</strong>
                    <span style="font-size:11px;color:#94a3b8;margin-left:auto;">${cable.fiber_count} fibras</span>
                </div>`;

            // Load fibers for this cable
            try {
                const fibers = await supabase.request('GET', 'fibers', {
                    filters: { cable_id: `eq.${cable.id}` },
                    select: 'id,position,color,status,customer_id'
                });

                if (fibers && fibers.length > 0) {
                    fibers.sort((a, b) => a.position - b.position);
                    fibers.forEach(fiber => {
                        const dotColor = fiberColorMap[fiber.color] || '#6b7280';
                        const statusLabel = statusLabels[fiber.status] || fiber.status;
                        html += `
                            <div class="fiber-item">
                                <div class="fiber-dot" style="background:${dotColor}"></div>
                                <span class="fiber-number">${fiber.position}</span>
                                <span style="flex:1;font-size:12px;color:#64748b;">${fiber.color || 'Fibra ' + fiber.position}</span>
                                ${fiber.customer_id ? `<span style="font-size:11px;color:#0ea5e9;margin-right:4px;">${fiber.customer_id}</span>` : ''}
                                <span class="fiber-status ${fiber.status}">${statusLabel}</span>
                            </div>
                        `;
                    });
                } else {
                    html += `<p style="color:#94a3b8;font-size:12px;padding:4px 0;">Fibras ainda não cadastradas para este cabo.</p>`;
                }
            } catch (fiberErr) {
                html += `<p style="color:#f97316;font-size:12px;">Erro ao carregar fibras: ${fiberErr.message}</p>`;
            }

            html += '</div>';
        }

        container.innerHTML = html;
    } catch (err) {
        container.innerHTML = `<p style="color:#ef4444;font-size:12px;">Erro: ${err.message}</p>`;
    }
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
const FIBER_COLORS = {
    'verde': '#22c55e', 'amarelo': '#eab308', 'branco': '#e2e8f0',
    'azul': '#3b82f6', 'vermelho': '#ef4444', 'violeta': '#8b5cf6',
    'marrom': '#92400e', 'rosa': '#ec4899', 'preto': '#1e293b',
    'cinza': '#6b7280', 'laranja': '#f97316', 'aqua': '#06b6d4'
};

const STATUS_COLORS = {
    'available': '#22c55e',
    'used': '#3b82f6',
    'reserved': '#eab308',
    'broken': '#ef4444'
};

let boxEditorState = {
    elementId: null,
    cables: { input: [], output: [] },
    fibers: {},
    splitters: [],
    ports: {},
    fusions: [],
    selectedFiberOrigin: null,
    selectedFiberDest: null,
};

async function openBoxEditor(element) {
    try {
        boxEditorState.elementId = element.id;

        // Update header
        document.getElementById('box-element-name').textContent = element.name;
        document.getElementById('box-element-badge').textContent = (element.type || 'CTO').toUpperCase();

        // Load all data from Supabase
        await loadBoxEditorData(element.id);

        // Render UI
        renderBoxInputCables();
        renderBoxOutputCables();
        renderBoxSplitters();
        renderBoxFusions();
        drawBoxDiagram();

        // Show modal
        document.getElementById('modal-box-editor').showModal();
        reinitIcons();
    } catch (err) {
        showToast('Erro ao abrir Box Editor: ' + err.message, 'error');
    }
}

async function loadBoxEditorData(elementId) {
    try {
        // Get cables connected to this element
        const [cablesFrom, cablesTo] = await Promise.all([
            supabase.request('GET', 'cables', {
                filters: { element_from_id: `eq.${elementId}` },
                select: 'id,name,cable_type,fiber_count'
            }),
            supabase.request('GET', 'cables', {
                filters: { element_to_id: `eq.${elementId}` },
                select: 'id,name,cable_type,fiber_count'
            })
        ]);

        // cablesFrom = cables starting at this element = outgoing (saída)
        // cablesTo = cables ending at this element = incoming (entrada)
        boxEditorState.cables.input = cablesTo || [];
        boxEditorState.cables.output = cablesFrom || [];

        // Get fibers for each cable
        boxEditorState.fibers = {};
        const allCables = [...boxEditorState.cables.input, ...boxEditorState.cables.output];

        for (const cable of allCables) {
            const fibers = await supabase.request('GET', 'fibers', {
                filters: { cable_id: `eq.${cable.id}` },
                select: 'id,position,color,status,customer_id'
            });
            boxEditorState.fibers[cable.id] = fibers || [];
        }

        // Get splitters in this element
        const splitters = await supabase.request('GET', 'splitters', {
            filters: { element_id: `eq.${elementId}` },
            select: 'id,ratio,input_fiber_id'
        });
        boxEditorState.splitters = splitters || [];

        // Get splitter ports
        boxEditorState.ports = {};
        for (const splitter of boxEditorState.splitters) {
            const ports = await supabase.request('GET', 'splitter_ports', {
                filters: { splitter_id: `eq.${splitter.id}` },
                select: 'id,port_number,output_fiber_id,status'
            });
            boxEditorState.ports[splitter.id] = ports || [];
        }

        // Get fusions in this element
        const fusions = await supabase.request('GET', 'fusions', {
            filters: { element_id: `eq.${elementId}` },
            select: 'id,fiber_in_id,fiber_out_id,loss_db,technician,notes,created_at'
        });
        boxEditorState.fusions = fusions || [];

    } catch (err) {
        showToast('Erro ao carregar dados: ' + err.message, 'error');
    }
}

function renderBoxInputCables() {
    const container = document.getElementById('box-input-cables');
    let html = '';

    if (boxEditorState.cables.input.length === 0) {
        html = '<div style="padding:20px;text-align:center;color:#94a3b8;font-size:12px;">Nenhum cabo de entrada</div>';
        container.innerHTML = html;
        return;
    }

    for (const cable of boxEditorState.cables.input) {
        const fibers = boxEditorState.fibers[cable.id] || [];
        html += `
            <div class="cable-group">
                <div class="cable-name">
                    <i data-lucide="arrow-right" style="width:12px;height:12px;"></i>
                    ${cable.name}
                    <span class="fiber-count">${fibers.length}</span>
                </div>
        `;

        for (const fiber of fibers) {
            const colorKey = fiber.color || 'azul';
            const color = FIBER_COLORS[colorKey] || '#3b82f6';
            const statusDisplay = fiber.status || 'available';

            html += `
                <div class="fiber-item" data-cable-id="${cable.id}" data-fiber-id="${fiber.id}"
                     data-color="${color}" data-status="${statusDisplay}">
                    <div class="fiber-dot" style="background:${color}"></div>
                    <span class="fiber-number">${fiber.position || '?'}</span>
                    <span class="fiber-status-badge ${statusDisplay}">${statusDisplay === 'available' ? 'Liv.' : statusDisplay === 'used' ? 'Uso' : statusDisplay === 'reserved' ? 'Res.' : 'Que.'}</span>
                </div>
            `;
        }

        html += '</div>';
    }

    container.innerHTML = html;
    reinitIcons();
}

function renderBoxOutputCables() {
    const container = document.getElementById('box-output-cables');
    let html = '';

    if (boxEditorState.cables.output.length === 0) {
        html = '<div style="padding:20px;text-align:center;color:#94a3b8;font-size:12px;">Nenhum cabo de saída</div>';
        container.innerHTML = html;
        return;
    }

    for (const cable of boxEditorState.cables.output) {
        const fibers = boxEditorState.fibers[cable.id] || [];
        html += `
            <div class="cable-group">
                <div class="cable-name">
                    <i data-lucide="arrow-left" style="width:12px;height:12px;"></i>
                    ${cable.name}
                    <span class="fiber-count">${fibers.length}</span>
                </div>
        `;

        for (const fiber of fibers) {
            const colorKey = fiber.color || 'azul';
            const color = FIBER_COLORS[colorKey] || '#3b82f6';
            const statusDisplay = fiber.status || 'available';

            html += `
                <div class="fiber-item" data-cable-id="${cable.id}" data-fiber-id="${fiber.id}"
                     data-color="${color}" data-status="${statusDisplay}">
                    <div class="fiber-dot" style="background:${color}"></div>
                    <span class="fiber-number">${fiber.position || '?'}</span>
                    <span class="fiber-status-badge ${statusDisplay}">${statusDisplay === 'available' ? 'Liv.' : statusDisplay === 'used' ? 'Uso' : statusDisplay === 'reserved' ? 'Res.' : 'Que.'}</span>
                </div>
            `;
        }

        html += '</div>';
    }

    container.innerHTML = html;
    reinitIcons();
}

function renderBoxSplitters() {
    // Splitters are drawn in the diagram, not in separate panels
    // This function can be extended for future detailed splitter management
}

function renderBoxFusions() {
    const tbody = document.getElementById('box-fusions-body');
    const countEl = document.getElementById('fusion-count');

    countEl.textContent = `${boxEditorState.fusions.length} fusão(ões)`;

    if (boxEditorState.fusions.length === 0) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="8" style="text-align:center;padding:20px;color:#94a3b8;">Nenhuma fusão registrada</td></tr>';
        return;
    }

    let html = '';
    for (const fusion of boxEditorState.fusions) {
        const fiberIn = findFiberById(fusion.fiber_in_id);
        const fiberOut = findFiberById(fusion.fiber_out_id);
        const cableIn = findCableByFiberId(fusion.fiber_in_id);
        const cableOut = findCableByFiberId(fusion.fiber_out_id);

        html += `
            <tr>
                <td>${cableIn?.type || '?'}</td>
                <td>${cableIn?.name || '?'}</td>
                <td>${fiberIn?.position || '?'}</td>
                <td>${cableOut?.type || '?'}</td>
                <td>${cableOut?.name || '?'}</td>
                <td>${fiberOut?.position || '?'}</td>
                <td>${fusion.loss_db ? fusion.loss_db.toFixed(2) : '—'}</td>
                <td>
                    <button class="fusion-action-btn" title="Excluir" onclick="deleteFusion(${fusion.id})">
                        <i data-lucide="trash-2"></i>
                    </button>
                </td>
            </tr>
        `;
    }

    tbody.innerHTML = html;
    reinitIcons();
}

function drawBoxDiagram() {
    const svg = document.getElementById('box-diagram-svg');
    const ns = 'http://www.w3.org/2000/svg';

    // Layout constants
    const FIBER_SQ = 14;           // fiber square size
    const FIBER_GAP = 3;           // gap between fiber squares
    const CABLE_PAD = 10;          // padding inside cable block
    const CABLE_SPACING = 30;      // vertical gap between cable blocks
    const SPLITTER_W = 60;         // splitter triangle width
    const SPLITTER_H = 80;         // splitter triangle height
    const MARGIN = 40;
    const COL_LEFT = 50;           // x center of input cables column
    const COL_RIGHT_OFFSET = 180;  // right column offset from right edge

    // Calculate cable block width based on max fibers
    const allCables = [...boxEditorState.cables.input, ...boxEditorState.cables.output];
    const maxFibers = Math.max(...allCables.map(c => (boxEditorState.fibers[c.id] || []).length), 6);
    const BLOCK_W = Math.max(160, maxFibers * (FIBER_SQ + FIBER_GAP) + CABLE_PAD * 2 + 10);
    const BLOCK_H = 60;

    // Calculate canvas dimensions
    const W = Math.max(900, COL_LEFT + BLOCK_W + 200 + SPLITTER_W + 200 + BLOCK_W + COL_RIGHT_OFFSET);

    // Calculate heights for each column
    const inputH = boxEditorState.cables.input.reduce((sum, c) => {
        const fCount = (boxEditorState.fibers[c.id] || []).length;
        return sum + BLOCK_H + (fCount > 0 ? 18 : 0) + CABLE_SPACING;
    }, 0);
    const outputH = boxEditorState.cables.output.reduce((sum, c) => {
        const fCount = (boxEditorState.fibers[c.id] || []).length;
        return sum + BLOCK_H + (fCount > 0 ? 18 : 0) + CABLE_SPACING;
    }, 0);
    const splitterH = boxEditorState.splitters.length * (SPLITTER_H + 60);
    const H = Math.max(400, inputH + MARGIN * 2, outputH + MARGIN * 2, splitterH + MARGIN * 2);

    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.innerHTML = '';

    // --- Defs: grid pattern ---
    const defs = document.createElementNS(ns, 'defs');
    const pat = document.createElementNS(ns, 'pattern');
    pat.setAttribute('id', 'boxgrid');
    pat.setAttribute('width', '20');
    pat.setAttribute('height', '20');
    pat.setAttribute('patternUnits', 'userSpaceOnUse');
    // Horizontal dots
    for (let dx = 0; dx < 20; dx += 5) {
        const dot = document.createElementNS(ns, 'circle');
        dot.setAttribute('cx', dx);
        dot.setAttribute('cy', 0);
        dot.setAttribute('r', '0.5');
        dot.setAttribute('fill', '#cbd5e1');
        pat.appendChild(dot);
    }
    // Vertical dots
    for (let dy = 5; dy < 20; dy += 5) {
        const dot = document.createElementNS(ns, 'circle');
        dot.setAttribute('cx', 0);
        dot.setAttribute('cy', dy);
        dot.setAttribute('r', '0.5');
        dot.setAttribute('fill', '#cbd5e1');
        pat.appendChild(dot);
    }
    defs.appendChild(pat);
    svg.appendChild(defs);

    // Background with grid
    const bgWhite = document.createElementNS(ns, 'rect');
    bgWhite.setAttribute('width', W);
    bgWhite.setAttribute('height', H);
    bgWhite.setAttribute('fill', '#f8fafc');
    svg.appendChild(bgWhite);

    const bgGrid = document.createElementNS(ns, 'rect');
    bgGrid.setAttribute('width', W);
    bgGrid.setAttribute('height', H);
    bgGrid.setAttribute('fill', 'url(#boxgrid)');
    svg.appendChild(bgGrid);

    // Fiber coordinate map for connection lines
    const fiberCoords = {};

    // --- Helper: draw cable block ---
    function drawCableBlock(cable, xCenter, yTop) {
        const fibers = boxEditorState.fibers[cable.id] || [];
        const fiberCount = fibers.length || 0;
        const actualBlockW = Math.max(140, fiberCount * (FIBER_SQ + FIBER_GAP) + CABLE_PAD * 2);
        const blockX = xCenter - actualBlockW / 2;

        // Shadow
        const shadow = document.createElementNS(ns, 'rect');
        shadow.setAttribute('x', blockX + 2);
        shadow.setAttribute('y', yTop + 2);
        shadow.setAttribute('width', actualBlockW);
        shadow.setAttribute('height', BLOCK_H);
        shadow.setAttribute('fill', 'rgba(0,0,0,0.15)');
        shadow.setAttribute('rx', '4');
        svg.appendChild(shadow);

        // Cable block rectangle (dark gray like Geosite)
        const block = document.createElementNS(ns, 'rect');
        block.setAttribute('x', blockX);
        block.setAttribute('y', yTop);
        block.setAttribute('width', actualBlockW);
        block.setAttribute('height', BLOCK_H);
        block.setAttribute('fill', '#374151');
        block.setAttribute('stroke', '#111827');
        block.setAttribute('stroke-width', '1.5');
        block.setAttribute('rx', '4');
        svg.appendChild(block);

        // Cable name (white text)
        const label = document.createElementNS(ns, 'text');
        label.setAttribute('x', xCenter);
        label.setAttribute('y', yTop + 16);
        label.setAttribute('text-anchor', 'middle');
        label.setAttribute('font-size', '11');
        label.setAttribute('font-weight', 'bold');
        label.setAttribute('fill', 'white');
        label.setAttribute('font-family', 'monospace');
        label.textContent = cable.name.length > 20 ? cable.name.substring(0, 20) + '…' : cable.name;
        svg.appendChild(label);

        // Cable type sub-label
        const subLabel = document.createElementNS(ns, 'text');
        subLabel.setAttribute('x', xCenter);
        subLabel.setAttribute('y', yTop + 28);
        subLabel.setAttribute('text-anchor', 'middle');
        subLabel.setAttribute('font-size', '9');
        subLabel.setAttribute('fill', '#9ca3af');
        subLabel.setAttribute('font-family', 'monospace');
        subLabel.textContent = (cable.cable_type || 'Óptico').toUpperCase();
        svg.appendChild(subLabel);

        // Fiber squares row
        if (fiberCount > 0) {
            const rowW = fiberCount * (FIBER_SQ + FIBER_GAP) - FIBER_GAP;
            const rowX = xCenter - rowW / 2;
            const rowY = yTop + 36;

            for (let i = 0; i < fibers.length; i++) {
                const fiber = fibers[i];
                const colorKey = fiber.color || 'azul';
                const color = FIBER_COLORS[colorKey] || '#3b82f6';
                const sx = rowX + i * (FIBER_SQ + FIBER_GAP);

                // Colored fiber square
                const sq = document.createElementNS(ns, 'rect');
                sq.setAttribute('x', sx);
                sq.setAttribute('y', rowY);
                sq.setAttribute('width', FIBER_SQ);
                sq.setAttribute('height', FIBER_SQ);
                sq.setAttribute('fill', color);
                sq.setAttribute('stroke', '#000');
                sq.setAttribute('stroke-width', '0.5');
                sq.setAttribute('rx', '1');
                svg.appendChild(sq);

                // Fiber number below square
                const num = document.createElementNS(ns, 'text');
                num.setAttribute('x', sx + FIBER_SQ / 2);
                num.setAttribute('y', rowY + FIBER_SQ + 10);
                num.setAttribute('text-anchor', 'middle');
                num.setAttribute('font-size', '8');
                num.setAttribute('fill', '#475569');
                num.setAttribute('font-family', 'monospace');
                num.textContent = fiber.position || (i + 1);
                svg.appendChild(num);

                // Record fiber position for connection lines
                // Top of square for connections going up, bottom for going down
                fiberCoords[fiber.id] = {
                    top: { x: sx + FIBER_SQ / 2, y: rowY },
                    bottom: { x: sx + FIBER_SQ / 2, y: rowY + FIBER_SQ },
                    center: { x: sx + FIBER_SQ / 2, y: rowY + FIBER_SQ / 2 }
                };
            }
        }

        return yTop + BLOCK_H + (fiberCount > 0 ? 18 : 0) + CABLE_SPACING;
    }

    // --- Helper: draw splitter (blue triangle like Geosite) ---
    function drawSplitter(splitter, xCenter, yTop) {
        const ratio = splitter.ratio || '1:8';
        const parts = ratio.split(':');
        const outputCount = parseInt(parts[1]) || 8;

        const triW = SPLITTER_W;
        const triH = SPLITTER_H;
        const leftX = xCenter - triW / 2;
        const tipX = xCenter + triW / 2;
        const topY = yTop;
        const midY = yTop + triH / 2;
        const botY = yTop + triH;

        // Shadow
        const shadowPoly = document.createElementNS(ns, 'polygon');
        shadowPoly.setAttribute('points',
            `${leftX + 2},${topY + 2} ${tipX + 2},${midY + 2} ${leftX + 2},${botY + 2}`);
        shadowPoly.setAttribute('fill', 'rgba(0,0,0,0.15)');
        svg.appendChild(shadowPoly);

        // Blue triangle
        const tri = document.createElementNS(ns, 'polygon');
        tri.setAttribute('points',
            `${leftX},${topY} ${tipX},${midY} ${leftX},${botY}`);
        tri.setAttribute('fill', '#2563eb');
        tri.setAttribute('stroke', '#1d4ed8');
        tri.setAttribute('stroke-width', '2');
        tri.setAttribute('stroke-linejoin', 'round');
        svg.appendChild(tri);

        // Ratio text
        const txt = document.createElementNS(ns, 'text');
        txt.setAttribute('x', leftX + triW * 0.35);
        txt.setAttribute('y', midY + 5);
        txt.setAttribute('text-anchor', 'middle');
        txt.setAttribute('font-size', '14');
        txt.setAttribute('font-weight', 'bold');
        txt.setAttribute('fill', 'white');
        txt.setAttribute('font-family', 'monospace');
        txt.textContent = ratio;
        svg.appendChild(txt);

        // Input point (left vertex center)
        fiberCoords[`splitter-in-${splitter.id}`] = {
            top: { x: leftX, y: midY },
            bottom: { x: leftX, y: midY },
            center: { x: leftX, y: midY }
        };

        // Draw output port lines (fan out from right tip)
        const ports = boxEditorState.ports[splitter.id] || [];
        const portSpacing = triH / (outputCount + 1);
        const lineLen = 40;

        for (let i = 0; i < outputCount; i++) {
            const portY = topY + portSpacing * (i + 1);
            const endX = tipX + lineLen;

            // Line from tip to port
            const line = document.createElementNS(ns, 'line');
            line.setAttribute('x1', tipX);
            line.setAttribute('y1', midY);
            line.setAttribute('x2', endX);
            line.setAttribute('y2', portY);
            line.setAttribute('stroke', '#1d4ed8');
            line.setAttribute('stroke-width', '1.5');
            svg.appendChild(line);

            // Port dot
            const dot = document.createElementNS(ns, 'circle');
            dot.setAttribute('cx', endX);
            dot.setAttribute('cy', portY);
            dot.setAttribute('r', '3');
            dot.setAttribute('fill', ports[i]?.status === 'used' ? '#ef4444' : '#22c55e');
            dot.setAttribute('stroke', '#1d4ed8');
            dot.setAttribute('stroke-width', '1');
            svg.appendChild(dot);

            // Port number
            const pNum = document.createElementNS(ns, 'text');
            pNum.setAttribute('x', endX + 10);
            pNum.setAttribute('y', portY + 4);
            pNum.setAttribute('font-size', '8');
            pNum.setAttribute('fill', '#475569');
            pNum.setAttribute('font-family', 'monospace');
            pNum.textContent = (i + 1).toString();
            svg.appendChild(pNum);

            // Record port position for connections
            if (ports[i]) {
                fiberCoords[`splitter-port-${ports[i].id}`] = {
                    top: { x: endX, y: portY },
                    bottom: { x: endX, y: portY },
                    center: { x: endX, y: portY }
                };
            }
        }

        // Draw input line (from left of triangle back)
        if (splitter.input_fiber_id && fiberCoords[splitter.input_fiber_id]) {
            const fromCoord = fiberCoords[splitter.input_fiber_id].center;
            const toX = leftX;
            const toY = midY;
            const cpX = (fromCoord.x + toX) / 2;

            const connPath = document.createElementNS(ns, 'path');
            connPath.setAttribute('d',
                `M ${fromCoord.x} ${fromCoord.y} C ${cpX} ${fromCoord.y}, ${cpX} ${toY}, ${toX} ${toY}`);
            connPath.setAttribute('stroke', '#374151');
            connPath.setAttribute('stroke-width', '2');
            connPath.setAttribute('fill', 'none');
            svg.appendChild(connPath);
        }

        return yTop + triH + 40;
    }

    // --- Layout positions ---
    const leftColX = COL_LEFT + BLOCK_W / 2;
    const rightColX = W - COL_RIGHT_OFFSET - BLOCK_W / 2;
    const midColX = (leftColX + rightColX) / 2;

    // Draw input cables (left side)
    let yPos = MARGIN;
    for (const cable of boxEditorState.cables.input) {
        yPos = drawCableBlock(cable, leftColX, yPos);
    }

    // Draw output cables (right side)
    yPos = MARGIN;
    for (const cable of boxEditorState.cables.output) {
        yPos = drawCableBlock(cable, rightColX, yPos);
    }

    // Draw splitters (center)
    yPos = MARGIN + 20;
    for (const splitter of boxEditorState.splitters) {
        yPos = drawSplitter(splitter, midColX, yPos);
    }

    // --- Draw fusion/connection lines ---
    for (const fusion of boxEditorState.fusions) {
        const fromCoords = fiberCoords[fusion.fiber_in_id];
        const toCoords = fiberCoords[fusion.fiber_out_id];

        if (fromCoords && toCoords) {
            const from = fromCoords.bottom;
            const to = toCoords.bottom;

            // Determine control points for a smooth curve
            const dx = Math.abs(to.x - from.x);
            const dy = to.y - from.y;
            const dropY = Math.max(from.y, to.y) + 30 + Math.random() * 20;

            const path = document.createElementNS(ns, 'path');
            path.setAttribute('d',
                `M ${from.x} ${from.y} L ${from.x} ${dropY} L ${to.x} ${dropY} L ${to.x} ${to.y}`);
            path.setAttribute('stroke', '#374151');
            path.setAttribute('stroke-width', '1.5');
            path.setAttribute('fill', 'none');
            path.setAttribute('opacity', '0.7');
            svg.appendChild(path);

            // Small circles at connection points
            [from, to].forEach(pt => {
                const c = document.createElementNS(ns, 'circle');
                c.setAttribute('cx', pt.x);
                c.setAttribute('cy', pt.y);
                c.setAttribute('r', '3');
                c.setAttribute('fill', '#374151');
                svg.appendChild(c);
            });
        }
    }

    // --- "Nenhum" messages if empty ---
    if (boxEditorState.cables.input.length === 0) {
        const t = document.createElementNS(ns, 'text');
        t.setAttribute('x', leftColX);
        t.setAttribute('y', H / 2);
        t.setAttribute('text-anchor', 'middle');
        t.setAttribute('font-size', '12');
        t.setAttribute('fill', '#94a3b8');
        t.textContent = 'Sem cabos de entrada';
        svg.appendChild(t);
    }
    if (boxEditorState.cables.output.length === 0) {
        const t = document.createElementNS(ns, 'text');
        t.setAttribute('x', rightColX);
        t.setAttribute('y', H / 2);
        t.setAttribute('text-anchor', 'middle');
        t.setAttribute('font-size', '12');
        t.setAttribute('fill', '#94a3b8');
        t.textContent = 'Sem cabos de saída';
        svg.appendChild(t);
    }
}

function findFiberById(fiberId) {
    const allCables = [...boxEditorState.cables.input, ...boxEditorState.cables.output];
    for (const cable of allCables) {
        const fibers = boxEditorState.fibers[cable.id] || [];
        const fiber = fibers.find(f => f.id === fiberId);
        if (fiber) return fiber;
    }
    return null;
}

function findCableByFiberId(fiberId) {
    const allCables = [...boxEditorState.cables.input, ...boxEditorState.cables.output];
    for (const cable of allCables) {
        const fibers = boxEditorState.fibers[cable.id] || [];
        if (fibers.some(f => f.id === fiberId)) return cable;
    }
    return null;
}

async function deleteFusion(fusionId) {
    if (!confirm('Tem certeza que deseja remover esta fusão?')) return;

    try {
        await supabase.request('DELETE', 'fusions', {
            filters: { id: `eq.${fusionId}` }
        });

        boxEditorState.fusions = boxEditorState.fusions.filter(f => f.id !== fusionId);
        renderBoxFusions();
        drawBoxDiagram();
        showToast('Fusão removida', 'success');
    } catch (err) {
        showToast('Erro ao remover fusão: ' + err.message, 'error');
    }
}

// Box Editor Modal Event Handlers
document.getElementById('btn-close-box-editor')?.addEventListener('click', () => {
    document.getElementById('modal-box-editor').close();
});

document.getElementById('btn-box-cancel')?.addEventListener('click', () => {
    document.getElementById('modal-box-editor').close();
});

document.getElementById('btn-box-add-splitter')?.addEventListener('click', () => {
    const select = document.getElementById('splitter-input-fiber');
    const allCables = [...boxEditorState.cables.input, ...boxEditorState.cables.output];
    let options = '<option value="">— Selecionar fibra —</option>';

    for (const cable of allCables) {
        const fibers = boxEditorState.fibers[cable.id] || [];
        for (const fiber of fibers) {
            options += `<option value="${fiber.id}" data-cable="${cable.name}" data-fiber="${fiber.position}">${cable.name} - Fibra ${fiber.position}</option>`;
        }
    }

    select.innerHTML = options;
    document.getElementById('modal-box-add-splitter').showModal();
    reinitIcons();
});

document.getElementById('btn-splitter-confirm')?.addEventListener('click', async () => {
    const ratio = document.getElementById('splitter-ratio').value;
    const fiberId = document.getElementById('splitter-input-fiber').value;

    if (!ratio || !fiberId) {
        showToast('Preencha todos os campos', 'warning');
        return;
    }

    try {
        await supabase.request('POST', 'splitters', {
            body: {
                element_id: boxEditorState.elementId,
                ratio: ratio,
                input_fiber_id: fiberId
            }
        });

        document.getElementById('modal-box-add-splitter').close();
        await loadBoxEditorData(boxEditorState.elementId);
        renderBoxSplitters();
        drawBoxDiagram();
        showToast(`Splitter ${ratio} adicionado`, 'success');
    } catch (err) {
        showToast('Erro ao adicionar splitter: ' + err.message, 'error');
    }
});

document.getElementById('btn-box-add-fusion')?.addEventListener('click', () => {
    const originDiv = document.getElementById('fusion-origin-selector');
    const destDiv = document.getElementById('fusion-dest-selector');

    originDiv.innerHTML = '';
    destDiv.innerHTML = '';

    const allCables = [...boxEditorState.cables.input, ...boxEditorState.cables.output];

    for (const cable of allCables) {
        const fibers = boxEditorState.fibers[cable.id] || [];
        for (const fiber of fibers) {
            const itemOrig = document.createElement('div');
            itemOrig.className = 'fiber-selector-item';
            itemOrig.innerHTML = `
                <div class="fiber-dot" style="background:${FIBER_COLORS[fiber.color] || '#3b82f6'}"></div>
                <span>${cable.name} - Fibra ${fiber.position}</span>
            `;
            itemOrig.addEventListener('click', () => {
                document.querySelectorAll('#fusion-origin-selector .fiber-selector-item').forEach(el =>
                    el.classList.remove('selected')
                );
                itemOrig.classList.add('selected');
                boxEditorState.selectedFiberOrigin = {
                    fiberId: fiber.id,
                    cableId: cable.id,
                    cableName: cable.name,
                    position: fiber.position
                };
            });
            originDiv.appendChild(itemOrig);

            const itemDest = document.createElement('div');
            itemDest.className = 'fiber-selector-item';
            itemDest.innerHTML = `
                <div class="fiber-dot" style="background:${FIBER_COLORS[fiber.color] || '#3b82f6'}"></div>
                <span>${cable.name} - Fibra ${fiber.position}</span>
            `;
            itemDest.addEventListener('click', () => {
                document.querySelectorAll('#fusion-dest-selector .fiber-selector-item').forEach(el =>
                    el.classList.remove('selected')
                );
                itemDest.classList.add('selected');
                boxEditorState.selectedFiberDest = {
                    fiberId: fiber.id,
                    cableId: cable.id,
                    cableName: cable.name,
                    position: fiber.position
                };
            });
            destDiv.appendChild(itemDest);
        }
    }

    document.getElementById('modal-box-add-fusion').showModal();
});

document.getElementById('btn-fusion-confirm')?.addEventListener('click', async () => {
    if (!boxEditorState.selectedFiberOrigin || !boxEditorState.selectedFiberDest) {
        showToast('Selecione as fibras de origem e destino', 'warning');
        return;
    }

    const lossDb = parseFloat(document.getElementById('fusion-loss-db').value) || 0;
    const notes = document.getElementById('fusion-notes').value || '';

    try {
        await supabase.request('POST', 'fusions', {
            body: {
                element_id: boxEditorState.elementId,
                fiber_in_id: boxEditorState.selectedFiberOrigin.fiberId,
                fiber_out_id: boxEditorState.selectedFiberDest.fiberId,
                loss_db: lossDb > 0 ? lossDb : null,
                notes: notes || null,
                technician: 'system'
            }
        });

        document.getElementById('modal-box-add-fusion').close();
        document.getElementById('fusion-loss-db').value = '';
        document.getElementById('fusion-notes').value = '';
        boxEditorState.selectedFiberOrigin = null;
        boxEditorState.selectedFiberDest = null;

        await loadBoxEditorData(boxEditorState.elementId);
        renderBoxFusions();
        drawBoxDiagram();
        showToast('Fusão adicionada', 'success');
    } catch (err) {
        showToast('Erro ao adicionar fusão: ' + err.message, 'error');
    }
});

document.getElementById('btn-box-save')?.addEventListener('click', async () => {
    showToast('Alterações salvas no Box Editor.', 'success');
    document.getElementById('modal-box-editor').close();
});

document.getElementById('btn-box-print')?.addEventListener('click', () => {
    const svg = document.getElementById('box-diagram-svg');
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = `box-editor-${boxEditorState.elementId}.png`;
        link.click();
        showToast('Diagrama exportado', 'success');
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
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

    // Save element (create or update)
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
            if (AppState.editingElementId) {
                // UPDATE mode
                const id = AppState.editingElementId;
                await api.elements.update(id, data);

                // Update marker on map
                const marker = LiberMap.markers[id];
                if (marker) {
                    marker.setLatLng([data.location.lat, data.location.lng]);
                    marker.setIcon(LiberMap.createIcon(data.type));
                    marker.setPopupContent(`<b>${data.name}</b><br>${data.type.toUpperCase()}`);
                }

                // Update sidebar if still selected
                if (AppState.selectedElement && AppState.selectedElement.id === id) {
                    const updated = { ...AppState.selectedElement, ...data };
                    AppState.selectedElement = updated;
                    window.onElementClick(updated);
                }

                modalElement.close();
                formElement.reset();
                AppState.editingElementId = null;
                showToast(`${data.name} atualizado com sucesso!`, 'success');

                // Reset modal title
                document.querySelector('#modal-element .modal-header h2').textContent = 'Novo Elemento';
                document.querySelector('#modal-element button[type="submit"]').textContent = 'Salvar Elemento';
            } else {
                // CREATE mode
                const element = await api.elements.create(data);
                LiberMap.addElement(element);
                modalElement.close();
                formElement.reset();
                showToast(`${data.name} criado com sucesso!`, 'success');

                // Update stats
                if (AppState.stats[data.type] !== undefined) {
                    AppState.stats[data.type]++;
                }
            }
        } catch (err) {
            showToast(`Erro ao ${AppState.editingElementId ? 'atualizar' : 'criar'} elemento: ` + err.message, 'error');
        }
    });

    // Reset modal when closed
    modalElement.addEventListener('close', () => {
        AppState.editingElementId = null;
        document.querySelector('#modal-element .modal-header h2').textContent = 'Novo Elemento';
        document.querySelector('#modal-element button[type="submit"]').textContent = 'Salvar Elemento';
    });

    // Save cable
    formCable.addEventListener('submit', async (e) => {
        e.preventDefault();
        const pathData = JSON.parse(document.getElementById('cable-path-data').value || '[]');
        // Convert [lat, lng] array to PostGIS EWKT format: SRID=4326;LINESTRING(lng lat, lng lat, ...)
        const wktCoords = pathData.map(p => `${p[1]} ${p[0]}`).join(', ');
        const pathWKT = `SRID=4326;LINESTRING(${wktCoords})`;

        const elementFromId = document.getElementById('cable-element-from').value;
        const elementToId = document.getElementById('cable-element-to').value;
        const fiberCount = parseInt(document.getElementById('cable-fibers').value);

        const data = {
            name: document.getElementById('cable-name').value,
            cable_type: document.getElementById('cable-type').value,
            fiber_count: fiberCount,
            length_meters: parseFloat(document.getElementById('cable-length').value) || 0,
            path: pathWKT,
            element_from_id: elementFromId ? parseInt(elementFromId) : null,
            element_to_id: elementToId ? parseInt(elementToId) : null,
        };

        try {
            const result = await api.cables.create(data);
            const cableId = Array.isArray(result) ? result[0]?.id : result?.id;

            // Create individual fiber records
            if (cableId && fiberCount > 0) {
                const fiberColors = [
                    'verde', 'amarelo', 'branco', 'azul', 'vermelho', 'violeta',
                    'marrom', 'rosa', 'preto', 'cinza', 'laranja', 'aqua'
                ];
                const fibers = [];
                for (let i = 0; i < fiberCount; i++) {
                    fibers.push({
                        cable_id: cableId,
                        position: i + 1,
                        color: fiberColors[i % fiberColors.length],
                        status: 'available',
                    });
                }
                try {
                    await supabase.request('POST', 'fibers', { body: fibers });
                } catch (fiberErr) {
                    console.warn('Aviso: fibras não criadas:', fiberErr.message);
                }
            }

            LiberMap.addCable({ ...data, id: cableId || Date.now(), path: pathData });
            LiberMap._clearDrawing();
            modalCable.close();
            formCable.reset();
            const fromName = elementFromId ? document.getElementById('cable-element-from').selectedOptions[0]?.text : '';
            const toName = elementToId ? document.getElementById('cable-element-to').selectedOptions[0]?.text : '';
            const connMsg = fromName && toName ? ` (${fromName} → ${toName})` : '';
            showToast(`Cabo ${data.name} criado${connMsg} com ${fiberCount} fibras!`, 'success');
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
