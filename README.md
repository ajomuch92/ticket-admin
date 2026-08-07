# Ticket Admin

Sistema de administración de tickets de soporte. Astro 7 (SSR) + Vue 3, desplegado
en **Cloudflare Workers**, con MySQL a través de **Hyperdrive** y clasificación
automática de tickets con **Workers AI**.

Incluye:

- Dashboard privado (tickets, usuarios, departamentos, estados, prioridades, roles, permisos).
- Chat público de soporte (`/reportar`) que recopila los datos y crea el ticket.
- Consulta pública de un ticket por su id público (`/buscar`).
- Endpoint público `POST /api/ticket` — **es el que consume el flujo de n8n**.

---

## Requisitos

| Requisito | Versión / nota |
| :-- | :-- |
| Node.js | >= 22.12.0 |
| pnpm | 9+ (`corepack enable`) |
| MySQL | 8.x, accesible desde la máquina de desarrollo |
| Cuenta de Cloudflare | necesaria: los bindings `AI` y `HYPERDRIVE` se usan también en dev |

---

## Instalación

```sh
git clone <url-del-repo>
cd ticket-admin
pnpm install
```

### 1. Variables de entorno

Copia el ejemplo y rellena los valores reales:

```sh
cp .env.example .env
```

```dotenv
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_USER=root
DATABASE_PASSWORD=tu_password
DATABASE_NAME=ticket_admin

# Cadena de conexión que el binding HYPERDRIVE usa en local (dev). NO commitear.
CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE=mysql://root:tu_password@localhost:3306/ticket_admin
```

Las variables `DATABASE_*` las usa **drizzle-kit** (migraciones) y el script de
seed. La cadena `CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE` la usa
el runtime del Worker en desarrollo, porque la app **siempre** habla con MySQL a
través del binding Hyperdrive ([src/data/db.ts](src/data/db.ts)).

### 2. Base de datos

Crea la base y aplica el esquema de Drizzle:

```sh
mysql -u root -p -e "CREATE DATABASE ticket_admin CHARACTER SET utf8mb4;"
pnpm drizzle-kit push
```

El esquema vive en [src/data/schema/](src/data/schema/): `usuarios`, `roles`,
`permisos`, `roles_permisos`, `usuarios_roles`, `departamentos`, `estados`,
`prioridades`, `tickets`.

> **Importante:** `POST /api/ticket` falla con 400 si no hay al menos un
> **estado** y una **prioridad** dados de alta (usa el primero de cada uno como
> valor por defecto). Crea también los **departamentos**, que son los que la IA
> usa para clasificar el ticket y asignarlo al agente con menos carga.

### 3. Usuario administrador

```sh
pnpm seed:user admin@ejemplo.com admin1234 "Admin User"
```

Genera el hash PBKDF2 con el mismo formato que usa el login.

### 4. Cloudflare (bindings)

El binding de IA está declarado como remoto en [wrangler.jsonc](wrangler.jsonc)
(`"ai": { "binding": "AI", "remote": true }`), así que incluso en desarrollo las
llamadas al modelo salen contra Cloudflare. Autentícate una vez:

```sh
pnpm wrangler login
```

Para producción, crea tu propio Hyperdrive y reemplaza el `id` en `wrangler.jsonc`:

```sh
pnpm wrangler hyperdrive create ticket-admin --connection-string="mysql://usuario:password@host:3306/ticket_admin"
```

---

## Ejecución

```sh
pnpm dev       # http://localhost:4321
pnpm build     # build de producción a ./dist
pnpm preview   # sirve el build con el runtime de Workers
```

Despliegue:

```sh
pnpm build && pnpm wrangler deploy
```

### Rutas principales

| Ruta | Acceso | Descripción |
| :-- | :-- | :-- |
| `/login` | pública | Inicio de sesión (cookie `session`) |
| `/reportar` | pública | Chat de soporte que crea tickets |
| `/buscar` | pública | Consulta de un ticket por `idPublico` |
| `/dashboard/*` | requiere sesión | Administración (CRUDs) |
| `POST /api/chat` | pública | Chat con Workers AI (streaming SSE) |
| `POST /api/ticket` | pública | Creación de tickets — **usado por n8n** |

