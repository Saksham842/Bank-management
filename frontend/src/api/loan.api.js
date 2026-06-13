import api from './axios.config';

export const getLoans = async () => {
  const res = await api.get('/loans');
  return res.data.data;
};

export const createLoan = async (data) => {
  const res = await api.post('/loans', data);
  return res.data.data;
};

export const updateLoan = async (id, data) => {
  const res = await api.put(`/loans/${id}`, data);
  return res.data.data;
};

export const deleteLoan = async (id) => {
  const res = await api.delete(`/loans/${id}`);
  return res.data;
};

export const calculateEMI = async (data) => {
  const res = await api.post('/loans/calculate/emi', data);
  return res.data.data;
};

export const generateSchedule = async (data) => {
  const res = await api.post('/loans/calculate/schedule', data);
  return res.data.data;
};

export const getLoanSummary = async () => {
  const res = await api.get('/loans/summary');
  return res.data.data;
};

export const compareLoans = async (loans) => {
  const res = await api.post('/loans/compare', { loans });
  return res.data.data;
};
