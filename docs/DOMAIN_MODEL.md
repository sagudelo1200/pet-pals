# DOMAIN MODEL — Paw-Path

**Última actualización**: 2026-08-01  
**Estado**: ✅ CONGELADO PARA MVP  
**Versión**: 1.0

---

## 🏛️ PRINCIPIOS DEL DOMINIO

Estas no son reglas técnicas. Son decisiones que gobiernan cómo Paw-Path evoluciona durante años.

### 1. **La Coordinación de Relaciones, No Transacciones**

Paw-Path no es un marketplace de servicios puntuales. Coordina **relaciones duraderas** entre tutores y cuidadores. Cada paseo es una oportunidad para fortalecer esa relación.

**Implicación**: No optimizamos por "cerrar el paseo más rápido". Optimizamos por "¿volverá este tutor con este cuidador en 6 meses?".

### 2. **La Continuidad Sobre la Optimización**

Un cuidador que el tutor conoce es siempre mejor que el "cuidador óptimo" según algoritmo.

**Implicación**: Después del primer paseo compartido, priorizar cuidador conocido sobre matching perfecto.

### 3. **Las Personas Resuelven Primero**

El sistema acompaña, pero nunca reemplaza el juicio humano. Si surge un conflicto (tardanza, cambio de planes), ofrecemos herramientas para que se comuniquen antes de penalizar.

**Implicación**: Recordatorios, sugerencias, botones de "reportar inconveniente" antes de auto-cancelación.

### 4. **La Reputación es Patrón, No Evento**

Una cancelación no hace mal cuidador. Un patrón de cancelaciones sí. La reputación refleja comportamiento consistente.

**Implicación**: Indicadores de confiabilidad (cumplimiento, comunicación, puntualidad) en lugar de una única calificación de 5 estrellas.

### 5. **Toda Acción Relevante es Auditable**

No solo para compliance. Para entender patrones territoriales, comportamientos, oportunidades.

**Implicación**: Cada transición, comunicación, y decisión se registra con contexto completo.

### 6. **El Sistema Acompaña el Criterio Humano**

El algoritmo NO decide quién puede o no ser cuidador. Propone. El usuario decide.

**Implicación**: Sugerencias de horarios, no imposiciones. Proposiciones de cuidadores, no asignaciones forzadas.

### 7. **La Experiencia de la Mascota Tiene Prioridad**

Toda decisión debe hacerse pensando en el bienestar de la mascota, no en la eficiencia operativa.

**Implicación**: Si hay conflicto entre "cumplir horario" y "mascota está cómoda", siempre gana la mascota.

---

## 📊 AGREGADO PRINCIPAL: LA RELACIÓN

**Esto es crítico:** En Paw-Path, el agregado principal NO es el paseo. Es la **Relación Tutor–Cuidador**.

```
Modelo Traditional (Marketplace):
Tutor → Paseos Independientes → Cuidador

Modelo Paw-Path (Coordinación):
Tutor → Relación → Paseos, Confianza, Historial, Preferencias
```

### Estructura de Datos

```typescript
// Agregado Principal: Relación
Relacion {
  id: string // uid_tutor + uid_cuidador (hash)
  tutorId: string
  cuidadorId: string

  // Identidad
  estado: "nueva" | "activa" | "pausada" | "finalizada"

  // Cronología
  primeraExperiencia: Date // Primer paseo completado
  ultimaExperiencia: Date  // Último paseo completado
  ultimaIntentoDeSolicitud: Date // Último intento (incluso cancelado)

  // Confianza
  paseosCompletados: number
  cancelacionesTutor: number
  cancelacionesCuidador: number
  incidencias: number

  // Preferencias Aprendidas
  horarioPreferido?: string
  frecuenciaUsual?: "diaria" | "semanal" | "mensual" | "ocasional"
  mascotasPrincipalesc: string[]
  lugaresHabituales?: string[]

  // Reputación Acumulada (vive aquí, no en el cuidador)
  confiabilidad: number // 0-100
  comunicacion: number
  puntualidad: number
  continuidad: number
  afinidad: number // "qué tan bien entiende a mi mascota"

  // Auditoría
  creado: Date
  actualizado: Date
  eventos: Event[] // Referencia a todos los eventos de esta relación
}

// Documento Secundario: Paseo
Paseo {
  id: string
  relacionId: string // ← Vive dentro de una relación

  mascotaIds: string[]
  ubicacion: GeoPoint
  horaInicio: string
  duracion: number

  estado: "solicitado" | "coordinado" | "confirmado" | "en_camino" | ... (ver máquina de estados)

  // Contexto de la Relación
  esRepeticion: boolean // ¿Es con un cuidador conocido?
  tiempoDesdeUltimaVez?: number // Días

  // Auditoria
  eventos: Event[]
  calificacion?: Rating // Opcional, no bloquea el cierre
}
```

