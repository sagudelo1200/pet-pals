# ANÁLISIS EXHAUSTIVO DEL CÓDIGO FUENTE — Paw-Path NATIVE

**Fecha del análisis:** 2026-07-05  
**Objetivo:** Diferenciar IMPLEMENTACIÓN REAL vs TODO/ASPIRACIONES  
**Nivel de detalle:** HECHOS verificables en código

---

## 1. MODELOS DE DATOS (en `/models`)

### 1.1 USUARIO

**Archivo:** [models/Usuario.ts](models/Usuario.ts)

**Campos REALES (definidos e implementados):**

- `nombre: string` ✅ **REQUERIDO**
- `foto?: string` (URL) ✅ **OPCIONAL**
- `correo: string` ✅ **REQUERIDO**
- `celular: string` ✅ **REQUERIDO** — Formato internacional recomendado
- `fecha_nacimiento?: Date` ✅ **OPCIONAL**
- `ubicaciones?: UbicacionRef[]` ✅ **OPCIONAL** — Array de referencias geocodificadas
- `id_ubicacion_principal?: string` ✅ **OPCIONAL** — ID para consultas rápidas
- `zona?: string` ✅ **OPCIONAL** — Texto libre
- `roles: RolUsuario[]` ✅ **REQUERIDO** — Array: `'admin' | 'tutor' | 'cuidador' | 'explorador'`
- `documento_identidad?: DocumentoIdentidad` ✅ **OPCIONAL** — Tipos soportados: `NUIP`, `CC`, `CE`, `Pasaporte`
- `verificado: boolean` ✅ **REQUERIDO**
- `estado: EstadoUsuario` ✅ **REQUERIDO** — `'activo' | 'inactivo' | 'baneado'`

**Validaciones presentes:**

- ✅ Roles validados en token + documento de usuario (Firestore Rules)
- ✅ Campo `creado_por` debe coincidir con `request.auth.uid`
- ❌ **NO hay validación de edad** (fecha_nacimiento es opcional, sin restricciones)
- ❌ **NO hay validación de formato de celular**
- ❌ **NO hay verificación de documento de identidad** (almacenado pero no verificado)

**Ubicación en BD:**

- Colección Firestore: `/usuarios/{uid}`
- uid = Firebase Auth UID

---

### 1.2 MASCOTA

**Archivo:** [models/Mascota.ts](models/Mascota.ts)

**Campos de identificación:**

- `nombre: string` ✅ **REQUERIDO**
- `foto?: string` ✅ **OPCIONAL**

**Campos de características físicas:**

- `especie: EspecieMascota` ✅ **REQUERIDO** — Actualmente solo `'perro'`
- `raza?: string` ✅ **OPCIONAL**
- `fecha_nacimiento?: Date` ✅ **OPCIONAL**
- `genero?: GeneroMascota` ✅ **OPCIONAL** — `'macho' | 'hembra'`
- `tamano?: TamanoMascota` ✅ **OPCIONAL** — `'pequeño' | 'mediano' | 'grande' | 'gigante'`
- `peso?: number` ✅ **OPCIONAL** — En kg
- `esterilizado?: boolean` ✅ **OPCIONAL**

**Campos de salud:**

- `vacunas?: VacunaMascota[]` ✅ **OPCIONAL** — Array de {nombre, fecha}
- `condiciones_salud?: string[]` ✅ **OPCIONAL** — Texto libre
- `alergias?: string[]` ✅ **OPCIONAL** — Texto libre
- `medicamentos?: string[]` ✅ **OPCIONAL** — Texto libre

**Campos de comportamiento/compatibilidad:**

- `nivel_energia?: NivelEnergia` ✅ **OPCIONAL** — `'bajo' | 'medio' | 'alto'`
- `socializacion?: NivelComportamiento` ✅ **OPCIONAL** — Nivel de socialización
- `ansiedad?: NivelComportamiento` ✅ **OPCIONAL**
- `reactividad?: NivelComportamiento` ✅ **OPCIONAL**
- `compatibilidad_paseo?: CompatibilidadPaseo` ✅ **OPCIONAL** — Versión del tutor + observaciones de cuidadores

**Validaciones presentes:**

- ✅ `creado_por` debe ser uid del tutor
- ✅ Solo campos específicos permitidos en updates
- ❌ **NO hay validación de tipos de especie** (modelo permite, pero reglas aceptan todos)
- ❌ **NO hay validación de edad mínima/máxima**
- ❌ **NO hay auditoría de cambios en salud**

**Ubicación en BD:**

- Colección Firestore: `/mascotas/{id}`
- Campo `creado_por` = ID del tutor

---

### 1.3 PASEO

**Archivo:** [models/Paseo.ts](models/Paseo.ts)

**Campos de identificación y asignación:**

- `id_cuidador?: string` ✅ **OPCIONAL** — UID del cuidador asignado (puede ser null inicialmente)
- `tipo_paseo: TipoPaseo` ✅ **REQUERIDO** — `'solicitado' | 'programado'`
- `modalidad?: ModalidadPaseo` ✅ **OPCIONAL** — `'privado' | 'compartido'` (permite otros tutores)

**Campos de mascotas:**

- `mascota_ids?: string[]` ✅ **OPCIONAL** — IDs de mascotas participantes
- `tutor_ids?: string[]` ✅ **OPCIONAL** — IDs de tutores (en paseos compartidos)
- `mascotas_count?: number` ✅ **OPCIONAL** — Contador
- `cupo_maximo_mascotas?: number` ✅ **OPCIONAL**
- `mascota_nombre_visual?: string` ✅ **OPCIONAL** — Para listas
- `mascota_foto_visual?: string` ✅ **OPCIONAL** — Para listas
- `mascotas_fotos_visual?: string[]` ✅ **OPCIONAL** — Hasta 4 fotos

**Campos de servicio:**

- `fecha_hora_inicio: Date` ✅ **REQUERIDO**
- `duracion_estimada: number` ✅ **REQUERIDO** — En minutos
- `duracion_real?: number` ✅ **OPCIONAL**
- `precio: number` ✅ **REQUERIDO** — En moneda local
- `estado: ESTADOS_PASEO` ✅ **REQUERIDO** — Enum con 9 estados

**Estados de paseo definidos (Enum `ESTADOS_PASEO`):**

```
PENDIENTE → CONFIRMADO → EN_CAMINO → EN_PUNTO_RECOGIDA → EN_PROGRESO → FINALIZADO → COMPLETADO
                                   ↳                 ↗ (ruta alternativa)
```

- ✅ Transiciones validadas en Firestore Rules

**Campos de ubicación:**

- `ubicacion_inicio?: UbicacionSnapshot | string` ✅ **OPCIONAL**
- `ubicacion_fin?: UbicacionSnapshot | string` ✅ **OPCIONAL**
- `ubicacion_inicio_txt?: string` ✅ **OPCIONAL** — Texto legible
- `ubicacion_fin_txt?: string` ✅ **OPCIONAL** — Texto legible
- `tracking_gps?: string` ✅ **OPCIONAL** — Referencia a documento de tracking

