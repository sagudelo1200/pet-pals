# Pet Pals — Producto, Arquitectura y Lanzamiento

**Documento Unificado:**
- **Sección 1:** QUÉ es Pet Pals (Producto)
- **Sección 2:** CÓMO está construido (Arquitectura)
- **Sección 3:** CUÁNDO lanzar qué (Estrategia MVP)

**Fecha:** 20 de julio de 2026  
**Versión:** MVP 1.0  
**Fuente:** Análisis del código actual + decisiones estratégicas

---

# SECCIÓN 1: PRODUCTO

## 1.1 Qué es Pet Pals

Pet Pals es una **plataforma móvil React Native** que conecta tutores de mascotas con cuidadores profesionales para servicios de paseo en tiempo real. Permite:

- **Tutores:** Crear mascotas, solicitar paseos, rastrear al cuidador en vivo, comunicarse por chat, validar reintegro con códigos
- **Cuidadores:** Aceptar solicitudes, ejecutar paseos con GPS, registrar eventos, comunicarse
- **Exploradores:** Capturar datos territoriales (tipo de zona, flujo de peatones, mascotas visibles)
- **Admin:** Visualizar inteligencia territorial agregada

**Problema que resuelve:** Conectar de forma segura y transparente a tutores con cuidadores de confianza.

---

## 1.2 Los 4 Roles Reales

### 👨‍👩‍👧 Tutor (Dueño de Mascotas)

**¿Qué hace?**
- Crear y editar mascotas (nombre, raza, foto, peso, condiciones de salud, vacunas)
- Solicitar paseos (seleccionar mascota, fecha, hora, cuidador)
- Ver solicitudes pendientes
- Rastrear al cuidador en tiempo real durante el paseo (mapa + polyline)
- Comunicarse con cuidador por chat (solo si paseo está confirmado)
- Recibir código de recogida y validarlo
- Ver historial y calificar

**Pantallas:**
- Inicio (Dashboard con próximos paseos)
- Mascotas (CRUD)
- Paseos (Historial + Solicitar)
- Mi Cuenta (Perfil, método de pago futuro)
- PaseoActivo (Modal con mapa en vivo)
- Chat (Screen completa)
- DetalleMascota, EdicionMascota (Modales)

**Restricciones:**
- Solo ve/edita sus propias mascotas
- Mascota debe estar en nivel de completitud ≥1 para solicitar (nombre + foto)
- Solo horario 05:30-22:30
- Buffer de 15min si paseo es HOY
- Máximo 60 días en futuro

---

### 👨‍🔧 Cuidador (Prestador de Servicio)

**¿Qué hace?**
- Ver todas las solicitudes en su zona (H3_R8 broadcast)
- Aceptar solicitud (sistema valida disponibilidad en aceptación)
- Ejecutar paseo: EN_CAMINO → EN_PROGRESO → FINALIZADO
- Rastrear GPS con publicación automática
- Registrar eventos (llegada, juego, descanso, etc.)
- Comunicarse con tutor por chat
- Establecer disponibilidad semanal + excepciones

**Pantallas:**
- Dashboard (Estadísticas + próximos paseos)
- Solicitudes (Lista broadcast filtrada)
- Agenda (Paseos confirmados)
- ControlPaseo (Modal con mapa + control)
- Disponibilidad (Calendario semanal)
- PerfilCuidador (Perfil público)
- ExcepcionSemanal, CoberturaCuidador (Modales)
- Mi Cuenta (Perfil, calificación)
- Chat (Screen)

**Restricciones:**
- Solo aceptar paseos dentro de su horario disponible
- No puede aceptar si ya tiene otro paseo superpuesto
- Debe estar verificado
- Sistema valida al aceptar, no antes

---

### 🗺️ Explorador (Crowdsourcer Territorial)

**¿Qué hace?**
- Capturar observaciones sobre zonas (parques, calles, comercios)
- Registrar: tipo de punto, mascotas visibles, flujo peatonal, observaciones
- Ganar huellas (recompensas) por exploración
- Ver historial con estados (pendiente, validada, rechazada)
- Ver mapa territorial con inteligencia agregada

**Pantallas:**
- Inicio Explorador (Bienvenida + estadísticas personales)
- Captura Territorial (Modal stepper conversacional)
- Mapa Territorial (Visual H3)
- Historial Exploraciones (Estilo Strava)
- Mi Cuenta (Perfil, huellas acumuladas)

