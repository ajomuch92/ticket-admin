import { mysqlTable, int, varchar } from 'drizzle-orm/mysql-core';
import { type InferSelectModel, type InferInsertModel } from 'drizzle-orm';

export const prioridades = mysqlTable('prioridades', {
  id: int('id').autoincrement().primaryKey(),
  nombre: varchar('nombre', { length: 30 }).notNull().unique(),
  orden: int('orden').default(0),
  /** Color hex (#rrggbb) para el badge de la prioridad. */
  color: varchar('color', { length: 7 }),
});

export type Prioridad = InferSelectModel<typeof prioridades>;
export type NuevaPrioridad = InferInsertModel<typeof prioridades>;