**Campos de validación de recogida/entrega (POR TUTOR):**

- `codigos_recogida_por_tutor?: Record<string, string>` ✅ **OPCIONAL** — {tutorId: codigo_6_digitos}
- `codigo_recogida_validado_por_tutor?: Record<string, boolean>` ✅ **OPCIONAL**
- `timestamp_validacion_recogida_por_tutor?: Record<string, Date>` ✅ **OPCIONAL**
- `intentos_fallidos_recogida_por_tutor?: Record<string, number>` ✅ **OPCIONAL**
- `codigos_entrega_por_tutor?: Record<string, string>` ✅ **OPCIONAL**
- `codigo_entrega_validado_por_tutor?: Record<string, boolean>` ✅ **OPCIONAL**

**Campos de transporte:**

- `modo_transporte_actual?: 'walking' | 'driving'` ✅ **OPCIONAL** — Seleccionado por cuidador durante EN_CAMINO

**Campos de solicitud:**

- `tipo_solicitud?: 'DIRECTA' | 'ABIERTA'` ✅ **OPCIONAL**

**Campos de visualización del cuidador:**

- `cuidador_nombre_visual?: string` ✅ **OPCIONAL**
- `cuidador_foto_visual?: string` ✅ **OPCIONAL**

**Validaciones presentes:**

- ✅ Transiciones de estado validadas (máquina de estados)
- ✅ Solo actor del paseo o admin puede actualizar
- ✅ Códigos de validación por tutor en paseos compartidos
- ❌ **NO hay captura de firma digital de entrega**
- ❌ **NO hay modelo de pago** (campo `precio` almacenado pero sin procesamiento)
- ❌ **NO hay reembolsos/cancelaciones con lógica de dinero**

**Ubicación en BD:**

- Colección Firestore: `/paseos/{id}`
- Subcolecciones: `/paseos/{id}/mascotas/{mascotaId}`, `/paseos/{id}/eventos/{eventoId}`

---

### 1.4 EXPLORACIÓN TERRITORIAL

**Archivo:** [models/ExploracionTerritorial.ts](models/ExploracionTerritorial.ts)

**Campos implementados:**

- `id_explorador: string` ✅ **REQUERIDO** — Heredado de `creado_por`
- `h3_index: string` ✅ **REQUERIDO** — Celda H3 resolución 8 (~460m radio)
- `h3_observacion: string` ✅ **REQUERIDO** — Celda H3 resolución 9 (~43m, microzoning)
- `coordenadas: {latitude, longitude}` ✅ **REQUERIDO** — Exactas
- `tipo_punto: TipoPunto` ✅ **REQUERIDO** — `'parque' | 'calle' | 'comercio' | 'conjunto' | 'otro'`
- `mascotas_visibles: number` ✅ **REQUERIDO** — 0-100 (cantidad observada)
- `flujo_peatonal: NivelObservable` ✅ **REQUERIDO** — `'bajo' | 'medio' | 'alto'`
- `estado: EstadoExploracion` ✅ **REQUERIDO** — `'pendiente' | 'validada' | 'rechazada'`
- `huellas_inmediatas: number` ✅ **REQUERIDO** — Siempre 5 por captura (según Firestore Rules)
- `huellas_otorgadas?: number` ✅ **OPCIONAL** — Si `estado = 'validada'`
- `observaciones?: string` ✅ **OPCIONAL** — ≤250 caracteres
- `foto_url?: string` ✅ **OPCIONAL** — URL del entorno
- `razon_rechazo?: string` ✅ **OPCIONAL** — Si `estado = 'rechazada'`

**Validaciones presentes (Firestore Rules):**

- ✅ `estado` inicial debe ser `'pendiente'`
- ✅ `huellas_inmediatas` debe ser exactamente 3
- ✅ `h3_index` y `h3_observacion` requeridos y no vacíos
- ✅ `coordenadas.latitude` y `.longitude` validados
- ✅ Solo explorador (creador) puede crear, solo admin puede actualizar estado
- ❌ **NO hay moderación automática**
- ❌ **NO hay validación de ubicaciones potencialmente falsas**

**Datos NO recopilados (prohibido en Legal):**

- ❌ Teléfonos de transeúntes o comercios
- ❌ Información personal de terceros

**Ubicación en BD:**

- Colección Firestore: `/exploraciones/{id}`
- Calcular H3 automáticamente desde coordenadas

---

### 1.5 UBICACIÓN

**Archivo:** [models/Ubicacion.ts](models/Ubicacion.ts)

**Campos obligatorios:**

- `proveedor: ProveedorMapa` ✅ **REQUERIDO** — `'google' | 'mapbox'`
- `proveedor_place_id: string` ✅ **REQUERIDO** — ID único del proveedor
- `direccion_formateada: string` ✅ **REQUERIDO** — Devuelta por proveedor
- `coordenadas: {latitude, longitude}` ✅ **REQUERIDO** — Fuente de verdad
- `estado: 'pendiente' | 'verificada' | 'obsoleta'` ✅ **REQUERIDO**

**Campos opcionales (contexto geoespacial):**

- `h3_index?: string` ✅ **OPCIONAL** — Resolución 8, para queries
- `h3_observacion?: string` ✅ **OPCIONAL** — Resolución 9, microzoning
- `componentes?: {pais, departamento, ciudad, localidad, barrio, codigo_postal, ruta, numero}` ✅ **OPCIONAL**
- `viewport?: {northeast, southwest}` ✅ **OPCIONAL**
- `alias?: string` ✅ **OPCIONAL** — "Casa", "Trabajo"
- `instrucciones?: string` ✅ **OPCIONAL** — Indicaciones humanas
- `metadata?: Record<string, any>` ✅ **OPCIONAL** — Datos crudos del proveedor

**Validaciones presentes:**

- ✅ Proveedor debe ser google o mapbox
- ✅ place_id debe ser string no vacío
- ✅ Dirección formateada debe tener >3 caracteres
- ❌ **NO hay validación de coordenadas dentro de límites geográficos permitidos**

**Ubicación en BD:**

- Colección Firestore: `/ubicaciones/{id}`
- Usuarios hacen referencia vía `UbicacionRef` (con alias y lugar)

---

### 1.6 CHAT (CONVERSACIONES Y MENSAJES)

**Archivo:** [models/Chat.ts](models/Chat.ts)

**Conversacion (documento padre):**

- `paseo_id: string` ✅ **REQUERIDO**
- `participantes: string[]` ✅ **REQUERIDO** — UIDs de tutor y cuidador
- `tutor_id: string` ✅ **REQUERIDO**
- `cuidador_id: string` ✅ **REQUERIDO**
- `activa: boolean` ✅ **REQUERIDO**
- `cerrada_en?: Date` ✅ **OPCIONAL** — Cuando paseo termina

