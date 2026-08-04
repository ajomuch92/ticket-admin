<script setup lang="ts">
import { ref, watch, computed } from "vue";
import { actions } from "astro:actions";
import { randomString } from "complete-js-utils";
import { showToast, showCopyToast } from "../lib/toast";

type FieldType =
    | "text"
    | "textarea"
    | "number"
    | "select"
    | "select-number"
    | "checkbox"
    | "password"
    | "date";

interface Column {
    key: string; // admite ruta anidada "estado.nombre"
    label: string;
    align?: "center" | "end";
    /** Ancho máx en px: trunca con "…" y muestra el texto completo en el title. */
    truncate?: number;
}

interface FieldOption {
    value: string | number;
    label: string;
}

interface Field {
    key: string;
    label: string;
    type: FieldType;
    options?: FieldOption[];
    required?: boolean;
    lockOnEdit?: boolean;
    hideOnEdit?: boolean;
    generate?: boolean;
}

interface RowAction {
    label: string;
    actionName: string;
    confirm?: string;
    copyKey?: string;
    toastLabel?: string;
}

type Item = Record<string, any>;

interface Props {
    /** Clave del namespace en `actions` (ej: "roles", "tickets"). */
    entity: string;
    /** Etiqueta singular para títulos ("Rol", "Ticket"). */
    titular: string;
    /** Título plural para el encabezado ("Roles"). */
    plural: string;
    initialItems?: Item[];
    columns: Column[];
    fields: Field[];
    idKey?: string;
    /** Acción extra por fila; llama actions[entity][actionName]({ id }). */
    rowAction?: RowAction | null;
}

const props = withDefaults(defineProps<Props>(), {
    initialItems: () => [],
    idKey: "id",
    rowAction: null,
});

const PW_CHARS =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

const items = ref<Item[]>([...props.initialItems]);
const showForm = ref(false);
const editing = ref<Item | null>(null);
const form = ref<Record<string, any>>({});
const revealed = ref<Record<string, boolean>>({}); // por-campo: password visible o no
const error = ref("");
const saving = ref(false);
const dialog = ref<HTMLDialogElement | null>(null);

// actions se indexa por nombre dinámico: casteamos para el acceso genérico.
const ns = (): Record<string, any> =>
    (actions as unknown as Record<string, any>)[props.entity];

// Campos visibles: oculta los hideOnEdit cuando se está editando.
const visibleFields = computed(() =>
    props.fields.filter((fl) => !(editing.value && fl.hideOnEdit)),
);

// Modal de confirmación (reemplaza confirm() nativo). askConfirm devuelve Promise.
const confirmState = ref<{ show: boolean; message: string }>({
    show: false,
    message: "",
});
const confirmLoading = ref(false); // true mientras corre la operación confirmada
const confirmResolve = ref<((value: boolean) => void) | null>(null);
const confirmDialog = ref<HTMLDialogElement | null>(null);

function askConfirm(message: string): Promise<boolean> {
    return new Promise((resolve) => {
        confirmState.value = { show: true, message };
        confirmResolve.value = resolve;
    });
}
/** Botón "Confirmar": resuelve true y deja el modal abierto con spinner;
 *  el llamador lo cierra con closeConfirm() al terminar. */
function onConfirm(): void {
    confirmLoading.value = true;
    const r = confirmResolve.value;
    confirmResolve.value = null;
    r?.(true);
}
/** Cancelar / backdrop / Esc: no hace nada durante la operación. */
function onCancel(): void {
    if (confirmLoading.value) return;
    const r = confirmResolve.value;
    confirmResolve.value = null;
    confirmState.value = { show: false, message: "" };
    r?.(false);
}
function closeConfirm(): void {
    confirmLoading.value = false;
    confirmState.value = { show: false, message: "" };
}

watch(
    () => confirmState.value.show,
    (open) => {
        const d = confirmDialog.value;
        if (!d) return;
        if (open && !d.open) d.showModal();
        else if (!open && d.open) d.close();
    },
);

function generatePassword(key: string): void {
    form.value[key] = randomString(14, PW_CHARS);
    revealed.value[key] = true; // mostrar para que el admin la vea/copie
}

const getVal = (item: Item, key: string): unknown =>
    key.split(".").reduce<any>((o, k) => (o == null ? o : o[k]), item);

