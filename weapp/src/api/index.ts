import Taro from '@tarojs/taro';

const BASE = 'https://api.dineflow.tech';

async function request(path: string, options: any = {}) {
  try {
    const res = await Taro.request({
      url: `${BASE}${path}`,
      method: options.method || 'GET',
      data: options.body,
      header: { 'Content-Type': 'application/json' },
      timeout: 8000,
    });
    return res.data;
  } catch (e: any) {
    throw new Error(e.errMsg || '请求失败');
  }
}

export const menuApi = {
  getCategories: () => request('/api/menu/categories'),
  getItems: (params?: any) => request(`/api/menu/items?${new URLSearchParams(params || {})}`),
};

export const orderApi = {
  create: (data: any) => request('/api/orders', { method: 'POST', body: data }),
  get: (id: number) => request(`/api/orders/${id}`),
  getAll: (params?: any) => request(`/api/orders?${new URLSearchParams(params || {})}`),
};

export const tableApi = {
  getAll: () => request('/api/tables'),
};
