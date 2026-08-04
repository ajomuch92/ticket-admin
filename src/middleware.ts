import { defineMiddleware } from "astro:middleware";
import { env } from "cloudflare:workers";
import { withDb, type HyperdriveBinding } from "./data/db.js";

export const onRequest = defineMiddleware(async (context, next) => {
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

    // Rate limit para endpoints públicos (30 req/min por IP+ruta).
    const publicLimited =
        path === "/api/chat" ||
        path === "/api/ticket" ||
        path === "/buscar" ||
        (path === "/login" && context.request.method === "POST");
    if (publicLimited && env.PUBLIC_RATE_LIMITER) {
        const ip = context.request.headers.get("cf-connecting-ip") ?? "local";
        const { success } = await env.PUBLIC_RATE_LIMITER.limit({
            key: `${ip}:${path}`,
        });
        if (!success) {
            return new Response("Demasiadas solicitudes. Intenta más tarde.", {
                status: 429,
            });
        }
    }

    // Abrir contexto de DB solo en rutas que la tocan (dashboard, actions, login POST,
    // y el endpoint público /api/ticket). /api/chat NO usa DB (solo IA).
    const needsDb =
        path.startsWith("/dashboard") ||
        path.startsWith("/_actions") ||
        path === "/api/ticket" ||
        path === "/buscar" ||
        (path === "/login" && context.request.method === "POST");

    const hyperdrive = (env as { HYPERDRIVE?: HyperdriveBinding }).HYPERDRIVE;

    if (needsDb && hyperdrive) {
        return withDb(hyperdrive, () => next());
    }

    return next();
});
