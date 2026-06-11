import api from './axios.config';

export const naturalSearch = async (query) => {
  const res = await api.post('/nlp/search', { query });
  return res.data;
};

export const extractFromText = async (rawText) => {
  const res = await api.post('/nlp/extract', { rawText });
  return res.data;
};

export const categorizeLocal = async (description) => {
  const res = await api.post('/nlp/categorize-local', { description });
  return res.data;
};