const alignClass = (c: Column): string =>
    c.align === "center" ? "text-center" : c.align === "end" ? "text-end" : "";

// Sincroniza el estado con el <dialog> nativo (showModal/close disparan la animación).
watch(showForm, (open) => {
    const d = dialog.value;
    if (!d) return;
    if (open && !d.open) d.showModal();
    else if (!open && d.open) d.close();
});

// Click en el backdrop (target === dialog) cierra.
function onDialogClick(e: MouseEvent): void {
    if (e.target === dialog.value) showForm.value = false;
}

function openCreate(): void {
    editing.value = null;
    const f: Record<string, any> = {};
    for (const fl of props.fields) f[fl.key] = fl.type === "checkbox" ? true : "";
    form.value = f;
    revealed.value = {};
    error.value = "";
    showForm.value = true;
}

function openEdit(item: Item): void {
    editing.value = item;
    const f: Record<string, any> = {};
    for (const fl of props.fields) {
        const v = getVal(item, fl.key);
        f[fl.key] = v == null ? (fl.type === "checkbox" ? false : "") : v;
    }
    form.value = f;
    revealed.value = {};
    error.value = "";
    showForm.value = true;
}

function buildPayload(): Record<string, any> {
    const p: Record<string, any> = {};
    for (const fl of props.fields) {
        // Campos bloqueados u ocultos en edición no se envían (ej. email, password).
        if (editing.value && (fl.lockOnEdit || fl.hideOnEdit)) continue;
        let v: any = form.value[fl.key];
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

async function reload(): Promise<void> {
    const { data } = await ns().list({});
    if (data) items.value = data;
}

async function save(): Promise<void> {
    saving.value = true;
    error.value = "";
    const payload = buildPayload();
    const current = editing.value;
    const { error: err } = current
        ? await ns().update({ [props.idKey]: current[props.idKey], ...payload })
        : await ns().create(payload);
    saving.value = false;
    if (err) {
        error.value = err.message || "Error al guardar";
        return;
    }
    await reload();
    showForm.value = false;
    showToast(`${props.titular} ${current ? "actualizado" : "creado"}`, "success");
}

async function remove(item: Item): Promise<void> {
    const ok = await askConfirm(
        `¿Eliminar ${props.titular.toLowerCase()} #${item[props.idKey]}?`,
    );
    if (!ok) return;
    // El modal sigue abierto con spinner mientras corre el delete.
    const { error: err } = await ns().delete({ [props.idKey]: item[props.idKey] });
    closeConfirm();
    if (err) {
        showToast(err.message || "Error al eliminar", "danger");
        return;
    }
    await reload();
    showToast(`${props.titular} eliminado`, "success");
}

async function runRowAction(item: Item): Promise<void> {
    const cfg = props.rowAction;
    if (!cfg) return;
    if (cfg.confirm && !(await askConfirm(cfg.confirm))) return;
    const { data, error: err } = await ns()[cfg.actionName]({
        [props.idKey]: item[props.idKey],
    });
    if (cfg.confirm) closeConfirm();
    if (err) {
        showToast(err.message || "Error", "danger");
        return;
    }
    const value = cfg.copyKey ? data?.[cfg.copyKey] : undefined;
    if (value) showCopyToast(cfg.toastLabel || "Resultado:", String(value));
    else showToast(cfg.toastLabel || "Listo", "success");
}
</script>

<template>
    <div class="card">
        <div class="card-header bg-body d-flex align-items-center justify-content-between">
            <h2 class="fs-6 fw-semibold m-0">{{ plural }}</h2>
            <button class="btn btn-primary btn-sm" @click="openCreate">
                Nuevo {{ titular }}
            </button>
        </div>

        <div class="table-responsive">
            <table class="table table-hover align-middle m-0 crud-table">
                <thead class="table-secondary">
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
                        <td
                            v-for="c in columns"
                            :key="c.key"
                            :class="alignClass(c)"
                            :data-label="c.label"
                        >
                            <span
                                v-if="typeof getVal(item, c.key) === 'boolean'"
                                class="badge"
                                :class="getVal(item, c.key) ? 'bg-success' : 'bg-secondary'"
                            >
                                {{ getVal(item, c.key) ? "Sí" : "No" }}
                            </span>
                            <span
                                v-else-if="c.truncate"
                                class="d-inline-block text-truncate align-bottom"
                                :style="`max-width: ${c.truncate}px`"
                                :title="String(getVal(item, c.key) ?? '')"
                            >
                                {{ getVal(item, c.key) ?? "—" }}
                            </span>
                            <template v-else>{{ getVal(item, c.key) ?? "—" }}</template>
                        </td>
                        <td class="text-end text-nowrap crud-acciones">
                            <button
                                v-if="rowAction"
                                class="btn btn-sm btn-link text-primary p-1"
                                @click="runRowAction(item)"
                            >
                                {{ rowAction.label }}
                            </button>
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
            <div class="card-header bg-body d-flex justify-content-between align-items-center">
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
                    <div v-for="fl in visibleFields" :key="fl.key" class="mb-3">
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
                                <button
                                    v-if="fl.generate"
                                    type="button"
                                    class="btn btn-outline-secondary"
                                    @click="generatePassword(fl.key)"
                                >
                                    Generar
                                </button>
                            </div>
                            <input
                                v-else
                                v-model="form[fl.key]"
                                :type="fl.type === 'number' ? 'number' : fl.type === 'date' ? 'date' : 'text'"
                                class="form-control"
                                :required="fl.required"
                                :disabled="Boolean(editing && fl.lockOnEdit)"
                                :readonly="Boolean(editing && fl.lockOnEdit)"
                            />
                            <div
                                v-if="editing && fl.lockOnEdit"
                                class="form-text"
                            >
                                No se puede modificar.
                            </div>
                        </template>
                    </div>
                    <div class="d-flex justify-content-end gap-2">
                        <button type="button" class="btn btn-light" @click="showForm = false">
                            Cancelar
                        </button>
                        <button type="submit" class="btn btn-primary" :disabled="saving">
                            <span
                                v-if="saving"
                                class="spinner-border spinner-border-sm me-1"
                                aria-hidden="true"
                            ></span>
                            {{ saving ? "Guardando…" : "Guardar" }}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </dialog>

    <!-- Modal de confirmación (reemplaza confirm() nativo) -->
    <dialog
        ref="confirmDialog"
        class="crud-dialog"
        @click="(e) => e.target === confirmDialog && onCancel()"
        @close="onCancel"
        @cancel="(e) => confirmLoading && e.preventDefault()"
    >
        <div class="card border-0">
            <div class="card-body">
                <p class="mb-3">{{ confirmState.message }}</p>
                <div class="d-flex justify-content-end gap-2">
                    <button
                        type="button"
                        class="btn btn-light"
                        :disabled="confirmLoading"
                        @click="onCancel"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        class="btn btn-primary"
                        :disabled="confirmLoading"
                        @click="onConfirm"
                    >
                        <span
                            v-if="confirmLoading"
                            class="spinner-border spinner-border-sm me-1"
                            aria-hidden="true"
                        ></span>
                        {{ confirmLoading ? "Procesando…" : "Confirmar" }}
                    </button>
                </div>
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

/* En móvil, cada fila se muestra como tarjeta (label: valor + acciones). */
@media (max-width: 767.98px) {
    .crud-table thead {
        display: none;
    }
    .crud-table tbody tr {
        display: block;
        border: 1px solid var(--bs-border-color);
        border-radius: 0.5rem;
        margin-bottom: 0.75rem;
        padding: 0.25rem 0.75rem;
    }
    .crud-table tbody td {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        text-align: right;
        border: none;
        padding: 0.45rem 0;
    }
    .crud-table tbody td:not(:last-child) {
        border-bottom: 1px solid var(--bs-border-color-translucent);
    }
    .crud-table tbody td::before {
        content: attr(data-label);
        font-weight: 600;
        color: var(--bs-secondary-color);
        text-align: left;
        margin-right: auto;
    }
    /* Celda de acciones: botones a lo ancho, sin etiqueta. */
    .crud-table tbody td.crud-acciones {
        justify-content: flex-end;
        gap: 0.25rem;
    }
    .crud-table tbody td.crud-acciones::before {
        content: none;
    }
    /* El título truncado se adapta al ancho de la tarjeta. */
    .crud-table tbody td .text-truncate {
        max-width: 60vw !important;
    }
}
</style>