**Restricciones:**
- Debe ser usuario verificado
- Solo una exploración por zona (H3_R9) por día
- Datos validados en FASE 2

**Importante:** El rol "explorador" se agrega automáticamente a todo usuario al registrarse (línea en `AuthContext.tsx`).

---

### 🔐 Administrador

**¿Qué hace?**
- Ver dashboard admin con KPIs globales
- Visualizar "Territorio Vivo" (mapa H3 con inteligencia)
- Monitorear actividad de plataforma
- Ver métricas y estadísticas

**Pantallas:**
- Dashboard Admin (KPIs, gráficos)
- Territorio Vivo (Mapa interactivo H3)
- Mi Cuenta (Perfil admin)

---

## 1.3 Flujo Completo: De la Solicitud a la Finalización

```
TUTOR crea mascota
  ↓ (nombre + foto)
TUTOR solicita paseo
  ↓ (elige cuidador, fecha, hora)
Sistema valida:
  ✓ Mascota completitud ≥1
  ✓ Horario 05:30-22:30
  ✓ Buffer 15min si HOY
  ✓ Cuidador disponible
  ↓
Paseo creado en PENDIENTE
  ↓
CUIDADOR recibe notificación
  ↓ (ve en Solicitudes)
CUIDADOR abre solicitud
  ↓ (ve detalles tutor + mascotas)
CUIDADOR acepta
  ↓
Sistema valida:
  ✓ ¿Disponible?
  ✓ ¿Sin conflicto?
  ✓ ¿Verificado?
  ↓
Si ✓ → Paseo CONFIRMADO + Chat auto-creado
Si ✗ → Mensaje error
  ↓
CUIDADOR ve Agenda → Abre ControlPaseo
  ↓
CUIDADOR: INICIAR_RUTA
  ↓ (estado: EN_CAMINO, GPS comienza)
GPS publica cada 9seg (foreground) + background task
  ↓
TUTOR: Abre PaseoActivo
  ↓ (ve cuidador en tiempo real)
CUIDADOR: LLEGAR_PUNTO_RECOGIDA
  ↓ (estado: EN_PUNTO_RECOGIDA)
Sistema genera códigos de recogida (1 por mascota)
  ↓
CUIDADOR muestra código (QR o texto)
TUTOR ingresa/escanea código
  ↓
CUIDADOR: INICIAR_PASEO
  ↓ (estado: EN_PROGRESO)
CUIDADOR registra eventos (llegada, juego, descanso, etc.)
  ↓
CUIDADOR: FINALIZAR_PASEO
  ↓ (estado: FINALIZADO)
TUTOR ve resumen
  ↓
CUIDADOR: CONFIRMAR_COMPLETADO
  ↓ (estado: COMPLETADO, chat cierra)
Paseo listo para calificación (futuro)
```

---

## 1.4 Máquina de Estados del Paseo

```
PENDIENTE
  → ACEPTAR → CONFIRMADO
  → CANCELAR → CANCELADO
  → [Auto-escalada en MVP 2.0: 45min → ABIERTA]

CONFIRMADO
  → INICIAR_RUTA → EN_CAMINO
  → INICIAR_PASEO → EN_PROGRESO (directo)
  → CANCELAR → CANCELADO

EN_CAMINO
  → LLEGAR_PUNTO_RECOGIDA → EN_PUNTO_RECOGIDA
  → INICIAR_PASEO → EN_PROGRESO
  → CANCELAR → CANCELADO

EN_PUNTO_RECOGIDA
  → INICIAR_PASEO → EN_PROGRESO
  → CANCELAR → CANCELADO

EN_PROGRESO
  → FINALIZAR_PASEO → FINALIZADO
  → CANCELAR → CANCELADO

FINALIZADO
  → CONFIRMAR_COMPLETADO → COMPLETADO
  → [Timeout 15min: auto → COMPLETADO]

COMPLETADO, CANCELADO (FINAL)
```

---

## 1.5 Features Principales

### Chat Integrado
- Auto-creado solo cuando paseo → CONFIRMADO
- Mensajes en tiempo real (texto, sistema, notificación)
- Se cierra automáticamente cuando paseo → FINALIZADO
- Auto-marca como leído

### GPS y Tracking
- Foreground: actualización cada 9 segundos
- Background: tarea Expo cada 12-30 segundos
- Resilencia: AsyncStorage persiste contexto
- Fallback: botón "Actualizar ubicación" si falla GPS
- Publicación automática en RTDB