**Mensaje (en subcolección `conversaciones/{id}/mensajes/{id}`):**

- `contenido: string` ✅ **REQUERIDO** — 1-5000 caracteres
- `autor_uid: string` ✅ **REQUERIDO**
- `tipo_mensaje: TipoMensaje` ✅ **REQUERIDO** — `'texto' | 'sistema' | 'notificacion'`
- `leidos_por?: Record<string, boolean>` ✅ **OPCIONAL** — {uid: true/false}
- `metadata?: Record<string, any>` ✅ **OPCIONAL**

**Validaciones presentes (Firestore Rules):**

- ✅ Contenido debe ser 1-5000 caracteres
- ✅ Solo participantes pueden leer/escribir mensajes
- ✅ `autor_uid` debe ser `request.auth.uid`
- ✅ Creación de conversación restringida a Cloud Functions
- ❌ **NO hay encriptación de mensajes**
- ❌ **NO hay auto-creación de conversación (falta CF)**

**Ubicación en BD:**

- Colección Firestore: `/conversaciones/{id}`
- Subcolección: `/conversaciones/{id}/mensajes/{msgId}`

---

### 1.7 VALORACIÓN

**Archivo:** [models/Valoracion.ts](models/Valoracion.ts)

**Campos:**

- `id_paseo: string` ✅ **REQUERIDO**
- `id_perfil: string` ✅ **REQUERIDO** — ID del cuidador valorado
- `rating: number` ✅ **REQUERIDO** — 1-5
- `comentario?: string` ✅ **OPCIONAL**
- `fecha: Date` ✅ **REQUERIDO**

**Validaciones presentes:**

- ❌ **NO hay validación de rango 1-5**
- ❌ **NO hay modelo CRUD implementado** (TodoComment en lógica: `// TODO: Integrar con logic/valoraciones`)
- ❌ **NO hay cálculo automático de `rating_promedio`**

**Ubicación en BD:**

- Colección Firestore: `/valoraciones/{id}` (definida en modelo, pero sin CRUD)

---

### 1.8 PERFIL PÚBLICO

**Archivo:** [models/PerfilPublico.ts](models/PerfilPublico.ts)

**Campos de presentación:**

- `nombre: string` ✅ **REQUERIDO** — Mostrado públicamente
- `foto?: string` ✅ **OPCIONAL**
- `biografia?: string` ✅ **OPCIONAL**
- `experiencia?: string` ✅ **OPCIONAL**

**Campos de cobertura geoespacial:**

- `h3_home?: string` ✅ **OPCIONAL** — Celda H3 R8 de origen (~460m)
- `celdas_cobertura?: string[]` ✅ **OPCIONAL** — Celdas H3 R8 definidas manualmente

**Campos de horario:**

- `horario_semanal?: Record<string, FranjaHoraria>` ✅ **OPCIONAL** — Claves: "0"-"6" (días), valores: {inicio, fin}

**Campos operativos:**

- `mascotas_aceptadas?: string[]` ✅ **OPCIONAL**
- `max_mascotas?: number` ✅ **OPCIONAL** — Simultáneamente
- `tarifa_por_hora?: number` ✅ **OPCIONAL** — En moneda local

**Campos de reputación:**

- `rating_promedio?: number` ✅ **OPCIONAL** — Calculado (PERO NO ACTUALIZADO)
- `cantidad_paseos_realizados?: number` ✅ **OPCIONAL**
- `verificacion: EstadoVerificacion` ✅ **REQUERIDO** — `'pendiente' | 'verificado' | 'rechazado'`

**Validaciones presentes:**

- ✅ Perfiles verificados son públicos (lectura sin autenticación)
- ✅ Solo el creador o admin puede actualizar
- ❌ **NO hay lógica de cambio automático de estado a `'verificado'`**

**Ubicación en BD:**

- Colección Firestore: `/perfiles_publicos/{uid}`
- uid = UID del cuidador

---

## 2. FUNCIONALIDADES IMPLEMENTADAS

### 2.1 ESTADOS DE PASEOS Y TRANSICIONES

**Máquina de estados (Enum `ESTADOS_PASEO`):**

```
PENDIENTE
    ↓ (Cuidador acepta)
CONFIRMADO
    ↓ (Cuidador sale de casa)
EN_CAMINO
    ├→ EN_PUNTO_RECOGIDA (Cuidador llega al punto de recogida)
    │   ↓ (Cuidador recoge mascota)
    └→ EN_PROGRESO (Paseo en curso)
       ↓ (Paseo termina)
    FINALIZADO
       ↓ (Validación tutor)
    COMPLETADO

Estados de error:
CANCELADO — Cancelación en cualquier momento
ERROR — Fallos de operación
```

**Archivo de lógica:** [logic/paseos/maquinaEstados.ts](logic/paseos/maquinaEstados.ts)

**Validaciones en Firestore Rules:**

```firestore
(PENDIENTE → CONFIRMADO) ✅
(CONFIRMADO → EN_CAMINO) ✅
(EN_CAMINO → EN_PUNTO_RECOGIDA) ✅
(EN_CAMINO → EN_PROGRESO) ✅
(EN_PUNTO_RECOGIDA → EN_PROGRESO) ✅
(EN_PROGRESO → FINALIZADO) ✅
(FINALIZADO → COMPLETADO) ✅
```

**Transiciones NO validadas / Potenciales:**

- ❌ No hay lógica de reintentos si estado = ERROR
- ❌ No hay auto-cancelación por timeout
- ❌ No hay validación de "paseo muy largo" (>8 horas)

**Implementación real del flujo:**

- ✅ Estados persisten en Firestore
- ✅ Transiciones validadas en backend (Firestore Rules)
- ✅ Cambios de estado disparan eventos
- ❌ No hay auto-notificaciones al cambiar estado

---

### 2.2 ROLES DE USUARIO

**Roles definidos y permitidos:**

```typescript
type RolUsuario = 'admin' | 'tutor' | 'cuidador' | 'explorador'
```

**Matriz de permisos (Firestore Rules):**

| Acción                        | Admin | Tutor          | Cuidador | Explorador |
| ----------------------------- | ----- | -------------- | -------- | ---------- |
| Ver todos los usuarios        | ✅    | ❌             | ❌       | ❌         |
| Ver mascotas propias          | ✅    | ✅             | ❌       | ❌         |
| Ver mascotas en solicitudes   | ✅    | ✅             | ✅       | ❌         |
| Crear paseo (solicitar)       | ❌    | ✅             | ❌       | ❌         |
| Ver paseos PENDIENTE          | ✅    | ✅             | ✅       | ❌         |
| Aceptar paseo (como cuidador) | ❌    | ❌             | ✅       | ❌         |
| Actualizar estado paseo       | ✅    | (solo creador) | ✅       | ❌         |
| Crear exploración             | ❌    | ❌             | Sí       | ✅         |
| Ver todas exploraciones       | ✅    | ❌             | ❌       | ❌         |
| Validar exploración           | ✅    | ❌             | ❌       | ❌         |
| Leer/escribir chat            | ✅    | ✅             | ✅       | ❌         |

