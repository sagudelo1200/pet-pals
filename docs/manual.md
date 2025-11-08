## Manual de integración (resumen rápido)

Este manual explica de forma simple y directa cómo usar los servicios y hooks principales del proyecto Pet Pals. Incluye qué hace cada método, sus entradas/salidas, errores esperados y ejemplos mínimos de ejecución.

Menos es más: aquí están las piezas que usarás y cómo actuar según sus respuestas.

---

## Contrato común

- La mayoría de los servicios devuelven un objeto tipo CrudResult<T> o AuthResult:
  - { success: boolean, data?: T, user?: {...}, error?: ErrorCode }
  - Siempre comprueba `result.success` antes de usar `data`/`user`.
- Los hooks exponen además `loading: boolean` y `error?: string` (código ERR).
- Los errores son códigos string definidos en `constants/errors.ts` (p. ej. `NO_AUTENTICADO`, `DOCUMENTO_NO_ENCONTRADO`, `AUTH_INVALID_CREDENTIALS`, `ERROR_DESCONOCIDO`).

---

## Errores (lista breve)

Valores comunes en `ERR` y cuándo aparecen (resumen):

- NO_AUTENTICADO: cuando se requiere usuario (ej. crear mascota) y no hay sesión.
- PERMISOS_INSUFICIENTES: acceso bloqueado por reglas/permiso.
- DOCUMENTO_NO_ENCONTRADO: obtenerPorId no encontró documento.
- DUENO_NO_COINCIDE: al crear/editar una mascota, si se intenta asignar otro dueño.
- AUTH\_\* (AUTH_INVALID_CREDENTIALS, AUTH_USER_NOT_FOUND, AUTH_EMAIL_IN_USE, AUTH_WEAK_PASSWORD, AUTH_TOO_MANY_REQUESTS, AUTH_USER_DISABLED, AUTH_INVALID_EMAIL, AUTH_NETWORK_ERROR): errores mapeados desde Firebase Auth.
- ERROR_DESCONOCIDO: fallback para errores no mapeados.

Usa estos códigos para mostrar mensajes al usuario o lógica condicional.

---

## Servicios principales

### ServicioAuth (services/firebase/auth.ts)

- Métodos:
  - registrarConCorreo(email, password, displayName): Promise<AuthResult>
    - Crea usuario en Firebase Auth, actualiza displayName y crea documento en Firestore (`usuarios/{uid}`).
    - Respuesta: { success: true, user } o { success: false, error }
    - Errores: AUTH_EMAIL_IN_USE, AUTH_WEAK_PASSWORD, ERROR_DESCONOCIDO, etc.
  - ingresarConCorreo(email, password): Promise<AuthResult>
    - Login; implementa un mínimo artificial de tiempo de respuesta (3s) para UX.
    - Errores: AUTH_INVALID_CREDENTIALS, AUTH_USER_NOT_FOUND, etc.
  - cerrarSesion(): Promise<AuthResult>
    - Cierra sesión.
  - obtenerUsuarioActual(): User | null
    - Devuelve usuario de Firebase Auth (sin llamar a la red).
  - escucharEstadoAuth(callback): Unsubscribe
    - Suscribe al cambio de estado de autenticación.

Ejemplo de uso:

```ts
const res = await ServicioAuth.ingresarConCorreo('a@a.com', 'pass')
if (!res.success) {
  // res.error es un código ERR
}
```

Recomendación práctica: preferir usar el contexto `useAuth()` (ver más abajo) en componentes UI.

### Usuario (ServicioUsuario)

- Métodos para manipular documentos de usuario (creación por UID, getById, etc.).
- Errores: típicamente `DOCUMENTO_NO_ENCONTRADO` o `ERROR_DESCONOCIDO`.

### ServicioCrudBase (services/firebase/crud.ts)

- CRUD genérico para cualquier colección.
- Métodos:
  - crear<T>(collectionName, data): Promise<CrudResult<T>>
  - obtenerPorId<T>(collectionName, id): Promise<CrudResult<T>>
  - actualizar<T>(collectionName, id, data): Promise<CrudResult<T>>
  - eliminar(collectionName, id): Promise<CrudResult<boolean>>
  - obtenerTodos<T>(collectionName): Promise<CrudResult<T[]>>
  - buscar<T>(collectionName, field, value): Promise<CrudResult<T[]>>

- Comportamiento clave:
  - Normaliza fechas y usuarios (usa `nowServerTimestamp`, `toDb`/`toDomain`).
  - Captura errores y retorna `{ success: false, error: ErrorCode }` en vez de lanzar.
  - `getById` retorna `DOCUMENTO_NO_ENCONTRADO` si no existe.

Cómo usar (ejemplo rápido):

```ts
const r = await ServicioCrudBase.obtenerPorId('mascotas', 'abc123')
if (r.success) {
  /* r.data */
} else {
  /* r.error */
}
```

### ServicioMascota (services/firebase/mascota.ts)

- Colección: `mascotas`.
- Métodos específicos:
  - crear(data): crea mascota, marca `creado_por` con UID actual; si no hay sesión devuelve `NO_AUTENTICADO`.
  - obtenerPorId(id), actualizar(id, data), eliminar(id), obtenerTodos(), obtenerPorUsuario(userId), obtenerPorTamano(tamano)

