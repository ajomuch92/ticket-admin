import { mysqlTable, int, primaryKey } from 'drizzle-orm/mysql-core';
import { type InferSelectModel } from 'drizzle-orm';

/** Tabla intermedia N:M entre usuarios y roles. */
export const usuariosRoles = mysqlTable(
  'usuarios_roles',
  {
    usuarioId: int('usuario_id').notNull(),
    rolId: int('rol_id').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.usuarioId, table.rolId] }),
  ],
);

export type UsuarioRol = InferSelectModel<typeof usuariosRoles>;
