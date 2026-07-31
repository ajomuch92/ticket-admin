import { relations } from 'drizzle-orm';
import { roles } from './roles.js';
import { permisos } from './permisos.js';
import { rolesPermisos } from './rolesPermisos.js';
import { usuarios } from './usuarios.js';
import { usuariosRoles } from './usuariosRoles.js';
import { prioridades } from './prioridades.js';
import { estados } from './estados.js';
import { tickets } from './tickets.js';

// ─── Roles ───────────────────────────────────────────────────────────────────
export const rolesRelations = relations(roles, ({ many }) => ({
  rolesPermisos: many(rolesPermisos),
  usuariosRoles: many(usuariosRoles),
}));

// ─── Permisos ─────────────────────────────────────────────────────────────────
export const permisosRelations = relations(permisos, ({ many }) => ({
  rolesPermisos: many(rolesPermisos),
}));

// ─── Roles ↔ Permisos (tabla intermedia) ────────────────────────────────────
export const rolesPermisosRelations = relations(rolesPermisos, ({ one }) => ({
  rol: one(roles, {
    fields: [rolesPermisos.rolId],
    references: [roles.id],
  }),
  permiso: one(permisos, {
    fields: [rolesPermisos.permisoId],
    references: [permisos.id],
  }),
}));

// ─── Usuarios ─────────────────────────────────────────────────────────────────
export const usuariosRelations = relations(usuarios, ({ many }) => ({
  usuariosRoles: many(usuariosRoles),
  ticketsCreados: many(tickets, { relationName: 'creador' }),
  ticketsAsignados: many(tickets, { relationName: 'asignado' }),
}));

// ─── Usuarios ↔ Roles (tabla intermedia) ────────────────────────────────────
export const usuariosRolesRelations = relations(usuariosRoles, ({ one }) => ({
  usuario: one(usuarios, {
    fields: [usuariosRoles.usuarioId],
    references: [usuarios.id],
  }),
  rol: one(roles, {
    fields: [usuariosRoles.rolId],
    references: [roles.id],
  }),
}));

// ─── Prioridades ──────────────────────────────────────────────────────────────
export const prioridadesRelations = relations(prioridades, ({ many }) => ({
  tickets: many(tickets),
}));

// ─── Estados ──────────────────────────────────────────────────────────────────
export const estadosRelations = relations(estados, ({ many }) => ({
  tickets: many(tickets),
}));

// ─── Tickets ──────────────────────────────────────────────────────────────────
export const ticketsRelations = relations(tickets, ({ one }) => ({
  estado: one(estados, {
    fields: [tickets.estadoId],
    references: [estados.id],
  }),
  prioridad: one(prioridades, {
    fields: [tickets.prioridadId],
    references: [prioridades.id],
  }),
  /** El usuario que creó el ticket. */
  creador: one(usuarios, {
    fields: [tickets.creadorId],
    references: [usuarios.id],
    relationName: 'creador',
  }),
  /** El usuario asignado como responsable (puede ser null). */
  asignadoA: one(usuarios, {
    fields: [tickets.asignadoAId],
    references: [usuarios.id],
    relationName: 'asignado',
  }),
}));
