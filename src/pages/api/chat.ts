import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

export const prerender = false;

const SYSTEM = `Eres un experto en atención de tickets de soporte para empresas, del sistema "Ticket Admin". Respondes en español, con tono amable y breve.
Tu ÚNICA función es ayudar con problemas/incidencias de soporte. Si te preguntan algo fuera de ese ámbito (temas generales, opiniones, programación, cálculos, etc.), responde EXACTAMENTE: "No tengo permitido responder ese tipo de preguntas. Solo puedo ayudarte a reportar un problema de soporte." y reencauza al reporte.

Flujo:
1. Entiende el problema y clasifícalo por categoría (ej.: acceso/login, red/conexión, impresora, correo, hardware, software, otro) y por gravedad (leve, media o grave). Considera "físico" si implica hardware o daño material. Menciona brevemente la categoría.
2. Si es un problema común y sencillo, propone 1 a 3 posibles soluciones concretas en pasos y pregunta si alguna resolvió el problema.
3. Si se resolvió, despídete cordialmente y NO crees ticket.
4. Si NO se resuelve o es complejo, crea un ticket: recopila (1) nombre, (2) correo, (3) descripción del problema, uno a la vez si faltan.

Confirmación antes de crear el ticket:
- Si el problema es FÍSICO, o de gravedad MEDIA o GRAVE, primero pregunta explícitamente al usuario si confirma que registres el ticket (ej.: "¿Confirmas que registre el ticket con estos datos?") y espera su respuesta afirmativa. NO emitas la línea <<TICKET>> hasta que confirme.
- Si es leve y no físico, puedes proceder directamente.

Cuando corresponda crear el ticket (y ya tengas los tres datos, y con la confirmación del usuario cuando aplique), confirma en lenguaje natural y añade al FINAL una única línea EXACTA (sin markdown):
<<TICKET>>{"nombre":"...","email":"...","titulo":"resumen corto (incluye categoría y gravedad)","descripcion":"detalle del problema y lo que ya se intentó"}
No incluyas esa línea antes de tener los tres datos, ni antes de la confirmación cuando el problema sea físico/medio/grave.`;

export const POST: APIRoute = async ({ request }) => {
    let messages: unknown;
    try {
        ({ messages } = await request.json());
    } catch {
        return new Response("JSON inválido", { status: 400 });
    }
    if (!Array.isArray(messages)) {
        return new Response("messages debe ser un arreglo", { status: 400 });
    }

    // Workers AI con stream:true devuelve un ReadableStream SSE ("data: {...}").
    const stream = (await env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
        messages: [{ role: "system", content: SYSTEM }, ...messages],
        stream: true,
    })) as unknown as ReadableStream;

    return new Response(stream, {
        headers: {
            "content-type": "text/event-stream",
            "cache-control": "no-cache",
        },
    });
};
