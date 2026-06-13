import api from './axios.config';

export const getPolicies = async () => {
  const res = await api.get('/insurance');
  return res.data.data;
};

export const getPolicy = async (id) => {
  const res = await api.get(`/insurance/${id}`);
  return res.data.data;
};

export const createPolicy = async (data) => {
  const res = await api.post('/insurance', data);
  return res.data.data;
};

export const updatePolicy = async (id, data) => {
  const res = await api.put(`/insurance/${id}`, data);
  return res.data.data;
};

export const deletePolicy = async (id) => {
  const res = await api.delete(`/insurance/${id}`);
  return res.data;
};

export const getInsuranceSummary = async () => {
  const res = await api.get('/insurance/summary');
  return res.data.data;
};

export const getCoverageAnalysis = async () => {
  const res = await api.get('/insurance/coverage');
  return res.data.data;
};
