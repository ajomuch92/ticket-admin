import { env } from "cloudflare:workers";

// Token firmado (HMAC-SHA256) para atar las llamadas a /api/chat a una carga de
// la página /reportar. Stateless: no requiere almacenamiento. Formato: exp.sigHex.
// ponytail: en prod define el secreto con `wrangler secret put CHAT_TOKEN_SECRET`.

const secret = () =>
    (env.CHAT_TOKEN_SECRET as string | undefined) ?? "dev-insecure-secret";

const TTL_MS = 30 * 60 * 1000; // 30 min

async function hmacHex(message: string): Promise<string> {
    const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(secret()),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
    );
    const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
    return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Emite un token válido por TTL_MS. Llamar en el frontmatter de /reportar. */
export async function issueChatToken(): Promise<string> {
    const exp = String(Date.now() + TTL_MS);
    return `${exp}.${await hmacHex(exp)}`;
}

/** Verifica firma y expiración (comparación en tiempo constante). */
export async function verifyChatToken(token: string | null): Promise<boolean> {
    if (!token) return false;
    const [exp, sig] = token.split(".");
    if (!exp || !sig || Number(exp) < Date.now()) return false;

    const expected = await hmacHex(exp);
    if (expected.length !== sig.length) return false;
    let diff = 0;
    for (let i = 0; i < expected.length; i++) {
        diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
    }
    return diff === 0;
}