**Implicación**: Cuando el tutor regresa, mostramos "Volver a pasear con Carlos" (relación persistente), no "buscar nuevo cuidador".

---

## 🔄 MÁQUINA DE ESTADOS

### Estados y Transiciones

```
SOLICITADO
├─ Actor: Tutor
├─ Disparo: TutorSolicita
├─ Duración máx: 30 min (timeout)
├─ Salidas posibles:
│  ├─ COORDINACION_PROPUESTA (match encontrado)
│  ├─ CANCELADO (tutor cancela)
│  └─ EXPIRADO (timeout 30 min)
├─ Datos: mascota, ubicación, hora, duración
└─ Auditoría: [WalkRequested]

    ↓

COORDINACION_PROPUESTA
├─ Actor: Sistema
├─ Disparo: MatchingEncontrado
├─ Duración máx: 20 min (timeout)
├─ Lo que ve Cuidador: Modal "Coordinar paseo con [Tutor]"
├─ Salidas posibles:
│  ├─ DISPONIBILIDAD_CONFIRMADA (cuidador confirma)
│  ├─ RECHAZADO (cuidador rechaza)
│  ├─ CANCELADO (tutor cancela)
│  └─ EXPIRADO (timeout 20 min → buscar otro)
├─ Notificación: CuidadorTienePropuesta
└─ Auditoría: [MatchingEncontrado]

    ↓

DISPONIBILIDAD_CONFIRMADA
├─ Actor: Cuidador
├─ Disparo: CuidadorConfirmaDisponibilidad
├─ Duración máx: 4 horas (timeout)
├─ Lo que ve Tutor: Modal "Carlos está disponible. ¿Confirmas?"
├─ Lo que ve Cuidador: "Esperando confirmación del tutor"
├─ Salidas posibles:
│  ├─ ACUERDO_ESTABLECIDO (tutor confirma)
│  ├─ RECHAZADO (tutor rechaza)
│  ├─ CUIDADOR_CANCELA_ANTICIPADAMENTE (cuidador se arrepiente)
│  └─ EXPIRADO (timeout 4h)
├─ Notificación: TutorCuidadorEstaDisponible, CuidadorAguardaConfirmacion
└─ Auditoría: [CuidadorConfirmaDisponibilidad]

    ↓

ACUERDO_ESTABLECIDO
├─ Actor: Tutor
├─ Disparo: TutorConfirma
├─ Duración máx: Hasta hora del paseo
├─ Lo que ve Tutor: "Acuerdo confirmado. Espera a [Cuidador]"
├─ Lo que ve Cuidador: "Tutor confirmó. Prepárate."
├─ Salidas posibles:
│  ├─ EN_CAMINO (cuidador saliendo)
│  ├─ CUIDADOR_CANCELA_ULTIMA_HORA (incidencia/emergencia)
│  ├─ TUTOR_CANCELA (cambio de planes)
│  └─ NO_SHOW (hora pasó, nadie inició)
├─ Notificaciones: AcuerdoEstablecido, ambos reciben confirmación final
└─ Auditoría: [TutorConfirmaAcuerdo]

    ↓

EN_CAMINO
├─ Actor: Cuidador
├─ Disparo: CuidadorSaliendo
├─ Duración máx: 30 min (tiempo estimado de llegada)
├─ Lo que ve Tutor: Mapa en vivo, ETA
├─ Lo que ve Cuidador: "En camino a [ubicación]"
├─ Salidas posibles:
│  ├─ PASEO_INICIADO (cuidador llega, inicia)
│  ├─ INCIDENCIA_REPORTADA (tráfico, accidente)
│  └─ CUIDADOR_CANCELA (emergencia en ruta)
├─ Notificaciones: TutorCuidadorEnCamino, LocalizaciónEnVivo
└─ Auditoría: [CuidadorDeparture]

    ↓

PASEO_INICIADO
├─ Actor: Cuidador
├─ Disparo: CuidadorTocaIniciar
├─ Duración: Variable (según duración solicitada)
├─ Lo que ve Tutor: Cronómetro, ubicación en tiempo real
├─ Lo que ve Cuidador: "Paseo activo desde hace 5 min"
├─ Salidas posibles:
│  ├─ PASEO_FINALIZADO (cuidador toca terminar)
│  ├─ PAUSA (necesita descansar)
│  └─ INCIDENCIA_URGENTE (seguridad de mascota)
├─ Notificaciones: PaseoIniciado
└─ Auditoría: [WalkStarted, LocationUpdates cada 30 seg]

    ↓

PASEO_FINALIZADO
├─ Actor: Cuidador
├─ Disparo: CuidadorTocaTerminar
├─ Duración: Variable (mientras se valida)
├─ Lo que ve Cuidador: Resumen, duración real, ubicación final
├─ Lo que ve Tutor: "Carlos está finalizando. Ingresa código para confirmar"
├─ Salidas posibles:
│  ├─ TUTOR_VALIDA (tutor ingresa código o confirma visualmente)
│  ├─ TUTOR_REPORTA_PROBLEMA (algo no cuadra)
│  └─ TIMEOUT_SIN_VALIDACION (72 horas)
├─ Notificaciones: PaseoTerminado, TutorValidaFinalización
└─ Auditoría: [WalkCompleted, FinalLocation]

    ↓

TUTOR_VALIDA
├─ Actor: Tutor
├─ Disparo: TutorIngresaCodigo (o confirma sin código si es conocido)
├─ Duración: 7 días para rating (opcional)
├─ Lo que ve Tutor: Modal "¿Cómo fue la experiencia?" (opcional)
├─ Lo que ve Cuidador: "Tutor validó tu trabajo"
├─ Salidas posibles:
│  ├─ CERRADO (sin rating)
│  ├─ CALIFICADO (con rating)
│  └─ DISPUTADO (tutor reporta problema)
├─ Notificaciones: PaseoValidado, ReputacionActualizada
└─ Auditoría: [TutorValidatesFinalización]

    ↓

CALIFICADO
├─ Actor: Tutor (opcional)
├─ Disparo: TutorEnvíaRating
├─ Duración: Final
├─ Lo que ve Tutor: Rating guardado
├─ Lo que ve Cuidador: Vio tu valoración (sin comentario si lo prefiere)
├─ Salidas posibles:
│  └─ CERRADO (siempre)
├─ Notificaciones: RatingRecibido, ActualizacionDeConfianza
└─ Auditoría: [RatingSubmitted]

    ↓

CERRADO
├─ Actor: Sistema
├─ Disparo: Paseo completado + 30 días, o Paseo validado sin rating
├─ Duración: Permanente
├─ Lo que ve: Historial
├─ Salidas posibles: NINGUNA (estado final)
├─ Impacto: Actualiza métricas de Relación (paseosCompletados++, confiabilidad++, etc)
└─ Auditoría: [WalkArchived]

// Estados Laterales

CANCELADO
├─ Orígenes: SOLICITADO, COORDINACION_PROPUESTA, DISPONIBILIDAD_CONFIRMADA, ACUERDO_ESTABLECIDO
├─ Actor: Tutor o Cuidador
├─ Disparo: CancelacionManual
├─ Tiempo: Depende de cuándo
├─ Auditoría: [WalkCancelled] con { cancelador, momento, motivo }
├─ Reputación: Afecta cumplimiento de Relación (solo si patrón)
└─ Dinero: Ninguna penalización en MVP

RECHAZADO
├─ Origen: COORDINACION_PROPUESTA
├─ Actor: Cuidador
├─ Impacto: No afecta reputación (rechazar es normal)
├─ Auditoría: [CuidadorRechaza]
└─ Siguiente: Sistema busca otro cuidador

INCIDENCIA
├─ Orígenes: EN_CAMINO, PASEO_INICIADO
├─ Actor: Cuidador o Tutor
├─ Disparo: CuidadorReportaProblema
├─ Tipo: "Tráfico", "Mascota asustada", "Lesión", etc
├─ Resultado: Comunicación bilateral, posible extensión o rescate
└─ Auditoría: [IncidenciaReportada] con contexto
```

