/// <reference path="../.astro/types.d.ts" />

// Bindings del Worker (Astro v6+ / Cloudflare): se acceden vía `cloudflare:workers`.
declare module "cloudflare:workers" {
    export const env: {
        HYPERDRIVE: import("./data/db").HyperdriveBinding;
        AI: {
            run: (
                model: string,
                options: unknown,
            ) => Promise<{ response?: string }>;
        };
        /** Rate limiter nativo de Workers (binding). Puede faltar en dev. */
        PUBLIC_RATE_LIMITER?: {
            limit: (opts: { key: string }) => Promise<{ success: boolean }>;
        };
        /** Secreto para firmar el token del chat público. */
        CHAT_TOKEN_SECRET?: string;
        [key: string]: unknown;
    };
}
