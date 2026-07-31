import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware((context, next) => {
    // ponytail: redirect pausado temporalmente para migrar/verificar UI.
    // Reactivar quitando este early-return.
    return next();

    if (
        context.url.pathname.startsWith("/dashboard") &&
        !context.cookies.has("session")
    ) {
        return context.redirect("/login");
    }
    return next();
});