---

## 🛡️ INVARIANTES DEL DOMINIO

Reglas que **NUNCA pueden romperse**. El código las garantiza, Firestore las valida:

```typescript
// Invariantes Estructurales

1. INTEGRIDAD REFERENCIAL
   - Un Paseo siempre tiene exactamente 1 Tutor (inmutable)
   - Un Paseo siempre tiene exactamente 1 Cuidador (después de COORDINACION_PROPUESTA, inmutable)
   - Un Paseo siempre tiene ≥1 Mascota
   - Un Paseo siempre tiene 1 Ubicación, 1 Hora de inicio, 1 Duración

2. RELACIÓN SIEMPRE EXISTE PRIMERO
   - No puede haber Paseo sin Relación
   - La Relación NO se crea por Paseo (se crea por primer Paseo COMPLETADO)

3. MÁQUINA UNIDIRECCIONAL
   - Un Paseo jamás regresa a estado anterior
   - SOLICITADO → COORDINACION_PROPUESTA (nunca vuelve)
   - ACUERDO_ESTABLECIDO → EN_CAMINO (nunca vuelve)

4. CALIFICACIÓN SOLO DESPUÉS DE CIERRE
   - No puede existir Rating sin Paseo.estado == CERRADO
   - No puede modificarse Rating una vez enviado
   - No puede asociarse Rating a Paseo activo

5. CANCELACIÓN SOLO EN VENTANAS PERMITIDAS
   - No puede cancelarse en TUTOR_VALIDA o posterior
   - Cancelación registra timestamp, actor, motivo (no se borra)

6. EVENTOS INMUTABLES
   - Una vez registrado un evento, no cambia
   - Timestamp es inmutable
   - Actor no puede cambiar

7. REPUTACIÓN EN CONTEXTO DE RELACIÓN
   - Las métricas de Confiabilidad viven en Relación, no en Usuario
   - Dos usuarios pueden tener confiabilidad diferente según la relación
   - (Carlos puede ser 95% confiable con Tutor A, 80% con Tutor B)

// Invariantes Comportamentales

8. TIMEOUT RESPETADO
   - COORDINACION_PROPUESTA debe expirar en 20 min (no puede extenderse)
   - DISPONIBILIDAD_CONFIRMADA debe expirar en 4 horas
   - Sistema busca alternativa automáticamente

9. DEDUPLICACIÓN
   - No puede haber dos Paseos idénticos (mismo tutor, cuidador, tiempo, mascota)
   - Múltiples clicks en "Confirmar" crean 1 Paseo, no N

10. RECUPERACIÓN ANTE REINICIO
    - Si usuario cierra app con Paseo en estado EN_CAMINO, al abrir va directo a ese paseo
    - No hay "pérdida" de contexto
```

