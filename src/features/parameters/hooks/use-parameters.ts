'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth';
import { parametersApi } from '../api';
import { parameterKeys } from '../keys';
import type { Parameter } from '../schemas';

export function useParameters() {
  const { status } = useAuth();
  return useQuery({
    queryKey: parameterKeys.list(),
    queryFn: () => parametersApi.list(),
    enabled: status === 'authenticated',
  });
}

/** The server's returned row replaces the cached one; nothing is optimistic. */
export function useUpdateParameter(key: string, onSaved: (row: Parameter) => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (value: string) => parametersApi.update(key, value),
    onSuccess: (row) => {
      qc.setQueryData<Parameter[]>(parameterKeys.list(), (old) =>
        old?.map((p) => (p.key === row.key ? row : p)),
      );
      onSaved(row);
    },
  });
}
