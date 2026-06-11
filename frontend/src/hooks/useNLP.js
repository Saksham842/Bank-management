import { useMutation } from '@tanstack/react-query';
import { naturalSearch, extractFromText, categorizeLocal } from '../api/nlp.api';

export const useNLPSearch = () => {
  return useMutation({
    mutationFn: (query) => naturalSearch(query)
  });
};

export const useReceiptExtract = () => {
  return useMutation({
    mutationFn: (rawText) => extractFromText(rawText)
  });
};

export const useLocalCategorize = () => {
  return useMutation({
    mutationFn: (description) => categorizeLocal(description)
  });
};