---

## 📡 EVENTOS AUDITABLES

No para analytics. Para **audit trail del negocio**. Cada evento incluye `timestamp`, `actor`, `relacionId`, `paseoId`.

```typescript
// Ciclo de Vida del Paseo

WalkRequested {
  timestamp: Date
  tutorId: string
  paseoId: string
  relacionId: string | null // null si es primer paseo
  mascotaIds: string[]
  ubicacion: GeoPoint
  horaInicio: string
  duracion: number
  cuidadorPreferido?: string // Si solicita un conocido
}

MatchingEncontrado {
  timestamp: Date
  paseoId: string
  cuidadorId: string
  distancia: number
  tiempoCalculo: number
  esRepeticion: boolean
}

CuidadorConfirmaDisponibilidad {
  timestamp: Date
  paseoId: string
  cuidadorId: string
  horarioPropuesto?: string // Si propone cambio
  ubicacionConfirmada?: GeoPoint
}

TutorConfirmaAcuerdo {
  timestamp: Date
  paseoId: string
  tutorId: string
  precioFinal: number
  metodoPago: string // "saldo" | "tarjeta" | etc
}

CuidadorDeparture {
  timestamp: Date
  paseoId: string
  cuidadorId: string
  ubicacionSalida: GeoPoint
  etaMinutos: number
}

WalkStarted {
  timestamp: Date
  paseoId: string
  cuidadorId: string
  ubicacion: GeoPoint
}

WalkCompleted {
  timestamp: Date
  paseoId: string
  cuidadorId: string
  duracionReal: number
  ubicacionFinal: GeoPoint
  fotosAdjuntas?: string[] // URLs a Cloud Storage
}

TutorValidatesFinalización {
  timestamp: Date
  paseoId: string
  tutorId: string
  metodo: "codigo" | "confirmacion_visual" | "timeout_automatico"
}

RatingSubmitted {
  timestamp: Date
  paseoId: string
  tutorId: string
  cuidadorId: string
  calificacion: {
    confiabilidad: 1-5
    comunicacion: 1-5
    puntualidad: 1-5
    afinidad: 1-5 // "entiende a mi mascota"
  }
  comentario?: string
  fotosAdjuntas?: string[]
}

// Ciclo de Cancelación

WalkCancelled {
  timestamp: Date
  paseoId: string
  cancelador: "tutor" | "cuidador" | "sistema"
  momento: "pre-coordinacion" | "post-coordinacion" | "en_camino" | "durante_paseo"
  motivo: string // "cambio_de_planes" | "emergencia" | "timeout" etc
  penalizacion?: { monto: number, razon: string }
  relacionId: string
}

// Incidencias

IncidenciaReportada {
  timestamp: Date
  paseoId: string
  reportadorId: string // Cuidador o Tutor
  tipo: "trafico" | "mascota_asustada" | "lesion" | "otro"
  descripcion: string
  ubicacion: GeoPoint
  fotosAdjuntas?: string[]
}

IncidenciaResuelta {
  timestamp: Date
  paseoId: string
  tipo: "continuacion" | "corte_anticipado" | "rescate"
  notas: string
}

// Relación

PrimeraExperienciaCompletada {
  timestamp: Date
  tutorId: string
  cuidadorId: string
  relacionId: string
  // ← La relación nace aquí
}

RelacionPausada {
  timestamp: Date
  relacionId: string
  actor: "tutor" | "cuidador"
  motivo?: string
}

RelacionReactivada {
  timestamp: Date
  relacionId: string
  actor: "tutor" | "cuidador"
}
```

