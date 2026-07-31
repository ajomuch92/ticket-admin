import { eq, like, and } from 'drizzle-orm';
import { db } from '../db.js';
import { roles } from '../schema/index.js';
import type { CreateRolDto, UpdateRolDto, FilterRolDto } from '../validators/roles.validator.js';

export class RolesRepository {
  /** Devuelve todos los roles con filtros opcionales. */
  async findAll(filters?: FilterRolDto) {
    const conditions = [];

    if (filters?.nombre) {
      conditions.push(like(roles.nombre, `%${filters.nombre}%`));
    }

    return db
      .select()
      .from(roles)
      .where(conditions.length > 0 ? and(...conditions) : undefined);
  }

  /** Busca un rol por ID. Devuelve null si no existe. */
  async findById(id: number) {
    const [result] = await db.select().from(roles).where(eq(roles.id, id));
    return result ?? null;
  }

  /** Crea un nuevo rol y devuelve el registro completo. */
  async create(data: CreateRolDto) {
    const [{ id }] = await db.insert(roles).values(data).$returningId();
    return this.findById(id);
  }

  /** Actualiza un rol por ID y devuelve el registro actualizado. */
  async update(id: number, data: UpdateRolDto) {
    await db.update(roles).set(data).where(eq(roles.id, id));
    return this.findById(id);
  }

  /** Elimina un rol por ID. Devuelve el registro eliminado o null si no existía. */
  async delete(id: number) {
    const existing = await this.findById(id);
    if (!existing) return null;
    await db.delete(roles).where(eq(roles.id, id));
    return existing;
  }
}

export const rolesRepository = new RolesRepository();
