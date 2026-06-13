import api from './axios.config';

export const getTaxProfile = async (year) => {
  const res = await api.get('/tax/profile', { params: { year } });
  return res.data.data;
};

export const saveTaxProfile = async (data) => {
  const res = await api.post('/tax/profile', data);
  return res.data.data;
};

export const calculateTax = async (data) => {
  const res = await api.post('/tax/calculate', data);
  return res.data.data;
};

export const getTaxSuggestions = async (data) => {
  const res = await api.post('/tax/suggestions', data);
  return res.data.data;
};
