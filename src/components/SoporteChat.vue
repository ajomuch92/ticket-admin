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

    const { data, error } = await actions.soporte.chat({
        messages: messages.value,
    });
    loading.value = false;

    if (error) {
        showToast(error.message || "Error del asistente", "danger");
        return;
    }

    let reply = data.reply || "";
    const m = reply.match(/<<TICKET>>\s*(\{[\s\S]*\})/);
    if (m) {
        try {
            ticketData.value = JSON.parse(m[1]);
        } catch {
            /* ignora JSON malformado */
        }
        reply = reply.replace(/<<TICKET>>[\s\S]*$/, "").trim();
    }
    messages.value.push({
        role: "assistant",
        content: reply || "Perfecto, tengo lo necesario.",
    });
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

            <div v-if="loading" class="text-muted small">Escribiendo…</div>

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
