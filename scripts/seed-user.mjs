// Crea un usuario inicial directo en MySQL (sin pasar por Hyperdrive).
// Uso:  node --env-file=.env scripts/seed-user.mjs [email] [password] [nombre]
// Ej.:  node --env-file=.env scripts/seed-user.mjs admin@ejemplo.com admin1234 "Admin User"
//
// El hash es PBKDF2 (mismo formato que la action usuarios.create).
import mysql from "mysql2/promise";

async function hashPassword(password) {
    const enc = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, [
        "deriveBits",
    ]);
    const bits = await crypto.subtle.deriveBits(
        { name: "PBKDF2", salt, iterations: 100_000, hash: "SHA-256" },
        key,
        256,
    );
    const hex = (buf) =>
        [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
    return `pbkdf2$100000$${hex(salt.buffer)}$${hex(bits)}`;
}

const {
    DATABASE_HOST = "localhost",
    DATABASE_PORT = "3306",
    DATABASE_USER = "root",
    DATABASE_PASSWORD = "",
    DATABASE_NAME = "tickets",
} = process.env;

const [, , email = "admin@ejemplo.com", password = "admin1234", nombre = "Admin User"] =
    process.argv;

const connection = await mysql.createConnection({
    host: DATABASE_HOST,
    port: Number(DATABASE_PORT),
    user: DATABASE_USER,
    password: DATABASE_PASSWORD,
    database: DATABASE_NAME,
});

const passwordHash = await hashPassword(password);

await connection.execute(
    "INSERT INTO usuarios (nombre, email, password_hash, activo) VALUES (?, ?, ?, 1)",
    [nombre, email, passwordHash],
);

console.log(`✓ Usuario creado: ${email}  (password: ${password})`);
await connection.end();
