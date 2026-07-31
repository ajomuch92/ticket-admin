import { mysqlTable, int, varchar } from 'drizzle-orm/mysql-core';
import { type InferSelectModel, type InferInsertModel } from 'drizzle-orm';

export const permisos = mysqlTable('permisos', {
  id: int('id').autoincrement().primaryKey(),
  nombre: varchar('nombre', { length: 50 }).notNull().unique(),
  descripcion: varchar('descripcion', { length: 255 }),
});

export type Permiso = InferSelectModel<typeof permisos>;
export type NuevoPermiso = InferInsertModel<typeof permisos>;
