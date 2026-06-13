import api from './axios.config';

export const getPlans = async () => {
  const res = await api.get('/retirement/plans');
  return res.data.data;
};

export const getPlan = async (id) => {
  const res = await api.get(`/retirement/plans/${id}`);
  return res.data.data;
};

export const createPlan = async (data) => {
  const res = await api.post('/retirement/plans', data);
  return res.data.data;
};

export const updatePlan = async (id, data) => {
  const res = await api.put(`/retirement/plans/${id}`, data);
  return res.data.data;
};

export const deletePlan = async (id) => {
  const res = await api.delete(`/retirement/plans/${id}`);
  return res.data;
};

export const getProjection = async (id) => {
  const res = await api.get(`/retirement/plans/${id}/projection`);
  return res.data.data;
};

export const getReadiness = async (id) => {
  const res = await api.get(`/retirement/plans/${id}/readiness`);
  return res.data.data;
};

export const getMonteCarlo = async (id) => {
  const res = await api.get(`/retirement/plans/${id}/monte-carlo`);
  return res.data.data;
};

export const getOptimize = async () => {
  const res = await api.get('/retirement/optimize');
  return res.data.data;
};

export const getPensionAccounts = async () => {
  const res = await api.get('/retirement/accounts');
  return res.data.data;
};

export const createPensionAccount = async (data) => {
  const res = await api.post('/retirement/accounts', data);
  return res.data.data;
};

export const updatePensionAccount = async (id, data) => {
  const res = await api.put(`/retirement/accounts/${id}`, data);
  return res.data.data;
};

export const deletePensionAccount = async (id) => {
  const res = await api.delete(`/retirement/accounts/${id}`);
  return res.data;
};
