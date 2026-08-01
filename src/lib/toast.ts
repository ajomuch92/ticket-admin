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

/**
 * Toast con un valor copiable (botón "Copiar"). Se auto-cierra tras `duration`ms
 * (o con la X). Útil para mostrar una contraseña generada una sola vez.
 */
export function showCopyToast(
    label: string,
    value: string,
    duration = 10000,
): void {
    const el = document.createElement("div");
    el.className = "toast show bg-body border";
    el.setAttribute("role", "alert");
    el.style.transition = "opacity .2s ease";
    el.style.opacity = "1";

    const bodyWrap = document.createElement("div");
    bodyWrap.className = "toast-body";

    const text = document.createElement("div");
    text.className = "mb-2";
    text.textContent = label;

    const group = document.createElement("div");
    group.className = "input-group input-group-sm";

    const input = document.createElement("input");
    input.type = "text";
    input.className = "form-control";
    input.readOnly = true;
    input.value = value;

    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "btn btn-primary";
    copyBtn.textContent = "Copiar";
    copyBtn.addEventListener("click", async () => {
        try {
            await navigator.clipboard.writeText(value);
            copyBtn.textContent = "¡Copiado!";
        } catch {
            input.select(); // fallback: selecciona para copiar manual
            copyBtn.textContent = "Copia manual";
        }
    });

    const dismiss = () => {
        el.style.opacity = "0";
        setTimeout(() => el.remove(), 200);
    };

    const close = document.createElement("button");
    close.type = "button";
    close.className = "btn-close position-absolute top-0 end-0 m-2";
    close.setAttribute("aria-label", "Cerrar");
    close.addEventListener("click", dismiss);

    group.append(input, copyBtn);
    bodyWrap.append(text, group);
    el.append(bodyWrap, close);
    el.style.position = "relative";
    getContainer().append(el);

    if (duration > 0) setTimeout(dismiss, duration);
}

if (typeof window !== "undefined") {
    (window as unknown as { toast: typeof showToast }).toast = showToast;
}