### Códigos de Recogida
- 1 código por tutor (para multi-tutor en futuro)
- Formato: alphanumeric 6 caracteres
- Generados al estado EN_PUNTO_RECOGIDA
- Validación: ingreso manual o (futuro) QR scanner
- Timeout automático: 15min → auto-validación

### Captura Territorial
- Modal stepper conversacional (tipo_punto → mascotas → flujo → obs)
- Cálculo automático H3_R8 + H3_R9
- Recompensas: 5 huellas inmediatas
- Datos se agregan en `/h3_zonas/{h3_r9}`

---

# SECCIÓN 2: ARQUITECTURA

## 2.1 Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| **Frontend** | React Native (Expo) |
| **Lenguaje** | TypeScript (strict mode) |
| **Estado** | Context API + Custom Hooks |
| **Backend** | Firebase (Auth + Firestore + RTDB + Cloud Functions) |
| **Geolocalización** | H3 (multiresolution R8, R9) |
| **Mapas** | Google Maps API |
| **Persistencia Local** | AsyncStorage |
| **Notificaciones** | (Futuro: Firebase Cloud Messaging) |

---

## 2.2 Estructura de Código Real

```
/
├─ context/
│  ├─ AuthContext.tsx (user, roles, profile, helpers)
│  ├─ RolContext.tsx (rolActivo, cambiarRolActivo)
│  ├─ MascotasContext.tsx (mascotas realtime)
│  └─ CapturaTerritorialContext.tsx (UI explorer)
│
├─ models/
│  ├─ Usuario.ts (4 roles: tutor, cuidador, explorador, admin)
│  ├─ Mascota.ts (nivel de completitud)
│  ├─ Paseo.ts (máquina de estados)
│  ├─ Conversacion.ts + Mensaje.ts
│  ├─ PerfilPublico.ts
│  ├─ Exploracion.ts
│  └─ Ubicacion.ts
│
├─ services/firebase/
│  ├─ firestore/
│  │  ├─ base/ (ServicioCrudBase genérico)
│  │  └─ colecciones/
│  │     ├─ usuario.ts (ServicioUsuario)
│  │     ├─ mascota.ts (ServicioMascota)
│  │     ├─ paseo.ts (ServicioPaseo)
│  │     ├─ chat.ts (ServicioChat)
│  │     └─ ...otros
│  ├─ auth/ (ServicioAuth)
│  └─ comun/ (conversores, mapeos de error)
│
├─ logic/
│  ├─ auth/ (GestorAuth, migraciones)
│  ├─ paseos/
│  │  ├─ matching.ts (LogicMatching: esCuidadorDisponible)
│  │  ├─ maquinaEstados.ts (transiciones válidas)
│  │  ├─ generador.ts (códigos de recogida)
│  │  └─ routerPaseos.ts (mapeo de experiencia)
│  ├─ territorio/ (ServicioTerritorio: H3)
│  └─ ...otros
│
├─ hooks/
│  ├─ useAuth() (acceso contexto Auth)
│  ├─ useRol() (acceso contexto Rol)
│  ├─ useMascotas() (listener realtime)
│  ├─ usePublicarUbicacion() (GPS foreground + background)
│  ├─ useMensajesPaseo() (chat realtime)
│  ├─ useControlPaseo() (estado + ubicación + eventos)
│  ├─ useTerritorio() (H3 context)
│  ├─ useExploracionTerritorial() (captura)
│  └─ ...20+ hooks especializados
│
├─ screens/
│  ├─ auth/ (Bienvenida, Ingresar, Registro)
│  ├─ tutor/ (Inicio, Mascotas, Paseos, PaseoActivo, Chat, etc)
│  ├─ cuidador/ (Dashboard, Solicitudes, Agenda, ControlPaseo, etc)
│  ├─ explorador/ (Inicio, Captura, Historial, MapaTerritorial)
│  ├─ admin/ (Dashboard, TerritoryLive)
│  ├─ comun/ (MiCuenta compartida)
│  └─ paseos/ (ChatScreen)
│
├─ components/
│  ├─ ui/ (Button, Card, Screen, Avatar, Icon, etc)
│  ├─ auth/ (Login forms)
│  ├─ mascota/ (TarjetaMascota, FormMascota)
│  ├─ paseos/ (TarjetaPaseo, DetallePaseo, Mapa)
│  ├─ cuidador/ (TarjetaSolicitud, EstadisticaCard)
│  ├─ explorer/ (CapturaTerritorial, MapaTerritorial)
│  ├─ chat/ (ChatScreen, MensajeItem)
│  └─ ...otros
│
├─ navigation/
│  ├─ RootNavigator.tsx (stack principal)
│  ├─ AuthNavigator.tsx (auth flow + selector rol)
│  ├─ TutorTabNavigator.tsx
│  ├─ CuidadorTabNavigator.tsx
│  ├─ ExplorerTabNavigator.tsx
│  ├─ AdminTabNavigator.tsx
│  └─ types.ts (param lists)
│
├─ constants/
│  ├─ h3.ts (resoluciones H3)
│  ├─ Theme.ts (colores, tipografía)
│  └─ ...otros
│
└─ functions/ (Cloud Functions en TypeScript)
   └─ src/
      ├─ actualizarPerfilPublico (trigger: usuarios/{uid})
      ├─ onCrearPaseoDirecto + escalarPaseoIndividual
      ├─ onPaseoConfirmado (crear chat automático)
      └─ ...otros
```

