# Acceso a datos (Firestore) – Contrato y hooks

Este proyecto usa un enfoque centralizado para manejar fechas y conversiones entre UI y Firestore.

- Dominio/UI: usa `Date` en los modelos (`models/*`).
- Persistencia (Firestore): guarda `Timestamp` y `serverTimestamp()` para `creado_en`/`actualizado_en`.
- Conversión recursiva centralizada: `services/firebase/converters.ts` expone `toDb` (Date→Timestamp) y `toDomain` (Timestamp→Date).

## CRUD genérico

`services/firebase/crud.ts` implementa operaciones CRUD y aplica las conversiones automáticamente.

- `create`: usa `serverTimestamp()` para `creado_en/actualizado_en` y devuelve el documento formateado a dominio (`Date`).
- `update`: usa `serverTimestamp()` para `updatedAt` y convierte el payload con `toDb`.
- `getById`, `getAll`, `getWhere`: convierten los datos leídos a `Date`.

### Usuarios: documento con ID = uid (importante)

Las reglas de seguridad requieren que el documento de usuario viva en `usuarios/{uid}`. Usa el helper:

- `UsuarioService.createForCurrentUser(data)` crea/actualiza el perfil con `docId = uid` y completa los campos de sistema con `serverTimestamp()`.
- En el contexto de autenticación (`AuthContext`) la carga de perfil se hace con `UsuarioService.getById(uid)`.

## Hooks

Los hooks proporcionan una API ergonómica para consumo en la UI.

### useDoc

Lee un documento por colección e id. Modo realtime opcional.

```ts
import { useDoc } from '@/hooks'

const {
  data: usuario,
  loading,
  error,
  refetch,
} = useDoc<Usuario>('usuarios', userId, {
  listen: true, // realtime
})
```

- data: `T | undefined`
- loading: boolean
- error: string | undefined (`'NOT_FOUND'` si no existe)
- refetch(): Promise<void>

### useCollection

Lee una colección/consulta (Query). Modo realtime opcional.

```ts
import { query, collection, where, orderBy, limit } from 'firebase/firestore'
import { db } from '@/firebase.config'
import { useCollection } from '@/hooks'

const q = query(
  collection(db, 'paseos'),
  where('estado', '==', 'pendiente'),
  orderBy('creado_en', 'desc'),
  limit(20)
)

const {
  data: paseos,
  loading,
  error,
  refetch,
} = useCollection<Paseo>(q, {
  listen: true,
})
```

- data: `T[]`
- loading: boolean
- error: string | undefined
- refetch(): Promise<void>

### useCrud

Acceso CRUD tipado por colección. Internamente usa `BaseCrudService` y hereda las conversiones.

```ts
import { useCrud } from '@/hooks'

const { create, update, remove, getById, getAll, getWhere, loading, error } =
  useCrud<Mascota>('mascotas')

await create({ nombre: 'Fido', especie: 'perro' })
const lista = await getAll()
```

- `create(data)` devuelve `CrudResult<T>` (el documento con `Date`).
- `update(id, data)` idem.
- `remove(id)`, `getById(id)`, `getAll()`, `getWhere(field, value)` idem.

## Consultas con fechas

Cuando filtres por fechas, usa `Date` en la UI y deja que `getWhere` convierta a `Timestamp`:

```ts
const inicio = new Date('2025-11-01T00:00:00Z')
// getWhere('fecha_hora_inicio', inicio)
```

Si necesitas rangos, preferimos construir un `Query` y usar `useCollection` o agregar un helper específico en el servicio.

## Buenas prácticas

- `creado_en`/`actualizado_en`: siempre con `serverTimestamp()`.
- Evita llamar `.toDate()` en UI; la conversión es centralizada.
- Cancela listeners (`onSnapshot`) en unmount (los hooks ya lo hacen).
- Pagina con `limit`/`startAfter` cuando la colección crezca.
- Asegura índices compuestos cuando combines `where` + `orderBy`.

## Problemas comunes

- Evita envolver sentinelas de Firestore (`serverTimestamp()`/`FieldValue`) con `toDb`. Escribe esos objetos directamente. Ejemplo aplicado en `services/firebase/paseo-mascota.ts`.

## Paseos con múltiples mascotas

- Campos nuevos en `Paseo`:
  - `es_multiple?: boolean` — indica si admite varias mascotas.
  - `cupo_maximo_mascotas?: number` — cupo por paseo (no mayor al global).
  - `mascotas_count?: number` — contador mantenido en servidor.

- Subcolección: `paseos/{paseoId}/mascotas/{mascotaId}`
  - Documento por mascota (ID = `mascotaId`).
  - Campos: `estado_mascota`, `observaciones?`, `codigo_recogida?`, `codigo_entrega?`, `id_paseo`, timestamps/owner. El `mascotaId` es el ID del documento (ruta `.../mascotas/{mascotaId}`); `id_paseo` se guarda como conveniencia.

- Crear con N mascotas: `PaseoService.createConMascotas(data, mascotaIds)`
  - Valida propiedad de cada mascota y que `N ≤ min(MAX_GLOBAL, cupo_maximo_mascotas)`.
  - Crea subdocs y sete­a `mascotas_count = N`.

- Agregar una mascota luego: `addMascotaAlPaseo(paseoId, mascotaId)`
  - Transaccional: revisa estado (`pendiente/confirmado`), `es_multiple`, cupo, duplicado y propiedad; crea subdoc e incrementa `mascotas_count`.

- Reglas (resumen):
  - Dueño/paseador/admin pueden escribir.
  - Joiners (otros dueños) pueden crear subdoc si `es_multiple == true`, estado permite unir y son dueños de `mascotaId`.

- Comparar fechas con strings o milisegundos en Firestore no funcionará como esperas; usa `Date` y deja que `toDb` lo convierta a `Timestamp`.
- Si ves datos como `Timestamp` en la UI, probablemente pasaste por fuera del CRUD o de los hooks: usa `toDomain` si necesitas convertir manualmente.

## Errores e i18n

- Los servicios devuelven `CrudResult.error` con códigos conocidos (ver `constants/errors.ts`) o mensajes crudos.
- Para mostrar mensajes en UI usa el helper de i18n:
  - `tError(code)` cuando tienes un `ErrorCode` explícito.
  - `tErrorMaybe(codeOrMessage, fallback?)` cuando puedes recibir un código o un mensaje genérico.
- Ejemplos de uso en pantallas:
  - `screens/auth/Ingresar.tsx`, `screens/auth/Registro.tsx`, `screens/shared/MiCuenta.tsx`.
