import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema';

/**
 * Pool de conexiones MySQL reutilizable.
 * Las credenciales se leen de variables de entorno (.env).
 */
const pool = mysql.createPool({
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: Number(process.env.DATABASE_PORT ?? '3306'),
  user: process.env.DATABASE_USER ?? 'root',
  password: process.env.DATABASE_PASSWORD ?? '',
  database: process.env.DATABASE_NAME ?? 'ticket_admin',
  waitForConnections: true,
  connectionLimit: 10,
  idleTimeout: 60_000,
});

/**
 * Instancia global de Drizzle ORM.
 * Importar y usar directamente en repositorios y handlers.
 *
 * @example
 * import { db } from '../db.js';
 * const tickets = await db.select().from(ticketsTable);
 */
export const db = drizzle(pool, { schema, mode: 'default' });

export type DB = typeof db;
