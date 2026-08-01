<script setup>
import { ref, watch } from "vue";
import { actions } from "astro:actions";

const props = defineProps({
    /** Clave del namespace en `actions` (ej: "roles", "tickets"). */
    entity: { type: String, required: true },
    /** Etiqueta singular para títulos ("Rol", "Ticket"). */
    titular: { type: String, required: true },
    /** Título plural para el encabezado ("Roles"). */
    plural: { type: String, required: true },
    initialItems: { type: Array, default: () => [] },
    /** Columnas: { key, label, align? }. key admite ruta anidada "estado.nombre". */
    columns: { type: Array, required: true },
    /** Campos del formulario: { key, label, type, options?, required? }. */
    fields: { type: Array, required: true },
    idKey: { type: String, default: "id" },
});

const items = ref([...props.initialItems]);
const showForm = ref(false);
const editing = ref(null);
const form = ref({});
const revealed = ref({}); // por-campo: password visible o no
const error = ref("");
const saving = ref(false);
const dialog = ref(null);

const ns = () => actions[props.entity];

const getVal = (item, key) =>
    key.split(".").reduce((o, k) => (o == null ? o : o[k]), item);

const alignClass = (c) =>
    c.align === "center" ? "text-center" : c.align === "end" ? "text-end" : "";

// Sincroniza el estado con el <dialog> nativo (showModal/close disparan la animación).
watch(showForm, (open) => {
    const d = dialog.value;
    if (!d) return;
    if (open && !d.open) d.showModal();
    else if (!open && d.open) d.close();
});

// Click en el backdrop (target === dialog) cierra.
function onDialogClick(e) {
    if (e.target === dialog.value) showForm.value = false;
}

function openCreate() {
    editing.value = null;
    const f = {};
    for (const fl of props.fields) f[fl.key] = fl.type === "checkbox" ? true : "";
    form.value = f;
    revealed.value = {};
    error.value = "";
    showForm.value = true;
}

function openEdit(item) {
    editing.value = item;
    const f = {};
    for (const fl of props.fields) {
        const v = getVal(item, fl.key);
        f[fl.key] = v == null ? (fl.type === "checkbox" ? false : "") : v;
    }
    form.value = f;
    revealed.value = {};
    error.value = "";
    showForm.value = true;
}

function buildPayload() {
    const p = {};
    for (const fl of props.fields) {
        let v = form.value[fl.key];
        if (fl.type === "number" || fl.type === "select-number") {
            v = v === "" || v == null ? undefined : Number(v);
        } else if (fl.type === "checkbox") {
            v = !!v;
        } else if (typeof v === "string") {
            v = v.trim();
            if (v === "" && !fl.required) v = undefined;
        }
        if (v !== undefined) p[fl.key] = v;
    }
    return p;
}

async function reload() {
    const { data } = await ns().list({});
    if (data) items.value = data;
}

async function save() {
    saving.value = true;
    error.value = "";
    const payload = buildPayload();
    const { error: err } = editing.value
        ? await ns().update({ [props.idKey]: editing.value[props.idKey], ...payload })
        : await ns().create(payload);
    saving.value = false;
    if (err) {
        error.value = err.message || "Error al guardar";
        return;
    }
    await reload();
    showForm.value = false;
}

async function remove(item) {
    if (!confirm(`¿Eliminar ${props.titular.toLowerCase()} #${item[props.idKey]}?`)) return;
    const { error: err } = await ns().delete({ [props.idKey]: item[props.idKey] });
    if (err) {
        alert(err.message || "Error al eliminar");
        return;
    }
    await reload();
}
</script>

