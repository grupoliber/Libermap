/**
 * Libermap - Lógica principal da aplicação
 */

document.addEventListener('DOMContentLoaded', () => {
    // Inicializa mapa
    LiberMap.init('map');

    // Carrega dados iniciais
    LiberMap.loadElements();
    LiberMap.loadCables();

    // Inicializa ícones Lucide
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    // --- Elementos ---
    const modal = document.getElementById('modal-element');
    const form = document.getElementById('form-element');
    const btnAdd = document.getElementById('btn-add-element');
    const btnCancel = document.getElementById('btn-cancel-element');

    let addMode = false;

    // Botão adicionar: ativa modo de clique no mapa
    btnAdd.addEventListener('click', () => {
        addMode = !addMode;
        btnAdd.style.color = addMode ? 'var(--color-primary)' : '';
        LiberMap.map.getContainer().style.cursor = addMode ? 'crosshair' : '';
    });

    // Clique no mapa para posicionar novo elemento
    LiberMap.map.on('click', (e) => {
        if (!addMode) return;

        document.getElementById('elem-lat').value = e.latlng.lat;
        document.getElementById('elem-lng').value = e.latlng.lng;
        modal.showModal();

        addMode = false;
        btnAdd.style.color = '';
        LiberMap.map.getContainer().style.cursor = '';
    });

    // Cancelar modal
    btnCancel.addEventListener('click', () => modal.close());

    // Salvar elemento
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const data = {
            type: document.getElementById('elem-type').value,
            name: document.getElementById('elem-name').value,
            address: document.getElementById('elem-address').value || null,
            area: document.getElementById('elem-area').value || null,
            capacity: parseInt(document.getElementById('elem-capacity').value) || null,
            location: {
                lat: parseFloat(document.getElementById('elem-lat').value),
                lng: parseFloat(document.getElementById('elem-lng').value),
            },
        };

        try {
            const element = await api.elements.create(data);
            LiberMap.addElement(element);
            modal.close();
            form.reset();
        } catch (err) {
            alert('Erro ao criar elemento: ' + err.message);
        }
    });

    // --- Sidebar ---
    const sidebar = document.getElementById('sidebar');
    const sidebarTitle = document.getElementById('sidebar-title');
    const sidebarContent = document.getElementById('sidebar-content');
    const btnCloseSidebar = document.getElementById('btn-close-sidebar');

    btnCloseSidebar.addEventListener('click', () => {
        sidebar.classList.add('hidden');
    });

    // Callback global de clique em elemento
    window.onElementClick = async (element) => {
        sidebarTitle.textContent = element.name;
        sidebarContent.innerHTML = `
            <p><strong>Tipo:</strong> ${element.type.toUpperCase()}</p>
            <p><strong>Status:</strong> ${element.status}</p>
            <p><strong>Endereço:</strong> ${element.address || 'N/A'}</p>
            <p><strong>Área:</strong> ${element.area || 'N/A'}</p>
            <p><strong>Capacidade:</strong> ${element.capacity || 'N/A'}</p>
            <hr style="margin: 12px 0; border-color: #e2e8f0;">
            <button onclick="traceElement(${element.id})" style="
                padding: 8px 16px; background: var(--color-primary);
                color: white; border: none; border-radius: 6px; cursor: pointer;
            ">Rastrear Fibra</button>
        `;
        sidebar.classList.remove('hidden');
    };

    // Rastreamento
    window.traceElement = async (elementId) => {
        try {
            const trace = await api.trace.fromElement(elementId);
            sidebarContent.innerHTML += `
                <div style="margin-top: 16px;">
                    <h3 style="font-size: 14px; margin-bottom: 8px;">Caminho da Fibra</h3>
                    <p>Distância: ${trace.total_distance_m?.toFixed(0) || '?'}m</p>
                    <p>Splitters: ${trace.total_splitters}</p>
                    <p>Fusões: ${trace.total_fusions}</p>
                </div>
            `;
        } catch (err) {
            alert('Erro no rastreamento: ' + err.message);
        }
    };

    // --- Filtros ---
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        Object.values(LiberMap.markers).forEach((marker) => {
            const popup = marker.getPopup().getContent().toLowerCase();
            if (popup.includes(term)) {
                marker.setOpacity(1);
            } else {
                marker.setOpacity(0.2);
            }
        });
    });

    // --- Exportação ---
    const btnExport = document.getElementById('btn-export');
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
        } catch (err) {
            alert('Erro na exportação: ' + err.message);
        }
    });
});
