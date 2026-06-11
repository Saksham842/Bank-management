import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAccounts, createAccount, updateAccount, deleteAccount } from '../api/accounts.api';

export const useAccounts = () => {
  const queryClient = useQueryClient();

  const accountsQuery = useQuery({
    queryKey: ['accounts'],
    queryFn: getAccounts,
  });

  const createMutation = useMutation({
    mutationFn: createAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateAccount(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    }
  });

  return {
    accounts: accountsQuery.data || [],
    isLoading: accountsQuery.isLoading,
    isError: accountsQuery.isError,
    refetch: accountsQuery.refetch,
    createAccount: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateAccount: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteAccount: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending
  };
};