---

## 2.3 Flujo de Autenticación Real

```
App.tsx
  ↓
AuthProvider (escucha onAuthStateChanged)
  ├─ Si usuario:
  │  ├─ Cargar /usuarios/{uid}
  │  ├─ Asegurar rol 'explorador' (migracion automática)
  │  └─ Exponer user, roles, profile, helpers
  │
  └─ Si NO usuario:
     └─ AuthNavigator (Bienvenida → Ingresar/Registro)

AuthNavigator (con RolContext)
  ├─ Si múltiples roles:
  │  └─ Mostrar SeleccionarRolModal
  │
  └─ Navegar reset() a:
     ├─ TutorApp (tutor)
     ├─ CuidadorApp (cuidador)
     ├─ ExplorerApp (explorador)
     └─ AdminApp (admin)

RolContext mantiene rolActivo en AsyncStorage
  → Al cambiar: recargarPerfil() y actualizar UI
```

---

## 2.4 Firestore: Colecciones Reales

```
/usuarios/{uid}
├─ nombre, correo, celular, foto
├─ roles: ['tutor'] | ['cuidador'] | ['explorador'] | ['admin']
├─ verificado, estado, fecha_nacimiento
├─ ubicaciones?, id_ubicacion_principal?
├─ documento_identidad? (privado)
└─ creado_en, actualizado_en, creado_por, actualizado_por

/perfiles_publicos/{uid}
├─ nombre, foto, verificado
├─ rol_principal, horario_semanal?, calificacion?
├─ h3_r8? (zona cuidador)
└─ [Auto-actualizado por Cloud Function]

/mascotas/{mascotaId}
├─ nombre, especie, raza, foto, peso, tamano
├─ vacunas?, esterilizado?, condiciones_salud?
├─ nivel_energia?, preferencias_paseo?, activo
├─ creado_por: uid (tutor)
└─ creado_en, actualizado_en

/paseos/{paseoId}
├─ creado_por: uid (tutor)
├─ id_cuidador?: uid
├─ mascota_ids: [string]
├─ estado: PENDIENTE | CONFIRMADO | EN_CAMINO | ... | COMPLETADO
├─ fecha_inicio_programada, duracion_estimada
├─ fecha_inicio_real?, fecha_fin_real?
├─ ubicacion_inicio: { coordenadas, h3_r8, h3_r9, direccion_txt }
├─ precio, ruta?, codigos_recogida?
│
└─ Subcollections:
   ├─ mascotas/{mascotaId} [denormalización snapshot]
   ├─ ubicaciones/{id} [historial GPS]
   ├─ eventos/{id} [bitácora: llegada, juego, descanso]
   ├─ codigos_recogida/{tutorId} [validación]
   └─ fotos/{id} [capturas durante paseo]

/conversaciones/{paseoId}
├─ participantes: [tutorId, cuidadorId]
├─ tutor_id, cuidador_id, activa, cerrada_en?
│
└─ /mensajes/{mensajeId}
   ├─ contenido, autor_uid
   ├─ tipo_mensaje: 'texto' | 'sistema' | 'notificacion'
   ├─ leidos_por: { [uid]: true }
   └─ creado_en [autofecha]

/exploraciones/{exploracionId}
├─ id_explorador: uid
├─ coordenadas: { latitude, longitude }
├─ h3_r8, h3_r9
├─ tipo_punto: 'parque' | 'calle' | 'comercio' | ...
├─ mascotas_visibles: 0-100
├─ flujo_peatonal: 'bajo' | 'medio' | 'alto'
├─ observaciones?, foto_url?
├─ estado: 'pendiente' | 'validada' | 'rechazada'
├─ huellas_inmediatas: 5
├─ huellas_otorgadas?
└─ creado_en, actualizado_en

/h3_zonas/{h3_r9}
├─ h3_r8, h3_r9
├─ cuidadores_count, demanda_total, paseos_activos
├─ estado: 'sin_actividad' | 'disponible' | 'sin_cobertura' | 'activa' | 'en_operacion'
├─ indices?: { bienestar, seguridad, actividad, socializacion } [FASE 2]
├─ identidad?: { tipo, confianza, fuente } [FASE 2]
└─ creado_en, actualizado_en

/ubicaciones/{ubicacionId} [Caché geocodificación]
├─ componentes: { pais, departamento, ciudad, barrio }
├─ coordenadas: { latitude, longitude }
├─ direccion_txt, viewport
└─ fuente: 'google_places'
```

