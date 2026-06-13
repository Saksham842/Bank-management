import api from './axios.config';

export const getDebts = async () => {
  const res = await api.get('/debt');
  return res.data.data;
};

export const getDebt = async (id) => {
  const res = await api.get(`/debt/${id}`);
  return res.data.data;
};

export const createDebt = async (data) => {
  const res = await api.post('/debt', data);
  return res.data.data;
};

export const updateDebt = async (id, data) => {
  const res = await api.put(`/debt/${id}`, data);
  return res.data.data;
};

export const deleteDebt = async (id) => {
  const res = await api.delete(`/debt/${id}`);
  return res.data;
};

export const getDebtSummary = async () => {
  const res = await api.get('/debt/summary');
  return res.data.data;
};

export const getPayoffPlan = async (extraPayment = 0, strategy = 'avalanche') => {
  const res = await api.post('/debt/payoff-plan', { extraPayment, strategy });
  return res.data.data;
};
