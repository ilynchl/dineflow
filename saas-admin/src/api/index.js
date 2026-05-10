const BASE = '/api';

function getToken() {
  return localStorage.getItem('saas_token');
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    headers,
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (res.status === 401 && token) {
    localStorage.removeItem('saas_token');
    localStorage.removeItem('saas_user');
    window.location.href = '/login';
    throw new Error('登录已过期');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '请求失败' }));
    throw new Error(err.error || '请求失败');
  }

  return res.json();
}

export const authApi = {
  login: (data) => request('/auth/login', { method: 'POST', body: data }),
  bootstrap: (data) => request('/auth/bootstrap', { method: 'POST', body: data }),
};

export const settingsApi = {
  get: () => request('/settings'),
  update: (data) => request('/settings', { method: 'PUT', body: data }),
};

export const systemParamApi = {
  getAll: () => request('/system-params'),
  create: (data) => request('/system-params', { method: 'POST', body: data }),
  update: (key, data) => request(`/system-params/${encodeURIComponent(key)}`, { method: 'PUT', body: data }),
  delete: (key) => request(`/system-params/${encodeURIComponent(key)}`, { method: 'DELETE' }),
};

export const saasApi = {
  getTenants: (params) => request(`/saas/tenants?${new URLSearchParams(params)}`),
  getTenant: (id) => request(`/saas/tenants/${id}`),
  createTenant: (data) => request('/saas/tenants', { method: 'POST', body: data }),
  updateTenant: (id, data) => request(`/saas/tenants/${id}`, { method: 'PUT', body: data }),
  changeStatus: (id, status) => request(`/saas/tenants/${id}/status`, { method: 'PATCH', body: { status } }),
  renewTenant: (id, expire_at) => request(`/saas/tenants/${id}/renew`, { method: 'PUT', body: { expire_at } }),
  deleteTenant: (id) => request(`/saas/tenants/${id}`, { method: 'DELETE' }),
  setTenantPassword: (id, password) => request(`/saas/tenants/${id}/set-password`, { method: 'POST', body: { password } }),
  getUsers: () => request('/saas/users'),
  createUser: (data) => request('/saas/users', { method: 'POST', body: data }),
  updateUser: (id, data) => request(`/saas/users/${id}`, { method: 'PUT', body: data }),
  deleteUser: (id) => request(`/saas/users/${id}`, { method: 'DELETE' }),
};
