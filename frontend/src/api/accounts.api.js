import api from './axios.config';

export const getAccounts = async () => {
  const res = await api.get('/accounts');
  return res.data.data;
};

export const createAccount = async (data) => {
  const res = await api.post('/accounts', data);
  return res.data.data;
};

export const getAccountById = async (id) => {
  const res = await api.get(`/accounts/${id}`);
  return res.data.data;
};

export const updateAccount = async (id, data) => {
  const res = await api.put(`/accounts/${id}`, data);
  return res.data.data;
};

export const deleteAccount = async (id) => {
  const res = await api.delete(`/accounts/${id}`);
  return res.data;
};
