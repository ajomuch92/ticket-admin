/**
 * Elige la opción cuyo nombre coincide con la respuesta del modelo.
 *
 * Devuelve null cuando la respuesta viene vacía o no encaja con ninguna opción:
 * el fallback lo decide el llamador. No damos por hecho "la primera de la lista"
 * porque esa lista suele venir ordenada por `orden ASC` y eso enterraba todos
 * los tickets en la prioridad más baja.
 */
export function matchOpcion<T extends { nombre: string }>(
    respuesta: string,
    opciones: T[],
): T | null {
    const ans = respuesta.trim().toLowerCase();
    // "cualquier".includes("") es true: sin este guard, una respuesta vacía
    // (modelo caído o censurado) matchearía siempre la primera opción.
    if (!ans) return null;
    return (
        opciones.find((o) => ans.includes(o.nombre.toLowerCase())) ??
        opciones.find((o) => o.nombre.toLowerCase().includes(ans)) ??
        null
    );
}
