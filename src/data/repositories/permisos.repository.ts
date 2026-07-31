import { eq, like, and } from 'drizzle-orm';
import { db } from '../db.js';
import { permisos } from '../schema/index.js';
import type { CreatePermisoDto, UpdatePermisoDto, FilterPermisoDto } from '../validators/permisos.validator.js';

export class PermisosRepository {
  /** Devuelve todos los permisos con filtros opcionales. */
  async findAll(filters?: FilterPermisoDto) {
    const conditions = [];

    if (filters?.nombre) {
      conditions.push(like(permisos.nombre, `%${filters.nombre}%`));
    }

    return db
      .select()
      .from(permisos)
      .where(conditions.length > 0 ? and(...conditions) : undefined);
  }

  /** Busca un permiso por ID. Devuelve null si no existe. */
  async findById(id: number) {
    const [result] = await db.select().from(permisos).where(eq(permisos.id, id));
    return result ?? null;
  }

  /** Crea un nuevo permiso y devuelve el registro completo. */
  async create(data: CreatePermisoDto) {
    const [{ id }] = await db.insert(permisos).values(data).$returningId();
    return this.findById(id);
  }

  /** Actualiza un permiso por ID y devuelve el registro actualizado. */
  async update(id: number, data: UpdatePermisoDto) {
    await db.update(permisos).set(data).where(eq(permisos.id, id));
    return this.findById(id);
  }

  /** Elimina un permiso por ID. Devuelve el registro eliminado o null si no existía. */
  async delete(id: number) {
    const existing = await this.findById(id);
    if (!existing) return null;
    await db.delete(permisos).where(eq(permisos.id, id));
    return existing;
  }
}

export const permisosRepository = new PermisosRepository();