---

## 2.5 Servicios Clave

### ServicioCrudBase
Operaciones genéricas:
- `crear<T>(collection, data)` → CrudResult<T>
- `obtenerPorId<T>(collection, id)` → CrudResult<T>
- `actualizar<T>(collection, id, data)` → CrudResult<T>
- `eliminar(collection, id)` → CrudResult<boolean>
- `obtenerTodos<T>(collection)` → CrudResult<T[]>
- `buscar<T>(collection, campo, valor)` → CrudResult<T[]>

### ServicioUsuario
- `crear(usuario)` → CrudResult<Usuario>
- `crearConUid(uid, usuario)` → CrudResult<Usuario>
- `obtenerPorId(uid)` → CrudResult<Usuario>
- `actualizar(uid, datos)` → CrudResult<Usuario>
- `commitPerfilBatch(uid, datosUsuario, datosPerfilPublico)` [transacción]

### ServicioPaseo
- `crear(paseo)` → CrudResult<Paseo>
- `cambiarEstado(id, nuevoEstado)` [valida máquina]
- `generarCodigoRecogida(paseoId, tutorId)` → string
- `validarCodigoRecogida(paseoId, tutorId, codigo)` → boolean

### ServicioChat
- `obtenerMensajes(conversacionId)` [listener]
- `enviarMensaje(conversacionId, contenido, tipo)` → CrudResult
- `marcarComoLeido(conversacionId, usuarioId)`

### ServicioTerritorio
- `obtenerContextoTerritorial(lat, lng)` → { h3_r8, h3_r9 }
- Agnóstico a resoluciones (permite evolución sin cambiar callers)

---

## 2.6 LogicMatching: Disponibilidad Real

```typescript
esCuidadorDisponible(
  cuidador: PerfilPublico,
  fecha_inicio: Date,
  duracion: number
): boolean {
  
  // 1. ¿Tiene rol 'cuidador'?
  if (!cuidador.rol_principal === 'cuidador') return false
  
  // 2. ¿Tiene horario_semanal?
  if (!cuidador.horario_semanal) return false
  
  // 3. Extraer día de semana
  const diaSemana = fecha_inicio.getDay() // 0=domingo, 1=lunes, ...
  const nombreDia = ['domingo', 'lunes', ..., 'sabado'][diaSemana]
  
  // 4. ¿Disponible ese día?
  const horarioDia = cuidador.horario_semanal[nombreDia]
  if (!horarioDia?.habilitado) return false
  
  // 5. ¿Dentro del rango horario? (con margen ±12 min)
  const horaInicio = convertirAMinutos(horarioDia.hora_inicio) - 12
  const horaFin = convertirAMinutos(horarioDia.hora_fin) + 12
  const horaPaseo = convertirAMinutos(fecha_inicio)
  
  if (horaPaseo < horaInicio || horaPaseo > horaFin) return false
  
  // 6. ¿Hay excepción ese día?
  if (tienExcepcion(cuidador.uid, fecha_inicio)) return false
  
  // 7. ¿Sin otro paseo superpuesto?
  if (tieneConflicto(cuidador.uid, fecha_inicio, duracion)) return false
  
  return true
}
```

---

## 2.7 Cloud Functions Reales

