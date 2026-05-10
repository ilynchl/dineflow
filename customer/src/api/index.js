const BASE = '/api';

async function request(path, options = {}) {
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
