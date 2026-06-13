import api from './axios.config';

export const getSubscriptions = async (status) => {
  const res = await api.get('/recurring', { params: { status } });
  return res.data.data;
};

export const createSubscription = async (data) => {
  const res = await api.post('/recurring', data);
  return res.data.data;
};

export const updateSubscription = async (id, data) => {
  const res = await api.put(`/recurring/${id}`, data);
  return res.data.data;
};

export const deleteSubscription = async (id) => {
  const res = await api.delete(`/recurring/${id}`);
  return res.data;
};

export const markBillingPaid = async (id, transactionId) => {
  const res = await api.post(`/recurring/${id}/mark-paid`, { transactionId });
  return res.data.data;
};

export const detectRecurring = async () => {
  const res = await api.get('/recurring/detect');
  return res.data.data;
};

export const getUpcomingPayments = async () => {
  const res = await api.get('/recurring/upcoming');
  return res.data.data;
};

export const getRecurringStats = async () => {
  const res = await api.get('/recurring/stats');
  return res.data.data;
};
