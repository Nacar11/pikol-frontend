import { ApiClient, apiClient } from '@/lib/api-client';
import { ParameterSchema, ParametersSchema, type Parameter } from './schemas';

export const parametersApi = {
  list(client: ApiClient = apiClient()): Promise<Parameter[]> {
    return client.get<unknown>('/admin/parameters').then((r) => ParametersSchema.parse(r));
  },

  /** The value always travels as a string; the server validates the whole model. */
  update(key: string, value: string, client: ApiClient = apiClient()): Promise<Parameter> {
    return client
      .patch<unknown>(`/admin/parameters/${encodeURIComponent(key)}`, { value })
      .then((r) => ParameterSchema.parse(r));
  },
};