---

## 📋 CATÁLOGOS CONGELADOS

Una vez congelados, NO cambian sin migración.

```typescript
// Estados del Paseo (Enum inmutable)
export const WalkState = {
  SOLICITADO: 'solicitado',
  COORDINACION_PROPUESTA: 'coordinacion_propuesta',
  DISPONIBILIDAD_CONFIRMADA: 'disponibilidad_confirmada',
  ACUERDO_ESTABLECIDO: 'acuerdo_establecido',
  EN_CAMINO: 'en_camino',
  PASEO_INICIADO: 'paseo_iniciado',
  PASEO_FINALIZADO: 'paseo_finalizado',
  TUTOR_VALIDA: 'tutor_valida',
  CALIFICADO: 'calificado',
  CERRADO: 'cerrado',
  CANCELADO: 'cancelado',
  RECHAZADO: 'rechazado',
  INCIDENCIA: 'incidencia',
} as const

// Momentos de Cancelación
export const CancellationMoment = {
  PRE_COORDINACION: 'pre_coordinacion', // SOLICITADO
  POST_COORDINACION: 'post_coordinacion', // DISPONIBILIDAD_CONFIRMADA hasta ACUERDO_ESTABLECIDO
  EN_CAMINO: 'en_camino',
  DURANTE_PASEO: 'durante_paseo',
} as const

// Motivos de Cancelación
export const CancellationMotives = {
  TUTOR_CAMBIO_PLANES: 'tutor_cambio_planes',
  TUTOR_EMERGENCIA: 'tutor_emergencia',
  CUIDADOR_EMERGENCIA: 'cuidador_emergencia',
  CUIDADOR_NO_DISPONIBILIDAD: 'cuidador_no_disponibilidad',
  MASCOTA_SALUD: 'mascota_salud',
  SISTEMA_TIMEOUT: 'sistema_timeout',
  SISTEMA_NO_VALIDACION: 'sistema_no_validacion',
} as const

// Tipos de Incidencia
export const IncidenceType = {
  TRAFICO: 'trafico',
  MASCOTA_ASUSTADA: 'mascota_asustada',
  LESION: 'lesion',
  COMPORTAMIENTO_INESPERADO: 'comportamiento_inesperado',
  EMERGENCIA: 'emergencia',
  OTRO: 'otro',
} as const

// Resolución de Incidencia
export const IncidenceResolution = {
  CONTINUACION: 'continuacion', // Continúa el paseo
  CORTE_ANTICIPADO: 'corte_anticipado', // Termina antes
  RESCATE: 'rescate', // Necesita intervención tutor
} as const

// Tipos de Rating
export const RatingDimensions = {
  CONFIABILIDAD: 'confiabilidad',
  COMUNICACION: 'comunicacion',
  PUNTUALIDAD: 'puntualidad',
  AFINIDAD: 'afinidad', // "Entiende a mi mascota"
} as const

// Tipos de Notificación
export const NotificationType = {
  // Tutor
  COORDINACION_PROPUESTA: 'coordinacion_propuesta',
  CUIDADOR_EN_CAMINO: 'cuidador_en_camino',
  PASEO_INICIADO: 'paseo_iniciado',
  CUIDADOR_REPORTA_INCIDENCIA: 'cuidador_reporta_incidencia',
  PASEO_FINALIZADO: 'paseo_finalizado',
  SOLICITUD_VALIDACION: 'solicitud_validacion',
  RATING_RECIBIDO: 'rating_recibido',

  // Cuidador
  NUEVA_OPORTUNIDAD: 'nueva_oportunidad',
  TUTOR_CONFIRMO: 'tutor_confirmo',
  TUTOR_RECHAZÓ: 'tutor_rechazó',
  TUTOR_VALIDO_PASEO: 'tutor_valido_paseo',

  // Sistema
  RECORDATORIO: 'recordatorio',
  SUGERENCIA_CONTACTO: 'sugerencia_contacto',
} as const

// Roles (Ya existía, pero aquí lo congelamos)
export const Role = {
  TUTOR: 'tutor',
  CUIDADOR: 'cuidador',
  ADMIN: 'admin',
} as const

// Métodos de Validación
export const ValidationMethod = {
  CODIGO_VERIFICACION: 'codigo',
  CONFIRMACION_VISUAL: 'visual',
  TIMEOUT_AUTOMATICO: 'timeout',
} as const
```

