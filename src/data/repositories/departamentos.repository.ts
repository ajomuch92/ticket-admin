import { eq, like, and } from 'drizzle-orm';
import { db } from '../db.js';
import { departamentos } from '../schema/index.js';
import type { CreateDepartamentoDto, UpdateDepartamentoDto, FilterDepartamentoDto } from '../validators/departamentos.validator.js';

export class DepartamentosRepository {
  /** Devuelve todos los departamentos con filtros opcionales. */
  async findAll(filters?: FilterDepartamentoDto) {
    const conditions = [];

    if (filters?.nombre) {
      conditions.push(like(departamentos.nombre, `%${filters.nombre}%`));
    }

    return db
      .select()
      .from(departamentos)
      .where(conditions.length > 0 ? and(...conditions) : undefined);
  }

  /** Busca un departamento por ID. Devuelve null si no existe. */
  async findById(id: number) {
    const [result] = await db.select().from(departamentos).where(eq(departamentos.id, id));
    return result ?? null;
  }

  /** Crea un nuevo departamento y devuelve el registro completo. */
  async create(data: CreateDepartamentoDto) {
    const [{ id }] = await db.insert(departamentos).values(data).$returningId();
    return this.findById(id);
  }

  /** Actualiza un departamento por ID y devuelve el registro actualizado. */
  async update(id: number, data: UpdateDepartamentoDto) {
    await db.update(departamentos).set(data).where(eq(departamentos.id, id));
    return this.findById(id);
  }

  /** Elimina un departamento por ID. Devuelve el registro eliminado o null. */
  async delete(id: number) {
    const existing = await this.findById(id);
    if (!existing) return null;
    await db.delete(departamentos).where(eq(departamentos.id, id));
    return existing;
  }
}

export const departamentosRepository = new DepartamentosRepository();
