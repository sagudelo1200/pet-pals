# Reglas de Firestore – Plan por fases

Este documento describe un plan incremental para reglas de seguridad, alineado con cómo el cliente escribe/lee datos.

## Principios

- Propiedad: todo documento tiene `creado_por = uid` del autor.
- Fechas del sistema: `creado_en`, `actualizado_en` son `timestamp` (el cliente usa `serverTimestamp()`).
- Dominio/UI trabaja con `Date` y la capa de datos convierte (ver `services/firebase/converters.ts`).

## Fase 1 (incluida en `firestore.rules`)

- Helpers: `isSignedIn`, `isAdmin` (vía doc `usuarios/{uid}`), `isOwner`.
- `usuarios/{uid}`: lectura propia y admin; create/update propias; `creado_en/por` inmutables.
- `perfil_publico/*`: lectura pública; create propia o admin (campos de sistema requeridos). En update se aplican reglas de inmutabilidad para `creado_en/creado_por`.
- `mascotas/*`: lectura del dueño; create forzando `id_usuario == uid`; inmutables `creado_en/creado_por` e `id_usuario`.
- `paseos/*`: lectura dueño, paseador asignado, admin; create dueño; bloquear cambios a `creado_por` (inmutable).

## Fase 2 (siguiente)

- Subcolección `paseos/{paseoId}/mascotas/{mascotaId}` para detalle por mascota.
- Reglas que hereden permisos del paseo padre.
- Paseo múltiple:
  - En `paseos/*` se añaden `es_multiple`, `cupo_maximo_mascotas` (≤ límite global) y `mascotas_count`.
  - Joiners (otros dueños) pueden crear subdocs si: `es_multiple == true`, estado ∈ {`pendiente`,`confirmado`} y son dueños de `mascotaId`.
  - El tope por paseo se valida en servicio (transacción con `increment`).
- Transiciones de estado de `paseos` (máquina de estados sencilla) con roles.

## Fase 3

- `valoraciones`: públicas en lectura; crear 1 por mascota por autor (ID determinístico `mascotaId_uid`).
- Validaciones de rango (rating 1..5) y referencias (paseo completado, relación con dueño/paseador).

## Cliente: cómo cumplir reglas

- No enviar `createdBy` de otro usuario; los servicios ya lo fuerzan al `uid` actual.
- No modificar `createdAt/createdBy`; el backend (CRUD + serverTimestamp) se encarga.
- `MascotaService.create`: no pases `id_usuario` distinto; será forzado al `uid`.
- `PaseoService.create`: se forzará `creado_por = uid`. La relación con mascotas se gestiona exclusivamente en la subcolección `paseos/{id}/mascotas`.

## Roles: documento vs claims

- De momento, `isAdmin()` consulta `usuarios/{uid}.roles`. Más adelante podemos migrar a Custom Claims para rendimiento y seguridad, sin romper reglas (dejaremos ambas rutas compatibles).

## Despliegue

- Usa Firebase CLI o CI para desplegar `firestore.rules`.
- Valida en staging antes de prod; define tests de reglas con emulador de Firebase si es posible.
