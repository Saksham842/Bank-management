import api from './axios.config';

export const getHoldings = async () => {
  const res = await api.get('/portfolio');
  return res.data.data;
};

export const getPortfolioSummary = async () => {
  const res = await api.get('/portfolio/summary');
  return res.data.data;
};

export const buyStock = async (data) => {
  const res = await api.post('/portfolio/buy', data);
  return res.data;
};

export const sellStock = async (data) => {
  const res = await api.post('/portfolio/sell', data);
  return res.data;
};

export const getTransactions = async (symbol) => {
  const res = await api.get('/portfolio/transactions', { params: { symbol } });
  return res.data;
};

export const updatePrice = async (symbol, price) => {
  const res = await api.put('/portfolio/price', { symbol, price });
  return res.data;
};

export const getAllocation = async () => {
  const res = await api.get('/portfolio/allocation');
  return res.data.data;
};

export const getRebalanceSuggestions = async () => {
  const res = await api.get('/portfolio/rebalance');
  return res.data.data;
};

export const getPerformance = async () => {
  const res = await api.get('/portfolio/performance');
  return res.data.data;
};

export const getPortfolioAnalysis = async () => {
  const res = await api.get('/portfolio/analyze');
  return res.data.data;
};
