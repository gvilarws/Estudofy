const API_URL = 'http://localhost:3000';

function getToken() {
    return localStorage.getItem('omni_token');
}

async function request(endpoint, options = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...options.headers
    };

    const res = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(data.error || 'Erro na requisição');
    }
    return data;
}

// Auth
function apiLogin(email, password) {
    return request('/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
    });
}

function apiRegister(name, email, password) {
    return request('/users', {
        method: 'POST',
        body: JSON.stringify({ name, email, password })
    });
}

// Sessions
function apiGetSessions() {
    return request('/sessions');
}

function apiCreateSession(session) {
    return request('/sessions', {
        method: 'POST',
        body: JSON.stringify(session)
    });
}

function apiUpdateSession(id, update) {
    return request(`/sessions/${id}`, {
        method: 'PUT',
        body: JSON.stringify(update)
    });
}

function apiDeleteSession(id) {
    return request(`/sessions/${id}`, {
        method: 'DELETE'
    });
}