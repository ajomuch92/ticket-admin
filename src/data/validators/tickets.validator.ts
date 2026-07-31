import { z } from 'zod';

export const CreateTicketSchema = z.object({
  titulo: z.string().min(1, 'El título es requerido').max(200, 'Máximo 200 caracteres'),
  descripcion: z.string().optional(),
  estadoId: z.number().int().positive('El estado es requerido'),
  prioridadId: z.number().int().positive('La prioridad es requerida'),
  /** Acepta string ISO, timestamp o Date. Se convierte automáticamente. */
  fechaVencimiento: z.coerce.date().nullable().optional(),
  creadorId: z.number().int().positive('El creador es requerido'),
  /** null = sin asignar. */
  asignadoAId: z.number().int().positive().nullable().optional(),
});

/** Para actualizar tickets: todos los campos son opcionales excepto creadorId (no modificable). */
export const UpdateTicketSchema = CreateTicketSchema.omit({ creadorId: true }).partial();

export const FilterTicketSchema = z.object({
  titulo: z.string().optional(),
  estadoId: z.number().int().optional(),
  prioridadId: z.number().int().optional(),
  creadorId: z.number().int().optional(),
  asignadoAId: z.number().int().nullable().optional(),
  /** Si true, filtra solo tickets sin asignar (asignado_a_id IS NULL). */
  sinAsignar: z.boolean().optional(),
});

export type CreateTicketDto = z.infer<typeof CreateTicketSchema>;
export type UpdateTicketDto = z.infer<typeof UpdateTicketSchema>;
export type FilterTicketDto = z.infer<typeof FilterTicketSchema>;
