import { z } from 'zod';

export const CreatePermisoSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').max(50, 'Máximo 50 caracteres'),
  descripcion: z.string().max(255, 'Máximo 255 caracteres').optional(),
});

export const UpdatePermisoSchema = CreatePermisoSchema.partial();

export const FilterPermisoSchema = z.object({
  nombre: z.string().optional(),
});

export type CreatePermisoDto = z.infer<typeof CreatePermisoSchema>;
export type UpdatePermisoDto = z.infer<typeof UpdatePermisoSchema>;
export type FilterPermisoDto = z.infer<typeof FilterPermisoSchema>;