---

## 🔐 PERMISOS POR ESTADO

Quién puede hacer qué en cada estado:

```
SOLICITADO
├─ Tutor: Cancelar
├─ Cuidador: ❌ Nada (no ve paseo todavía)
└─ Sistema: Buscar cuidador

COORDINACION_PROPUESTA
├─ Tutor: ❌ Nada (esperando cuidador)
├─ Cuidador: Confirmar disponibilidad, Rechazar
└─ Sistema: Expirar si timeout

DISPONIBILIDAD_CONFIRMADA
├─ Tutor: Confirmar, Rechazar
├─ Cuidador: Cancelar (con penalización reputacional)
└─ Sistema: Expirar si timeout

ACUERDO_ESTABLECIDO
├─ Tutor: Cancelar (penalización si es última hora)
├─ Cuidador: Cancelar (penalización reputacional)
└─ Sistema: Monitorear si se pasa hora

EN_CAMINO
├─ Tutor: Ver ubicación, Contactar cuidador, Reportar problema
├─ Cuidador: Actualizar ubicación, Reportar incidencia
└─ Sistema: Recibir actualizaciones GPS

PASEO_INICIADO
├─ Tutor: Ver en tiempo real, Reportar incidencia
├─ Cuidador: Pausar, Reportar incidencia, Finalizar
└─ Sistema: Recibir updates de ubicación

PASEO_FINALIZADO
├─ Tutor: Ingresar código, Reportar problema, Ver resumen
├─ Cuidador: ❌ Ver resumen (espera validación)
└─ Sistema: Notificar tutor

TUTOR_VALIDA
├─ Tutor: Calificar (opcional), Reportar disputa
├─ Cuidador: Ver que tutor validó
└─ Sistema: Cerrar o abrir disputa

CALIFICADO / CERRADO
├─ Tutor: Ver historial
├─ Cuidador: Ver rating y comentarios
└─ Sistema: Archivado
```

