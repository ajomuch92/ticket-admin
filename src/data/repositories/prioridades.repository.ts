import { asc, eq, like, and } from 'drizzle-orm';
import { db } from '../db.js';
import { prioridades } from '../schema/index.js';
import type { CreatePrioridadDto, UpdatePrioridadDto, FilterPrioridadDto } from '../validators/prioridades.validator.js';

export class PrioridadesRepository {
  /** Devuelve todas las prioridades ordenadas por su campo `orden`. */
  async findAll(filters?: FilterPrioridadDto) {
    const conditions = [];

    if (filters?.nombre) {
      conditions.push(like(prioridades.nombre, `%${filters.nombre}%`));
    }

    return db
      .select()
      .from(prioridades)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(prioridades.orden));
  }

  /** Busca una prioridad por ID. Devuelve null si no existe. */
  async findById(id: number) {
    const [result] = await db.select().from(prioridades).where(eq(prioridades.id, id));
    return result ?? null;
  }

  /** Crea una nueva prioridad y devuelve el registro completo. */
  async create(data: CreatePrioridadDto) {
    const [{ id }] = await db.insert(prioridades).values(data).$returningId();
    return this.findById(id);
  }

  /** Actualiza una prioridad por ID. */
  async update(id: number, data: UpdatePrioridadDto) {
    await db.update(prioridades).set(data).where(eq(prioridades.id, id));
    return this.findById(id);
  }

  /** Elimina una prioridad por ID. */
  async delete(id: number) {
    const existing = await this.findById(id);
    if (!existing) return null;
    await db.delete(prioridades).where(eq(prioridades.id, id));
    return existing;
  }
}

export const prioridadesRepository = new PrioridadesRepository();
