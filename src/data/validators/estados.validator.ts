import { z } from 'zod';

export const CreateEstadoSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').max(30, 'Máximo 30 caracteres'),
  orden: z.number().int().min(0).optional().default(0),
});

export const UpdateEstadoSchema = CreateEstadoSchema.partial();

export const FilterEstadoSchema = z.object({
  nombre: z.string().optional(),
});

export type CreateEstadoDto = z.infer<typeof CreateEstadoSchema>;
export type UpdateEstadoDto = z.infer<typeof UpdateEstadoSchema>;
export type FilterEstadoDto = z.infer<typeof FilterEstadoSchema>;