| Función | Trigger | Acción |
|---------|---------|--------|
| **actualizarPerfilPublico** | usuarios/{uid} update | Sync nombre, foto, verificación → perfiles_publicos |
| **onCrearPaseoDirecto** | paseos create (modalidad DIRECTA) | Crear Cloud Task (delay 45min MVP 2.0) |
| **escalarPaseoIndividual** | Cloud Task (45min delay) | Eliminar id_cuidador → ABIERTA |
| **onPaseoConfirmado** | paseos/{id} estado→CONFIRMADO | POST /conversaciones/{paseoId} (auto-crear chat) |

---

# SECCIÓN 3: ESTRATEGIA DE LANZAMIENTO

## 3.1 Realidad Hoy vs. MVP 1.0

El código **EXISTE completamente**, pero no todo debe estar **ACTIVO en MVP 1.0**.

| Feature | Código Existe | MVP 1.0 | MVP 2.0 | MVP 3.0 |
|---------|---------------|---------|---------|---------|
| **Tutor** | ✓ | ✓ 100% | ✓ | ✓ |
| **Cuidador** | ✓ | ✓ 100% | ✓ | ✓ |
| **Explorador** | ✓ | ✗ Deshabilitado | ✓ | ✓ |
| **Admin** | ✓ | ✗ Solo logs | ✓ Básico | ✓ Completo |
| **Matching** | ✓ Estricto | ◇ Broadcast | ✓ Validar aceptación | ✓ Scoring |
| **Auto-escalada** | ✓ 10min | ✗ Deshabilitado | ✓ 45min | ✓ |
| **GPS** | ✓ | ✓ + fallback manual | ✓ | ✓ |
| **Chat** | ✓ | ✓ | ✓ | ✓ |
| **Códigos** | ✓ Manual | ✓ + timeout 15min | ✓ | ✓ QR scanner |
| **Captura Territorial** | ✓ | ✗ Deshabilitada | ✓ | ✓ Validación |
| **H3 Inteligencia** | ✓ Estructura | ✗ Sin índices | ◇ Básico | ✓ Completo |
| **Gamificación** | ✓ Huellas | ✗ | ◇ Básica | ✓ XP, badges |
| **Notif. Push** | ✗ | ✗ | ◇ In-app | ✓ FCM |
| **Pagos** | ✗ | ✗ | ✗ | ✓ Stripe/PayU |

---

## 3.2 MVP 1.0: Cambios Concretos

### A. Matching: De Filtro Estricto a Broadcast + Validación

**ACTUAL (Código):**
```typescript
const solicitudesVisibles = paseos.filter(p =>
  estaEnZona(p) &&
  estaDisponible(p) &&
  sinExcepciones(p) &&
  sinConflictos(p)
)
// Resultado: 0 paseos si falta UNA condición
```

**MVP 1.0 (Cambio):**
```typescript
const solicitudesVisibles = paseos.filter(p =>
  estaEnZona(p, H3_R8) // Zona más amplia
)
// Resultado: 5-10 paseos siempre

// Al ACEPTAR:
if (!estaDisponible()) {
  return { ok: false, msg: "No disponible ese horario" }
}
if (tieneConflicto()) {
  return { ok: false, msg: "Tienes otro paseo" }
}
return { ok: true }
```

**Ventaja:** Cuidador ve actividad, no se siente la app "muerta".

---

### B. Auto-Escalada: Desactivar en MVP 1.0

**ACTUAL (Código):**
```typescript
// Cloud Task con delay 10min
cloudTasksClient.createTask({
  parent: `projects/${projectId}/queues/default`,
  task: {
    httpRequest: {
      httpMethod: 'POST',
      url: `${functionUrl}/escalarPaseoIndividual`,
      delay: { seconds: 600 } // 10 minutos
    }
  }
})
```

**MVP 1.0 (Cambio):**
```typescript
// Comentar o añadir flag:
if (ENABLE_AUTO_ESCALADA === false) {
  // No crear task
  return
}
```

**Razón:** 10 minutos es insuficiente. Mejor esperar datos reales antes de activar.

---

### C. GPS: Agregar Fallback Manual

**Ubicación:** `screens/cuidador/ControlPaseo.tsx`

**Agregar botón:**
```typescript
<Button
  title="Actualizar Ubicación"
  icon="map-marker"
  onPress={async () => {
    const ubicacion = await getCurrentLocation()
    if (!ubicacion) {
      showModal("¿Dónde estás?", {
        onConfirm: (manualLoc) => publicarUbicacion(idPaseo, manualLoc)
      })
    } else {
      publicarUbicacion(idPaseo, ubicacion)
    }
  }}
/>
```

