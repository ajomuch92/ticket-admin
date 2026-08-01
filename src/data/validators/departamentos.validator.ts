import { z } from 'zod';

export const CreateDepartamentoSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').max(80, 'Máximo 80 caracteres'),
  descripcion: z.string().max(255, 'Máximo 255 caracteres').optional(),
  activo: z.boolean().optional().default(true),
});

export const UpdateDepartamentoSchema = CreateDepartamentoSchema.partial();

export const FilterDepartamentoSchema = z.object({
  nombre: z.string().optional(),
});

export type CreateDepartamentoDto = z.infer<typeof CreateDepartamentoSchema>;
export type UpdateDepartamentoDto = z.infer<typeof UpdateDepartamentoSchema>;
export type FilterDepartamentoDto = z.infer<typeof FilterDepartamentoSchema>;
