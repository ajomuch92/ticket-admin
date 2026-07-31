import { mysqlTable, int, primaryKey } from 'drizzle-orm/mysql-core';
import { type InferSelectModel } from 'drizzle-orm';

/** Tabla intermedia N:M entre roles y permisos. */
export const rolesPermisos = mysqlTable(
  'roles_permisos',
  {
    rolId: int('rol_id').notNull(),
    permisoId: int('permiso_id').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.rolId, table.permisoId] }),
  ],
);

export type RolPermiso = InferSelectModel<typeof rolesPermisos>;
