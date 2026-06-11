import api from './axios.config';

export const getLoans = async (status) => {
  const res = await api.get('/loans', { params: { status } });
  return res.data.data;
};

export const getLoanSummary = async () => {
  const res = await api.get('/loans/summary');
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

export const getAmortization = async (id) => {
  const res = await api.get(`/loans/${id}/amortization`);
  return res.data.data;
};

export const payEmi = async (id, amount) => {
  const res = await api.post(`/loans/${id}/pay-emi`, { amount });
  return res.data;
};

export const simulatePrepayment = async (id, prepayAmount) => {
  const res = await api.post(`/loans/${id}/simulate-prepayment`, { prepayAmount });
  return res.data.data;
};
