const BASE = '/api';

function getToken() {
  return localStorage.getItem('merchant_token');
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    headers: { ...headers, ...options.headers },
    ...options,
  });
  if (!res.ok) {
    // Only redirect to login when token was sent (session expired), not for login failures
    if (res.status === 401 && token) {
      localStorage.removeItem('merchant_token');
      localStorage.removeItem('merchant_user');
      window.location.href = '/login';
      throw new Error('登录已过期');
    }
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.error || `请求失败 (${res.status})`);
  }
  return res.json();
}

export const merchantAuthApi = {
  login: (data) => request('/auth/merchant-login', { method: 'POST', body: JSON.stringify(data) }),
};

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
  serveItem: (itemId, quantity) => request(`/orders/items/${itemId}/serve`, { method: 'PATCH', body: JSON.stringify({ quantity }) }),
  kitchenPending: () => request('/orders/kitchen/pending'),
  kitchenGrouped: (groupBy) => request(`/orders/kitchen/grouped?group_by=${groupBy}`),
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

// Merchant profile
export const merchantApi = {
  getProfile: () => request('/merchant/profile'),
  updateProfile: (data) => request('/merchant/profile', { method: 'PUT', body: JSON.stringify(data) }),
  updateAvatar: (url, hash) => request('/merchant/avatar', { method: 'PUT', body: JSON.stringify({ url, hash }) }),
  checkHash: (hash) => request('/merchant/check-hash', { method: 'POST', body: JSON.stringify({ hash }) }),
  getOssConfig: () => request('/merchant/oss-config'),
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

// Preferences
export const preferenceApi = {
  getAll: () => request('/preferences'),
  create: (data) => request('/preferences', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/preferences/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/preferences/${id}`, { method: 'DELETE' }),
};
