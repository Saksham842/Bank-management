import api from './axios.config';

export const getWallets = async () => {
  const res = await api.get('/currency/wallets');
  return res.data.data;
};

export const createWallet = async (data) => {
  const res = await api.post('/currency/wallets', data);
  return res.data.data;
};

export const updateWallet = async (id, data) => {
  const res = await api.put(`/currency/wallets/${id}`, data);
  return res.data.data;
};

export const deleteWallet = async (id) => {
  const res = await api.delete(`/currency/wallets/${id}`);
  return res.data;
};

export const getRates = async () => {
  const res = await api.get('/currency/rates');
  return res.data.data;
};

export const convertCurrency = async (from, to, amount) => {
  const res = await api.post('/currency/convert', { from, to, amount });
  return res.data.data;
};

export const executeConversion = async (fromCurrency, toCurrency, fromAmount) => {
  const res = await api.post('/currency/execute', { fromCurrency, toCurrency, fromAmount });
  return res.data.data;
};

export const getTransactions = async () => {
  const res = await api.get('/currency/transactions');
  return res.data.data;
};

export const getAnalytics = async () => {
  const res = await api.get('/currency/analytics');
  return res.data.data;
};
