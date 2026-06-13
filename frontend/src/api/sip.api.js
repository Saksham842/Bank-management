import api from './axios.config';

export const getGoals = async () => {
  const res = await api.get('/sip/goals');
  return res.data.data;
};

export const createGoal = async (data) => {
  const res = await api.post('/sip/goals', data);
  return res.data.data;
};

export const updateGoal = async (id, data) => {
  const res = await api.put(`/sip/goals/${id}`, data);
  return res.data.data;
};

export const deleteGoal = async (id) => {
  const res = await api.delete(`/sip/goals/${id}`);
  return res.data;
};

export const calculateSIP = async (data) => {
  const res = await api.post('/sip/calculate/sip', data);
  return res.data.data;
};

export const calculateLumpsum = async (data) => {
  const res = await api.post('/sip/calculate/lumpsum', data);
  return res.data.data;
};

export const calculateGoal = async (data) => {
  const res = await api.post('/sip/calculate/goal', data);
  return res.data.data;
};

export const projectGoal = async (id) => {
  const res = await api.get(`/sip/goals/${id}/project`);
  return res.data.data;
};
