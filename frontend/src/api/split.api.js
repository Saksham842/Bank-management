import api from './axios.config';

export const getGroups = async () => {
  const res = await api.get('/split/groups');
  return res.data.data;
};

export const createGroup = async (data) => {
  const res = await api.post('/split/groups', data);
  return res.data.data;
};

export const updateGroup = async (id, data) => {
  const res = await api.put(`/split/groups/${id}`, data);
  return res.data.data;
};

export const deleteGroup = async (id) => {
  const res = await api.delete(`/split/groups/${id}`);
  return res.data;
};

export const getExpenses = async (groupId) => {
  const res = await api.get(`/split/groups/${groupId}/expenses`);
  return res.data.data;
};

export const createExpense = async (groupId, data) => {
  const res = await api.post(`/split/groups/${groupId}/expenses`, data);
  return res.data.data;
};

export const deleteExpense = async (id) => {
  const res = await api.delete(`/split/expenses/${id}`);
  return res.data;
};

export const getBalances = async (groupId) => {
  const res = await api.get(`/split/groups/${groupId}/balances`);
  return res.data.data;
};

export const createSettlement = async (groupId, data) => {
  const res = await api.post(`/split/groups/${groupId}/settlements`, data);
  return res.data.data;
};

export const getSettlements = async (groupId) => {
  const res = await api.get(`/split/groups/${groupId}/settlements`);
  return res.data.data;
};
