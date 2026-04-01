/**
 * Libermap API Client
 * Comunicação com Supabase (PostgREST)
 */

const SUPABASE_URL = 'https://ppkuqavzpfoeecrodino.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwa3VxYXZ6cGZvZWVjcm9kaW5vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5MTA4MzksImV4cCI6MjA5MDQ4NjgzOX0.WZUkKdBdkIXLxZCm7NSsE65_Ti-JL1boW9Wqqy1KoFM';

const supabase = {
    async request(method, table, options = {}) {
        const { filters, body, select, single } = options;
        let url = `${SUPABASE_URL}/rest/v1/${table}`;

        const params = new URLSearchParams();
        if (select) params.set('select', select);
        if (filters) {
            Object.entries(filters).forEach(([key, value]) => {
                params.set(key, value);
            });
        }
        const queryString = params.toString();
        if (queryString) url += `?${queryString}`;

        const headers = {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': (method === 'POST' || method === 'PATCH') ? 'return=representation' : '',
        };
        if (single) {
            headers['Accept'] = 'application/vnd.pgrst.object+json';
        }

        const fetchOptions = { method, headers };
        if (body) fetchOptions.body = JSON.stringify(body);

        const response = await fetch(url, fetchOptions);
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || `Erro ${response.status}`);
        }
        if (response.status === 204) return null;
        return response.json();
    },

    async rpc(fnName, params = {}) {
        const url = `${SUPABASE_URL}/rest/v1/rpc/${fnName}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(params),
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || `Erro ${response.status}`);
        }
        return response.json();
    },
};

// API compatível com o frontend existente
const api = {
    elements: {
        list: (params = {}) => {
            const filters = {};
            if (params.type) filters['type'] = `eq.${params.type}`;
            if (params.area) filters['area'] = `eq.${params.area}`;
            if (params.status) filters['status'] = `eq.${params.status}`;
            return supabase.request('GET', 'elements', { filters });
        },
        get: (id) => supabase.request('GET', 'elements', {
            filters: { id: `eq.${id}` },
            single: true,
        }),
        create: async (data) => {
            const body = {
                type: data.type,
                name: data.name,
                description: data.description || null,
                address: data.address || null,
                area: data.area || null,
                capacity: data.capacity || null,
                metadata: data.metadata || null,
            };
            // Usa RPC para criar com geometria PostGIS
            if (data.location) {
                return supabase.rpc('create_element', {
                    p_type: body.type,
                    p_name: body.name,
                    p_description: body.description,
                    p_address: body.address,
                    p_area: body.area,
                    p_capacity: body.capacity,
                    p_lat: data.location.lat,
                    p_lng: data.location.lng,
                });
            }
            const result = await supabase.request('POST', 'elements', { body });
            return Array.isArray(result) ? result[0] : result;
        },
        update: (id, data) => {
            // Convert location {lat, lng} to PostGIS EWKT if present
            const body = { ...data };
            if (body.location && body.location.lat && body.location.lng) {
                body.location = `SRID=4326;POINT(${body.location.lng} ${body.location.lat})`;
            }
            return supabase.request('PATCH', `elements?id=eq.${id}`, { body });
        },
        delete: (id) => supabase.request('DELETE', `elements?id=eq.${id}`, {}),
    },

    cables: {
        list: (params = {}) => {
            const filters = {};
            if (params.cable_type) filters['cable_type'] = `eq.${params.cable_type}`;
            return supabase.request('GET', 'cables', { filters });
        },
        get: (id) => supabase.request('GET', 'cables', {
            filters: { id: `eq.${id}` },
            single: true,
        }),
        create: (data) => supabase.request('POST', 'cables', { body: data }),
        update: (id, data) => supabase.request('PATCH', `cables?id=eq.${id}`, { body: data }),
        delete: (id) => supabase.request('DELETE', `cables?id=eq.${id}`, {}),
        fibers: (cableId) => supabase.request('GET', 'fibers', {
            filters: { cable_id: `eq.${cableId}` },
        }),
    },

    splitters: {
        list: () => supabase.request('GET', 'splitters', {}),
        ports: (splitterId) => supabase.request('GET', 'splitter_ports', {
            filters: { splitter_id: `eq.${splitterId}` },
        }),
    },

    export: {
        geojson: async (area) => {
            const elements = await api.elements.list(area ? { area } : {});
            return {
                type: 'FeatureCollection',
                features: (elements || []).map((el) => ({
                    type: 'Feature',
                    geometry: { type: 'Point', coordinates: [0, 0] },
                    properties: {
                        id: el.id,
                        type: el.type,
                        name: el.name,
                        area: el.area,
                        status: el.status,
                    },
                })),
            };
        },
    },
};
