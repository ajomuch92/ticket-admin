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
        [key: string]: unknown;
    };
}
