# Catálogo de errores y cuándo ocurren

Este documento lista los códigos de error del dominio y una breve descripción de cuándo pueden ocurrir. Los mensajes visibles al usuario se traducen vía i18n (namespace `errors`). Para obtener el texto legible en la UI, usa `t('errors:CODIGO')`, el helper `tError(CODIGO)` o, cuando recibas códigos/strings mixtos desde servicios, el helper `tErrorMaybe(codeOrMessage)`.

Traducciones: `services/i18n/locales/es/errors.json`. Helpers y setup: `services/i18n/index.ts`.

- NO_AUTENTICADO
  - Cuándo: Cuando no hay un usuario autenticado al intentar crear recursos o unirse a un paseo.
  - Origen: `MascotaService.create`, `PaseoService.create`, `PaseoService.createConMascotas`, `addMascotasAlPaseo`, `addMascotaAlPaseo`.

- MASCOTA_REQUERIDA
  - Cuándo: Al intentar crear/agregar una mascota a un paseo cuando falta el identificador de mascota.
  - Origen: `PaseoService.create`, `addMascotaAlPaseo`.

- MASCOTAS_REQUERIDAS
  - Cuándo: Al crear un paseo múltiple sin pasar al menos una mascota.
  - Origen: `PaseoService.createConMascotas`.

- MASCOTA_NO_ENCONTRADA
  - Cuándo: El id de la mascota no corresponde a un documento existente.
  - Origen: `PaseoService.create`, `PaseoService.createConMascotas`, `addMascotaAlPaseo`.

- MASCOTA_NO_PERTENECE_AL_USUARIO
  - Cuándo: La mascota no es propiedad del usuario autenticado.
  - Origen: `PaseoService.create`, `PaseoService.createConMascotas`, `addMascotaAlPaseo`.

- PASEO_NO_ENCONTRADO
  - Cuándo: Se intenta unirse a un paseo inexistente.
  - Origen: `addMascotaAlPaseo`.

- PASEO_NO_ES_MULTIPLE
  - Cuándo: Se intenta agregar una mascota adicional a un paseo que no admite múltiples mascotas.
  - Origen: `addMascotaAlPaseo`.

- ESTADO_DEL_PASEO_NO_ACEPTA_MASCOTAS
  - Cuándo: El estado actual del paseo no permite agregar nuevas mascotas (por ejemplo, ya iniciado o finalizado).
  - Origen: `addMascotaAlPaseo`.

- LIMITE_DE_MASCOTAS_SUPERADO
  - Cuándo: Se alcanza el límite máximo de mascotas permitidas para el paseo (mínimo entre el global y el por paseo).
  - Origen: `PaseoService.createConMascotas`, `addMascotaAlPaseo`.

- MASCOTA_YA_AGREGADA
  - Cuándo: Se intenta agregar una mascota que ya participa en el paseo.
  - Origen: `addMascotaAlPaseo`.

- DUENO_NO_COINCIDE
  - Cuándo: Al crear una mascota con `id_usuario` distinto del usuario autenticado.
  - Origen: `MascotaService.create`.

- ERROR_DESCONOCIDO
  - Cuándo: Fallback genérico cuando no se dispone de un mensaje específico del error capturado.
  - Origen: bloques `catch` de servicios.

## Autenticación (Firebase Auth)

Los errores de Firebase Auth se mapean en `services/firebase/auth.ts` a códigos de dominio (`constants/errors.ts`) y se traducen con `tErrorMaybe(res.error)` desde la UI.

- AUTH_INVALID_CREDENTIALS
  - Cuándo: Credenciales inválidas al ingresar (wrong-password, invalid-credential).
  - Origen: `AuthService.login`

- AUTH_USER_NOT_FOUND
  - Cuándo: No existe una cuenta con ese correo.
  - Origen: `AuthService.login`

- AUTH_EMAIL_IN_USE
  - Cuándo: Ya existe un usuario con ese correo.
  - Origen: `AuthService.register`

- AUTH_WEAK_PASSWORD
  - Cuándo: La contraseña no cumple los requisitos mínimos.
  - Origen: `AuthService.register`

- AUTH_OPERATION_NOT_ALLOWED
  - Cuándo: La operación no está habilitada en el proyecto.
  - Origen: `AuthService.register` o `login`

- AUTH_TOO_MANY_REQUESTS
  - Cuándo: Demasiados intentos en un corto periodo.
  - Origen: `AuthService.login` o `register`

- AUTH_USER_DISABLED
  - Cuándo: La cuenta ha sido deshabilitada por un administrador.
  - Origen: `AuthService.login`

- AUTH_INVALID_EMAIL
  - Cuándo: El formato del correo no es válido.
  - Origen: `AuthService.login` o `register`

- AUTH_NETWORK_ERROR
  - Cuándo: Error de red del cliente.
  - Origen: `AuthService.login` o `register`

### Ejemplo de uso en UI

```ts
import { tErrorMaybe } from '@/services/i18n'

const res = await AuthService.login(email, password)
if (!res.ok) {
  const message = tErrorMaybe(res.error)
  setFormError(message)
}
```
