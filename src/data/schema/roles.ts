import { mysqlTable, int, varchar } from 'drizzle-orm/mysql-core';
import { type InferSelectModel, type InferInsertModel } from 'drizzle-orm';

export const roles = mysqlTable('roles', {
  id: int('id').autoincrement().primaryKey(),
  nombre: varchar('nombre', { length: 50 }).notNull().unique(),
  descripcion: varchar('descripcion', { length: 255 }),
});

export type Rol = InferSelectModel<typeof roles>;
export type NuevoRol = InferInsertModel<typeof roles>;
