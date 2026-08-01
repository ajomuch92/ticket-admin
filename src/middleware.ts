import { defineMiddleware } from "astro:middleware";
import { env } from "cloudflare:workers";
import { withDb, type HyperdriveBinding } from "./data/db.js";

export const onRequest = defineMiddleware((context, next) => {
    const path = context.url.pathname;

    // Sesión válida = id numérico. Una sesión vieja/corrupta se limpia.
    const sessionVal = context.cookies.get("session")?.value;
    const loggedIn = !!sessionVal && /^\d+$/.test(sessionVal);

    // Páginas del dashboard: requieren sesión.
    if (path.startsWith("/dashboard") && !loggedIn) {
        if (sessionVal) context.cookies.delete("session", { path: "/" });
        return context.redirect("/login");
    }

    // Actions: soporte.* son públicas (chat de reporte); el resto exige sesión.
    const isAction = path.startsWith("/_actions/");
    const isPublicAction = path.startsWith("/_actions/soporte.");
    if (isAction && !isPublicAction && !loggedIn) {
        return new Response("No autorizado", { status: 401 });
    }

    // Abrir contexto de DB solo en rutas que la tocan (dashboard, actions, login POST).
    const needsDb =
        path.startsWith("/dashboard") ||
        path.startsWith("/_actions") ||
        (path === "/login" && context.request.method === "POST");

    const hyperdrive = (env as { HYPERDRIVE?: HyperdriveBinding }).HYPERDRIVE;

    if (needsDb && hyperdrive) {
        return withDb(hyperdrive, () => next());
    }

    return next();
});
