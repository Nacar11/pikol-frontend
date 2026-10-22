import { z } from 'zod';

export const ParameterSchema = z.object({
  key: z.string(),
  value: z.string(),
  value_type: z.enum(['int', 'decimal', 'bool', 'string']),
  description: z.string(),
  updated_at: z.string(),
  updated_by_user_id: z.number().nullable(),
});
export type Parameter = z.infer<typeof ParameterSchema>;
export const ParametersSchema = z.array(ParameterSchema);
