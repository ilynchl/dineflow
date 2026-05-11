const BASE = '/api';

let cachedTenant = '';

function getTenantParam() {
  if (cachedTenant) return cachedTenant;
  const params = new URLSearchParams(window.location.search);
  const tid = params.get('__tenant');
  if (tid) {
    cachedTenant = `__tenant=${tid}`;
    return cachedTenant;
  }
  const saved = localStorage.getItem('dev_tenant');
  if (saved) {
    cachedTenant = `__tenant=${saved}`;
    return cachedTenant;
  }
  return '';
}

export const menuApi = {
  getCategories: () => request('/menu/categories'),
  getItems: (params) => request(`/menu/items?${new URLSearchParams(params)}`),
};

export const orderApi = {
  create: (data) => request('/orders', { method: 'POST', body: data }),
  get: (id) => request(`/orders/${id}`),
  getAll: (params) => request(`/orders?${new URLSearchParams(params)}`),
  addItems: (id, data) => request(`/orders/${id}/items`, { method: 'POST', body: data }),
  pay: (id, data) => request(`/orders/${id}/pay`, { method: 'POST', body: data }),
};

export const tableApi = {
  getAll: () => request('/tables'),
};

export const settingsApi = {
  getAll: () => request('/settings'),
};

export const preferenceApi = {
  getAll: () => request('/preferences'),
};

async function request(path, options = {}) {
  const tenant = getTenantParam();
  if (tenant) {
    const sep = path.includes('?') ? '&' : '?';
    path = `${path}${sep}${tenant}`;
  }

  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!res.ok) throw new Error(`请求失败`);
  return res.json();
}
