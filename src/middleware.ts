import { defineMiddleware } from "astro:middleware";
import { env } from "cloudflare:workers";
import { withDb, type HyperdriveBinding } from "./data/db.js";

export const onRequest = defineMiddleware((context, next) => {
    // Guard de sesión para el dashboard.
    if (
        context.url.pathname.startsWith("/dashboard") &&
        !context.cookies.has("session")
    ) {
        return context.redirect("/login");
    }

    // Abrir contexto de DB solo en rutas que la tocan (dashboard, actions, login POST).
    const needsDb =
        context.url.pathname.startsWith("/dashboard") ||
        context.url.pathname.startsWith("/_actions") ||
        (context.url.pathname === "/login" && context.request.method === "POST");

    const hyperdrive = (env as { HYPERDRIVE?: HyperdriveBinding }).HYPERDRIVE;

    if (needsDb && hyperdrive) {
        return withDb(hyperdrive, () => next());
    }

    return next();
});
