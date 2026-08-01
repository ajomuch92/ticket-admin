import { drizzle } from 'drizzle-orm/mysql2';
import { createConnection } from 'mysql2/promise';
import { AsyncLocalStorage } from 'node:async_hooks';
import * as schema from './schema';

/**
 * Credenciales que expone el binding de Hyperdrive
 * (`Astro.locals.runtime.env.HYPERDRIVE`).
 */
export interface HyperdriveBinding {
  host: string;
  user: string;
  password: string;
  database: string;
  port: number;
}

function buildDrizzle(
  connection: Awaited<ReturnType<typeof createConnection>>,
) {
  return drizzle(connection, { schema, mode: 'default' });
}

export type DB = ReturnType<typeof buildDrizzle>;

/**
 * Contexto por-request. Cada petición del Worker abre su propia conexión MySQL
 * a través de Hyperdrive (que gestiona el pooling del lado de Cloudflare).
 */
const dbContext = new AsyncLocalStorage<DB>();

/**
 * Abre una conexión vía Hyperdrive y ejecuta `fn` con la DB en contexto.
 * Se llama desde el middleware con `locals.runtime.env.HYPERDRIVE`.
 *
 * ponytail: no cerramos la conexión (patrón documentado por Cloudflare —
 * Hyperdrive hace el pooling; el isolate del Worker es efímero).
 */
export async function withDb<T>(
  hyperdrive: HyperdriveBinding,
  fn: () => Promise<T> | T,
): Promise<T> {
  const connection = await createConnection({
    host: hyperdrive.host,
    user: hyperdrive.user,
    password: hyperdrive.password,
    database: hyperdrive.database,
    port: hyperdrive.port,
    disableEval: true, // requerido por mysql2 en el runtime de Workers
  });
  return dbContext.run(buildDrizzle(connection), fn);
}

/**
 * Instancia de Drizzle que los repositorios importan directamente.
 * Es un Proxy que delega al `db` del request actual (puesto por `withDb`),
 * así los repositorios no necesitan recibir la conexión por parámetro.
 *
 * @example
 * import { db } from '../db.js';
 * const roles = await db.select().from(rolesTable);
 */
export const db = new Proxy({} as DB, {
  get(_target, prop) {
    const current = dbContext.getStore();
    if (!current) {
      throw new Error(
        'DB sin contexto de request. ¿Falta withDb() en el middleware, o el binding HYPERDRIVE?',
      );
    }
    return current[prop as keyof DB];
  },
});
