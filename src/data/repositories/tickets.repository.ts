import { eq, like, and, isNull, desc } from 'drizzle-orm';
import { db } from '../db.js';
import { tickets } from '../schema/index.js';
import type { CreateTicketDto, UpdateTicketDto, FilterTicketDto } from '../validators/tickets.validator.js';

export class TicketsRepository {
  /**
   * Devuelve tickets con filtros opcionales, ordenados del más reciente al más antiguo.
   *
   * Filtros disponibles:
   * - `titulo`: búsqueda parcial por título
   * - `estadoId`: filtro exacto por estado
   * - `prioridadId`: filtro exacto por prioridad
   * - `creadorId`: filtro exacto por creador
   * - `asignadoAId`: filtro exacto por usuario asignado
   * - `sinAsignar`: si true, devuelve solo tickets sin asignar (asignado_a_id IS NULL)
   */
  async findAll(filters?: FilterTicketDto) {
    const conditions = [];

    if (filters?.titulo) {
      conditions.push(like(tickets.titulo, `%${filters.titulo}%`));
    }
    if (filters?.estadoId !== undefined) {
      conditions.push(eq(tickets.estadoId, filters.estadoId));
    }
    if (filters?.prioridadId !== undefined) {
      conditions.push(eq(tickets.prioridadId, filters.prioridadId));
    }
    if (filters?.creadorId !== undefined) {
      conditions.push(eq(tickets.creadorId, filters.creadorId));
    }
    if (filters?.sinAsignar === true) {
      conditions.push(isNull(tickets.asignadoAId));
    } else if (filters?.asignadoAId !== undefined) {
      if (filters.asignadoAId === null) {
        conditions.push(isNull(tickets.asignadoAId));
      } else {
        conditions.push(eq(tickets.asignadoAId, filters.asignadoAId));
      }
    }

    return db
      .select()
      .from(tickets)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(tickets.creadoEn));
  }

  /**
   * Devuelve tickets con sus relaciones cargadas (estado, prioridad, creador, asignadoA).
   * Usa la API relacional de Drizzle — requiere que `db` tenga el schema completo.
   */
  async findAllWithRelations(filters?: FilterTicketDto) {
    const conditions = [];

    if (filters?.titulo) {
      conditions.push(like(tickets.titulo, `%${filters.titulo}%`));
    }
    if (filters?.estadoId !== undefined) {
      conditions.push(eq(tickets.estadoId, filters.estadoId));
    }
    if (filters?.prioridadId !== undefined) {
      conditions.push(eq(tickets.prioridadId, filters.prioridadId));
    }
    if (filters?.creadorId !== undefined) {
      conditions.push(eq(tickets.creadorId, filters.creadorId));
    }
    if (filters?.sinAsignar === true) {
      conditions.push(isNull(tickets.asignadoAId));
    } else if (filters?.asignadoAId !== undefined) {
      if (filters.asignadoAId === null) {
        conditions.push(isNull(tickets.asignadoAId));
      } else {
        conditions.push(eq(tickets.asignadoAId, filters.asignadoAId));
      }
    }

    return db.query.tickets.findMany({
      with: {
        estado: true,
        prioridad: true,
        creador: true,
        asignadoA: true,
      },
      where: conditions.length > 0 ? and(...conditions) : undefined,
      orderBy: [desc(tickets.creadoEn)],
    });
  }

  /** Busca un ticket por ID. Devuelve null si no existe. */
  async findById(id: number) {
    const [result] = await db.select().from(tickets).where(eq(tickets.id, id));
    return result ?? null;
  }

  /**
   * Busca un ticket por ID incluyendo sus relaciones.
   * Útil para vistas de detalle.
   */
  async findByIdWithRelations(id: number) {
    return db.query.tickets.findFirst({
      where: eq(tickets.id, id),
      with: {
        estado: true,
        prioridad: true,
        creador: true,
        asignadoA: true,
      },
    }) ?? null;
  }

  /** Crea un nuevo ticket y devuelve el registro completo. */
  async create(data: CreateTicketDto) {
    const [{ id }] = await db.insert(tickets).values(data).$returningId();
    return this.findById(id);
  }

  /** Actualiza campos de un ticket por ID. El creadorId no puede modificarse. */
  async update(id: number, data: UpdateTicketDto) {
    await db.update(tickets).set(data).where(eq(tickets.id, id));
    return this.findById(id);
  }

  /**
   * Asigna el ticket a un usuario.
   * Pasar `null` para desasignar el ticket.
   */
  async asignar(id: number, usuarioId: number | null) {
    await db.update(tickets).set({ asignadoAId: usuarioId }).where(eq(tickets.id, id));
    return this.findById(id);
  }

  /** Elimina un ticket por ID. Devuelve el registro eliminado o null si no existía. */
  async delete(id: number) {
    const existing = await this.findById(id);
    if (!existing) return null;
    await db.delete(tickets).where(eq(tickets.id, id));
    return existing;
  }
}

export const ticketsRepository = new TicketsRepository();