---

## 📊 CÁLCULO DE CONFIABILIDAD

La reputación NO es una estrella. Es un perfil en contexto de relación:

```typescript
// Para una Relación específica, Tutor-Cuidador

Confiabilidad = (
  (Puntualidad * 0.25) +
  (Cumplimiento * 0.35) +
  (Comunicacion * 0.20) +
  (Afinidad * 0.20)
) / 100

Donde:

Puntualidad = (paseos_a_tiempo / paseos_totales) * 100
              // Si llega más de 10 min tarde = 0 ese paseo

Cumplimiento = (paseos_completados / (paseos_totales + cancelaciones)) * 100
               // Cancelaciones = -10 puntos por evento

Comunicacion = Promedio de ratings en "comunicacion" dimension
               // Defecto si nunca se calificó = 80

Afinidad = Promedio de ratings en "afinidad" dimension
           // Defecto si nunca se calificó = Neutral (sin penalización)
```

**Nota**: Esto se recalcula después de cada paseo CERRADO. No antes.

---

## 🎯 DECISIONES DERIVADAS DE LOS PRINCIPIOS

Para referencia futura cuando surjan preguntas:

| Pregunta                          | Respuesta                                                        | Principio                        |
| --------------------------------- | ---------------------------------------------------------------- | -------------------------------- |
| ¿Penalizamos cancelaciones?       | Solo reputacional (patrón), no económico en MVP                  | Personas resuelven primero       |
| ¿Qué pasa si tardanza?            | Recordatorios, sugerencias, botón de incidencia (no auto-cancel) | Las personas resuelven primero   |
| ¿Cuándo nace la relación?         | Después de primer paseo COMPLETADO y VALIDADO                    | La coordinación > la transacción |
| ¿Rating obligatorio?              | Opcional. Se ofrece 7 días. Después se archiva.                  | Flujo no se bloquea por datos    |
| ¿Qué pasa si no acepta en 20 min? | Busca otro cuidador automáticamente                              | La coordinación debe ser ágil    |
| ¿Puede saltarse estados?          | No. NUNCA. Máquina unidireccional.                               | Integridad de datos              |
| ¿Qué es lo más importante?        | Que el tutor confíe en el cuidador para paseos futuros           | Coordinación de relaciones       |

---

**Documento congelado. Cualquier cambio requiere decisión explícita y versionado.**