El control de acceso está en [src/middleware.ts](src/middleware.ts).

---

## Integración con n8n

El flujo de n8n vive fuera de este repositorio y se conecta contra el endpoint
público de creación de tickets: [src/pages/api/ticket.ts](src/pages/api/ticket.ts).

### Contrato del endpoint

```
POST https://<tu-dominio>/api/ticket
Content-Type: application/json
```

**Body**

| Campo | Tipo | Obligatorio | Notas |
| :-- | :-- | :-- | :-- |
| `nombre` | string | sí | se recorta a 100 caracteres |
| `email` | string | sí | se extrae el correo aunque venga embebido (`Ana <ana@x.com>`); máx. 150 |
| `titulo` | string | no | máx. 200; por defecto `"Reporte de soporte"` |
| `descripcion` | string | no | máx. 2000 |

**Respuesta 200**

```json
{ "id": 42, "idPublico": "f2c1e0a4-..." }
```

Usa `idPublico` para que el usuario dé seguimiento en `/buscar`.

**Errores 400:** `JSON inválido`, `Falta el nombre.`, `Correo inválido o ausente.`,
`No hay estados/prioridades configurados.`

### Qué hace el endpoint por su cuenta

1. Busca el usuario por correo; si no existe, crea uno **anónimo** (sin contraseña, inactivo).
2. Asigna el primer **estado** y la primera **prioridad** existentes.
3. Clasifica el ticket en un **departamento** con Workers AI (modelo
   `@cf/meta/llama-3.3-70b-instruct-fp8-fast`); si falla, usa el primer departamento activo.
4. Lo asigna al **agente con menos tickets** de ese departamento.
5. Genera el `idPublico` (UUID).

n8n solo necesita enviar los cuatro campos: no hay que resolver ids ni asignaciones.

### Configuración en n8n

Nodo **HTTP Request**:

- Method: `POST`
- URL: `https://<tu-dominio>/api/ticket`
- Body Content Type: `JSON`
- JSON:

```json
{
  "nombre": "{{ $json.nombre }}",
  "email": "{{ $json.email }}",
  "titulo": "{{ $json.titulo }}",
  "descripcion": "{{ $json.descripcion }}"
}
```

Prueba rápida desde consola:

```sh
curl -X POST http://localhost:4321/api/ticket \
  -H 'content-type: application/json' \
  -d '{"nombre":"Ana","email":"ana@ejemplo.com","titulo":"No puedo entrar al correo","descripcion":"Error de credenciales desde ayer"}'
```

> **Seguridad:** el endpoint es público y no valida ninguna credencial (el chat
> de `/reportar` lo llama desde el navegador). Si el flujo de n8n se expone a
> Internet, protégelo por delante (Cloudflare Access, WAF o rate limiting).

---

## Estructura

```text
src/
├── actions/            # Astro Actions (CRUD del dashboard, login, chat)
├── components/         # CrudManager.vue, SoporteChat.vue, Header/Sidebar
├── data/
│   ├── db.ts           # Drizzle sobre MySQL vía Hyperdrive (AsyncLocalStorage por request)
│   ├── schema/         # Tablas Drizzle
│   ├── repositories/   # Acceso a datos
│   └── validators/     # Esquemas Zod
├── layouts/
├── middleware.ts       # Sesión + apertura del contexto de DB
└── pages/
    ├── api/            # chat.ts (SSE) y ticket.ts (n8n)
    └── dashboard/
scripts/seed-user.mjs
```

## Comandos

| Comando | Acción |
| :-- | :-- |
| `pnpm install` | Instala dependencias |
| `pnpm dev` | Servidor local en `localhost:4321` |
| `pnpm build` | Build de producción a `./dist` |
| `pnpm preview` | Previsualiza el build |
| `pnpm seed:user` | Crea un usuario admin |
| `pnpm drizzle-kit push` | Aplica el esquema a MySQL |
| `pnpm wrangler deploy` | Despliega a Cloudflare Workers |
