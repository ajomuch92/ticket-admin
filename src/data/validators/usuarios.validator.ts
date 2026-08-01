import { z } from 'zod';

export const CreateUsuarioSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').max(100, 'Máximo 100 caracteres'),
  email: z.string().email('Email inválido').max(150, 'Máximo 150 caracteres'),
  /**
   * Debe recibir el hash generado con bcrypt/argon2.
   * Nunca almacenar la contraseña en texto plano.
   */
  passwordHash: z.string().min(1, 'El hash de contraseña es requerido').max(255),
  activo: z.boolean().optional().default(true),
  anonimo: z.boolean().optional().default(false),
  departamentoId: z.number().int().positive().nullable().optional(),
});

export const UpdateUsuarioSchema = z.object({
  nombre: z.string().min(1).max(100).optional(),
  email: z.string().email().max(150).optional(),
  passwordHash: z.string().min(1).max(255).optional(),
  activo: z.boolean().optional(),
});

export const FilterUsuarioSchema = z.object({
  nombre: z.string().optional(),
  email: z.string().optional(),
  activo: z.boolean().optional(),
});

export type CreateUsuarioDto = z.infer<typeof CreateUsuarioSchema>;
export type UpdateUsuarioDto = z.infer<typeof UpdateUsuarioSchema>;
export type FilterUsuarioDto = z.infer<typeof FilterUsuarioSchema>;
