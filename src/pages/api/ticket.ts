import type { APIRoute } from "astro";
import {
    usuariosRepository,
    estadosRepository,
    prioridadesRepository,
    ticketsRepository,
} from "../../data/repositories";

export const prerender = false;

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

    // idPublico (UUID) lo genera el repositorio.
    const ticket = await ticketsRepository.create({
        titulo,
        descripcion,
        estadoId: estado.id,
        prioridadId: prioridad.id,
        creadorId: user.id,
    });

    return json({ id: ticket?.id ?? null, idPublico: ticket?.idPublico ?? null });
};
