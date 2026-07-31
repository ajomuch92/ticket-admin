import { asc, eq, like, and } from 'drizzle-orm';
import { db } from '../db.js';
import { estados } from '../schema/index.js';
import type { CreateEstadoDto, UpdateEstadoDto, FilterEstadoDto } from '../validators/estados.validator.js';

export class EstadosRepository {
  /** Devuelve todos los estados ordenados por su campo `orden`. */
  async findAll(filters?: FilterEstadoDto) {
    const conditions = [];

    if (filters?.nombre) {
      conditions.push(like(estados.nombre, `%${filters.nombre}%`));
    }

    return db
      .select()
      .from(estados)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(estados.orden));
  }

  /** Busca un estado por ID. Devuelve null si no existe. */
  async findById(id: number) {
    const [result] = await db.select().from(estados).where(eq(estados.id, id));
    return result ?? null;
  }

  /** Crea un nuevo estado y devuelve el registro completo. */
  async create(data: CreateEstadoDto) {
    const [{ id }] = await db.insert(estados).values(data).$returningId();
    return this.findById(id);
  }

  /** Actualiza un estado por ID. */
  async update(id: number, data: UpdateEstadoDto) {
    await db.update(estados).set(data).where(eq(estados.id, id));
    return this.findById(id);
  }

  /** Elimina un estado por ID. */
  async delete(id: number) {
    const existing = await this.findById(id);
    if (!existing) return null;
    await db.delete(estados).where(eq(estados.id, id));
    return existing;
  }
}

export const estadosRepository = new EstadosRepository();
