<script setup>
import { ref, nextTick, watch } from "vue";
import { actions } from "astro:actions";
import { showToast } from "../lib/toast";

const messages = ref([
    {
        role: "assistant",
        content:
            "¡Hola! Soy el asistente de soporte. Cuéntame tu problema y te ayudo a reportarlo. Para empezar, ¿cuál es tu nombre?",
    },
]);
const input = ref("");
const loading = ref(false);
const streaming = ref(false); // true cuando ya llegan tokens (dejó de "pensar")
const ticketData = ref(null); // { nombre, email, titulo, descripcion }
const creado = ref(null); // id del ticket creado
const scroller = ref(null);

watch(
    () => messages.value.length,
    () => nextTick(() => {
        if (scroller.value) scroller.value.scrollTop = scroller.value.scrollHeight;
    }),
);

async function send() {
    const text = input.value.trim();
    if (!text || loading.value) return;
    messages.value.push({ role: "user", content: text });
    input.value = "";
    loading.value = true;
    streaming.value = false;

    // Solo mensajes con contenido al backend (evita bubbles vacíos)
    const payload = messages.value.filter((m) => m.content);

    let res;
    try {
        res = await fetch("/api/chat", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ messages: payload }),
        });
    } catch {
        loading.value = false;
        showToast("No se pudo conectar con el asistente", "danger");
        return;
    }
    if (!res.ok || !res.body) {
        loading.value = false;
        showToast("El asistente no está disponible", "danger");
        return;
    }

    // Bubble del asistente que se irá llenando token a token.
    const idx = messages.value.push({ role: "assistant", content: "" }) - 1;
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let full = "";
    let buffer = "";

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // guarda la línea incompleta
        for (const line of lines) {
            const l = line.trim();
            if (!l.startsWith("data:")) continue;
            const d = l.slice(5).trim();
            if (d === "[DONE]") continue;
            try {
                const obj = JSON.parse(d);
                if (obj.response) {
                    streaming.value = true;
                    full += obj.response;
                    // oculta el marcador <<TICKET>> mientras escribe
                    messages.value[idx].content = full.split("<<TICKET>>")[0].trimEnd();
                }
            } catch {
                /* fragmento no-JSON, ignora */
            }
        }
    }

    loading.value = false;
    streaming.value = false;

    // Extrae el ticket del texto completo (con el marcador).
    const m = full.match(/<<TICKET>>\s*(\{[\s\S]*\})/);
    if (m) {
        try {
            ticketData.value = JSON.parse(m[1]);
        } catch {
            /* json malformado, ignora */
        }
    }
    messages.value[idx].content =
        full.split("<<TICKET>>")[0].trim() || "Perfecto, tengo lo necesario.";
}

async function crear() {
    if (!ticketData.value) return;
    loading.value = true;
    const { data, error } = await actions.soporte.crearTicket(ticketData.value);
    loading.value = false;
    if (error) {
        showToast(error.message || "No se pudo crear el ticket", "danger");
        return;
    }
    creado.value = data.id;
    ticketData.value = null;
    showToast(`Ticket #${data.id} creado. ¡Gracias!`, "success");
}
</script>

<template>
    <div class="card">
        <div class="card-header bg-body fw-semibold">Reportar un problema</div>

        <div ref="scroller" class="card-body overflow-auto" style="height: 55vh">
            <div
                v-for="(m, i) in messages"
                :key="i"
                class="d-flex mb-2"
                :class="m.role === 'user' ? 'justify-content-end' : 'justify-content-start'"
            >
                <div
                    class="px-3 py-2 rounded-3"
                    :class="m.role === 'user' ? 'bg-primary text-white' : 'bg-body-tertiary'"
                    style="max-width: 80%; white-space: pre-wrap"
                >
                    {{ m.content }}
                </div>
            </div>

            <div v-if="loading && !streaming" class="d-flex mb-2">
                <div class="px-3 py-2 rounded-3 bg-body-tertiary text-muted">
                    Pensando<span class="thinking-dots"></span>
                </div>
            </div>

            <!-- Resumen del ticket para confirmar -->
            <div v-if="ticketData" class="border rounded-3 p-3 mt-2">
                <div class="fw-semibold mb-2">Confirma el reporte:</div>
                <div class="small mb-1"><strong>Nombre:</strong> {{ ticketData.nombre }}</div>
                <div class="small mb-1"><strong>Correo:</strong> {{ ticketData.email }}</div>
                <div class="small mb-1"><strong>Título:</strong> {{ ticketData.titulo }}</div>
                <div class="small mb-2">
                    <strong>Descripción:</strong> {{ ticketData.descripcion }}
                </div>
                <button class="btn btn-success btn-sm" :disabled="loading" @click="crear">
                    Confirmar y crear ticket
                </button>
            </div>

            <div v-if="creado" class="alert alert-success mt-2 mb-0">
                Tu ticket <strong>#{{ creado }}</strong> fue creado. Te contactaremos
                por correo.
            </div>
        </div>

        <div class="card-footer bg-body">
            <form class="d-flex gap-2" @submit.prevent="send">
                <input
                    v-model="input"
                    type="text"
                    class="form-control"
                    placeholder="Escribe tu mensaje…"
                    :disabled="loading"
                />
                <button type="submit" class="btn btn-primary" :disabled="loading">
                    Enviar
                </button>
            </form>
        </div>
    </div>
</template>

<style scoped>
.thinking-dots::after {
    content: "";
    animation: thinking 1.2s steps(1, end) infinite;
}
@keyframes thinking {
    0% {
        content: "";
    }
    25% {
        content: ".";
    }
    50% {
        content: "..";
    }
    75% {
        content: "...";
    }
}
</style>