- Comportamientos importantes:
  - `create` valida que el `creado_por` coincida con el usuario actual (si se pasa); si no, devuelve `DUENO_NO_COINCIDE`.
  - Por defecto, `activo` se pone en `true` si no se especifica.

Ejemplo:

```ts
const res = await ServicioMascota.crear({
  nombre: 'Firulais',
  especie: 'perro',
})
if (!res.success) {
  /* manejar res.error */
}
```

---

## Hooks (uso en componentes)

### useAuth / AuthProvider (`services/context/AuthContext.tsx`)

- Debe envolver la app: `<AuthProvider>{children}</AuthProvider>`.
- Hook: `const { user, cargando, ingresar, registrar, cerrarSesion, roles, profile, hasRole, recargarPerfil } = useAuth()`
- Notas:
  - `ingresar`, `registrar`, `cerrarSesion` devuelven `AuthResult` (mismo contrato que ServicioAuth).
  - `cargando` está ligado tanto a estado de auth como a operaciones explícitas de ingresar/registrar.
  - `profile` y `roles` se cargan desde Firestore cuando hay usuario.

Ejemplo mínimo:

```tsx
const { user, ingresar, cargando, error } = useAuth()
await ingresar(email, password)
```

### useCrud(collectionName) (`hooks/useCrud.ts`)

- Retorna: { crear, actualizar, eliminar, obtenerPorId, obtenerTodos, buscar, loading, error }
- `loading` y `error` gestionados internamente. Cada acción devuelve el `CrudResult` del servicio subyacente.
- Nota importante: los métodos devuelven objetos `{ success: false, error }` en errores esperados — revisa `result.success`.

Ejemplo:

```tsx
const { create, loading, error } = useCrud<Mascota>('mascotas')
const res = await create({ nombre: 'X' })
if (!res.success) console.log(res.error)
```

### useMascotasDelUsuario (hooks/useMascotas.ts)

- Retorna: { mascotas, loading, error, refetch }.
- Comportamiento:
  - Usa `useCollection` con un query por `creado_por === user.uid`.
  - Por defecto `listen: true` (realtime).
  - Si `auth` ya resolvió y no hay usuario, expone `NO_AUTENTICADO` en `error`.

Ejemplo:

```tsx
const { mascotas, loading, error, refetch } = useMascotasDelUsuario()
```

### useMascotaActions (hooks/useMascotaActions.ts)

- Retorna: { create, update, remove, loading, error } (API orientada a UI).
- Internamente usa `ServicioMascota`.
- `create` no pide `creado_por` (se infiere del usuario actual).

Ejemplo:

```tsx
const { create, loading, error } = useMascotaActions()
const res = await create({ nombre: 'Coco', especie: 'gato' })
if (!res.success) alert(res.error)
```

---

## Buenas prácticas y notas rápidas

- Siempre comprobar `result.success` antes de confiar en `result.data` o `result.user`.
- Para UI, preferir los hooks (`useAuth`, `useCrud`, `useMascotasDelUsuario`, `useMascotaActions`) en lugar de llamar a los servicios directamente; los hooks manejan `loading`/`error` y adaptación a la UI.
- Los servicios intentan no lanzar (devuelven objetos con `success:false`) — use try/catch si espera excepciones imprevistas.
- Si necesita manejar errores legibles, convierta códigos ERR a mensajes de usuario en la capa de UI (i18n). Hay mapeos en `services/firebase/errors.ts`.

---

## Cómo probar rápidamente (checklist)

1. Asegúrate de envolver la app con `<AuthProvider>` en `App.tsx` o `index.tsx`.
2. Inicia la app (Expo / React Native según tu flujo).
3. Usar la pantalla de registro: llamar a `registrar(email,password,name)` desde `useAuth` y confirmar que el doc usuario se creó.
4. Crear una mascota: usar `useMascotaActions().create(...)` y comprobarla en `useMascotasDelUsuario()`.
5. Probar casos de error: intentar `ServicioMascota.crear` sin estar autenticado (debe devolver `NO_AUTENTICADO`).

---

## Archivos relevantes (rápido)

- `services/firebase/auth.ts` — ServicioAuth (ingresar/registrar/cerrarSesion)
- `services/firebase/crud.ts` — ServicioCrudBase (create/get/update/delete/getWhere/getAll)
- `services/firebase/mascota.ts` — ServicioMascota (lógica específica de mascotas)
- `services/firebase/errors.ts` — mapFirebaseError (mapeo a `ERR`)
- `services/context/AuthContext.tsx` — AuthProvider / useAuth
- `hooks/useCrud.ts`, `hooks/useMascotas.ts`, `hooks/useMascotaActions.ts` — hooks de uso en componentes.

---

Si quieres, puedo:

- Añadir ejemplos de UI más completos (componentes de creación/edición para mascotas).
- Añadir una tabla traducida de códigos ERR → mensajes i18n.
- Generar tests unitarios mínimos para `ServicioMascota` y `useMascotaActions`.

Indica qué prefieres y lo implemento como siguiente paso.