**Restricción especial (Firestore Rules):**

```
admin NO puede ser tutor/cuidador simultáneamente
admin SÍ puede ser explorador
```

[Archivo de lógica: logic/usuarios/gestor.ts](logic/usuarios/gestor.ts)

**Asignación de rol en código:**

- ✅ `GestorUsuarios.agregarRol()` agrega rol a usuario existente
- ✅ Crea perfil público automáticamente si nuevo rol es `cuidador`
- ❌ No hay interfaz UI para asignar roles (solo Backend)

---

### 2.3 MÉTODOS DE COORDINACIÓN

**Coordinación Tutor ↔ Cuidador:**

1. **Solicitud de paseo (por Tutor)**
   - ✅ Crear documento en `/paseos/{id}` con estado `PENDIENTE`
   - ✅ Especificar `tipo_paseo: 'solicitado'` o `'programado'`
   - ✅ Especificar `modalidad: 'privado'` o `'compartido'`
   - ✅ Campo `id_cuidador` puede ser NULL (solicitud abierta) o específico (directa)

2. **Búsqueda de cuidador (por Tutor)**
   - ✅ Consultar `/indice_cobertura/{h3_celda}/cuidadores/{uid}` para cuidadores disponibles
   - ✅ Filtrar por horario semanal en `/perfiles_publicos/{uid}`
   - ✅ Ordenar por `rating_promedio`
   - Archivo: [hooks/paseos/useSeleccionarCuidador.ts](hooks/paseos/useSeleccionarCuidador.ts)

3. **Aceptación de paseo (por Cuidador)**
   - ✅ Actualizar paseo: estado PENDIENTE → CONFIRMADO
   - ✅ Asignar `id_cuidador = request.auth.uid`
   - ✅ Auto-crear conversación (¿Cloud Function? → FALTA)

4. **Validación de recogida (por Tutor)**
   - ✅ Generar código 6 dígitos por tutor
   - ✅ Validar en punto de recogida con código
   - ✅ Guardar timestamps y intentos fallidos
   - Archivo: [components/paseos/ModalIngresarCodigo.tsx](components/paseos/ModalIngresarCodigo.tsx)

5. **Chat durante paseo**
   - ✅ Conversación automática (si CF existe)
   - ✅ Mensajes persistidos en `/conversaciones/{id}/mensajes/{msgId}`
   - ✅ Validación: solo participantes pueden escribir
   - ❌ Sin encriptación

---

### 2.4 PROCESAMIENTO DE PAGOS

**Estado ACTUAL:** ❌ **NO IMPLEMENTADO**

**Evidencia:**

- Campo `precio: number` en modelo Paseo ✅ (presente)
- Cálculo de precio 0 ✅ (presente en generador)
- Integración con procesador ❌ (NO EXISTE)
- ❌ No hay integraciones Stripe/Mercado Pago
- ❌ No hay modelo de transacción
- ❌ No hay historial de pagos
- ❌ No hay reembolsos
- ❌ No hay facturación

**Referencia en documentación legal:**

```markdown
| **Pagos** | "Procesamos pagos" | "No procesamos (MVP)" |
```

