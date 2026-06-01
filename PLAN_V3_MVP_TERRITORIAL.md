# 🎯 PLAN V3: MVP TERRITORIAL REAL (Loop Mínimo)

**Generado**: 19 de mayo de 2026 (V3 - MVP Enfocado)  
**Timeline**: 2-3 semanas  
**Alcance**: Solo el loop territorial que importa  
**Métrica de Éxito**: % de paseos repetidos con mismo cuidador  
**Territorio Piloto**: Laureles, Medellín

---

## 📋 TABLA DE CONTENIDOS

1. [La Realidad del MVP](#la-realidad-del-mvp)
2. [Loop Territorial Mínimo](#loop-territorial-mínimo)
3. [Qué Construimos, Qué NO](#qué-construimos-qué-no)
4. [Cambios Modelos Datos](#cambios-modelos-datos)
5. [Pantallas Reales (5 Solamente)](#pantallas-reales-5-solamente)
6. [Flujo Exacto del MVP](#flujo-exacto-del-mvp)
7. [Backend Mínimo](#backend-mínimo)
8. [Timeline Realista](#timeline-realista)
9. [Riesgos a Evitar](#riesgos-a-evitar)

---

## 🎯 LA REALIDAD DEL MVP

### Qué Es Realmente El MVP

**NO:**

- Sistema completo
- 40 pantallas
- Analytics avanzadas
- Territorio Vivo
- Dashboards
- Descuentos por recurrencia
- Historial sofisticado

**SÍ:**

```
Tutor solicita paseo
  ↓
Sistema busca cuidador territorial
  ↓
Cuidador acepta
  ↓
Paseo ocurre (inicio → foto → fin)
  ↓
Tutor califica
  ↓
Tutor solicita OTRA VEZ con mismo cuidador
  ↓
LA RECURRENCIA EMERGE NATURALMENTE
```

**Si ese loop funciona:**

- Todo lo demás tiene sentido
- La arquitectura territorial se valida
- La confianza emerge realmente

**Si ese loop falla:**

- Nada más importa

---

## 🔄 LOOP TERRITORIAL MÍNIMO

### Día 1: Primer Paseo

```
USUARIO NUEVO
  ↓ Onboarding mínimo (nombre, mascota, casa)
  ↓
SOLICITA PASEO
  ↓ Elige: mascota, fecha, hora, duración
  ↓
SISTEMA BUSCA EN TERRITORIO
  ↓ Cloud Function: buscarCuidadorDisponible
     - Busca en h3_principal del tutor
     - Filtra por horario_semanal + excepciones
     - Retorna 1 cuidador (no 5 opciones)
  ↓
MUESTRA RESULTADO
  ↓
CUIDADOR ACEPTA/RECHAZA
  ↓
PASEO OCURRE
  ├─ Cuidador: inicio + 1 foto + fin
  └─ Tutor: ve estados
  ↓
TUTOR CALIFICA
  ↓
COMPLETADO
```

### Día 8: Recurrencia

```
TUTOR QUIERE OTRO PASEO
  ↓
SISTEMA DETECTA: "Hiciste paseo con Carlos hace días"
  ↓
OFRECE: "¿Quieres pasar con Carlos?"
  ↓
SI → Confirma rápido
NO → Busca otro en territorio
  ↓
PASEO 2 OCURRE
  ↓
¿Y si repite?
  ↓
EMERGENCIA RELACIÓN: 3-4 paseos = confianza real
```

---

## ✅ QUÉ CONSTRUIMOS, QUÉ NO

### CONSTRUCCIÓN (MVP)

**Frontend:**

- ✅ Bienvenida + Onboarding básico (1 screen)
- ✅ Solicitar Paseo (1 progressive sheet)
- ✅ Resultado Matching (1 screen, 1 opción)
- ✅ Paseo en Vivo (1 screen, mapa simple)
- ✅ Resumen + Calificación (1 screen)
- ✅ Dashboard Tutor (muestra próximos + últimos)

**Backend:**

- ✅ Cloud Function: buscarCuidadorDisponible (territorial)
- ✅ Cloud Function: onAceptarPaseo
- ✅ Cloud Function: onFinalizarPaseo
- ✅ Notificaciones: cuidador invitación
- ✅ Notificaciones: tutor resultado

**Admin:**

- ✅ Screen simple: validar cuidadores
- ✅ Screen simple: ver paseos (monitoreo)

**Data:**

- ✅ Firestore Rules (básicas, territoriales)
- ✅ Seed data: 1 territorio + 5-8 cuidadores demo

### NO CONSTRUCCIÓN (Postpone)

- ❌ Territory stats complejos (confianza_promedio, paseos_mes, etc)
- ❌ Territorio Vivo (muy bonito, no crítico)
- ❌ Reagendar rápido (puede ser manual)
- ❌ Descuentos automáticos (peligroso temprano)
- ❌ Historial sofisticado (no aporta aún)
- ❌ Chat (Fase 1.5)
- ❌ Múltiples territorios (solo Laureles)
- ❌ Matching con 5 opciones (solo 1 asignado)
- ❌ Disponibilidad manual en admin (solo weekly_template)
- ❌ Admin dashboard enterprise
- ❌ Progressive sheet en onboarding (solo screens lineales simples)

---

## 💾 CAMBIOS MODELOS DATOS

### SIMPLIFICAR: Paseo (9 estados → 5)

```typescript
// ANTES (9 estados):
enum ESTADOS_PASEO {
  PENDIENTE = 'PENDIENTE',
  CONFIRMADO = 'CONFIRMADO',
  EN_CAMINO = 'EN_CAMINO',
  EN_PROGRESO = 'EN_PROGRESO',
  FINALIZADO = 'FINALIZADO',
  COMPLETADO = 'COMPLETADO',
  CANCELADO = 'CANCELADO',
  ERROR = 'ERROR',
}

// DESPUÉS (5 estados):
enum ESTADOS_PASEO {
  PENDING_ACCEPTANCE = 'PENDING_ACCEPTANCE', // Invitación enviada
  SCHEDULED = 'SCHEDULED', // Aceptado, esperando hora
  IN_PROGRESS = 'IN_PROGRESS', // Paseo ocurriendo
  COMPLETED = 'COMPLETED', // Finalizado + calificado
  CANCELLED = 'CANCELLED', // Rechazado o cancelado
}
```

### NUEVA COLECCIÓN: preferencias_cuidador_tutor

⚠️ **IMPORTANTE:** Esta colección emerge SOLO DESPUÉS de paseo completado + rating enviado.
**NO se crea en onAceptarPaseo.** Eso evita relaciones falsas por cancelaciones/ghosting.

```typescript
preferencias_cuidador_tutor/{id}
├─ uid_tutor: string
├─ uid_cuidador: string
├─ paseos_completados: number (SIEMPRE >= 1)
├─ rating_promedio: number (1-5)
├─ fecha_primer_paseo: timestamp (primer paseo exitoso)
├─ fecha_ultimo_paseo: timestamp
├─ creado_en: timestamp
└─ actualizado_en: timestamp
```

**Cómo emerge (CORRECTO):**

```
Paseo 1: COMPLETED
  → Tutor califica + envía rating
  → Trigger Cloud Function: onCalificarPaseo
  ↓
  SI preferencia NO existe:
      crear con paseos_completados = 1
  SI preferencia existe:
      incrementar paseos_completados++
  ↓
  Sistema empieza a prioritizar en búsquedas

Paseo 2+: COMPLETED
  → Relación se fortalece naturalmente
  → ES EVIDENCE REAL de confianza
  → NO es database lock-in artificial
```

**Por qué NO en onAceptarPaseo:**

- Cuidador puede rechazar
- Paseo puede cancelarse
- Usuario puede no presentarse
- Relación falsa = datos corruptos

Mejor: emerge SOLO de éxito demostrado.

### MODIFICAR: Paseo (simplificar campos)

```typescript
interface Paseo {
  // Core
  uid_tutor: string
  uid_cuidador: string (asignado por matching)
  mascota_ids: string[]

  // Territorial
  h3_index: string (donde ocurre el paseo)

  // Temporal
  fecha_hora_inicio: timestamp
  duracion_estimada: number (minutos)

  // Estado
  estado: ESTADOS_PASEO (5 estados)
  // IMPORTANTE: COMPLETED = paseo terminado, NO requiere rating aún

  // GPS emocional (4 momentos)
  gps_eventos: {
    inicio: { timestamp, coordenadas }
    checkpoints: [{ timestamp, foto_url, comentario }]
    finalizacion: { timestamp, observacion_cuidador }
  }

  // Calificación (OPCIONAL, posterior a COMPLETED)
  rating_tutor?: number (1-5, puede ser undefined)
  comentario_tutor?: string (puede ser undefined)
  observacion_cuidador: string
  fecha_calificacion?: timestamp (cuándo se envió la calificación)

  // Timestamps
  creado_en: timestamp
  actualizado_en: timestamp
}
```

**Por qué rating es opcional:**

- COMPLETED es HECHO (paseo terminó realmente)
- Rating es ACCIÓN POSTERIOR del tutor (puede no hacerlo)
- Evita estados inconsistentes
- Separa realidad física (paseo ocurrió) de feedback (evaluación)

### MANTENER: PerfilPublico

```typescript
// Ya tiene lo que necesitamos:
├─ horario_semanal: Record<string, FranjaHoraria>
├─ h3_home: string
├─ celdas_cobertura: string[] (opcional)
├─ rating_promedio: number
└─ cantidad_paseos_realizados: number

// NO agregar nada más
```

### MANTENER: ExcepcionDisponibilidad

Ya existe y funciona perfecto para overrides manuales.

---

## 📱 PANTALLAS REALES (5 SOLAMENTE)

### 1. Bienvenida + Onboarding (1 screen lineal)

```
Screen 1: Bienvenida
├─ Nombre: _____
├─ Teléfono: _____
├─ Tu zona: [Laureles - Medellín]
├─ Mascota nombre: _____
├─ Mascota tamaño: [Mediano]
├─ Casa dirección: _____
└─ [LISTO, IR A DASHBOARD]

Nota: Una sola screen secuencial, no bottom sheet.
Simple como formulario.
```

### 2. Solicitar Paseo (1 screen simple)

```
Screen 2: Solicitar Paseo
├─ Mascota: [Luna] (seleccionada)
├─ Fecha: [Viernes 22]
├─ Hora: [19:00]
├─ Duración: [60 minutos]
└─ [BUSCAR CUIDADOR]

Nota: Todo en 1 screen, no 6 pasos.
Validaciones inline.
```

### 3. Resultado Matching (1 screen)

```
Screen 3: Resultado Matching

ESCENARIO A: Cuidador disponible
├─ ✅ Cuidador asignado
├─ 📷 Foto + nombre
├─ ⭐ Rating
├─ 📍 Distancia
├─ 💬 Breve bio
└─ [CONFIRMAR]

ESCENARIO B: Sin disponibilidad
├─ ❌ No hay disponibilidad esa hora
├─ 💡 Sugerencias: viernes 19:00 (disponible)
└─ [EDITAR HORARIO]

Nota: NO mostrar 5 opciones.
1 asignado o sugerencias de horario.
```

### 4. Paseo en Vivo (1 screen)

```
Screen 4: En Paseo
├─ 🔴 PASEO EN CURSO
├─ INICIO: Carlos en camino
├─ Timestamp: 19:01
├─ [Mapa simple, ubicación aprox]
├─ ⏱️ Tiempo: 1 min / 60 min
├─ 📸 [Foto checkpoint si envía]
└─ 📞 [CONTACTAR]

Nota: Mapa simple, NO tracking agresivo.
Foto emocional, NO telemetría.
```

### 5. Resumen + Calificación (1 screen)

```
Screen 5: Paseo Completado
├─ ✅ COMPLETADO
├─ Duración: 63 minutos
├─ 📸 Fotos: [2-3 fotos]
├─ 💬 Observación Carlos: "Luna tranquila"
├─ ⭐ Puntúa: [5 estrellas]
├─ 📝 Tu comentario: ________
└─ [GUARDAR]

Nota: Simple, no flujo complejo.
Lo importante: la calificación emerge naturalmente.
```

### BONUS: Dashboard Tutor (1 screen)

```
Screen Extra: Dashboard
├─ 🔜 Próximos paseos
│   └─ Viernes 22 (19:00) con Carlos
├─ 📋 Últimos paseos
│   ├─ Carlos (hace 1 semana, ⭐⭐⭐⭐⭐)
│   └─ Patricia (hace 2 semanas, ⭐⭐⭐⭐)
└─ [SOLICITAR NUEVO PASEO]

Nota: Sin preferidos, sin favoritos.
Solo: próximos + últimos.
NO estadísticas.
```

**TOTAL: 5 screens + 1 dashboard = SUFICIENTE MVP**

---

## 🔄 FLUJO EXACTO DEL MVP

### Usuario Nuevo → Primer Paseo → Segundo Paseo

```
DAY 1 - NUEVA INSTALACIÓN
├─ User instala app
├─ Screen 1: Onboarding (nombre, mascota, casa)
├─ Screen: Dashboard vacío
└─ [SOLICITAR PASEO]

DAY 1 - PRIMER PASEO
├─ Screen 2: Solicitar (mascota, fecha, hora, duración)
├─ Backend: buscarCuidadorDisponible(h3_index, hora, duracion)
│   └─ Valida: horario_semanal + excepciones
│   └─ Busca en territorio (h3 del tutor)
│   └─ Retorna: 1 cuidador O "sin disponibilidad"
├─ Screen 3: Resultado (muestra cuidador asignado)
├─ [CONFIRMAR]
├─ Backend: onAceptarPaseo()
│   └─ Crea: paseo con estado SCHEDULED
│   └─ ⚠️ NO crea preferencia aún (se crea en onCalificarPaseo tras éxito)
│   └─ Notifica: cuidador (invitación)
│   └─ Notifica: tutor (confirmado)
└─ Estado paseo: SCHEDULED

DAY 1 - HORA DE PASEO
├─ Cuidador: inicia paseo (Button INICIO)
├─ Backend: onIniciarPaseo()
│   └─ gps_eventos.inicio = {timestamp, coordenadas}
│   └─ Estado paseo: IN_PROGRESS
├─ Screen 4: Paseo en Vivo
├─ Cuidador: envía foto checkpoint (opcional)
├─ Cuidador: finaliza paseo (Button FINALIZAR)
├─ Backend: onFinalizarPaseo()
│   └─ gps_eventos.finalizacion = {timestamp, observacion}
│   └─ Estado paseo: COMPLETED
│   └─ Notifica: tutor
└─ Screen 5: Resumen

DAY 1 - CALIFICACIÓN
├─ Tutor: ve Screen 5 con foto + observación
├─ Tutor: califica ⭐⭐⭐⭐⭐
├─ Tutor: comenta
├─ Backend: onCalificarPaseo()
│   └─ Actualiza: preferencias_cuidador_tutor
│   └─ preferencias.paseos_completados = 1
│   └─ preferencias.rating_promedio = 5.0
└─ PASEO 1 TERMINADO

DAY 8 - SEGUNDO PASEO
├─ Tutor abre app
├─ Dashboard muestra: "Últimos paseos: Carlos"
├─ [SOLICITAR PASEO]
├─ Screen 2: Solicitar (igual)
├─ Backend: buscarCuidadorDisponible()
│   └─ Busca preferencias_cuidador_tutor
│   └─ Si existe y paseos_completados >= 1
│   └─ Intenta asignar MISMO cuidador primero
│   └─ Si no disponible → busca otro en territorio
├─ Screen 3: Resultado (probablemente Carlos de nuevo)
├─ [CONFIRMAR]
├─ Backend: onAceptarPaseo()
│   └─ Crea paseo (preferencia YA existe, no la modifica)
└─ FLUJO IGUAL A PASEO 1
└─ (En onCalificarPaseo, se incrementa paseos_completados: 1→2)

DAY 21 - EMERGENCIA RELACIÓN
├─ 3-4 paseos completados con Carlos
├─ Tutor naturalmente vuelve a él
├─ Sistema NO hace nada especial
├─ Pero la data registra: confianza emergida
├─ Rating promedio del cuidador sube
└─ LA RELACIÓN EXISTE EN DATOS, NO EN FEATURES
```

---

## 🔧 BACKEND MÍNIMO

### Cloud Functions (3 críticas)

#### 1. `buscarCuidadorDisponible` (Territorial + Vecinos)

```typescript
// functions/src/matching/buscarCuidadorDisponible.ts

export const buscarCuidadorDisponible = functions.https.onCall(
  async (data, context) => {
    const { h3_index, fecha, hora, duracion, uid_tutor } = data

    // 1. Validar usuario autenticado
    if (!context.auth)
      throw new HttpsError('unauthenticated', 'Usuario no autenticado')

    // 2. Buscar cuidadores EN TERRITORIO + vecinos cercanos
    // (NO igualdad exacta h3_home == h3_index, porque bordes rompen matching)
    const h3 = require('h3-js')
    const vecinos = h3.gridDisk(h3_index, 1) // h3_index + hexágonos vecinos inmediatos

    const cuidadores = await db
      .collection('perfiles_publicos')
      .where('h3_home', 'in', vecinos)
      .get()

    // 3. Para cada cuidador, validar disponibilidad
    // También verificar preferencia para prioritizar recurrencia
    const candidatos = []

    for (const doc of cuidadores.docs) {
      const perfil = doc.data()
      const cuidador_id = doc.id

      // RIESGO 8: Verificar que no esté reservado (concurrencia)
      const tieneReserva = await db
        .collection('matching_reservas')
        .doc(cuidador_id)
        .get()

      if (tieneReserva.exists) {
        const reserva = tieneReserva.data()
        if (Date.now() < reserva.reservado_hasta) {
          continue // Este cuidador está reservado, skip
        }
      }

      // Usar LogicMatching existente
      const disponible = LogicMatching.esCuidadorDisponible(perfil, {
        fecha: new Date(fecha),
        hora,
        duracion,
      })

      if (disponible) {
        // Buscar si existe preferencia (recurrencia)
        const prefQuery = await db
          .collection('preferencias_cuidador_tutor')
          .where('uid_tutor', '==', uid_tutor)
          .where('uid_cuidador', '==', cuidador_id)
          .limit(1)
          .get()

        const tienePreferencia = !prefQuery.empty

        // RIESGO 9: Verificar cooldown (no monopolio)
        let score = 1.0 // score base para ordenar
        if (tienePreferencia) {
          score = 2.0 // prioridad para recurrencia
        } else {
          // Es un cuidador nuevo, verificar si ya tiene 3+ paseos nuevos en 24h
          const paseos24h = await db
            .collection('paseos')
            .where('uid_cuidador', '==', cuidador_id)
            .where('estado', 'in', ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED'])
            .where('creado_en', '>', new Date(Date.now() - 24 * 60 * 60 * 1000))
            .get()

          const paseos_nuevos = paseos24h.docs.filter(p => {
            const pd = p.data()
            // Contar paseos sin preferencia (sin relación previa)
            return !db
              .collection('preferencias_cuidador_tutor')
              .where('uid_tutor', '==', pd.uid_tutor)
              .where('uid_cuidador', '==', cuidador_id)
              .limit(1)
              .get() // Nota: esto es N+1, mejorar en V2
          }).length

          if (paseos_nuevos >= 3) {
            score = 0.5 // deprioritizar si ya tiene 3+ paseos nuevos
          }
        }

        candidatos.push({
          id: cuidador_id,
          nombre: perfil.nombre,
          foto: perfil.foto,
          rating: perfil.rating_promedio,
          h3: perfil.h3_home,
          tienePreferencia,
          paseos_previos: tienePreferencia
            ? prefQuery.docs[0].data().paseos_completados
            : 0,
          score,
        })
      }
    }

    // 4. Ordenar por score y priorizar recurrencia
    candidatos.sort((a, b) => b.score - a.score)

    // 5. Si hay candidatos, crear reserva temporal y retornar
    if (candidatos.length > 0) {
      const elegido = candidatos[0]

      // CRÍTICO: Crear reserva temporal (2 minutos)
      const paseo_id_temp = `temp_${Date.now()}_${Math.random()}`
      await db
        .collection('matching_reservas')
        .doc(elegido.id)
        .set(
          {
            paseo_id: paseo_id_temp,
            uid_tutor,
            reservado_hasta: Date.now() + 2 * 60 * 1000, // 2 minutos
          },
          { merge: true }
        )

      return {
        success: true,
        cuidador_id: elegido.id,
        cuidador_nombre: elegido.nombre,
        cuidador_foto: elegido.foto,
        cuidador_rating: elegido.rating,
        cuidador_h3: elegido.h3,
        recurrencia: elegido.paseos_previos,
        temp_reservation_id: paseo_id_temp,
      }
    }

    // 6. Si nadie disponible en hora solicitada:
    return {
      success: false,
      sugerencia: 'Intenta viernes 19:00 (1 disponible)',
    }
  }
)
```

**Cambios importantes:**

- ✅ Busca en vecinos H3 (gridDisk + 1), no igualdad exacta
- ✅ Prioriza cuidador con preferencia (recurrencia)
- ✅ Evita falsos "sin disponibilidad" por bordes hexágonos

#### 2. `onAceptarPaseo` (SIN crear preferencia aún, LIMPIAR reserva)

```typescript
// functions/src/paseos/onAceptarPaseo.ts

export const onAceptarPaseo = functions.https.onCall(async (data, context) => {
  const { uid_tutor, uid_cuidador, fecha_hora_inicio, duracion, mascota_ids } =
    data

  // 1. Crear paseo
  const paseoRef = await db.collection('paseos').add({
    uid_tutor,
    uid_cuidador,
    mascota_ids,
    fecha_hora_inicio,
    duracion_estimada: duracion,
    estado: 'SCHEDULED',
    creado_en: admin.firestore.FieldValue.serverTimestamp(),
  })

  // 2. LIMPIAR RESERVA TEMPORAL (Riesgo 8: concurrencia)
  // La reserva fue creada en buscarCuidadorDisponible
  // Ahora se confirma, así que liberar la reserva
  await db.collection('matching_reservas').doc(uid_cuidador).delete()

  // 3. CRÍTICO: NO crear preferencia aquí
  // La preferencia emerge SOLO cuando:
  //   - Paseo COMPLETED
  //   - Rating enviado por tutor
  // Esto evita relaciones falsas por cancelaciones/ghosting/no-shows

  // 4. Enviar notificación al cuidador con opción de aceptar/rechazar
  await enviarNotificacion(uid_cuidador, {
    titulo: 'Nueva solicitud de paseo',
    cuerpo: `${mascota_ids.length} mascota(s) el ${fecha_hora_inicio}`,
    paseo_id: paseoRef.id,
    acciones: ['ACEPTAR', 'RECHAZAR'],
  })

  return { success: true, paseo_id: paseoRef.id }
})
```

**Cambios críticos:**

- ❌ NO crea preferencia con paseos_completados = 0
- ✅ LIMPIA reserva temporal (Riesgo 8)
- ✅ Preferencia emerge SOLO después de COMPLETED + rating
- ✅ Evita datos corruptos por cancelaciones/rechazos

#### 3. `onFinalizarPaseo` (Solo finaliza, no crea preferencia)

```typescript
// functions/src/paseos/onFinalizarPaseo.ts

export const onFinalizarPaseo = functions.https.onCall(
  async (data, context) => {
    const { paseo_id, observacion_cuidador, foto_urls } = data

    // 1. Obtener datos del paseo
    const paseoRef = await db.collection('paseos').doc(paseo_id).get()
    const paseoData = paseoRef.data()

    // 2. Actualizar paseo: IN_PROGRESS → COMPLETED
    await db
      .collection('paseos')
      .doc(paseo_id)
      .update({
        estado: 'COMPLETED',
        gps_eventos: {
          finalizacion: {
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            observacion: observacion_cuidador,
          },
        },
        fotos_paseo: foto_urls || [],
        actualizado_en: admin.firestore.FieldValue.serverTimestamp(),
      })

    // 3. Notificar tutor (sin crear preferencia aún)
    const uid_tutor = paseoData.uid_tutor

    await enviarNotificacion(uid_tutor, {
      titulo: '✅ Paseo finalizado',
      cuerpo: 'Luna volvió a casa feliz. ¿Cómo estuvo?',
      paseo_id,
      acciones: ['VER_RESUMEN', 'CALIFICAR'],
    })

    return { success: true }
  }
)
```

**Cambio importante:**

- Solo transiciona: IN_PROGRESS → COMPLETED
- NO crea preferencia aquí
- Espera rating del tutor para crear preferencia

#### 3B. `onCalificarPaseo` (NUEVA - Donde emerge la preferencia)

```typescript
// functions/src/paseos/onCalificarPaseo.ts (NUEVA - CRÍTICA)

export const onCalificarPaseo = functions.https.onCall(
  async (data, context) => {
    const { paseo_id, rating, comentario } = data
    const uid_tutor = context.auth.uid

    // 1. Obtener datos del paseo
    const paseoRef = await db.collection('paseos').doc(paseo_id).get()
    const paseoData = paseoRef.data()
    const uid_cuidador = paseoData.uid_cuidador

    // 2. Validar que el tutor sea el dueño
    if (paseoData.uid_tutor !== uid_tutor) {
      throw new HttpsError('permission-denied', 'No es tu paseo')
    }

    // 3. Actualizar paseo con rating
    await db.collection('paseos').doc(paseo_id).update({
      rating_tutor: rating,
      comentario_tutor: comentario,
      fecha_calificacion: admin.firestore.FieldValue.serverTimestamp(),
    })

    // 4. 🔑 AHORA crear o incrementar preferencia
    // LA RELACIÓN EMERGE AQUÍ, TRAS ÉXITO DEMOSTRADO
    const prefQuery = await db
      .collection('preferencias_cuidador_tutor')
      .where('uid_tutor', '==', uid_tutor)
      .where('uid_cuidador', '==', uid_cuidador)
      .limit(1)
      .get()

    if (prefQuery.empty) {
      // Primera vez completada exitosamente
      await db.collection('preferencias_cuidador_tutor').add({
        uid_tutor,
        uid_cuidador,
        paseos_completados: 1, // ✅ Ahora sí con 1 paseo REAL
        rating_promedio: rating,
        fecha_primer_paseo: new Date(),
        fecha_ultimo_paseo: new Date(),
        creado_en: admin.firestore.FieldValue.serverTimestamp(),
      })
    } else {
      // Ya existe, incrementar
      const pref = prefQuery.docs[0]
      const prefData = pref.data()
      const nuevoPromedio =
        (prefData.rating_promedio * prefData.paseos_completados + rating) /
        (prefData.paseos_completados + 1)

      await db
        .collection('preferencias_cuidador_tutor')
        .doc(pref.id)
        .update({
          paseos_completados: admin.firestore.FieldValue.increment(1),
          rating_promedio: nuevoPromedio,
          fecha_ultimo_paseo: admin.firestore.FieldValue.serverTimestamp(),
          actualizado_en: admin.firestore.FieldValue.serverTimestamp(),
        })
    }

    // 5. Notificar cuidador
    await enviarNotificacion(uid_cuidador, {
      titulo: `⭐ ${rating}/5 - Paseo completado exitosamente`,
      cuerpo: comentario,
      paseo_id,
    })

    return { success: true, preferencia_creada_o_actualizada: true }
  }
)
```

**Cambio CRÍTICO:**

- ✅ Preferencia se crea SOLO aquí
- ✅ SOLO después de COMPLETED + rating enviado
- ✅ paseos_completados NUNCA < 1
- ✅ Es EVIDENCIA REAL de confianza, no artificial

### Notificaciones (Simple)

```typescript
// services/firebase/notificaciones.ts

export async function enviarNotificacion(uid: string, datos: any) {
  // Usar Firebase Cloud Messaging
  // Implementación simple, sin obsesionarse
  const token = await obtenerFCMToken(uid)
  if (token) {
    await admin.messaging().send({
      token,
      notification: {
        title: datos.titulo,
        body: datos.cuerpo,
      },
      data: {
        paseo_id: datos.paseo_id,
      },
    })
  }
}
```

---

## ⏰ TIMELINE REALISTA

### Semana 1

**Lunes-Martes (2 días):** Base + Modelos

```
✓ Simplificar Paseo (9 → 5 estados)
✓ Crear preferencias_cuidador_tutor
✓ Firestore Rules básicas territoriales
✓ Seed data: Laureles + 5-8 cuidadores
```

**Miércoles-Viernes (3 días):** Screens + Contextos

```
✓ Screen 1: Onboarding (lineal simple)
✓ Screen 2: Solicitar Paseo
✓ Screen 3: Resultado Matching
✓ Dashboard Tutor
✓ Context: RelacionesContext (mínimo)
```

### Semana 2

**Lunes-Miércoles (3 días):** Backend + GPS Emocional

```
✓ Cloud Function: buscarCuidadorDisponible
✓ Cloud Function: onAceptarPaseo
✓ Cloud Function: onFinalizarPaseo
✓ GPS: 4 momentos (inicio, checkpoint, fin)
✓ Notificaciones mínimas
```

**Jueves-Viernes (2 días):** Screens Paseo en Vivo + Resumen

```
✓ Screen 4: Paseo en Vivo (mapa simple)
✓ Screen 5: Resumen + Calificación
✓ Subida de fotos simple
```

### Semana 3

**Lunes-Miércoles (3 días):** Testing + Fixes

```
✓ Testing: flujo completo usuario nuevo
✓ Testing: matching territorial
✓ Testing: GPS emocional
✓ Testing: notificaciones
✓ Fixes críticos
```

**Jueves-Viernes (2 días):** Deploy MVP

```
✓ Deploy a staging
✓ Validación con 10-15 usuarios reales
✓ Logs + monitoreo
```

**TOTAL: 15 días (2.5 semanas), no 7-9 semanas**

---

## ⚠️ RIESGOS A EVITAR

### RIESGO 1: Sobrediseño

**PELIGRO:** Agregar features "por si acaso"

- Territory stats tempranos
- Descuentos complejos
- Historial sofisticado
- Múltiples territorios

**CÓMO EVITAR:**

```
Solo: solicitar → buscar → paseo → repetición
Nada más.
Si funciona eso: TODO lo demás tiene sentido.
Si no: todo lo demás es desperdicio.
```

### RIESGO 2: Rechazo Silencioso de Cuidadores

**PELIGRO:** Si cuidador rechaza → volver al tutor con "sin disponibilidad"

- Tutor ve UX rota
- Sistema parece fallido
- Aunque SÍ había disponibilidad (fue rechazada)

**CÓMO EVITAR:**

```
Si cuidador RECHAZA:
  → buscar siguiente automáticamente EN MISMO TERRITORIO
  → NO volver al tutor hasta agotar opciones
  → Intentos: hasta 3 cuidadores
  → Solo mostrar "sin disponibilidad" si realmente no hay

Esto es UX correcta para territorial.
```

### RIESGO 3: Favoritos Monopolizadores

**PELIGRO:** Crear "favoritos" como colección explícita

- Monopolizan cuidadores
- Nuevos cuidadores nunca se usan
- Saturación de los buenos

**CÓMO EVITAR:**

```
Usar: preferencias_cuidador_tutor EMERGENTE
Emerge DESPUÉS de 2+ paseos reales + calificación
NO es un feature rígido
Es EVIDENCIA de confianza, no un lock-in
```

### RIESGO 4: Complejidad Temprana de Matching

**PELIGRO:** "¿Y si ofrecemos 5 opciones?"

- Confunde tutor
- Mata valor territorial
- Parece otro Uber

**CÓMO EVITAR:**

```
MVP: 1 cuidador asignado
O: "sin disponibilidad, intenta X horario"
Eso es TODO.
```

### RIESGO 5: GPS Agresivo

**PELIGRO:** Tracking continuo cada 3 segundos

- Batería del tutor se agota
- Costo Firebase explota
- Privacy concerns

**CÓMO EVITAR:**

```
GPS emocional:
- Inicio: timestamp + coordenadas
- Checkpoint: foto + comentario (cuidador envía)
- Fin: observación

Eso tranquiliza emocionalmente.
Tracking continuo NO agrega valor.
```

### RIESGO 6: Admin Perfectoista

**PELIGRO:** "Construyamos admin enterprise"

- Costo de desarrollo enorme
- NO crítico para MVP
- Distrae del core loop

**CÓMO EVITAR:**

```
Admin MVP:
- Lista de cuidadores
- Validar manualmente: sí/no
- Ver paseos (monitoreo)

ESO ES TODO.
No dashboards, no stats, no reports.
```

### RIESGO 7: Perfeccionismo UX

**PELIGRO:** "Hagamos progressive sheets hermosas"

- 4 screens → 1 bottom sheet
- 5 pasos → 6 pasos
- Animaciones suaves

**CÓMO EVITAR:**

```
MVP UX:
- Funcional
- No bonito
- NO perfecto
- Verde o roto

Después:
- Diseño
- Pulido
- Animaciones
```

### RIESGO 8: Doble Asignación Simultánea (Concurrencia)

**PELIGRO:** Dos tutores buscan al mismo tiempo → ambos reciben mismo cuidador

```
Tutor A busca cuidador
Tutor B busca cuidador
  ↓
Ambos: "Carlos disponible"
  ↓
Ambos: confirman con Carlos
  ↓
Conflicto: Carlos no puede estar en dos lugares
```

**CÓMO EVITAR:**

Crear tabla temporal de reservas:

```typescript
matching_reservas/{cuidador_id}
{
  paseo_id: string
  uid_tutor: string
  reservado_hasta: timestamp (TTL: 2 minutos)
}
```

Lógica en `buscarCuidadorDisponible`:

```typescript
// ANTES de retornar cuidador:

const tieneReserva = await db
  .collection('matching_reservas')
  .doc(cuidador_id)
  .get()

if (tieneReserva.exists) {
  const reserva = tieneReserva.data()
  if (Date.now() < reserva.reservado_hasta) {
    skip // Este cuidador está reservado, buscar otro
  }
}

// Si pasa validación, crear reserva:
await db
  .collection('matching_reservas')
  .doc(cuidador_id)
  .set({
    paseo_id,
    uid_tutor,
    reservado_hasta: Date.now() + 2 * 60 * 1000, // 2 minutos
  })

return cuidador
```

**Por qué 2 minutos:**

- Tutor tiene tiempo para confirmar
- No es tan largo que bloquee cuidador
- Si tutor no confirma, se libera automáticamente

**Limpiar reserva en onAceptarPaseo:**

```typescript
await db.collection('matching_reservas').doc(cuidador_id).delete()
```

---

### RIESGO 9: Monopolio de Cuidador (Mata Onboarding de Nuevos)

**PELIGRO:** Si Carlos es bueno → naturalmente recibe TODOS los paseos

```
Carlos: rating 5.0, siempre disponible, territorio perfecto
  ↓
Sistema lo prioriza correctamente
  ↓
Pero: nuevos cuidadores NO reciben paseos
  ↓
No puedes escalar: no hay cuidadores con recurrencia
```

**CÓMO EVITAR:**

Agregar "cooldown" mínimo por cuidador en últimas 24h:

```typescript
// En buscarCuidadorDisponible, después de validar disponibilidad:

const paseos24h = await db
  .collection('paseos')
  .where('uid_cuidador', '==', cuidador_id)
  .where('estado', 'in', ['SCHEDULED', 'IN_PROGRESS'])
  .where('fecha_creacion', '>', Date.now() - 24 * 60 * 60 * 1000)
  .get()

const paseos_nuevos = paseos24h.docs.filter(
  p => !p.data().uid_tutor // sin relación previa (sin preferencia)
).length

if (paseos_nuevos >= 3) {
  // Este cuidador ya tiene 3+ paseos NUEVOS en 24h
  // Deprioritizar levemente
  candidatos.push({
    ...candidato,
    score: candidato.score - 0.2, // penalizar
  })
} else {
  candidatos.push(candidato)
}
```

**Por qué esto funciona:**

- Cuidadores con preferencia (recurrencia) siguen siendo priorizados
- Pero no monopolizan paseos NUEVOS
- Nuevos cuidadores get fair chance
- Equilibrio territorial

**Métrica a monitorear:**

```
Paseos nuevos / Paseos totales por cuidador

Sano: 60-70% nuevos, 30-40% recurrencia
Sick: >90% nuevos (no reteniendo) O <10% nuevos (monopolio)
```

---

## 📊 MÉTRICAS DE ÉXITO

### Métrica Principal

```
% de paseos repetidos con MISMO cuidador

= (Paseos con cuidador repetido) / (Paseos totales)

Paseo 1 con Cuidador X
Paseo 2 con Cuidador X ← Cuenta como repetición
↓
Eso es éxito territorial real.

Si ese % > 40%:
✅ Tu arquitectura territorial funciona
✅ La confianza emerge naturalmente
✅ El grafo territorial existe

Si ese % < 20%:
❌ Los usuarios no vuelven
❌ Sistema fallido
❌ Vuelve al drawing board
```

### Métrica Secundaria (MUY IMPORTANTE)

```
Usuarios con 2+ paseos / Usuarios totales

= (Usuarios que hicieron ≥2 paseos) / (Usuarios que descargaron)

Esto distingue:

CASO A (Falso positivo):
- 10 usuarios totales
- 8 paseos totales
- 7 paseos con mismo cuidador
- % recurrencia = 87% ❌
- Pero: usuarios con 2+ paseos = 40% (solo 4 usuarios)
- Realidad: muestra pequeña, falsa señal

CASO B (Éxito real):
- 100 usuarios totales
- 250 paseos totales
- 120 paseos con mismo cuidador
- % recurrencia = 48% ✅
- Y: usuarios con 2+ paseos = 60% (60 usuarios)
- Realidad: sistema funciona, retención real

USO: Interpretar % recurrencia con contexto de retención
```

### Alertas de Falla

```
🚨 Si ves esto, hay problema:

1. % recurrencia < 20% → NO FUNCIONA
2. Usuarios con 2+ paseos < 30% → NO RETENIENDO
3. Rating promedio < 3.5/5 → NO CONFIANZA
4. Cancelación > 40% → BREAKING TRUST
```

---

## � OBSERVABILIDAD MÍNIMA (Eventos)

**NO necesitas dashboard complejo.** Solo 7 eventos clave que permitan diagnosticar después:

```typescript
// services/firebase/observabilidad.ts

export async function registrarEvento(tipo: string, datos: any) {
  await db.collection('eventos_mvp').add({
    tipo,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    ...datos,
  })
}

// Usar en las Cloud Functions:
```

### Evento 1: paseo_solicitado

```typescript
registrarEvento('paseo_solicitado', {
  uid_tutor,
  h3_index,
  fecha_solicitada: fecha_hora_inicio,
})
```

**Por qué:** Entender volumen de solicitudes, patrones temporales.

### Evento 2: matching_encontrado

```typescript
registrarEvento('matching_encontrado', {
  uid_tutor,
  uid_cuidador,
  tiene_preferencia: tienePreferencia,
  paseos_previos: paseos_previos,
  score: score,
})
```

**Por qué:** Saber si el sistema está encontrando matches, si recurrencia se activa.

### Evento 3: matching_rechazado

```typescript
registrarEvento('matching_rechazado', {
  uid_tutor,
  uid_cuidador,
  razon: 'cuidador_rechaza' | 'no_hay_disponible',
})
```

**Por qué:** Diagnosticar si cuidadores rechazan mucho, si hay realmente falta de disponibilidad.

### Evento 4: paseo_iniciado

```typescript
registrarEvento('paseo_iniciado', {
  uid_cuidador,
  uid_tutor,
  paseo_id,
  duracion_estimada,
})
```

**Por qué:** Confirmar que paseos realmente ocurren, no solo se crean.

### Evento 5: paseo_completado

```typescript
registrarEvento('paseo_completado', {
  uid_cuidador,
  uid_tutor,
  paseo_id,
  duracion_real,
  razon: 'normal' | 'cancelado' | 'no_show',
})
```

**Por qué:** Entender si paseos completan o si hay cancelaciones/no-shows.

### Evento 6: rating_enviado

```typescript
registrarEvento('rating_enviado', {
  uid_tutor,
  uid_cuidador,
  rating,
  comentario_length: comentario?.length || 0,
})
```

**Por qué:** Saber si tutores califican, qué ratings dan, si feedback es meaningful.

### Evento 7: recurrencia_detectada

```typescript
registrarEvento('recurrencia_detectada', {
  uid_tutor,
  uid_cuidador,
  paseos_completados: prefData.paseos_completados,
  rating_promedio: prefData.rating_promedio,
})
```

**Por qué:** La métrica más importante: ¿se repite con mismo cuidador?

### Análisis Simple Post-MVP

```sql
SELECT
  (SELECT COUNT(*) FROM eventos_mvp WHERE tipo = 'recurrencia_detectada') /
  (SELECT COUNT(*) FROM eventos_mvp WHERE tipo = 'paseo_completado') as pct_recurrencia,

  (SELECT COUNT(DISTINCT uid_tutor) FROM eventos_mvp WHERE tipo = 'paseo_completado' AND paseos_completados >= 2) /
  (SELECT COUNT(DISTINCT uid_tutor) FROM eventos_mvp WHERE tipo = 'paseo_solicitado') as retention_rate,

  (SELECT COUNT(*) FROM eventos_mvp WHERE tipo = 'matching_rechazado') /
  (SELECT COUNT(*) FROM eventos_mvp WHERE tipo = 'matching_encontrado') as rejection_rate
```

**Eso es TODO.** No necesitas más complejidad.

---

## �🚀 INICIO FASE 0 (Semana 0)

**Antes de escribir código:**

- [ ] Equipo alineado en: loop mínimo = TODO
- [ ] Decidir: ¿1 dev o 2 devs?
- [ ] Seed data: definir 5-8 cuidadores demo realistas
- [ ] Territorio piloto: confirmar Laureles
- [ ] Definir: ¿testeamos con usuarios reales internamente o solo equipo?
- [ ] Git: crear rama `mvp-territorial`
- [ ] Firestore: backup de data actual (si hay)

---

## 📋 CHECKLIST CONSTRUCCIÓN

### Semana 1

- [ ] Simplificar Paseo a 5 estados
- [ ] Crear preferencias_cuidador_tutor schema
- [ ] Firestore Rules territoriales
- [ ] Seed data: Laureles + cuidadores
- [ ] Screen 1: Onboarding lineal
- [ ] Screen 2: Solicitar Paseo
- [ ] Screen 3: Resultado Matching
- [ ] Dashboard Tutor básico

### Semana 2

- [ ] Cloud Function: buscarCuidadorDisponible
- [ ] Cloud Function: onAceptarPaseo
- [ ] Cloud Function: onFinalizarPaseo
- [ ] GPS: estructura 4 momentos
- [ ] Notificaciones: invitación + resultado
- [ ] Screen 4: Paseo en Vivo
- [ ] Screen 5: Resumen + Calificación

### Semana 3

- [ ] Testing: usuario nuevo → primer paseo
- [ ] Testing: matching territorial
- [ ] Testing: segundo paseo (recurrencia)
- [ ] Testing: notificaciones
- [ ] Fixes críticos
- [ ] Deploy staging
- [ ] Validación con usuarios demo

---

## 📝 NOTAS TÉCNICAS - FUTURAS OPTIMIZACIONES (V2+)

**NO hacer ahora. Solo documentar para después.**

### Problema N+1 en buscarCuidadorDisponible

**Síntoma actual:**

```typescript
for (const doc of cuidadores.docs) {
  // Aquí hacemos 1 query por cuidador
  const prefQuery = await db.collection('preferencias_cuidador_tutor').where(...)
}
```

Con 8 cuidadores demo = 8 queries.  
Con 50 cuidadores = 50 queries.  
Escala mal.

**Solución V2 (Cuando haya tráfico real):**

```typescript
// Materializar preferencias recientes en cache local
// O pre-computar ranking territorial en documento raíz

// Opción 1: Materializar en usuariosTutor
usuariosTutor / { uid_tutor }
{
  preferencias_ids: [uid_cuidador_1, uid_cuidador_2]
}

// Opción 2: Pre-computar en matching_ranking/{h3_index}
matching_ranking / { h3_index }
{
  cuidadores_ordenados: [
    { uid: '...', score: 2.5, recurrencia: true },
    { uid: '...', score: 1.2, recurrencia: false },
  ]
}
```

**Cuándo: Cuando veas latency > 500ms en matching.**

### TTL en matching_reservas

**Problema:** Si tutor abandona sin confirmar, reserva queda 2 minutos bloqueando.

**Solución V2:**

```
Firestore TTL policy en matching_reservas:
  reservado_hasta = TTL field
  Auto-delete después de timestamp
```

(Google Cloud solo permite TTL en campos específicos)

**Cuándo: Cuando canales de abandono sean claros.**

### Mejora de Cooldown (Riesgo 9)

**Actual:** Loop query para contar paseos_nuevos (N+1).

**Mejor:**

```typescript
// Materializar en perfil público
perfiles_publicos/{uid}
{
  // ...
  stats_24h: {
    paseos_nuevos: 3,
    paseos_recurrencia: 2,
    ultima_actualizacion: timestamp
  }
}

// Actualizar mediante Cloud Task scheduler cada hora
```

**Cuándo: Cuando haya >20 cuidadores.**

---

## 🎯 RESUMEN EJECUTIVO V3

**Lo que V3 NO hace:**

- ❌ Construir arquitectura completa
- ❌ Optimizar perfeccionista
- ❌ Crear features "por si acaso"
- ❌ Hacer admin enterprise
- ❌ Múltiples territorios

**Lo que V3 SÍ hace:**

- ✅ Valida loop territorial mínimo
- ✅ Prueba que recurrencia emerge naturalmente
- ✅ Confirma matching territorial funciona
- ✅ Construye en 2-3 semanas, no 7-9
- ✅ Métrica clara: % paseos repetidos

**El verdadero aprendizaje:**

Si después de 2-3 semanas ves que:

- Usuarios vuelven con mismo cuidador (>40%)
- Preferencias emergen sin obligar
- Sistema es simple pero funciona
- Confianza territorial es REAL

Entonces sabes que tienes producto.

Entonces sí expandes.
Entonces sí construyes lo complejo.

**Pero ANTES de eso, lo simple debe funcionar.**

---

**Generado**: 19 de mayo de 2026 (V3 - MVP Real)  
**Status**: Listo para Fase 0 - Preparación (1 día)  
**Timeline Construcción**: 2-3 semanas  
**Métrica Éxito**: % paseos repetidos con mismo cuidador