**En PaseoActivo (Tutor):**
```typescript
if (sinActualizacionesEnUltimos5Min) {
  mostrarBanner(
    "⚠️ Ubicación no actualiza. " +
    "El cuidador puede reportar manualmente."
  )
}
```

---

### D. Códigos: Timeout Automático 15min

**Ubicación:** `services/firebase/firestore/colecciones/paseo.ts`

**En cambiarAFinalizado:**
```typescript
await update(`/paseos/${paseoId}`, {
  estado: 'FINALIZADO',
  fecha_fin_real: Date.now(),
  timeout_validacion_en: Date.now() + (15 * 60 * 1000)
})

// Cloud Function (scheduled, cada 1 min):
if (paseo.estado === 'FINALIZADO' && 
    Date.now() > paseo.timeout_validacion_en) {
  
  // Notificar tutor (15min grace period)
  notificarTutor("⏰ 5 minutos para validar código")
  
  // Después de 5min más:
  if (Date.now() > paseo.timeout_validacion_en + (5 * 60 * 1000)) {
    update(`/paseos/${paseoId}`, {
      estado: 'COMPLETADO',
      validado_automaticamente: true
    })
    notificarTutor("✓ Paseo confirmado automáticamente")
  }
}
```

---

### E. Explorador: Desactivar en MVP 1.0

**Ubicación:** `context/AuthContext.tsx`

**ACTUAL:**
```typescript
if (!res.data.roles?.includes('explorador')) {
  await asegurarRolExplorador(firebaseUser.uid)
}
```

**MVP 1.0:**
```typescript
// Comentar la migración:
// if (!res.data.roles?.includes('explorador')) {
//   await asegurarRolExplorador(firebaseUser.uid)
// }

// Los usuarios solo tendrán: tutor, cuidador
```

**Reactivar en MVP 2.0 como opt-in en pantalla de Inicio.**

---

### F. Mascota: Nivel 1 → Nombre + Foto + Tamaño

**Ubicación:** `models/Mascota.ts`

**Definir Nivel 1:**
```typescript
type CompletitudNivel = 1 | 2 | 3

// Nivel 1: nombre + foto + tamaño (MVP 1.0)
// Nivel 2: + vacunas + esterilizado (MVP 2.0)
// Nivel 3: + condiciones_salud + nivel_energia (MVP 3.0)

export const calcularCompletitud = (mascota: Mascota): CompletitudNivel => {
  const campos = [
    mascota.nombre,
    mascota.foto,
    mascota.tamano
  ]
  if (campos.every(c => c)) return 1
  if (mascota.vacunas && mascota.esterilizado) return 2
  if (mascota.condiciones_salud && mascota.nivel_energia) return 3
  return 1
}

// Validación en SolicitarPaseo:
if (calcularCompletitud(mascota) < 1) {
  alert("Completa nombre + foto + tamaño")
}
```

---

## 3.3 Mantras y Principios del MVP

### 1. Mostrar Actividad Antes que Perfección

**Ejemplos:**
- Broadcast en lugar de filtro perfecto
- Permitir solicitud con datos mínimos
- GPS manual en lugar de esperar automático

### 2. Nunca Introducir Complejidad Sin Datos

**No construir:**
- IA scoring
- Ranking complejos
- ML
- Índices territoriales avanzados

**Hasta:**
- Tener 1000+ paseos
- Entender patrón real de usuarios

### 3. Comunicación Clara Sobre Fallidos

**Cuando algo NO funciona:**
```
"No puedes aceptar porque tienes otro paseo"
"Ubicación no actualiza. Reporta manualmente."
"Completa 3 campos mínimos en la mascota"
```

NO ocultar errores, NO dejar en incertidumbre.

---

## 3.4 Hoja de Ruta: 4 Semanas

### SEMANA 1: Implementación

```
[ ] 1. Relax matching (solo filtrar H3_R8, validar en aceptación)
[ ] 2. Timeout códigos (15min → 5min → auto)
[ ] 3. Fallback GPS manual (botón "Actualizar Ubicación")
[ ] 4. Banner GPS (advertencia si sin actualizar 5min)
[ ] 5. Desactivar auto-escalada (comentar Cloud Task)
[ ] 6. Desactivar explorador auto-add (comentar migracion)
[ ] 7. Mascota Nivel 1 (nombre + foto + tamaño)
[ ] 8. Advertencia en solicitud (si mascota < Nivel 2)
```

**Prioridad:** 1-5 son críticas. 6-8 son UX.

### SEMANA 2: Testing Interno