[legal/README.md](legal/README.md#L225)

**Análisis de impacto:**

- Esto debe ser declarado explícitamente en T&C
- MVP funciona con pagos manuales entre usuarios
- Campo de precio es informativo solamente

---

### 2.5 CHAT (IMPLEMENTACIÓN)

**Estado ACTUAL:** ✅ **PARCIALMENTE IMPLEMENTADO**

**Lo que SÍ está implementado:**

- ✅ Modelo de datos (Conversacion + Mensaje)
- ✅ Firestore Rules para lectura/escritura
- ✅ Validaciones: solo participantes pueden acceder
- ✅ Campo `tipo_mensaje: 'texto' | 'sistema' | 'notificacion'`
- ✅ Marca de lectura: `leidos_por: {uid: boolean}`
- ✅ Contenido: 1-5000 caracteres

**Lo que NO está implementado:**

- ❌ **Creación automática de conversación** (Firestore Rules dice `allow create: if false;`)
- ❌ **NO hay Cloud Function para auto-crear conversación**
- ❌ **NO hay UI de Chat completamente funcional** (archivos [screens/paseos/ChatScreen.tsx](screens/paseos/ChatScreen.tsx) y [screens/dev/...](screens/dev/) son placeholders o hardcoded)
- ❌ **SIN encriptación end-to-end**
- ❌ **SIN notificaciones en tiempo real**
- ❌ **SIN búsqueda de mensajes**

**Referencia:**

- Regla de creación: Línea 515 en [firestore.rules](firestore.rules#L515)
- Modelo: [models/Chat.ts](models/Chat.ts)

---

### 2.6 VERIFICACIÓN DE IDENTIDAD

**Estado ACTUAL:** ❌ **MODELO SIN IMPLEMENTACIÓN**

**Lo que sí hay:**

- ✅ Campo `documento_identidad?: DocumentoIdentidad` en Usuario
- ✅ Tipos soportados: `NUIP`, `CC`, `CE`, `Pasaporte`
- ✅ Campo `verificado: boolean` en Usuario
- ✅ Campo `verificacion: EstadoVerificacion` en PerfilPublico (`'pendiente' | 'verificado' | 'rechazado'`)

**Lo que NO hay:**

- ❌ **NO hay upload de documento**
- ❌ **NO hay validación de documento** (verificación manual)
- ❌ **NO hay OCR o extracción automática**
- ❌ **NO hay comparación de fotos (selfie vs documento)**
- ❌ **NO hay API externa de verificación**
- ❌ **NO hay UI para verificación**
- ❌ **`verificado` nunca se actualiza en código** (campo inerte)

**Restricción especial:**

```markdown
- ✅ Información completa de documento de identidad (con consentimiento)
```

[legal/02_POLITICA_TRATAMIENTO_DATOS.md](legal/02_POLITICA_TRATAMIENTO_DATOS.md)

---

## 3. MANEJO DE UBICACIÓN / GPS

### 3.1 DÓNDE SE CAPTURA GPS

**Escenarios de captura:**

1. **Durante paseo EN_PROGRESO**
   - ✅ Cuidador publica ubicación cada 9 segundos (según Legal)
   - ✅ O cada 9 metros si se mueve rápido
   - Referencia: [legal/05_POLITICA_GEOLOCALIZACION.md](legal/05_POLITICA_GEOLOCALIZACION.md)

2. **Durante exploración territorial**
   - ✅ Coordenadas exactas capturadas
   - ✅ Almacenadas en `/exploraciones/{id}`
   - Referencia: [hooks/explorador/useExploracionTerritorial.ts](hooks/explorador/useExploracionTerritorial.ts#L40)

3. **En selección de ubicación (Tutor)**
   - ✅ GPS para autocompletar dirección (Google Maps API)
   - ✅ Almacenado como `Ubicacion` en Firestore
   - Referencia: [hooks/useUbicacionDispositivo.ts](hooks/useUbicacionDispositivo.ts)

4. **Ubicación principal del Usuario**
   - ✅ Almacenada en `Usuario.id_ubicacion_principal`
   - ✅ Referencia a `/ubicaciones/{id}`

---

### 3.2 CÓMO Y DÓNDE SE ALMACENA

**Realtime Database (RTDB) - GPS EN VIVO:**

```json
{
  "seguimiento_paseos": {
    "{paseoId}": {
      "actual": {
        "latitud": number,
        "longitud": number,
        "velocidad": number?,
        "rumbo": number?,
        "precision": number?,
        "actualizado_en": timestamp
      },
      "ruta": {
        "{índice}": {
          "latitud": number,
          "longitud": number,
          "velocidad": number?,
          "rumbo": number?,
          "precision": number?,
          "actualizado_en": timestamp
        }
      }
    }
  }
}
```

**Firestore - GPS PERSISTIDO:**

- ✅ Ubicaciones se guardan en `/ubicaciones/{id}` como coordenadas normales
- ✅ Coordenadas: `{latitude, longitude}` (NOT GeoPoint automáticamente en reglas)
- ✅ H3 índices se calculan y almacenan: `h3_index` (R8), `h3_observacion` (R9)

**Archivo de servicio:**
[services/firebase/rtdb/realtime.ts](services/firebase/rtdb/realtime.ts)
[logic/paseos/seguimiento.ts](logic/paseos/seguimiento.ts)

---

### 3.3 BASES DE DATOS

**Realtime Database:**

- Seguimiento EN VIVO: `/seguimiento_paseos/{paseoId}/actual` y `/ruta`
- Lectura/escritura: cualquier usuario autenticado
- ✅ Validaciones: latitud y longitud deben ser números

**Firestore:**

- Ubicaciones permanentes: `/ubicaciones/{id}`
- Exploraciones territoriales: `/exploraciones/{id}`
- Paseos (con referencias a tracking): `/paseos/{id}` (campo `tracking_gps`)
- ✅ Validaciones complejas en reglas

---

### 3.4 LIMPIEZA Y RETENCIÓN

**Política de retención (Legal):**

```markdown
| **GPS - Alta precisión** | 7 días | ✅ Sí |
| **GPS - Agregado** | 8-60 días | ✅ Sí |
| **GPS - Post 60 días** | Eliminar | ✅ Sí |
```

[legal/README.md](legal/README.md#L63)

**Implementación ACTUAL:**

- ❌ **NO hay lógica de limpieza automática en código**
- ❌ **NO hay Cloud Function de limpieza**
- ❌ **RTDB: datos persisten indefinidamente**
- ❌ **TODO: Implementar TTL o borrado programado**

---

### 3.5 ANONIMIZACIÓN

**Anonimización aplicada:**

- ✅ GPS guardado SIN UID de usuarios en RTDB (solo paseoId)
- ✅ GPS en exploraciones guardado con `id_explorador` (identificable)
- ❌ **SIN rotación de coordenadas (k-anonymity)**
- ❌ **SIN agregación de múltiples trazas**

---

## 4. DATOS SENSIBLES

### 4.1 INFORMACIÓN DE SALUD DE MASCOTAS

**Dónde se guarda:**

```
/mascotas/{id}:
  - vacunas: VacunaMascota[] ✅
  - condiciones_salud: string[] ✅
  - alergias: string[] ✅
  - medicamentos: string[] ✅
```

**Quién accede:**

- ✅ Tutor (propietario)
- ✅ Admin
- ✅ Cuidador (solo en contexto de paseo)

**Validaciones:**

- ✅ Solo tutor puede editar
- ❌ **NO hay auditoría de cambios en salud**
- ❌ **NO hay historial de cambios médicos**

---

### 4.2 DOCUMENTOS DE IDENTIDAD

**Dónde se guardan:**

```
/usuarios/{uid}:
  - documento_identidad: {
      tipo: TipoDocumento,
      numero: string
    }
```

**Almacenamiento:**

- ✅ Firestore
- ❌ **NO encriptado** (texto plano)
- ❌ **NO hay borrado automático**

**Acceso:**

- ✅ Solo usuario (su propio documento)
- ✅ Admin
- ❌ **NO hay auditoría de quién accede**

**Validaciones:**

- ❌ **NO hay validación de formato**
- ❌ **NO hay validación de rango válido**

---

### 4.3 FOTOS

**Dónde se guardan:**

- ✅ URLs en Firestore (`Usuario.foto`, `Mascota.foto`, `PerfilPublico.foto`)
- ✅ Archivos reales probablemente en Cloud Storage (NO rastreado en código)

**Cuántas fotos:**

- `Usuario.foto` — 1
- `Mascota.foto` — 1
- Paseos: `Paseo.mascotas_fotos_visual` — Hasta 4
- Exploración: `ExploracionTerritorial.foto_url` — 1

**Acceso:**

- ✅ Fotos de perfil públicas si verificado
- ✅ Fotos de mascota solo para tutor + cuidadores en paseos
- ✅ Fotos de exploración solo para admin

**Validaciones:**

- ❌ **NO hay validación de tipo MIME**
- ❌ **NO hay límite de tamaño**
- ❌ **NO hay compresión automática**
- ❌ **NO hay borrado al eliminar usuario**

---

### 4.4 TELÉFONOS

**Dónde se guardan:**

```
/usuarios/{uid}:
  - celular: string ✅ (requerido)
```

**Acceso:**

- ✅ Usuario propio
- ✅ Admin
- ❌ **NO se comparte con otros usuarios**
- ✅ Chat es medio alternativo (implementado parcialmente)

**Restricciones (Legal):**

```markdown
❌ NO usar teléfono directo si existe chat en app
❌ Teléfono de transeúntes NO se recopila (Exploración Territorial)
```

**Validaciones:**

- ❌ **NO hay validación de formato**
- ❌ **NO hay verificación de SMS**

---

## 5. EXPLORACIÓN TERRITORIAL

### 5.1 FUNCIONALIDAD COMPLETA

**Estado ACTUAL:** ✅ **ESTRUCTURA IMPLEMENTADA, MVP FUNCIONAL**

**Lo que SÍ funciona:**

- ✅ Captura de puntos territoriales con GPS
- ✅ Clasificación: `'parque' | 'calle' | 'comercio' | 'conjunto' | 'otro'`
- ✅ Datos observables: mascotas visibles (0-100), flujo peatonal (bajo/medio/alto)
- ✅ Almacenamiento en Firestore `/exploraciones/{id}`
- ✅ Auto-generación de H3 indices (R8 + R9)
- ✅ Foto opcional de entorno

**Lo que NO funciona:**

- ❌ **NO hay validación automática**
- ❌ **Estado `'pendiente'` requiere validación manual por admin**
- ❌ **NO hay interfaz de admin para validar**
- ❌ **NO hay moderación de contenido**
- ❌ **NO hay gamificación (huellas otorgadas pero NO aplicada)**

---

### 5.2 QUÉ SE PUEDE REGISTRAR

**Campos capturables:**

```
✅ Tipo de punto (5 opciones predefinidas)
✅ Cantidad de mascotas vistas (0-100)
✅ Flujo peatonal (bajo/medio/alto)
✅ Observaciones de texto (<250 chars)
✅ Foto del entorno
✅ Coordenadas exactas GPS
```

**Lo que NO se puede registrar:**

```
❌ Teléfonos de terceros
❌ Nombres de personas (prohibido en Legal)
❌ Información personal de otros usuarios
❌ Evaluación de comercios/negocios
```

---

### 5.3 VALIDACIONES Y MODERACIÓN

**Validaciones en el cliente:**

- ✅ Campos obligatorios: tipo_punto, mascotas_visibles, flujo_peatonal
- ✅ Rango de mascotas: 0-100 (validado en componente)
- ❌ **NO hay validación de ubicación duplicada**
- ❌ **NO hay detección de spam**

**Validaciones en servidor (Firestore Rules):**

- ✅ tipo_punto debe ser uno de los 5 tipos
- ✅ mascotas_visibles debe ser int ≥ 0
- ✅ h3_index y h3_observacion requeridos
- ✅ Estado inicial debe ser `'pendiente'`
- ✅ huellas_inmediatas debe ser 3
- ❌ **NO hay validación de ubicación real**

**Moderación:**

- ❌ **TODO: Admin dashboard para validar/rechazar**
- ❌ **TODO: Notificaciones al rechazar**
- ❌ **TODO: Razón de rechazo visible a explorador**

---

### 5.4 RECOPILACIÓN DE TELÉFONOS

**Prohibición explícita:**

```markdown
❌ **Recopilar teléfonos** de transeúntes/comercios sin consentimiento.
```

[legal/06_POLITICA_EXPLORACION_TERRITORIAL.md](legal/06_POLITICA_EXPLORACION_TERRITORIAL.md#L64)

**Implementación:**

- ✅ **NO hay campo para teléfono en ExploracionTerritorial**
- ✅ **Modelo rechaza recopilación**
- ✅ **Firestore Rules lo forbid (implícitamente)**

---

## 6. NAVEGACIÓN Y PANTALLAS POR ROL

### 6.1 PANTALLAS IMPLEMENTADAS POR ROL

#### **TUTOR** (Usuario que pide paseos)

**Implementadas:**

- ✅ [screens/tutor/Dashboard.tsx](screens/tutor/Dashboard.tsx) — Panel principal
- ✅ [screens/tutor/Mascotas.tsx](screens/tutor/Mascotas.tsx) — Listar mascotas
- ✅ [screens/tutor/CrearMascotaFlow.tsx](screens/tutor/CrearMascotaFlow.tsx) — Crear/editar mascota
- ✅ [screens/tutor/DetalleMascota.tsx](screens/tutor/DetalleMascota.tsx) — Ver detalle de mascota
- ✅ [screens/tutor/EdicionMascota.tsx](screens/tutor/EdicionMascota.tsx) — Editar mascota
- ✅ [screens/tutor/Paseos.tsx](screens/tutor/Paseos.tsx) — Listar paseos
- ✅ [screens/tutor/PaseoActivo.tsx](screens/tutor/PaseoActivo.tsx) — Ver paseo en progreso
- ✅ [screens/tutor/PaseoFinalizado.tsx](screens/tutor/PaseoFinalizado.tsx) — Calificar después de paseo
- ⚠️ [screens/tutor/Placeholder.tsx](screens/tutor/Placeholder.tsx) — Placeholder

**Componentes de flujo:**

- ✅ [components/paseos/SeleccionarMascotaPaso.tsx](components/paseos/SeleccionarMascotaPaso.tsx)
- ✅ [components/paseos/SeleccionarDireccionPaso.tsx](components/paseos/SeleccionarDireccionPaso.tsx)
- ✅ [components/paseos/SeleccionarFechaPaso.tsx](components/paseos/SeleccionarFechaPaso.tsx)
- ✅ [components/paseos/SeleccionarHoraPaso.tsx](components/paseos/SeleccionarHoraPaso.tsx)
- ✅ [components/paseos/SeleccionarCuidadorPaso.tsx](components/paseos/SeleccionarCuidadorPaso.tsx)
- ✅ [components/paseos/ConfirmarPaseoPaso.tsx](components/paseos/ConfirmarPaseoPaso.tsx)
- ✅ [components/paseos/ModalCodigoRecogidaTutor.tsx](components/paseos/ModalCodigoRecogidaTutor.tsx)

**Funcionalidades:**

- ✅ Crear paseo con 6 pasos
- ✅ Seleccionar mascotas
- ✅ Escoger ubicación de inicio/fin
- ✅ Agendar fecha y hora
- ✅ Elegir cuidador por rating/horario
- ✅ Ver paseos activos
- ✅ Validar recogida con código
- ✅ Calificar cuidador (UI presente, sin guardar)

---

#### **CUIDADOR** (Usuario que pasea)

**Implementadas:**

- ✅ [screens/cuidador/Dashboard.tsx](screens/cuidador/Dashboard.tsx) — Panel principal
- ✅ [screens/cuidador/Agenda.tsx](screens/cuidador/Agenda.tsx) — Agenda semanal
- ✅ [screens/cuidador/Paseos.tsx](screens/cuidador/Paseos.tsx) — Paseos activos
- ✅ [screens/cuidador/SolicitudesPaseos.tsx](screens/cuidador/SolicitudesPaseos.tsx) — Solicitudes pendientes
- ✅ [screens/cuidador/ControlPaseo.tsx](screens/cuidador/ControlPaseo.tsx) — Control durante paseo
- ✅ [screens/cuidador/CoberturaCuidador.tsx](screens/cuidador/CoberturaCuidador.tsx) — Mapa de cobertura
- ✅ [screens/cuidador/ExcepcionSemanal.tsx](screens/cuidador/ExcepcionSemanal.tsx) — Marcar días no disponibles
- ✅ [screens/cuidador/PerfilCuidador.tsx](screens/cuidador/PerfilCuidador.tsx) — Perfil público
- ✅ [screens/cuidador/Placeholder.tsx](screens/cuidador/Placeholder.tsx)

**Funcionalidades:**

- ✅ Ver solicitudes de paseos
- ✅ Aceptar/rechazar paseos
- ✅ Agenda con horarios
- ✅ Control GPS durante paseo
- ✅ Cambiar modo de transporte (walking/driving)
- ✅ Marcar excepciones (no disponible)
- ✅ Ver zona de cobertura (mapa H3)
- ✅ Editar perfil público
- ❌ **NO hay historial de ganancias**
- ❌ **NO hay estadísticas de desempeño**

---

#### **EXPLORADOR** (Registro territorial)

**Implementadas:**

- ✅ [screens/explorador/InicioExplorador.tsx](screens/explorador/InicioExplorador.tsx) — Inicio
- ✅ [screens/explorador/MapaTerritorial.tsx](screens/explorador/MapaTerritorial.tsx) — Mapa con zonas
- ✅ [screens/explorador/CapturaTerritorial.tsx](screens/explorador/CapturaTerritorial.tsx) — Captura de punto
- ✅ [screens/explorador/ResumenExploracion.tsx](screens/explorador/ResumenExploracion.tsx) — Resumen post-captura
- ✅ [screens/explorador/HistorialExploraciones.tsx](screens/explorador/HistorialExploraciones.tsx) — Historial

**Funcionalidades:**

- ✅ Ver mapa territorial (H3 zonas)
- ✅ Capturar puntos con GPS
- ✅ Clasificar tipo de punto
- ✅ Registrar mascotas vistas
- ✅ Foto opcional
- ✅ Observaciones libres
- ✅ Huellas inmediatas (5 por captura)
- ✅ Ver historial de capturas
- ❌ **NO hay gamificación visible**
- ❌ **NO hay ranking de exploradores**

---

#### **ADMIN** (Administración)

**Implementadas:**

- ❌ [screens/admin/AdminDashboard.tsx](screens/admin/AdminDashboard.tsx) — **PLACEHOLDER: "Próximamente…"**
- ✅ [screens/admin/TerritorioVivo.tsx](screens/admin/TerritorioVivo.tsx) — Mapa territorial en vivo

**Funcionalidades FALTANTES:**

- ❌ Validar exploraciones territoriales
- ❌ Revisar reportes de usuarios
- ❌ Ver estadísticas globales
- ❌ Moderar paseos
- ❌ Gestionar usuarios
- ❌ Ver transacciones (no existe modelo)
- ❌ Dashboard de KPIs

---

#### **COMÚN** (Acceso a todos los roles)

**Implementadas:**

- ✅ [screens/comun/MiCuenta.tsx](screens/comun/MiCuenta.tsx) — Perfil del usuario
- ✅ Chat (parcialmente) — [screens/paseos/ChatScreen.tsx](screens/paseos/ChatScreen.tsx)

---

### 6.2 CUAL ESTÁ MÁS IMPLEMENTADO

**Ranking de completitud:**

1. **TUTOR** (80% implementado)
   - ✅ Flujo completo de solicitud
   - ✅ Selección de cuidador
   - ✅ Validaciones de recogida
   - ❌ Calificación no guarda
   - ❌ Historial incompleto

2. **CUIDADOR** (75% implementado)
   - ✅ Aceptar/rechazar paseos
   - ✅ Control GPS
   - ✅ Agenda
   - ✅ Cobertura (mapa)
   - ❌ Estadísticas incompletas
   - ❌ Historial de ganancias (no existe)

3. **EXPLORADOR** (70% implementado)
   - ✅ Captura territorial
   - ✅ Historial
   - ❌ Gamificación no visible
   - ❌ Ranking no existe
   - ❌ Validación manual por admin

4. **ADMIN** (10% implementado)
   - ✅ Mapa territorial en vivo
   - ❌ Dashboard es placeholder
   - ❌ Sin validaciones de exploración
   - ❌ Sin gestión de usuarios
   - ❌ Sin reportes

---

### 6.3 PANTALLA DE RATINGS/VALORACIONES

**Ubicación:** [screens/tutor/PaseoFinalizado.tsx](screens/tutor/PaseoFinalizado.tsx)

**Estado:**

- ✅ Componente UI presente: [components/paseos/PaseoFinalizadoCard.tsx](components/paseos/PaseoFinalizadoCard.tsx)
- ✅ Permite seleccionar 1-5 estrellas
- ✅ Campo de comentario opcional
- ❌ **NO guarda la valoración en Firestore**
- ❌ **Callback `onRate` no implementado en backend**
- ❌ **NO calcula `rating_promedio` automáticamente**

**Datos NO persistidos:**

```typescript
onRate={(r) => console.log('Rating screen:', r)} // Solo log, no guarda
```

---

## 7. CONFIGURACIÓN Y SEGURIDAD

### 7.1 PERMISOS DE UBICACIÓN

**Permisos capturados en tiempo de ejecución:**

- Archivo de hook: [hooks/useUbicacionDispositivo.ts](hooks/useUbicacionDispositivo.ts)
- Librería: `expo-location`

**Tipos de ubicación:**

```
❌ Ubicación en FOREGROUND — parcialmente
   - Capturada cuando usuario interactúa

⚠️ Ubicación en BACKGROUND — NO confirmado
   - Teóricamente posible con expo-location
   - NO hay código de inicialización de background task
```

**Validaciones presentes:**

- ✅ Se solicita permiso antes de capturar
- ✅ Manejo de error si permiso denegado
- ✅ Reintento si vuelve a la app
- ❌ **NO hay indicador visual de "registrando GPS"**
- ❌ **NO hay opción de pausar tracking**

**Archivo de lógica:** [logic/ubicaciones/gestor.ts](logic/ubicaciones/gestor.ts)

---

### 7.2 AUTENTICACIÓN

**Métodos soportados:**

- ✅ Email + contraseña (Firebase Auth)
- ✅ Google OAuth (línea 89 en [services/firebase/types.ts](services/firebase/types.ts))
- ❌ Apple Sign-In (NO implementado)
- ❌ Facebook (NO implementado)
- ❌ WhatsApp (NO implementado)

**Persistencia:**

- ✅ AsyncStorage con React Native Persistence
- ✅ Token guardado localmente
- ✅ Auto-login al abrir app

**Archivo de configuración:**
[firebase.config.ts](firebase.config.ts) — Inicialización con `initializeAuth` + `getReactNativePersistence`

---

### 7.3 REGLAS DE FIREBASE

**Firestore Rules:** [firestore.rules](firestore.rules)

**Arquitectura de seguridad:**

- ✅ Usuario solo puede leer/modificar su propio documento
- ✅ Admin tiene acceso a todo
- ✅ Roles validados en claims + documento
- ✅ Transiciones de estado validadas
- ✅ Participantes de chat pueden leer/escribir

**Reglas por colección:**

| Colección          | Lectura                   | Creación   | Actualización        | Eliminación   |
| ------------------ | ------------------------- | ---------- | -------------------- | ------------- |
| /usuarios          | propio + admin            | creador    | propio + admin       | admin         |
| /mascotas          | tutor + admin + cuidador  | tutor      | tutor                | tutor + admin |
| /paseos            | actor                     | actor      | actor + transiciones | actor         |
| /exploraciones     | explorador + admin        | explorador | admin                | admin         |
| /conversaciones    | participantes             | ❌ (CF)    | ❌                   | ❌            |
| /perfiles_publicos | autenticado si verificado | cuidador   | creador + admin      | admin         |
| /ubicaciones       | autenticado               | creador    | creador + admin      | admin         |

---

### 7.4 VALIDACIONES DE EDAD

**Definición:**

- ❌ **NO hay validación de edad mínima**
- ❌ **NO hay verificación de mayoría de edad**
- ❌ **Campo `fecha_nacimiento` es OPCIONAL**

**Implicaciones legales:**

```markdown
CRÍTICO: Menores de edad pueden registrarse sin restricción.
Requiere T&C actualizados y consentimiento parental.
```

---

## RESUMEN DE IMPLEMENTACIÓN

### Estado General

| Área                            | Implementado | Funcional | Notas                                       |
| ------------------------------- | ------------ | --------- | ------------------------------------------- |
| **Modelos de datos**            | 95%          | ✅        | Campos bien definidos, validaciones básicas |
| **Estados de paseo**            | 100%         | ✅        | Máquina de estados robusta                  |
| **Roles y permisos**            | 90%          | ✅        | 4 roles, restricciones bien aplicadas       |
| **Coordinación tutor-cuidador** | 85%          | ✅        | Flujo completo pero faltan notificaciones   |
| **GPS/Ubicación**               | 80%          | ⚠️        | Captura y almacenamiento OK, limpieza NO    |
| **Chat**                        | 40%          | ❌        | Modelo OK, auto-creación no existe          |
| **Pagos**                       | 0%           | ❌        | Campo almacenado, sin procesamiento         |
| **Verificación identidad**      | 5%           | ❌        | Modelo solo, sin implementación             |
| **Exploración territorial**     | 70%          | ⚠️        | Captura OK, moderación manual falta         |
| **Pantallas tutor**             | 80%          | ✅        | Muy completo                                |
| **Pantallas cuidador**          | 75%          | ✅        | Muy completo                                |
| **Pantallas explorador**        | 70%          | ✅        | Captura OK, gamificación falta              |
| **Pantallas admin**             | 10%          | ❌        | Solo mapa territorial                       |
| **Valoraciones**                | 30%          | ❌        | UI presente, no guarda                      |
| **Seguridad Firebase**          | 90%          | ✅        | Reglas bien diseñadas                       |
| **Retención de datos**          | 0%           | ❌        | Sin limpieza automática                     |

---

## HALLAZGOS CRÍTICOS

### 🔴 RIESGOS LEGALES

1. **Almacenamiento GPS indefinido**
   - Legal requiere: 7 días (alta precisión) + 8-60 días (agregado)
   - Actual: **Indefinido en RTDB** (sin limpieza)
   - **Acción:** Implementar TTL en RTDB o Cloud Function de limpieza

2. **Recopilación de datos sin consentimiento explícito**
   - Celular es requerido pero usuario no puede negarse
   - Documento de identidad almacenado sin verificación
   - **Acción:** Checkbox de consentimiento en registro

3. **Chat sin cifrado**
   - Mensajes privados en texto plano
   - **Acción:** Implementar encriptación E2E

4. **Menores de edad sin validación**
   - `fecha_nacimiento` opcional
   - **Acción:** Validación de mayoría de edad

### 🟡 RIESGOS FUNCIONALES

5. **Valoraciones no guardan**
   - UI completa pero sin backend
   - `rating_promedio` nunca se calcula
   - **Acción:** CRUD de valoraciones + cálculo promedio

6. **Chat no se auto-crea**
   - Firestore Rules forbid creación manual
   - **Acción:** Cloud Function en paseo→CONFIRMADO

7. **Pagos sin modelo**
   - Campo `precio` informativo solamente
   - **Acción:** Decisión: implementar o declarar en T&C

8. **Admin dashboard vacío**
   - "Próximamente…"
   - **Acción:** Validación de exploraciones + reportes

### 🟠 DEUDA TÉCNICA

9. **Sin auditoría de accesos**
   - No hay log de quién accedió qué dato
   - **Acción:** Agregar logging en Cloud Functions

10. **Fotos sin validación**
    - Sin límite de tamaño, tipo MIME
    - **Acción:** Validación en cliente + server

---

## MATRIZ DETALLADA DE RECOPILACIÓN DE DATOS

| Dato                        | Campo                       | Almacenado | Compartido              | Propósito       | Retención         |
| --------------------------- | --------------------------- | ---------- | ----------------------- | --------------- | ----------------- |
| **Nombre**                  | Usuario.nombre              | Sí         | Público (si verificado) | Identificación  | Indefinida        |
| **Email**                   | Firebase Auth               | Sí         | No                      | Autenticación   | Indefinida        |
| **Celular**                 | Usuario.celular             | Sí         | No                      | Contacto        | Indefinida        |
| **Foto**                    | Usuario.foto                | Sí         | Público (verificados)   | Identificación  | Indefinida        |
| **Fecha nacimiento**        | Usuario.fecha_nacimiento    | Opcional   | No                      | Validación edad | Sin validar       |
| **Documento**               | Usuario.documento_identidad | Opcional   | No                      | Verificación    | Indefinida        |
| **GPS durante paseo**       | RTDB /seguimiento_paseos    | Sí         | No                      | Seguimiento     | **Indefinida** ⚠️ |
| **GPS exploración**         | Exploraciones.coordenadas   | Sí         | Solo admin              | Territorial     | Indefinida        |
| **GPS selección ubicación** | Ubicaciones.coordenadas     | Sí         | No                      | Geolocalización | Indefinida        |
| **Vacunas mascota**         | Mascota.vacunas             | Sí         | Solo cuidador           | Salud           | Indefinida        |
| **Alergias mascota**        | Mascota.alergias            | Sí         | Solo cuidador           | Salud           | Indefinida        |
| **Medicamentos**            | Mascota.medicamentos        | Sí         | Solo cuidador           | Salud           | Indefinida        |
| **Mensajes chat**           | Conversaciones/mensajes     | Sí         | Participantes           | Comunicación    | Indefinida        |
| **Teléfonos terceros**      | N/A                         | No         | N/A                     | Exploración     | N/A               |
| **Fotos entorno**           | Exploraciones.foto_url      | Sí         | Solo admin              | Territorial     | Indefinida        |
| **Rating/reseña**           | Valoraciones                | No ❌      | Público (no existe)     | Reputación      | N/A               |

---

**FIN DEL ANÁLISIS**
