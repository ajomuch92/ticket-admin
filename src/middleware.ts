import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware((context, next) => {
    // if (
    //     context.url.pathname.startsWith("/dashboard") &&
    //     !context.cookies.has("session")
    // ) {
    //     return context.redirect("/login");
    // }
    return next();
});
