import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/data/schema/index.ts',
  out: './drizzle/migrations',
  dialect: 'mysql',
  dbCredentials: {
    host: process.env.DATABASE_HOST ?? 'localhost',
    port: Number(process.env.DATABASE_PORT ?? '3306'),
    user: process.env.DATABASE_USER ?? 'root',
    password: process.env.DATABASE_PASSWORD ?? '',
    database: process.env.DATABASE_NAME ?? 'ticket_admin',
  },
});
