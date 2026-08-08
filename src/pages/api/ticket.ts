import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import {
    usuariosRepository,
    estadosRepository,
    prioridadesRepository,
    departamentosRepository,
    ticketsRepository,
} from "../../data/repositories";
import { matchOpcion } from "../../lib/clasificar";

export const prerender = false;

const MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
        status,
        headers: { "content-type": "application/json" },
    });

// El modelo no siempre da JSON limpio: extrae el correo aunque venga embebido
// (ej. "Ana <ana@x.com>").
function extractEmail(s: string): string | null {
    const m = s.match(/[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+/);
    const email = m?.[0]?.toLowerCase();
    return email && email.length <= 150 ? email : null;
}

// Le pasa una lista de opciones al modelo y devuelve la que mejor encaje.
// null = el modelo falló o no hubo match; el fallback lo decide cada llamador.
async function clasificar<T extends { nombre: string }>(
    texto: string,
    opciones: T[],
    instruccion: string,
): Promise<T | null> {
    if (opciones.length === 0) return null;
    const lista = opciones.map((o) => `- ${o.nombre}`).join("\n");
    try {
        const res = await env.AI.run(MODEL, {
            messages: [
                {
                    role: "user",
                    content: `${instruccion}\n\nOpciones:\n${lista}\n\nProblema: ${texto}`,
                },
            ],
        });
        return matchOpcion(res.response ?? "", opciones);
    } catch {
        return null;
    }
}

export const POST: APIRoute = async ({ request }) => {
    let body: Record<string, unknown>;
    try {
        body = await request.json();
    } catch {
        return json({ error: "JSON inválido" }, 400);
    }

    // Saneado tolerante (el payload viene del modelo, no de un formulario).
    const nombre = String(body.nombre ?? "").trim().slice(0, 100);
    const email = extractEmail(String(body.email ?? ""));
    const titulo =
        String(body.titulo ?? "").trim().slice(0, 200) || "Reporte de soporte";
    const descripcion =
        String(body.descripcion ?? "").trim().slice(0, 2000) || undefined;

    if (!nombre) return json({ error: "Falta el nombre." }, 400);
    if (!email) return json({ error: "Correo inválido o ausente." }, 400);

    // Usuario: buscar por correo; si no existe, crear uno anónimo (sin contraseña).
    let user = await usuariosRepository.findByEmail(email);
    if (!user) {
        user = await usuariosRepository.create({
            nombre,
            email,
            passwordHash: "",
            activo: false,
            anonimo: true,
        });
    }

    // El estado inicial sí es siempre el primero por `orden` ("Por Hacer").
    const [estado] = await estadosRepository.findAll();
    const prioridades = await prioridadesRepository.findAll();
    if (!estado || prioridades.length === 0 || !user) {
        return json(
            { error: "No hay estados/prioridades configurados." },
            400,
        );
    }

    // Si el modelo no responde caemos a "Media": la lista viene ordenada por
    // `orden ASC`, así que tomar la primera enterraría el ticket en la más baja.
    const prioridadPorDefecto =
        prioridades.find((p) => p.nombre.toLowerCase() === "media") ??
        prioridades[Math.floor(prioridades.length / 2)] ??
        prioridades[0];

    const texto = `${titulo}. ${descripcion ?? ""}`;
    const deps = (await departamentosRepository.findAll()).filter((d) => d.activo);

    // Dos clasificaciones independientes: en paralelo para no encadenar latencia.
    const [departamento, prioridad] = await Promise.all([
        clasificar(
            texto,
            deps,
            "Clasifica este problema de soporte en UNO de estos departamentos. Responde SOLO con el nombre exacto del departamento, sin explicación.",
        ),
        clasificar(
            texto,
            prioridades,
            "Clasifica la urgencia de este problema de soporte en UNA de estas prioridades. Responde SOLO con el nombre exacto de la prioridad, sin explicación.",
        ),
    ]);

    const departamentoId = departamento?.id ?? deps[0]?.id ?? null;
    const prioridadId = (prioridad ?? prioridadPorDefecto).id;
    const asignadoAId = departamentoId
        ? await ticketsRepository.agenteConMenosTickets(departamentoId)
        : null;

    // idPublico (TK-AAAA-NNNN) lo genera el repositorio.
    const ticket = await ticketsRepository.create({
        titulo,
        descripcion,
        estadoId: estado.id,
        prioridadId,
        creadorId: user.id,
        departamentoId: departamentoId ?? undefined,
        asignadoAId: asignadoAId ?? undefined,
    });

    return json({ id: ticket?.id ?? null, idPublico: ticket?.idPublico ?? null });
};
