/**
 * Hash y verificación de contraseñas con PBKDF2 (WebCrypto — sin dependencias,
 * corre en Node y Cloudflare Workers). Formato: pbkdf2$iter$saltHex$hashHex.
 * ponytail: PBKDF2/SHA-256 correcto y sin dep; sube a argon2 si el proyecto lo pide.
 */

const hex = (buf: ArrayBuffer) =>
    [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

async function derive(password: string, salt: Uint8Array, iterations: number) {
    const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(password),
        "PBKDF2",
        false,
        ["deriveBits"],
    );
    return crypto.subtle.deriveBits(
        { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
        key,
        256,
    );
}

export async function hashPassword(password: string): Promise<string> {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iterations = 100_000;
    const bits = await derive(password, salt, iterations);
    return `pbkdf2$${iterations}$${hex(salt.buffer)}$${hex(bits)}`;
}

export async function verifyPassword(
    password: string,
    stored: string,
): Promise<boolean> {
    const [scheme, iterStr, saltHex, hashHex] = stored.split("$");
    if (scheme !== "pbkdf2" || !saltHex || !hashHex) return false;

    const salt = Uint8Array.from(
        saltHex.match(/../g)!.map((h) => parseInt(h, 16)),
    );
    const actual = hex(await derive(password, salt, Number(iterStr)));

    // Comparación en tiempo constante (evita timing attacks).
    if (actual.length !== hashHex.length) return false;
    let diff = 0;
    for (let i = 0; i < actual.length; i++) {
        diff |= actual.charCodeAt(i) ^ hashHex.charCodeAt(i);
    }
    return diff === 0;
}
