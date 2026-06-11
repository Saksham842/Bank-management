import api from './axios.config';

export const getBudgets = async (month) => {
  const res = await api.get('/budgets', { params: { month } });
  return res.data.data;
};

export const setBudget = async (data) => {
  const res = await api.post('/budgets', data);
  return res.data.data;
};

export const getBudgetVsActual = async (month) => {
  const res = await api.get('/budgets/vs-actual', { params: { month } });
  return res.data.data;
};

export const getBudgetRecommendations = async () => {
  const res = await api.get('/budgets/recommendations');
  return res.data.data;
};

export const getBudgetHistory = async () => {
  const res = await api.get('/budgets/history');
  return res.data.data;
};

export const recalculateSpent = async (month) => {
  const res = await api.post('/budgets/recalculate', { month });
  return res.data.data;
};

export const saveMonthlySnapshot = async () => {
  const res = await api.post('/budgets/snapshot');
  return res.data;
};
