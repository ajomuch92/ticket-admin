import { defineAction, ActionError } from "astro:actions";
import { z } from "astro:schema";
import { count, eq, desc } from "drizzle-orm";
import { randomString } from "complete-js-utils";
import { hashPassword } from "../data/password.js";
import { db } from "../data/db.js";
import { tickets, estados, prioridades, usuarios } from "../data/schema/index.js";

import {
    rolesRepository,
    permisosRepository,
    usuariosRepository,
    prioridadesRepository,
    estadosRepository,
    ticketsRepository,
    departamentosRepository,
} from "../data/repositories/index.js";

import {
    CreateRolSchema,
    UpdateRolSchema,
    FilterRolSchema,
    CreatePermisoSchema,
    UpdatePermisoSchema,
    FilterPermisoSchema,
    FilterUsuarioSchema,
    CreatePrioridadSchema,
    UpdatePrioridadSchema,
    FilterPrioridadSchema,
    CreateEstadoSchema,
    UpdateEstadoSchema,
    FilterEstadoSchema,
    CreateTicketSchema,
    UpdateTicketSchema,
    FilterTicketSchema,
    CreateDepartamentoSchema,
    UpdateDepartamentoSchema,
    FilterDepartamentoSchema,
} from "../data/validators/index.js";

// ponytail: los inputs usan accept:"json" (default). Las actions se llaman desde
// el cliente con tipos: actions.roles.create({ nombre: "..." }). Si quieres POST
// nativo desde <form>, añade accept:"form" y coerción (z.coerce.number) en los ids.

const id = z.number().int().positive();
const idInput = z.object({ id });

const notFound = (que: string) =>
    new ActionError({ code: "NOT_FOUND", message: `${que} no encontrado` });

