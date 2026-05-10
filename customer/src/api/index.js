const BASE = '/api';

function getTenantParam() {
  const params = new URLSearchParams(window.location.search);
  const tid = params.get('__tenant');
  return tid ? `__tenant=${tid}` : '';
}

async function request(path, options = {}) {
  // 自动追加租户参数
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

export const menuApi = {
  getCategories: () => request('/menu/categories'),
  getItems: (params) => request(`/menu/items?${new URLSearchParams(params)}`),
};

export const orderApi = {
  create: (data) => request('/orders', { method: 'POST', body: data }),
  get: (id) => request(`/orders/${id}`),
  getAll: (params) => request(`/orders?${new URLSearchParams(params)}`),
};

export const tableApi = {
  getAll: () => request('/tables'),
};

export const settingsApi = {
  getAll: () => request('/settings'),
};
