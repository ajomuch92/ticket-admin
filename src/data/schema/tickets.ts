import { mysqlTable, int, varchar, text, datetime, timestamp } from 'drizzle-orm/mysql-core';
import { type InferSelectModel, type InferInsertModel } from 'drizzle-orm';

export const tickets = mysqlTable('tickets', {
  id: int('id').autoincrement().primaryKey(),
  titulo: varchar('titulo', { length: 200 }).notNull(),
  descripcion: text('descripcion'),

  // Estado y Prioridad
  estadoId: int('estado_id').notNull(),
  prioridadId: int('prioridad_id').notNull(),

  // Fechas
  fechaVencimiento: datetime('fecha_vencimiento'),
  creadoEn: timestamp('creado_en').defaultNow(),
  actualizadoEn: timestamp('actualizado_en').defaultNow().onUpdateNow(),

  // Asignación y Autoría
  creadorId: int('creador_id').notNull(),
  /** NULL cuando el ticket todavía no tiene responsable asignado. */
  asignadoAId: int('asignado_a_id'),
});

export type Ticket = InferSelectModel<typeof tickets>;
export type NuevoTicket = InferInsertModel<typeof tickets>;
