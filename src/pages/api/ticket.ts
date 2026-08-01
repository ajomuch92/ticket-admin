import type { APIRoute } from "astro";
import { z } from "astro:schema";
import {
    usuariosRepository,
    estadosRepository,
    prioridadesRepository,
    ticketsRepository,
} from "../../data/repositories";

export const prerender = false;

const schema = z.object({
    nombre: z.string().min(1).max(100),
    email: z.string().email().max(150),
    titulo: z.string().min(1).max(200),
    descripcion: z.string().max(2000).optional(),
});

const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
        status,
        headers: { "content-type": "application/json" },
    });

export const POST: APIRoute = async ({ request }) => {
    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return json({ error: "JSON inválido" }, 400);
    }

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
        return json({ error: "Datos inválidos" }, 400);
    }
    const { nombre, email, titulo, descripcion } = parsed.data;

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