<template>
    <div class="card">
        <div class="card-header bg-white d-flex align-items-center justify-content-between">
            <h2 class="fs-6 fw-semibold m-0">{{ plural }}</h2>
            <button class="btn btn-primary btn-sm" @click="openCreate">
                Nuevo {{ titular }}
            </button>
        </div>

        <div class="table-responsive">
            <table class="table table-hover align-middle m-0">
                <thead class="table-light">
                    <tr>
                        <th
                            v-for="c in columns"
                            :key="c.key"
                            class="text-uppercase small text-secondary"
                            :class="alignClass(c)"
                        >
                            {{ c.label }}
                        </th>
                        <th class="text-uppercase small text-secondary text-end">
                            Acciones
                        </th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-if="items.length === 0">
                        <td :colspan="columns.length + 1" class="text-center text-muted py-4">
                            Sin registros
                        </td>
                    </tr>
                    <tr v-for="item in items" :key="item[idKey]">
                        <td v-for="c in columns" :key="c.key" :class="alignClass(c)">
                            <span
                                v-if="typeof getVal(item, c.key) === 'boolean'"
                                class="badge"
                                :class="getVal(item, c.key) ? 'bg-success' : 'bg-secondary'"
                            >
                                {{ getVal(item, c.key) ? "Sí" : "No" }}
                            </span>
                            <template v-else>{{ getVal(item, c.key) ?? "—" }}</template>
                        </td>
                        <td class="text-end text-nowrap">
                            <button
                                class="btn btn-sm btn-link text-secondary p-1"
                                @click="openEdit(item)"
                            >
                                Editar
                            </button>
                            <button
                                class="btn btn-sm btn-link text-danger p-1"
                                @click="remove(item)"
                            >
                                Borrar
                            </button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>

    <!-- Modal nativo: <dialog> con backdrop y animación CSS -->
    <dialog ref="dialog" class="crud-dialog" @click="onDialogClick" @close="showForm = false">
        <div class="card border-0">
            <div class="card-header bg-white d-flex justify-content-between align-items-center">
                <h3 class="fs-6 fw-semibold m-0">
                    {{ editing ? "Editar" : "Nuevo" }} {{ titular }}
                </h3>
                <button
                    type="button"
                    class="btn-close"
                    aria-label="Cerrar"
                    @click="showForm = false"
                ></button>
            </div>
            <div class="card-body">
                <div v-if="error" class="alert alert-danger py-2">{{ error }}</div>
                <form @submit.prevent="save">
                    <div v-for="fl in fields" :key="fl.key" class="mb-3">
                        <template v-if="fl.type === 'checkbox'">
                            <div class="form-check">
                                <input
                                    :id="'chk-' + fl.key"
                                    v-model="form[fl.key]"
                                    type="checkbox"
                                    class="form-check-input"
                                />
                                <label class="form-check-label" :for="'chk-' + fl.key">
                                    {{ fl.label }}
                                </label>
                            </div>
                        </template>
                        <template v-else>
                            <label class="form-label fw-medium">{{ fl.label }}</label>
                            <textarea
                                v-if="fl.type === 'textarea'"
                                v-model="form[fl.key]"
                                class="form-control"
                                rows="3"
                            ></textarea>
                            <select
                                v-else-if="fl.type === 'select' || fl.type === 'select-number'"
                                v-model="form[fl.key]"
                                class="form-select"
                            >
                                <option value="">— Seleccionar —</option>
                                <option v-for="o in fl.options" :key="o.value" :value="o.value">
                                    {{ o.label }}
                                </option>
                            </select>
                            <!-- Password con ojito show/hide -->
                            <div v-else-if="fl.type === 'password'" class="input-group">
                                <input
                                    v-model="form[fl.key]"
                                    :type="revealed[fl.key] ? 'text' : 'password'"
                                    class="form-control"
                                    :required="fl.required"
                                />
                                <button
                                    type="button"
                                    class="btn btn-outline-secondary d-flex align-items-center"
                                    :aria-label="revealed[fl.key] ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                                    @click="revealed[fl.key] = !revealed[fl.key]"
                                >
                                    <svg
                                        v-if="!revealed[fl.key]"
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="18"
                                        height="18"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        stroke-width="2"
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                    >
                                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                                        <circle cx="12" cy="12" r="3" />
                                    </svg>
                                    <svg
                                        v-else
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="18"
                                        height="18"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        stroke-width="2"
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                    >
                                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 8 10 8a13.16 13.16 0 0 1-1.67 2.68" />
                                        <path d="M6.61 6.61A13.5 13.5 0 0 0 2 12s3 8 10 8a9.7 9.7 0 0 0 5.39-1.61" />
                                        <line x1="2" x2="22" y1="2" y2="22" />
                                    </svg>
                                </button>
                            </div>
                            <input
                                v-else
                                v-model="form[fl.key]"
                                :type="fl.type === 'number' ? 'number' : fl.type === 'date' ? 'date' : 'text'"
                                class="form-control"
                                :required="fl.required"
                            />
                        </template>
                    </div>
                    <div class="d-flex justify-content-end gap-2">
                        <button type="button" class="btn btn-light" @click="showForm = false">
                            Cancelar
                        </button>
                        <button type="submit" class="btn btn-primary" :disabled="saving">
                            {{ saving ? "Guardando…" : "Guardar" }}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </dialog>
</template>

<style scoped>
.crud-dialog {
    width: 100%;
    max-width: 480px;
    padding: 0;
    border: none;
    border-radius: 0.5rem;
    overflow: hidden;
    box-shadow: 0 1rem 3rem rgba(0, 0, 0, 0.175);

    /* Estado cerrado (para la animación de salida) */
    opacity: 0;
    transform: translateY(-12px) scale(0.97);
    transition:
        opacity 0.18s ease,
        transform 0.18s ease,
        overlay 0.18s ease allow-discrete,
        display 0.18s ease allow-discrete;
}

.crud-dialog[open] {
    opacity: 1;
    transform: translateY(0) scale(1);
}

/* Estado inicial al abrir (animación de entrada) */
@starting-style {
    .crud-dialog[open] {
        opacity: 0;
        transform: translateY(-12px) scale(0.97);
    }
}

.crud-dialog::backdrop {
    background: rgba(0, 0, 0, 0);
    transition:
        background 0.18s ease,
        overlay 0.18s ease allow-discrete,
        display 0.18s ease allow-discrete;
}

.crud-dialog[open]::backdrop {
    background: rgba(0, 0, 0, 0.5);
}

@starting-style {
    .crud-dialog[open]::backdrop {
        background: rgba(0, 0, 0, 0);
    }
}
</style>
