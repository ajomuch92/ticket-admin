// Toast global sin framework. Importable desde Astro (<script>) o Vue.
//   import { showToast } from "../lib/toast";
//   showToast("Guardado", "success");
// También queda en window.toast al importarse.
// Usa el CSS de toast de Bootstrap (ya cargado); no requiere Bootstrap JS.

type ToastType = "success" | "danger" | "warning" | "info" | "secondary";

function getContainer(): HTMLElement {
    let c = document.getElementById("toast-container");
    if (!c) {
        c = document.createElement("div");
        c.id = "toast-container";
        c.className = "toast-container position-fixed bottom-0 end-0 p-3";
        c.style.zIndex = "1090";
        document.body.appendChild(c);
    }
    return c;
}

export function showToast(
    message: string,
    type: ToastType = "success",
    duration = 3500,
): void {
    const el = document.createElement("div");
    el.className = `toast show text-white bg-${type} border-0`;
    el.setAttribute("role", "alert");
    el.style.transition = "opacity .2s ease";
    el.style.opacity = "1"; // visible al instante; el fade es solo de salida

    const row = document.createElement("div");
    row.className = "d-flex";

    const body = document.createElement("div");
    body.className = "toast-body";
    body.textContent = message; // textContent evita XSS

    const close = document.createElement("button");
    close.type = "button";
    close.className = "btn-close btn-close-white me-2 m-auto";
    close.setAttribute("aria-label", "Cerrar");

    row.append(body, close);
    el.append(row);
    getContainer().append(el);

    const dismiss = () => {
        el.style.opacity = "0";
        setTimeout(() => el.remove(), 200);
    };
    close.addEventListener("click", dismiss);
    if (duration > 0) setTimeout(dismiss, duration);
}

if (typeof window !== "undefined") {
    (window as unknown as { toast: typeof showToast }).toast = showToast;
}
