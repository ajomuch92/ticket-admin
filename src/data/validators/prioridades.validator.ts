import { z } from 'zod';

export const CreatePrioridadSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').max(30, 'Máximo 30 caracteres'),
  orden: z.number().int().min(0).optional().default(0),
});

export const UpdatePrioridadSchema = CreatePrioridadSchema.partial();

export const FilterPrioridadSchema = z.object({
  nombre: z.string().optional(),
});

export type CreatePrioridadDto = z.infer<typeof CreatePrioridadSchema>;
export type UpdatePrioridadDto = z.infer<typeof UpdatePrioridadSchema>;
export type FilterPrioridadDto = z.infer<typeof FilterPrioridadSchema>;
