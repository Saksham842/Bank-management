import api from './axios.config';

export const getTransactions = async (filters) => {
  const res = await api.get('/transactions', { params: filters });
  return res.data.data;
};

export const createTransaction = async (data) => {
  const res = await api.post('/transactions', data);
  return res.data.data;
};

export const updateTransaction = async (id, data) => {
  const res = await api.put(`/transactions/${id}`, data);
  return res.data.data;
};

export const deleteTransaction = async (id) => {
  const res = await api.delete(`/transactions/${id}`);
  return res.data;
};