export const server = {
    // ─────────────── Roles ───────────────
    roles: {
        list: defineAction({
            input: FilterRolSchema,
            handler: (filters) => rolesRepository.findAll(filters),
        }),
        get: defineAction({
            input: idInput,
            handler: async ({ id }) => {
                const rol = await rolesRepository.findById(id);
                if (!rol) throw notFound("Rol");
                return rol;
            },
        }),
        create: defineAction({
            input: CreateRolSchema,
            handler: (data) => rolesRepository.create(data),
        }),
        update: defineAction({
            input: UpdateRolSchema.extend({ id }),
            handler: async ({ id, ...data }) => {
                const rol = await rolesRepository.update(id, data);
                if (!rol) throw notFound("Rol");
                return rol;
            },
        }),
        delete: defineAction({
            input: idInput,
            handler: async ({ id }) => {
                const rol = await rolesRepository.delete(id);
                if (!rol) throw notFound("Rol");
                return rol;
            },
        }),
    },

    // ─────────────── Permisos ───────────────
    permisos: {
        list: defineAction({
            input: FilterPermisoSchema,
            handler: (filters) => permisosRepository.findAll(filters),
        }),
        get: defineAction({
            input: idInput,
            handler: async ({ id }) => {
                const permiso = await permisosRepository.findById(id);
                if (!permiso) throw notFound("Permiso");
                return permiso;
            },
        }),
        create: defineAction({
            input: CreatePermisoSchema,
            handler: (data) => permisosRepository.create(data),
        }),
        update: defineAction({
            input: UpdatePermisoSchema.extend({ id }),
            handler: async ({ id, ...data }) => {
                const permiso = await permisosRepository.update(id, data);
                if (!permiso) throw notFound("Permiso");
                return permiso;
            },
        }),
        delete: defineAction({
            input: idInput,
            handler: async ({ id }) => {
                const permiso = await permisosRepository.delete(id);
                if (!permiso) throw notFound("Permiso");
                return permiso;
            },
        }),
    },

    // ─────────────── Usuarios ───────────────
    // ponytail: CreateUsuarioSchema espera `passwordHash` ya hasheado. El hashing
    // (bcrypt/argon2) debe hacerse ANTES de llamar create — no hay lib de hash aún.
    usuarios: {
        list: defineAction({
            input: FilterUsuarioSchema,
            handler: (filters) => usuariosRepository.findAll(filters),
        }),
        get: defineAction({
            input: idInput,
            handler: async ({ id }) => {
                const usuario = await usuariosRepository.findById(id);
                if (!usuario) throw notFound("Usuario");
                return usuario;
            },
        }),
        // Recibe `password` en texto plano y lo hashea antes de guardar.
        create: defineAction({
            input: z.object({
                nombre: z.string().min(1, "El nombre es requerido").max(100),
                email: z.string().email("Email inválido").max(150),
                password: z.string().min(6, "Mínimo 6 caracteres").max(100),
                activo: z.boolean().optional().default(true),
                departamentoId: z.number().int().positive().nullable().optional(),
            }),
            handler: async ({ password, ...rest }) => {
                const passwordHash = await hashPassword(password);
                return usuariosRepository.create({
                    ...rest, passwordHash,
                    anonimo: false
                });
            },
        }),
        update: defineAction({
            input: z.object({
                id,
                nombre: z.string().min(1).max(100).optional(),
                email: z.string().email().max(150).optional(),
                password: z.string().min(6, "Mínimo 6 caracteres").max(100).optional(),
                activo: z.boolean().optional(),
                departamentoId: z.number().int().positive().nullable().optional(),
            }),
            handler: async ({ id, password, ...rest }) => {
                const data: Record<string, unknown> = { ...rest };
                if (password) data.passwordHash = await hashPassword(password);
                const usuario = await usuariosRepository.update(id, data);
                if (!usuario) throw notFound("Usuario");
                return usuario;
            },
        }),
        delete: defineAction({
            input: idInput,
            handler: async ({ id }) => {
                const usuario = await usuariosRepository.delete(id);
                if (!usuario) throw notFound("Usuario");
                return usuario;
            },
        }),
        // Genera una contraseña aleatoria, la asigna al usuario y la devuelve
        // (en claro, una sola vez) para mostrarla al admin.
        resetPassword: defineAction({
            input: idInput,
            handler: async ({ id }) => {
                const password = randomString(
                    14,
                    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789",
                );
                const usuario = await usuariosRepository.update(id, {
                    passwordHash: await hashPassword(password),
                });
                if (!usuario) throw notFound("Usuario");
                return { password };
            },
        }),
    },

    // ─────────────── Prioridades ───────────────
    prioridades: {
        list: defineAction({
            input: FilterPrioridadSchema,
            handler: (filters) => prioridadesRepository.findAll(filters),
        }),
        get: defineAction({
            input: idInput,
            handler: async ({ id }) => {
                const prioridad = await prioridadesRepository.findById(id);
                if (!prioridad) throw notFound("Prioridad");
                return prioridad;
            },
        }),
        create: defineAction({
            input: CreatePrioridadSchema,
            handler: (data) => prioridadesRepository.create(data),
        }),
        update: defineAction({
            input: UpdatePrioridadSchema.extend({ id }),
            handler: async ({ id, ...data }) => {
                const prioridad = await prioridadesRepository.update(id, data);
                if (!prioridad) throw notFound("Prioridad");
                return prioridad;
            },
        }),
        delete: defineAction({
            input: idInput,
            handler: async ({ id }) => {
                const prioridad = await prioridadesRepository.delete(id);
                if (!prioridad) throw notFound("Prioridad");
                return prioridad;
            },
        }),
    },

    // ─────────────── Estados ───────────────
    estados: {
        list: defineAction({
            input: FilterEstadoSchema,
            handler: (filters) => estadosRepository.findAll(filters),
        }),
        get: defineAction({
            input: idInput,
            handler: async ({ id }) => {
                const estado = await estadosRepository.findById(id);
                if (!estado) throw notFound("Estado");
                return estado;
            },
        }),
        create: defineAction({
            input: CreateEstadoSchema,
            handler: (data) => estadosRepository.create(data),
        }),
        update: defineAction({
            input: UpdateEstadoSchema.extend({ id }),
            handler: async ({ id, ...data }) => {
                const estado = await estadosRepository.update(id, data);
                if (!estado) throw notFound("Estado");
                return estado;
            },
        }),
        delete: defineAction({
            input: idInput,
            handler: async ({ id }) => {
                const estado = await estadosRepository.delete(id);
                if (!estado) throw notFound("Estado");
                return estado;
            },
        }),
    },

    // ─────────────── Tickets ───────────────
    tickets: {
        // Lista con relaciones (estado, prioridad, creador, asignadoA) para la tabla.
        list: defineAction({
            input: FilterTicketSchema,
            handler: (filters) => ticketsRepository.findAllWithRelations(filters),
        }),
        get: defineAction({
            input: idInput,
            handler: async ({ id }) => {
                const ticket = await ticketsRepository.findByIdWithRelations(id);
                if (!ticket) throw notFound("Ticket");
                return ticket;
            },
        }),
        create: defineAction({
            input: CreateTicketSchema,
            handler: (data) => ticketsRepository.create(data),
        }),
        update: defineAction({
            input: UpdateTicketSchema.extend({ id }),
            handler: async ({ id, ...data }) => {
                const ticket = await ticketsRepository.update(id, data);
                if (!ticket) throw notFound("Ticket");
                return ticket;
            },
        }),
        // Asigna/desasigna (usuarioId: null = sin asignar).
        asignar: defineAction({
            input: z.object({ id, usuarioId: id.nullable() }),
            handler: async ({ id, usuarioId }) => {
                const ticket = await ticketsRepository.asignar(id, usuarioId);
                if (!ticket) throw notFound("Ticket");
                return ticket;
            },
        }),
        delete: defineAction({
            input: idInput,
            handler: async ({ id }) => {
                const ticket = await ticketsRepository.delete(id);
                if (!ticket) throw notFound("Ticket");
                return ticket;
            },
        }),
    },

    // ─────────────── Dashboard (agregados) ───────────────
    dashboard: {
        stats: defineAction({
            input: z.object({}),
            handler: async () => {
                const [{ totalTickets }] = await db
                    .select({ totalTickets: count() })
                    .from(tickets);

                const [{ usuariosActivos }] = await db
                    .select({ usuariosActivos: count() })
                    .from(usuarios)
                    .where(eq(usuarios.activo, true));

                const porEstado = await db
                    .select({ nombre: estados.nombre, count: count(tickets.id) })
                    .from(estados)
                    .leftJoin(tickets, eq(tickets.estadoId, estados.id))
                    .groupBy(estados.id)
                    .orderBy(estados.orden);

                const porPrioridad = await db
                    .select({ nombre: prioridades.nombre, count: count(tickets.id) })
                    .from(prioridades)
                    .leftJoin(tickets, eq(tickets.prioridadId, prioridades.id))
                    .groupBy(prioridades.id)
                    .orderBy(prioridades.orden);

                const recientes = await db.query.tickets.findMany({
                    with: { estado: true },
                    orderBy: [desc(tickets.creadoEn)],
                    limit: 5,
                });

                return {
                    totalTickets,
                    usuariosActivos,
                    porEstado,
                    porPrioridad,
                    actividadReciente: recientes.map((t) => ({
                        id: t.id,
                        titulo: t.titulo,
                        estado: t.estado?.nombre ?? "—",
                        fecha: t.creadoEn,
                    })),
                };
            },
        }),
    },

    // ─────────────── Departamentos ───────────────
    departamentos: {
        list: defineAction({
            input: FilterDepartamentoSchema,
            handler: (filters) => departamentosRepository.findAll(filters),
        }),
        get: defineAction({
            input: idInput,
            handler: async ({ id }) => {
                const dep = await departamentosRepository.findById(id);
                if (!dep) throw notFound("Departamento");
                return dep;
            },
        }),
        create: defineAction({
            input: CreateDepartamentoSchema,
            handler: (data) => departamentosRepository.create(data),
        }),
        update: defineAction({
            input: UpdateDepartamentoSchema.extend({ id }),
            handler: async ({ id, ...data }) => {
                const dep = await departamentosRepository.update(id, data);
                if (!dep) throw notFound("Departamento");
                return dep;
            },
        }),
        delete: defineAction({
            input: idInput,
            handler: async ({ id }) => {
                const dep = await departamentosRepository.delete(id);
                if (!dep) throw notFound("Departamento");
                return dep;
            },
        }),
    },
};