```
[ ] Prueba 3-4 paseos completos
[ ] Testing GPS real en calles
[ ] Testing chat latencia
[ ] Testing permisos (Android 10+, iOS)
[ ] Debugging + fixes rápidos
```

### SEMANA 3: Prueba Beta

```
[ ] Test con 5 usuarios reales (amigos/familia)
[ ] Observar: ¿Cuidador ve solicitudes?
[ ] Observar: ¿Aceptación rápida?
[ ] Observar: ¿GPS funciona?
[ ] Iterar basado en feedback
```

### SEMANA 4: Lanzamiento + Preparar MVP 2.0

```
[ ] Lanzar MVP 1.0
[ ] Monitorear errores en backend
[ ] Recolectar métricas
[ ] Planificar MVP 2.0
```

---

## 3.5 Métricas de Éxito MVP 1.0

Si estos números son ✓, MVP 1.0 es exitoso:

```
✓ Paseos completados exitosamente: > 80%
✓ Cuidadores que ven solicitudes: > 90%
✓ Tiempo promedio aceptación: < 5 minutos
✓ GPS uptime: > 95%
✓ Tutor retención (completan paseo): > 70%
✓ Bugs críticos bloqueantes: 0
```

Si alguno falla, iterar rápido en MVP 1.0 antes de pasar a 2.0.

---

## 3.6 Riesgos Aceptados en MVP 1.0

```
⚠️  H3_R8 puede ser larga distancia
    → Si usuario está fuera: no ve nada
    → Comunicar: "Pet Pals es local por ahora"

⚠️  Chat sin FCM = solo in-app
    → Si cuidador cierra app: no ve mensaje
    → Mitigación: banners al abrir

⚠️  GPS background Android < 10
    → Sin background tracking en Android 9 y menos
    → Documentar, soporte manual

⚠️  Códigos ingreso manual (no QR)
    → 6 dígitos pueden confundir
    → MVP 2.0: agregar QR scanner

⚠️  Captura territorial deshabilitada
    → No hay datos territoriales en MVP 1.0
    → Reactivar MVP 2.0 como opt-in
```

---

## 3.7 MVP 2.0: Preview

**Cuándo:** Después de 100+ paseos exitosos

```
◇ Auto-escalada: 45min + 2 recordatorios
◇ Explorador: Reactivado como opt-in ("¿Explorar tu barrio?")
◇ Gamificación: Huellas básicas por paseo completado
◇ Calificaciones: ⭐⭐⭐⭐⭐ post-paseo
◇ Notificaciones: In-app + (futuro) FCM
◇ Admin: Dashboard básico (KPIs visuales)
```

---

## 3.8 MVP 3.0: Vision

**Cuándo:** Core validado, necesitas escalar

```
◇ Captura territorial: Validación manual + índices
◇ H3 inteligencia: Cálculo de bienestar/seguridad
◇ Matching avanzado: Scoring + recomendaciones
◇ Gamificación completa: XP, badges, leaderboards
◇ Multi-ciudad: Expansión geográfica
◇ Pagos: Stripe/PayU integrados
```

---

# Conclusión

## La Regla de Oro

**La arquitectura es sólida. El MVP 1.0 no necesita toda la complejidad.**

**Pet Pals tiene que demostrar que:**
1. Tutor y cuidador pueden conectar
2. Pueden ejecutar un paseo juntos
3. Hay transparencia (GPS + chat) y confianza (código)

**Todo lo demás es "salsa". La agregamos cuando tengamos datos reales de usuarios.**

---

## Decisiones Clave (Resumidas)

| Decisión | Por Qué |
|----------|---------|
| **Broadcast en H3_R8** | Cuidador debe ver paseos, no sentir app "muerta" |
| **Timeout 15min → 5min → auto** | Evita bloqueos invisibles, cuidador no espera indefinidamente |
| **Fallback GPS manual** | GPS falla. Tutor necesita saber dónde está siempre. |
| **Desactivar auto-escalada** | 10min es muy corto. Reactivar con datos reales. |
| **Desactivar explorador** | MVP 1.0 = Tutor + Cuidador. Exploradores MVP 2.0. |
| **Mascota Nivel 1** | Menos fricción inicial. Iterar después con datos. |

---

**Próximos pasos:**
1. Alinear equipo en estas decisiones
2. Implementar cambios en Semana 1
3. Testing interno en Semana 2
4. Lanzamiento en Semana 4

🐾 **Adelante con Pet Pals MVP 1.0.**
