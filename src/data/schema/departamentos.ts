import { mysqlTable, int, varchar, boolean, timestamp } from 'drizzle-orm/mysql-core';
import { type InferSelectModel, type InferInsertModel } from 'drizzle-orm';

export const departamentos = mysqlTable('departamentos', {
  id: int('id').autoincrement().primaryKey(),
  nombre: varchar('nombre', { length: 80 }).notNull().unique(),
  descripcion: varchar('descripcion', { length: 255 }),
  activo: boolean('activo').default(true),
  creadoEn: timestamp('creado_en').defaultNow(),
});

export type Departamento = InferSelectModel<typeof departamentos>;
export type NuevoDepartamento = InferInsertModel<typeof departamentos>;
