import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import {
    usuariosRepository,
    estadosRepository,
    prioridadesRepository,
    departamentosRepository,
    ticketsRepository,
} from "../../data/repositories";

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

// Le pasa la lista de departamentos al modelo y devuelve el id del que mejor
// encaje. Fallback: el primero. null si no hay departamentos.
async function clasificarDepartamento(
    texto: string,
    deps: { id: number; nombre: string }[],
): Promise<number | null> {
    if (deps.length === 0) return null;
    const lista = deps.map((d) => `- ${d.nombre}`).join("\n");
    try {
        const res = await env.AI.run(MODEL, {
            messages: [
                {
                    role: "user",
                    content: `Clasifica este problema de soporte en UNO de estos departamentos. Responde SOLO con el nombre exacto del departamento, sin explicación.\n\nDepartamentos:\n${lista}\n\nProblema: ${texto}`,
                },
            ],
        });
        const ans = (res.response ?? "").trim().toLowerCase();
        const match =
            deps.find((d) => ans.includes(d.nombre.toLowerCase())) ??
            deps.find((d) => d.nombre.toLowerCase().includes(ans));
        return (match ?? deps[0]).id;
    } catch {
        return deps[0].id;
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

    const [estado] = await estadosRepository.findAll();
    const [prioridad] = await prioridadesRepository.findAll();
    if (!estado || !prioridad || !user) {
        return json(
            { error: "No hay estados/prioridades configurados." },
            400,
        );
    }

    // Clasificar por IA en un departamento y asignar al agente menos cargado.
    const deps = (await departamentosRepository.findAll()).filter((d) => d.activo);
    const departamentoId = await clasificarDepartamento(
        `${titulo}. ${descripcion ?? ""}`,
        deps,
    );
    const asignadoAId = departamentoId
        ? await ticketsRepository.agenteConMenosTickets(departamentoId)
        : null;

    // idPublico (UUID) lo genera el repositorio.
    const ticket = await ticketsRepository.create({
        titulo,
        descripcion,
        estadoId: estado.id,
        prioridadId: prioridad.id,
        creadorId: user.id,
        departamentoId: departamentoId ?? undefined,
        asignadoAId: asignadoAId ?? undefined,
    });

    return json({ id: ticket?.id ?? null, idPublico: ticket?.idPublico ?? null });
};
