import { eq, like, and } from 'drizzle-orm';
import { db } from '../db.js';
import { usuarios } from '../schema/index.js';
import type { CreateUsuarioDto, UpdateUsuarioDto, FilterUsuarioDto } from '../validators/usuarios.validator.js';

export class UsuariosRepository {
  /**
   * Devuelve todos los usuarios con filtros opcionales.
   * NOTA: passwordHash se excluye de la proyección por seguridad.
   */
  async findAll(filters?: FilterUsuarioDto) {
    const conditions = [];

    if (filters?.nombre) {
      conditions.push(like(usuarios.nombre, `%${filters.nombre}%`));
    }
    if (filters?.email) {
      conditions.push(like(usuarios.email, `%${filters.email}%`));
    }
    if (filters?.activo !== undefined) {
      conditions.push(eq(usuarios.activo, filters.activo));
    }

    return db
      .select({
        id: usuarios.id,
        nombre: usuarios.nombre,
        email: usuarios.email,
        activo: usuarios.activo,
        creadoEn: usuarios.creadoEn,
        actualizadoEn: usuarios.actualizadoEn,
      })
      .from(usuarios)
      .where(conditions.length > 0 ? and(...conditions) : undefined);
  }

  /**
   * Busca un usuario por ID.
   * Incluye passwordHash para operaciones internas (ej: autenticación).
   */
  async findById(id: number) {
    const [result] = await db.select().from(usuarios).where(eq(usuarios.id, id));
    return result ?? null;
  }

  /** Busca un usuario por email (útil para login). */
  async findByEmail(email: string) {
    const [result] = await db.select().from(usuarios).where(eq(usuarios.email, email));
    return result ?? null;
  }

  /** Crea un nuevo usuario. Asegurarse de pasar passwordHash ya hasheado. */
  async create(data: CreateUsuarioDto) {
    const [{ id }] = await db.insert(usuarios).values(data).$returningId();
    return this.findById(id);
  }

  /** Actualiza campos de un usuario por ID. */
  async update(id: number, data: UpdateUsuarioDto) {
    await db.update(usuarios).set(data).where(eq(usuarios.id, id));
    return this.findById(id);
  }

  /** Elimina un usuario por ID. Devuelve el registro eliminado o null. */
  async delete(id: number) {
    const existing = await this.findById(id);
    if (!existing) return null;
    await db.delete(usuarios).where(eq(usuarios.id, id));
    return existing;
  }
}

export const usuariosRepository = new UsuariosRepository();
