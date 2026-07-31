import { mysqlTable, int, varchar, boolean, timestamp } from 'drizzle-orm/mysql-core';
import { type InferSelectModel, type InferInsertModel } from 'drizzle-orm';

export const usuarios = mysqlTable('usuarios', {
  id: int('id').autoincrement().primaryKey(),
  nombre: varchar('nombre', { length: 100 }).notNull(),
  email: varchar('email', { length: 150 }).notNull().unique(),
  /** Almacenar SIEMPRE el hash (bcrypt/argon2), nunca la contraseña plana. */
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  activo: boolean('activo').default(true),
  creadoEn: timestamp('creado_en').defaultNow(),
  actualizadoEn: timestamp('actualizado_en').defaultNow().onUpdateNow(),
});

export type Usuario = InferSelectModel<typeof usuarios>;
export type NuevoUsuario = InferInsertModel<typeof usuarios>;
