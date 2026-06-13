import api from './axios.config';

export const getAssets = async (type) => {
  const res = await api.get('/networth/assets', { params: { type } });
  return res.data.data;
};

export const createAsset = async (data) => {
  const res = await api.post('/networth/assets', data);
  return res.data.data;
};

export const updateAsset = async (id, data) => {
  const res = await api.put(`/networth/assets/${id}`, data);
  return res.data.data;
};

export const deleteAsset = async (id) => {
  const res = await api.delete(`/networth/assets/${id}`);
  return res.data;
};

export const getNetWorth = async () => {
  const res = await api.get('/networth');
  return res.data.data;
};

export const updateLiabilities = async (totalLiabilities) => {
  const res = await api.post('/networth/liabilities', { totalLiabilities });
  return res.data;
};

export const getNetWorthHistory = async (months) => {
  const res = await api.get('/networth/history', { params: { months } });
  return res.data.data;
};

export const getNetWorthGoal = async () => {
  const res = await api.get('/networth/goal');
  return res.data.data;
};
