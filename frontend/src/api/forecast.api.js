import api from './axios.config';

export const getForecast = async (months) => {
  const res = await api.get('/forecast', { params: { months } });
  return res.data.data;
};

export const runWhatIf = async (data) => {
  const res = await api.post('/forecast/what-if', data);
  return res.data.data;
};

export const runMonteCarlo = async (data) => {
  const res = await api.post('/forecast/monte-carlo', data);
  return res.data.data;
};

export const getScenarios = async () => {
  const res = await api.get('/forecast/scenarios');
  return res.data.data;
};

export const saveScenario = async (data) => {
  const res = await api.post('/forecast/scenarios', data);
  return res.data.data;
};

export const deleteScenario = async (id) => {
  const res = await api.delete(`/forecast/scenarios/${id}`);
  return res.data;
};

export const getFire = async () => {
  const res = await api.get('/forecast/fire');
  return res.data.data;
};
