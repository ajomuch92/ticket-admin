import { mysqlTable, int, varchar } from 'drizzle-orm/mysql-core';
import { type InferSelectModel, type InferInsertModel } from 'drizzle-orm';

export const estados = mysqlTable('estados', {
  id: int('id').autoincrement().primaryKey(),
  nombre: varchar('nombre', { length: 30 }).notNull().unique(),
  orden: int('orden').default(0),
});

export type Estado = InferSelectModel<typeof estados>;
export type NuevoEstado = InferInsertModel<typeof estados>;
