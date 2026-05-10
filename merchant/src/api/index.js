const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

// Menu
export const menuApi = {
  getCategories: () => request('/menu/categories'),
  createCategory: (data) => request('/menu/categories', { method: 'POST', body: JSON.stringify(data) }),
  deleteCategory: (id) => request(`/menu/categories/${id}`, { method: 'DELETE' }),
  getItems: (params) => request(`/menu/items?${new URLSearchParams(params)}`),
  getItem: (id) => request(`/menu/items/${id}`),
  createItem: (data) => request('/menu/items', { method: 'POST', body: JSON.stringify(data) }),
  updateItem: (id, data) => request(`/menu/items/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteItem: (id) => request(`/menu/items/${id}`, { method: 'DELETE' }),
  updateStatus: (id, status) => request(`/menu/items/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
};

// Tables
export const tableApi = {
  getAll: () => request('/tables'),
  getZones: () => request('/tables/zones'),
  createZone: (name) => request('/tables/zones', { method: 'POST', body: JSON.stringify({ name }) }),
  deleteZone: (id) => request(`/tables/zones/${id}`, { method: 'DELETE' }),
  create: (data) => request('/tables', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/tables/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/tables/${id}`, { method: 'DELETE' }),
};

// Orders
export const orderApi = {
  getAll: (params) => request(`/orders?${new URLSearchParams(params)}`),
  get: (id) => request(`/orders/${id}`),
  create: (data) => request('/orders', { method: 'POST', body: JSON.stringify(data) }),
  addItems: (id, items) => request(`/orders/${id}/items`, { method: 'POST', body: JSON.stringify({ items }) }),
  updateStatus: (id, status) => request(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  updateItemStatus: (itemId, status) => request(`/orders/items/${itemId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  kitchenPending: () => request('/orders/kitchen/pending'),
};

// Payment
export const paymentApi = {
  pay: (data) => request('/payment/pay', { method: 'POST', body: JSON.stringify(data) }),
  records: (orderId) => request(`/payment/records?order_id=${orderId}`),
};

// QR Codes
export const qrApi = {
  getAll: () => request('/qrcodes'),
  update: (id, data) => request(`/qrcodes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  generate: (count) => request('/qrcodes/generate', { method: 'POST', body: JSON.stringify({ count }) }),
};

// Stats
export const statsApi = {
  summary: () => request('/stats/summary'),
  revenue: (params) => request(`/stats/revenue?${new URLSearchParams(params)}`),
};

// Settings
export const settingsApi = {
  get: () => request('/settings'),
  update: (data) => request('/settings', { method: 'PUT', body: JSON.stringify(data) }),
};

// Split (分串)
export const splitApi = {
  create: (data) => request('/orders/split', { method: 'POST', body: JSON.stringify(data) }),
  getAll: (status) => request(`/orders/splits${status ? `?status=${status}` : ''}`),
  updateStatus: (id, status) => request(`/orders/splits/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
};

// Words (词库/语音)
export const wordApi = {
  getAll: () => request('/words'),
  create: (data) => request('/words', { method: 'POST', body: JSON.stringify(data) }),
  delete: (id) => request(`/words/${id}`, { method: 'DELETE' }),
  resolve: (text) => request('/words/resolve', { method: 'POST', body: JSON.stringify({ text }) }),
};
