import { z } from 'zod';

export const CreateRolSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').max(50, 'Máximo 50 caracteres'),
  descripcion: z.string().max(255, 'Máximo 255 caracteres').optional(),
});

/** Todos los campos opcionales para actualizaciones parciales. */
export const UpdateRolSchema = CreateRolSchema.partial();

export const FilterRolSchema = z.object({
  nombre: z.string().optional(),
});

export type CreateRolDto = z.infer<typeof CreateRolSchema>;
export type UpdateRolDto = z.infer<typeof UpdateRolSchema>;
export type FilterRolDto = z.infer<typeof FilterRolSchema>;
