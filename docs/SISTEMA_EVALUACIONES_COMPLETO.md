# Sistema de Evaluaciones Paw-Path — Especificación Definitiva

**Fecha:** 30 Agosto 2026  
**Versión:** MVP1 (Fase Descubrimiento Corregida)  
**Estado:** APROBADO PARA FASE 1 (Con Ajustes Críticos de Seguridad y Arquit.)

---

## 1. VISIÓN

Capturar información de confianza en Paw-Path a través de evaluaciones simples que responden:

- ¿Fue confiable el cuidador?
- ¿Fue claro el tutor en instrucciones?
- ¿Cómo se comportó la mascota?
- ¿Cumplió el cuidador sus compromisos?

**Resultado:** Mejores decisiones de matching, detección de problemas, reputación transparente.

---

## 2. MODELOS DE DATOS

### 2.1 Evaluation (Entidad Principal)

```typescript
// models/Evaluation.ts

import { BaseModel } from './BaseModel'

/** Tipos de evaluación soportados */
export type EvaluationType =
  | 'caregiver_review' // Tutor evalúa Cuidador
  | 'tutor_review' // Cuidador evalúa Tutor
  | 'pet_behavior' // Cuidador evalúa Mascota
  | 'system_performance' // Sistema evalúa Cuidador (futuro MVP2)

/** Referencia genérica a cualquier entidad */
export interface EntityReference {
  type: 'user' | 'pet' | 'walk'
  id: string // UID (usuario/mascota) o ID (paseo)
}

/** Evaluación de un actor sobre un target en un contexto */
export interface Evaluation extends BaseModel {
  /** Tipo de evaluación */
  type: EvaluationType

  /** Quién evalúa (siempre usuario) */
  actor: EntityReference

  /** Qué se evalúa (usuario o mascota) */
  target: EntityReference

  /** En qué contexto (siempre paseo para MVP1) */
  context: EntityReference

  /** Datos específicos según el tipo (ver secciones abajo) */
  data: Record<string, unknown>
}

/**
 * Ejemplo Caso 1: Tutor evalúa Cuidador
 *
 * {
 *   type: 'caregiver_review',
 *   actor: {type: 'user', id: 'tutor_uid_123'},
 *   target: {type: 'user', id: 'cuidador_uid_456'},
 *   context: {type: 'walk', id: 'paseo_abc789'},
 *   data: {
 *     rating: 5,
 *     comment: 'Excelente servicio, puntual'
 *   }
 * }
 */

/**
 * Ejemplo Caso 2: Cuidador evalúa Tutor
 *
 * {
 *   type: 'tutor_review',
 *   actor: {type: 'user', id: 'cuidador_uid_456'},
 *   target: {type: 'user', id: 'tutor_uid_123'},
 *   context: {type: 'walk', id: 'paseo_abc789'},
 *   data: {
 *     rating: 4,
 *     comment: 'Instrucciones claras'
 *   }
 * }
 */

/**
 * Ejemplo Caso 3: Cuidador evalúa Mascota
 *
 * {
 *   type: 'pet_behavior',
 *   actor: {type: 'user', id: 'cuidador_uid_456'},
 *   target: {type: 'pet', id: 'mascota_uid_789'},
 *   context: {type: 'walk', id: 'paseo_abc789'},
 *   data: {
 *     ritmo: 'tranquilo',
 *     compania: 'varios_perros',
 *     tolerancia: 'intenta_una',
 *     tamano_compatible: 'mediano',
 *     incidentes?: 'ninguno' | 'menor' | 'moderado' | 'critico'
 *   }
 * }
 */
```

### 2.2 ResumenEvaluacion (Agregado por Tipo)

```typescript
// models/ResumenEvaluacion.ts

import { BaseModel } from './BaseModel'

/** Desglose de evaluaciones POR TIPO (separado, nunca mezclado) */
export interface DesglosePorTipo {
  /** Promedio de calificaciones (1-5) */
  promedio: number
  /** Cantidad total de evaluaciones de este tipo */
  cantidad: number
}

/** Resumen de evaluaciones para un target, SEPARADO POR TIPO */
export interface ResumenEvaluacion extends BaseModel {
  /** A quién se refiere el resumen */
  objetivo: EntityReference

  /** Evaluaciones de Tutor → Cuidador */
  evaluaciones_cuidador?: DesglosePorTipo
  // {
  //   promedio: 4.6,
  //   cantidad: 15
  // }

  /** Evaluaciones de Cuidador → Tutor */
  evaluaciones_tutor?: DesglosePorTipo
  // {
  //   promedio: 4.3,
  //   cantidad: 12
  // }

  /** Evaluaciones de Cuidador → Mascota (observaciones finales) */
  evaluaciones_mascota?: DesglosePorTipo
  // {
  //   promedio: N/A (no tiene rating),
  //   cantidad: 5
  // }

  /** Evaluaciones del Sistema (futuro MVP2) */
  evaluaciones_sistema?: DesglosePorTipo
  // {
  //   promedio: 4.2,
  //   cantidad: 8
  // }

  /** Última actualización */
  actualizado_en: Date
}

/**
 * INVARIANTE CRÍTICO:
 * - No existe un "promedio general" que mezcle tipos
 * - Cada tipo es independiente
 * - El cuidador tiene 4.6 ⭐ de TUTORES (15 evaluaciones)
 * - El cuidador tiene 4.3 ⭐ de TUTORES sobre el TUTOR (12 evaluaciones)
 * - El sistema tiene 4.2 ⭐ en rendimiento (8 paseos)
 * - Paw-Path decide qué mostrar, no el promedio genérico
 */
```

---

## 2.3 Invariantes del Sistema (CRÍTICO ANTES DE CODIFICAR)

### Identidad

- Una `Evaluation` existe solo dentro de un contexto (Paseo)
- `actor` debe ser participante actual del `context` (Paseo)
- `target` debe ser participante actual del `context` (Paseo)
- `type` determina las validaciones permitidas

### Unicidad

- **Caregiver Review:** (Tutor → Cuidador) por Paseo = máximo 1
  - actor + target + context deben ser únicos
  - No se pueden editar (inmutable MVP1)
  - Si el tutor evalúa múltiples veces el mismo cuidador en paseos diferentes, son evaluaciones distintas

- **Tutor Review:** (Cuidador → Tutor) por Paseo = máximo 1
  - actor + target + context deben ser únicos

- **Pet Behavior:** (Cuidador → Mascota) por Paseo = máximo 1
  - actor + target + context deben ser únicos
  - Una sola observación final por mascota por paseo
  - Si queremos tracking temporal, va en `EventoPaseo`, no en `Evaluation`

### Datos de Contexto

- `cantidad_paseos_realizados` de un cuidador NO viene de `Evaluation.cantidad`
  - Viene de contar Paseos donde `id_cuidador = cuidador_uid` Y `estado = COMPLETADO`
  - Esto es responsabilidad de una query diferente, probablemente en `GestorPerfilPublico`
- `rating_promedio` viene SOLO del `ResumenEvaluacion.evaluaciones_cuidador.promedio`

### Tipos Separados

- `evaluaciones_cuidador` = promedio de Tutor → Cuidador (lo que ven tutores nuevos)
- `evaluaciones_tutor` = promedio de Cuidador → Tutor (invisible, para coaching)
- `evaluaciones_mascota` = observaciones, no tiene promedio, solo historial
- `evaluaciones_sistema` = independiente, nunca se mezcla con humano

---

## 3. CASOS DE USO DETALLADOS

### Caso 1: Tutor Evalúa Cuidador ✅ MVP1 CRÍTICA

**Flujo en Código:**

```
1. Paseo en estado COMPLETADO
2. Tutor ve PaseoFinalizadoCard.tsx
3. Tutor selecciona rating 1-5 (UI existe)
4. Tutor opcionalmente escribe comentario
5. Tutor presiona "Finalizar"
6. Sistema guarda Evaluation en Firestore
7. Cloud Function actualiza EvaluationSummary del cuidador
8. PerfilPublico.rating_promedio se actualiza
```

**Datos Capturados:**

```typescript
{
  type: 'caregiver_review',
  actor: {type: 'user', id: paseo.creado_por},          // UID Tutor
  target: {type: 'user', id: paseo.id_cuidador},        // UID Cuidador
  context: {type: 'walk', id: paseo.id},
  data: {
    rating: 1-5,                                         // Requerido
    comment?: string                                     // Opcional (MVP2)
  }
}
```

**Impacto de Confianza:**

- Cuidador con 4.8/5 ⭐ en `evaluaciones_cuidador` → Tutor lo busca primero
- Cuidador con 2.2/5 ⭐ → Admin lo investiga
- Histórico de comentarios → Detecta patrones
- (NOTA: NO se mezcla con `evaluaciones_sistema` ni `evaluaciones_mascota`)

**Integración con Código Existente:**

```
screens/tutor/PaseoFinalizado.tsx
  └─ components/paseos/PaseoFinalizadoCard.tsx
       └─ onRate={(rating) => EvaluationService.crearEvaluation(...)}
              └─ ServicioEvaluacion.crear(evaluation)
                    └─ Firestore: /evaluaciones/{id}
                          └─ Cloud Function: actualiza PerfilPublico
```

---

### Caso 2: Cuidador Evalúa Tutor 🟡 MVP1 IMPORTANTE

**Flujo en Código:**

```
1. Paseo en estado COMPLETADO
2. Cuidador ve nueva pantalla: PaseoFinalizadoCuidador.tsx (NUEVA)
3. Cuidador selecciona rating 1-5
4. Cuidador escribe comentario opcional
5. Sistema guarda Evaluation
6. Tutor puede ver su evaluación promedio en su perfil
```

**Datos Capturados:**

```typescript
{
  type: 'tutor_review',
  actor: {type: 'user', id: paseo.id_cuidador},         // UID Cuidador
  target: {type: 'user', id: paseo.creado_por},         // UID Tutor
  context: {type: 'walk', id: paseo.id},
  data: {
    rating: 1-5,
    comment?: string
  }
}
```

**Impacto de Confianza:**

- Tutor con evaluaciones bajas → Instrucciones poco claras
- Tutor con evaluaciones altas → Comunicación clara, profesional

---

### Caso 3: Cuidador Evalúa Mascota 🟡 MVP1 IMPORTANTE

**Flujo en Código:**

```
1. Durante o después del paseo
2. Cuidador en ControlPaseo.tsx ve opción "Registrar Observación"
3. Cuidador selecciona comportamientos observados
4. Sistema guarda como Evaluation (tipo: pet_behavior)
5. Mascota.compatibilidad_paseo.observaciones[] se actualiza (migración)
6. Tutor ve en perfil de mascota: "Historial de comportamiento"
```

**Datos Capturados:**

```typescript
{
  type: 'pet_behavior',
  actor: {type: 'user', id: paseo.id_cuidador},         // UID Cuidador
  target: {type: 'pet', id: mascota.id},                // UID Mascota
  context: {type: 'walk', id: paseo.id},
  data: {
    ritmo: 'adelante' | 'rapido' | 'tranquilo' | 'explorador',
    compania: 'solo' | 'un_perro' | 'varios_perros' | 'grupo_grande',
    tolerancia: 'ignora' | 'intenta_una' | 'insiste' | 'se_altera',
    tamano_compatible: 'pequeño' | 'mediano' | 'grande' | 'gigante',
    incidentes?: string,                                 // "ninguno" o descripción
    notas?: string                                       // Observación libre
  }
}
```

**INVARIANTE:** Una observación final por mascota por paseo.

- Si queremos tracking temporal (10:30, 11:00, 11:30 comportamiento cambió), eso vive en `EventoPaseo`, no en `Evaluation`
- `Evaluation` de tipo `pet_behavior` es la observación FINAL consolidada

**Impacto de Confianza:**

- Mascota con "insiste" en tolerancia → Cuidadores la evitan o requieren experiencia
- Mascota con "se_altera" + incidentes → Requiere adiestrador
- Mascota con "tranquilo" → Muy solicitada
- Histórico disponible para matching futuro

---

### Caso 4: Sistema Evalúa Cuidador 🟢 MVP2

**Flujo (Futuro):**

```
1. Cloud Function monitorea EventoPaseo
2. Calcula métricas automáticas:
   - Llegó a tiempo (fecha_inicio_real vs estimada)
   - Integridad GPS (EventoPaseo con tipo 'gps')
   - Duración real vs estimada
3. Crea Evaluation de tipo system_performance
4. Se suma al promedio del cuidador
```

**Datos Capturados (Futuro):**

```typescript
{
  type: 'system_performance',
  actor: {type: 'system', id: 'sistema'},
  target: {type: 'user', id: paseo.id_cuidador},
  context: {type: 'walk', id: paseo.id},
  data: {
    on_time: boolean,
    arrival_delay_minutes: number,
    gps_integrity_percent: number,
    duration_variance_percent: number
  }
}
```

---

## 4. SERVICIO DE EVALUACIONES

### 4.1 Interfaz Pública (EvaluationService)

```typescript
// services/firebase/firestore/colecciones/evaluacion.ts

import { Evaluation, EvaluationType } from '@/models/Evaluation'
import { CrudResult } from '@/services/firebase/comun'

export class ServicioEvaluacion {
  private static readonly COLLECTION = 'evaluaciones'

  /**
   * Crear una evaluación
   * Valida que:
   * - Actor existe y es participante del Paseo
   * - Target existe y es participante del Paseo
   * - Paseo está en estado COMPLETADO/FINALIZADO
   * - No existe evaluación anterior del mismo actor sobre el mismo target
   */
  static async crear(
    data: Omit<
      Evaluation,
      'id' | 'creado_en' | 'actualizado_en' | 'creado_por' | 'actualizado_por'
    >
  ): Promise<CrudResult<Evaluation>> {
    // Validar
    const validacion = await this.validarEvaluacion(data)
    if (!validacion.success) {
      return { success: false, error: validacion.error }
    }

    // Crear
    return ServicioCrudBase.crear<Evaluation>(this.COLLECTION, data as any)
  }

  /**
   * Validar que una evaluación es permitida
   */
  private static async validarEvaluacion(
    evaluation: Omit<
      Evaluation,
      'id' | 'creado_en' | 'actualizado_en' | 'creado_por' | 'actualizado_por'
    >
  ): Promise<CrudResult<void>> {
    const { type, actor, target, context } = evaluation

    // 1. ¿Existe el Paseo?
    const paseoResult = await ServicioPaseo.obtenerPorId(context.id)
    if (!paseoResult.success || !paseoResult.data) {
      return { success: false, error: 'Paseo no encontrado' }
    }
    const paseo = paseoResult.data

    // 2. ¿Está el paseo en estado evaluable?
    if (
      paseo.estado !== ESTADOS_PASEO.FINALIZADO &&
      paseo.estado !== ESTADOS_PASEO.COMPLETADO
    ) {
      return {
        success: false,
        error: `Paseo no está completado (${paseo.estado})`,
      }
    }

    // 3. Validar por tipo
    switch (type) {
      case 'caregiver_review':
        return this.validarCaregiverReview(actor.id, target.id, paseo)

      case 'tutor_review':
        return this.validarTutorReview(actor.id, target.id, paseo)

      case 'pet_behavior':
        return this.validarPetBehavior(actor.id, target.id, paseo)

      default:
        return { success: false, error: `Tipo desconocido: ${type}` }
    }
  }

  /**
   * Tutor evalúa Cuidador
   * - Actor debe ser el tutor del paseo
   * - Target debe ser el cuidador del paseo
   * - No puede haber evaluación anterior para este PASEO específico
   * - INVARIANTE: actor + target + context (paseo) = única
   */
  private static async validarEvaluacionCuidador(
    actorUid: string,
    targetUid: string,
    paseoId: string,
    paseo: Paseo
  ): Promise<CrudResult<void>> {
    // ¿Es el tutor?
    if (actorUid !== paseo.creado_por) {
      return {
        success: false,
        error: 'Solo el tutor puede evaluar al cuidador',
      }
    }

    // ¿Es el cuidador del paseo?
    if (targetUid !== paseo.id_cuidador) {
      return {
        success: false,
        error: 'Target no es el cuidador asignado a este paseo',
      }
    }

    // ¿Ya existe evaluación para ESTE PASEO específico?
    const existente = await this.evaluacionExistePorPaseo(
      'caregiver_review',
      actorUid,
      targetUid,
      paseoId
    )
    if (existente) {
      return {
        success: false,
        error:
          'Ya evaluaste al cuidador en este paseo (no se permite edición MVP1)',
      }
    }

    return { success: true }
  }

  /**
   * Cuidador evalúa Tutor
   * - INVARIANTE: actor + target + context (paseo) = única
   */
  private static async validarEvaluacionTutor(
    actorUid: string,
    targetUid: string,
    paseoId: string,
    paseo: Paseo
  ): Promise<CrudResult<void>> {
    if (actorUid !== paseo.id_cuidador) {
      return {
        success: false,
        error: 'Solo el cuidador puede evaluar al tutor',
      }
    }

    if (targetUid !== paseo.creado_por) {
      return {
        success: false,
        error: 'Target no es el tutor del paseo',
      }
    }

    const existente = await this.evaluacionExistePorPaseo(
      'tutor_review',
      actorUid,
      targetUid,
      paseoId
    )
    if (existente) {
      return { success: false, error: 'Ya evaluaste al tutor en este paseo' }
    }

    return { success: true }
  }

  /**
   * Cuidador evalúa Mascota
   * - INVARIANTE: Una observación FINAL por mascota por paseo
   * - actor + target + context (paseo) = única
   */
  private static async validarComportamientoMascota(
    actorUid: string,
    targetUid: string,
    paseoId: string,
    paseo: Paseo
  ): Promise<CrudResult<void>> {
    if (actorUid !== paseo.id_cuidador) {
      return {
        success: false,
        error: 'Solo el cuidador puede registrar observación de mascota',
      }
    }

    if (!paseo.mascota_ids?.includes(targetUid)) {
      return { success: false, error: 'Mascota no estaba en este paseo' }
    }

    // ¿Ya existe observación final para ESTA mascota en ESTE paseo?
    const existente = await this.evaluacionExistePorPaseo(
      'pet_behavior',
      actorUid,
      targetUid,
      paseoId
    )
    if (existente) {
      return {
        success: false,
        error: 'Ya registraste observación de esta mascota en este paseo',
      }
    }

    return { success: true }
  }

  /**
   * INVARIANTE CRÍTICA: Validar unicidad POR PASEO
   * actor + objetivo + contexto (paseo_id) = ÚNICA
   *
   * Esto permite que el mismo tutor evalúe al mismo cuidador en múltiples paseos.
   * Cada paseo es su propia evaluación independiente.
   * Pero dentro de UN paseo, máximo UNA evaluación por relación.
   */
  private static async evaluacionExistePorPaseo(
    type: EvaluationType,
    actorUid: string,
    objetivoUid: string,
    paseoId: string
  ): Promise<boolean> {
    const q = query(
      collection(db, this.COLLECTION),
      where('type', '==', type),
      where('actor.id', '==', actorUid),
      where('objetivo.id', '==', objetivoUid),
      where('contexto.id', '==', paseoId)
    )
    const snap = await getDocs(q)
    return snap.size > 0
  }

  /**
   * Obtener evaluaciones de un target
   */
  static async obtenerPorTarget(
    targetType: 'user' | 'pet',
    targetUid: string
  ): Promise<CrudResult<Evaluation[]>> {
    try {
      const q = query(
        collection(db, this.COLLECTION),
        where('target.type', '==', targetType),
        where('target.id', '==', targetUid),
        orderBy('creado_en', 'desc')
      )
      const snap = await getDocs(q)
      const data = snap.docs.map(
        doc => ({ id: doc.id, ...doc.data() }) as Evaluation
      )
      return { success: true, data }
    } catch (error) {
      return { success: false, error: mapFirebaseError(error) }
    }
  }
}
```

---

## 5. CLOUD FUNCTIONS

### 5.1 Cloud Function: Crear ResumenEvaluacion al Crear Evaluation

```typescript
// functions/src/evaluaciones/alCrearEvaluacion.ts

import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import * as admin from 'firebase-admin'

const db = admin.firestore()

/**
 * Trigger: Cuando se crea una Evaluation
 * Acción: Actualizar ResumenEvaluacion separado por tipo
 *
 * INVARIANTE: by_type es OBLIGATORIO
 * No existe "promedio general" que mezcle tipos
 */
export const alCrearEvaluacion = onDocumentCreated(
  'evaluaciones/{evaluacionId}',
  async event => {
    const evaluacion = event.data?.data() as any

    if (!evaluacion || evaluacion.objetivo.type !== 'user') {
      return // Solo procesar evaluaciones de usuarios, no mascotas como target
    }

    const objetivoUid = evaluacion.objetivo.id
    const tipo = evaluacion.type

    try {
      // Obtener TODAS las evaluaciones del objetivo
      const q = admin
        .firestore()
        .collection('evaluaciones')
        .where('objetivo.type', '==', 'user')
        .where('objetivo.id', '==', objetivoUid)

      const snap = await q.get()
      const evaluaciones = snap.docs.map(doc => doc.data() as any)

      // Calcular promedios POR TIPO (separado)
      const porTipo: { [key: string]: { promedio: number; cantidad: number } } =
        {}

      // Evaluaciones de Tutor → Cuidador
      const caregiverReviews = evaluaciones.filter(
        (e: any) => e.type === 'caregiver_review' && e.data?.rating
      )
      const promedioTutor = caregiverReviews.length
        ? caregiverReviews.reduce(
            (sum: number, e: any) => sum + e.data.rating,
            0
          ) / caregiverReviews.length
        : 0
      porTipo['evaluaciones_cuidador'] = {
        promedio: Math.round(promedioTutor * 10) / 10,
        cantidad: caregiverReviews.length,
      }

      // Evaluaciones de Cuidador → Tutor
      const tutorReviews = evaluaciones.filter(
        (e: any) => e.type === 'tutor_review' && e.data?.rating
      )
      const promedioCuidador = tutorReviews.length
        ? tutorReviews.reduce((sum: number, e: any) => sum + e.data.rating, 0) /
          tutorReviews.length
        : 0
      porTipo['evaluaciones_tutor'] = {
        promedio: Math.round(promedioCuidador * 10) / 10,
        cantidad: tutorReviews.length,
      }

      // Evaluaciones de Cuidador → Mascota (no tiene promedio, solo cantidad)
      const petBehavior = evaluaciones.filter(
        (e: any) => e.type === 'pet_behavior'
      )
      porTipo['evaluaciones_mascota'] = {
        promedio: 0, // N/A, no tiene rating
        cantidad: petBehavior.length,
      }

      // Evaluaciones del Sistema (futuro MVP2)
      const systemPerf = evaluaciones.filter(
        (e: any) => e.type === 'system_performance' && e.data?.rating
      )
      const promedioSistema = systemPerf.length
        ? systemPerf.reduce((sum: number, e: any) => sum + e.data.rating, 0) /
          systemPerf.length
        : 0
      porTipo['evaluaciones_sistema'] = {
        promedio: Math.round(promedioSistema * 10) / 10,
        cantidad: systemPerf.length,
      }

      // Actualizar ResumenEvaluacion (FUENTE DE VERDAD)
      const resumenRef = db.collection('resumenes_evaluacion').doc(objetivoUid)
      await resumenRef.set(
        {
          objetivo: { type: 'user', id: objetivoUid },
          ...porTipo,
          actualizado_en: admin.firestore.Timestamp.now(),
        },
        { merge: true }
      )

      // Actualizar PerfilPublico.rating_promedio (CACHE, solo caregiver_review)
      // CRÍTICO: Leer desde ResumenEvaluacion, no calcular aquí
      if (porTipo['evaluaciones_cuidador'].cantidad > 0) {
        const perfilRef = db.collection('perfiles_publicos').doc(objetivoUid)
        await perfilRef.update({
          rating_promedio: porTipo['evaluaciones_cuidador'].promedio,
        })
      }

      console.log(
        `[CF] ResumenEvaluacion(${objetivoUid}) actualizado:`,
        porTipo
      )
    } catch (err) {
      console.error(`[CF] Error procesando evaluación ${evaluacion.id}:`, err)
      throw err
    }
  }
)
```

**CAMBIOS CRÍTICOS:**

1. Cálculos separados por `type`
2. No existe "promedio general"
3. ResumenEvaluacion es fuente de verdad
4. PerfilPublico.rating_promedio es cache, solo de `evaluaciones_cuidador`
5. No se actualiza `cantidad_paseos_realizados` aquí (viene de Paseo)

---

## 6. INTEGRACIÓN CON CÓDIGO EXISTENTE

### 6.1 PaseoFinalizado Tutor (Modificación Existente)

**Archivo:** `screens/tutor/PaseoFinalizado.tsx`

```typescript
// ANTES:
onRate={(r) => console.log('Rating screen:', r)}

// DESPUÉS:
onRate={(rating) => handleRate(rating)}

// Nueva función:
const handleRate = async (rating: number) => {
  const evaluation = {
    type: 'caregiver_review' as const,
    actor: {type: 'user' as const, id: user!.uid},
    target: {type: 'user' as const, id: paseo!.id_cuidador!},
    context: {type: 'walk' as const, id: paseoId},
    data: {
      rating,
      // comment: (agregado en MVP2)
    },
  }

  const result = await ServicioEvaluacion.crear(evaluation)
  if (result.success) {
    Alert.alert('Éxito', 'Evaluación guardada')
    navigation.navigate('TutorApp')
  } else {
    Alert.alert('Error', result.error)
  }
}
```

### 6.2 PaseoFinalizadoCuidador (Nueva Pantalla)

```typescript
// screens/cuidador/PaseoFinalizadoCuidador.tsx (NUEVA)

export default function PaseoFinalizadoCuidador() {
  const [rating, setRating] = useState(5)

  const handleRate = async () => {
    const evaluation = {
      type: 'tutor_review' as const,
      actor: {type: 'user' as const, id: user!.uid},
      target: {type: 'user' as const, id: paseo!.creado_por},
      context: {type: 'walk' as const, id: paseoId},
      data: {rating},
    }

    const result = await ServicioEvaluacion.crear(evaluation)
    if (result.success) {
      Alert.alert('Gracias', 'Tu evaluación fue registrada')
    }
  }

  return (
    <View style={styles.container}>
      <PaseoFinalizadoCard
        onRate={handleRate}
        mascotaNombre={paseo.mascota_nombre_visual}
      />
    </View>
  )
}
```

### 6.3 ControlPaseo Cuidador (Integración Existente)

```typescript
// En screens/cuidador/ControlPaseo.tsx
// Agregar botón "Registrar Observación de Mascota" cuando EN_PROGRESO

const handleRegistrarObservacion = async (observacion: any) => {
  const evaluation = {
    type: 'pet_behavior' as const,
    actor: { type: 'user' as const, id: user!.uid },
    target: { type: 'pet' as const, id: mascotaId },
    context: { type: 'walk' as const, id: paseoId },
    data: observacion, // ritmo, compania, tolerancia, etc.
  }

  await ServicioEvaluacion.crear(evaluation)
}
```

### 6.4 Actualizar PerfilPublico (Lectura)

```typescript
// En components/cuidador/PerfilCuidadorCard.tsx
// Ya existe, solo cambiar de hardcoded = 0 a lectura de EvaluationSummary

// ANTES:
<Text>{perfilPublico.rating_promedio || 0}</Text>

// DESPUÉS:
const {data: summary} = await ServicioEvaluacionSummary.obtenerPorId(uid)
<Text>{summary?.average_rating || '—'} ⭐ ({summary?.total_count || 0})</Text>
```

---

## 7. Estructura Firestore (Alineada con Paw-Path)

```
firestore/
├── evaluaciones/
│   ├── eval_1 {
│   │   type: "caregiver_review",
│   │   actor: {type: "user", id: "tutor_uid"},
│   │   objetivo: {type: "user", id: "cuidador_uid"},  // CAMBIO: objetivo, no target
│   │   contexto: {type: "walk", id: "paseo_id"},      // CAMBIO: contexto, no context
│   │   datos: {rating: 5, comentario?: "..."},        // CAMBIO: datos, comentario (español)
│   │   creado_en: 2026-08-30T...,
│   │   creado_por: "tutor_uid"
│   │ }
│   └── eval_2 { ... }
│
├── resumenes_evaluacion/                              // CAMBIO: nombre español
│   ├── cuidador_uid {
│   │   objetivo: {type: "user", id: "cuidador_uid"},
│   │   evaluaciones_cuidador: {
│   │     promedio: 4.6,
│   │     cantidad: 15
│   │   },
│   │   evaluaciones_tutor: {
│   │     promedio: 4.3,
│   │     cantidad: 12
│   │   },
│   │   evaluaciones_mascota: {
│   │     promedio: 0,
│   │     cantidad: 5
│   │   },
│   │   evaluaciones_sistema: {
│   │     promedio: 4.2,
│   │     cantidad: 8
│   │   },
│   │   actualizado_en: 2026-08-30T...
│   │ }
│   └── ...
│
└── perfiles_publicos/
    └── cuidador_uid {
        ...campos existentes...,
        rating_promedio: 4.6,                          // CACHE de evaluaciones_cuidador
        cantidad_paseos_realizados: 23                 // CUENTA desde Paseos, NO desde Evaluation
        // Ejemplo query:
        // db.collection('paseos')
        //   .where('id_cuidador', '==', cuidador_uid)
        //   .where('estado', 'in', ['COMPLETADO', 'FINALIZADO'])
        //   .count()
    }
```

**CAMBIOS DE IDIOMA ESPAÑOL CONSISTENTE:**

- `actor` → `actor` (se mantiene, es técnico)
- `target` → `objetivo`
- `context` → `contexto`
- `data` → `datos`
- `comment` → `comentario`
- `EvaluationSummary` → `ResumenEvaluacion`
- `created_at` → `creado_en`
- `updated_at` → `actualizado_en`

---

## 8. Reglas de Firestore (CRÍTICO: SEGURIDAD)

```
// firestore.rules

// Evaluaciones: Validaciones de seguridad estrictas
match /evaluaciones/{docId} {
  // LECTURA: Solo participantes del paseo o admin
  allow read: if request.auth.uid == request.resource.data.actor.id ||
                 request.auth.uid == request.resource.data.target.id;

  // ESCRITURA: Solo crear (no editar ni eliminar - inmutable MVP1)
  allow create: if
    // 1. Usuario autenticado
    request.auth != null &&

    // 2. Actor es el usuario autenticado (no permite suplantación)
    request.auth.uid == request.resource.data.actor.id &&

    // 3. Type es válido
    request.resource.data.type in ['caregiver_review', 'tutor_review', 'pet_behavior', 'system_performance'] &&

    // 4. Actor, target, context existen y tienen estructura
    request.resource.data.actor.type == 'user' &&
    request.resource.data.actor.id != null &&
    request.resource.data.target.type in ['user', 'pet'] &&
    request.resource.data.target.id != null &&
    request.resource.data.context.type == 'walk' &&
    request.resource.data.context.id != null &&

    // 5. Data tiene rating (si aplica)
    (request.resource.data.type == 'pet_behavior' ||
     (request.resource.data.data.rating >= 1 && request.resource.data.data.rating <= 5)) &&

    // 6. No permite ediciones posteriores
    !exists(/databases/$(database)/documents/evaluaciones/$(docId));

  allow update, delete: if false; // INMUTABLES en MVP1
}

// ResumenEvaluacion: Solo lectura, actualizado por Cloud Functions
match /resumenes_evaluacion/{userId} {
  allow read: if true;  // Público (para matching)
  allow write: if false; // Solo Cloud Functions
}
```

**NOTAS DE SEGURIDAD:**

- `request.resource.data` es para documentos NUEVOS (al crear)
- `resource.data` es para documentos EXISTENTES (al leer/actualizar)
- Validar `rating` entre 1-5 en Rules
- Validar participación en Paseo en Backend/CloudFunction (no en Rules, es caro)
- Actor debe ser `request.auth.uid` para evitar suplantación

---

## 9. Timeline Implementación (ORDEN CRÍTICO)

### Fase 1 (3-4 días) — CIMIENTOS

```
1. ✅ Definir contratos finales (Evaluation, ResumenEvaluacion, invariantes)
2. ✅ Crear modelos TypeScript
   - models/Evaluation.ts
   - models/ResumenEvaluacion.ts
   - models/EntityReference.ts
3. ✅ Crear ServicioEvaluacion con validaciones completas
   - Reutilizar ServicioCrudBase (no crear desde cero)
   - Usar patrón de Paw-Path: CrudResult<T>
4. ✅ Implementar Firestore Rules (SEGURIDAD PRIMERO)
5. ✅ Tests del servicio + validaciones
6. ✅ Cloud Function alCrearEvaluacion
7. ✅ Conectar PaseoFinalizado.tsx (Tutor → Cuidador)
8. ✅ Flujo E2E: crear Paseo, completar, evaluar
```

### Fase 2 (2-3 días) — COMPLETAR CASOS

```
🟡 Crear PaseoFinalizadoCuidador.tsx (Cuidador → Tutor)
🟡 Integrar ControlPaseo con registro de comportamiento (Cuidador → Mascota)
🟡 UI para mostrar ResumenEvaluacion en Perfil Cuidador
🟡 Query para `cantidad_paseos_realizados` (desde Paseos, no Evaluation)
```

### Fase 3 (MVP2, futuro)

```
🟢 Caso D (Sistema → Cuidador)
🟢 Agregar comentarios a evaluaciones
🟢 Criterios multidimensionales (puntualidad, comunicación, etc.)
```

### Fase 2 (1-2 días, después de Fase 1)

```
🟡 Crear PaseoFinalizadoCuidador.tsx
🟡 Conectar ControlPaseo con registro de observaciones
🟡 Crear UI para mostrar histórico de comportamiento en mascota
🟡 Actualizar perfiles públicos con ratings
```

### Fase 3 (MVP2, futuro)

```
🟢 Casos D (Sistema → Cuidador)
🟢 Agregar criterios multidimensionales (puntualidad, comunicación, etc.)
🟢 Cloud Function de métricas automáticas
```

---

## 10. EJEMPLOS DE USO END-TO-END

### Flujo Completo: Tutor Solicita → Paseo Completa → Evalúa Cuidador

```
DÍA 1:
┌─────────────────────────────────────────────────┐
│ TUTOR: Solicita paseo para "Max"                │
│ - Selecciona Cuidador "Juan" (4.2 ⭐, 8 paseos) │
│ - Paseo creado: estado = PENDIENTE              │
└─────────────────────────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────────────────┐
│ JUAN (Cuidador): Ve solicitud en bandeja        │
│ - Presiona ACEPTAR                              │
│ - Paseo → CONFIRMADO                            │
│ - Cloud Function crea Chat                      │
└─────────────────────────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────────────────┐
│ EJECUCIÓN:                                       │
│ - Paseo → EN_CAMINO, EN_PROGRESO, FINALIZADO   │
│ - Juan registra observaciones de Max:           │
│   * ritmo: "tranquilo"                          │
│   * compania: "varios_perros"                   │
│   * Crea Evaluation tipo: "pet_behavior"        │
│ - Paseo → COMPLETADO                            │
└─────────────────────────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────────────────┐
│ TUTOR: Ve pantalla PaseoFinalizado               │
│ - Selecciona 5 ⭐ "Excelente, puntual"          │
│ - Presiona "Finalizar"                          │
│ - Sistema crea Evaluation:                      │
│   {                                             │
│     type: 'caregiver_review',                   │
│     actor: {type: 'user', id: tutor_uid},      │
│     target: {type: 'user', id: juan_uid},      │
│     context: {type: 'walk', id: paseo_id},     │
│     data: {rating: 5}                           │
│   }                                             │
└─────────────────────────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────────────────┐
│ CLOUD FUNCTION: onEvaluationCreated             │
│ - Obtiene todas las evaluaciones de Juan        │
│ - Promedio anterior: 4.2 ⭐ (8 paseos)          │
│ - Nuevo promedio: 4.27 ⭐ (9 paseos)            │
│ - Actualiza:                                    │
│   * EvaluationSummary(juan_uid)                │
│   * PerfilPublico(juan_uid)                    │
└─────────────────────────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────────────────┐
│ RESULTADO:                                       │
│ - Juan ve su perfil: 4.27 ⭐ (9 paseos)         │
│ - Próximos tutores lo buscan                    │
│ - Sistema lo sugiere más frecuentemente         │
│ - Max tiene en su perfil:                       │
│   "Observaciones: tranquilo en grupo, varios.." │
└─────────────────────────────────────────────────┘
```

---

## 11. CONSIDERACIONES ARQUITECTÓNICAS

### ✅ Por Qué Este Diseño Es Mínimal

- **Una tabla `Evaluation`:** Todos los tipos en una sola colección (no 4 tablas)
- **`data` genérico:** Variaciones viven en JSON, no en schema
- **`EvaluationSummary` opcional:** Introducir cuando crezca volumen
- **Validación en servicio:** No en BD (Firestore Rules simples)
- **Sin `EvaluationDefinition`:** Los tipos viven en enum, no en entidad

### ✅ Reutilizable en Kudu

```typescript
// Este mismo modelo funciona para:
Evaluations en Kudu para:
- Usuario evalúa Experto
- Experto evalúa Usuario
- Usuario evalúa Contenido
- Sistema evalúa Usuario

Solo cambiar:
- type: EvaluationType
- data: {...}
```

---

## 12. GOTCHAS Y DECISIONES

| Aspecto                                | Decisión              | Razón                                   |
| -------------------------------------- | --------------------- | --------------------------------------- |
| **Una persona ≠ Editar evaluación**    | Inmutable MVP1        | Simplifica auditoría, evita disputes    |
| **Múltiples observaciones de mascota** | Permitidas            | Necesarias para tracking histórico      |
| **Sistema como actor**                 | No es usuario         | Métrica automática, diferente identidad |
| **Rating solo 1-5**                    | No sub-criterios      | MVP1 minimalista, agregados en MVP2     |
| **Context siempre Paseo**              | Restricción MVP1      | Suficiente para todos los casos         |
| **Sin comentarios MVP1**               | Data.comment opcional | UI no existe, agregable después         |

---

## 13. TESTING

```typescript
// __tests__/evaluaciones.test.ts

describe('Sistema de Evaluaciones', () => {
  test('Tutor puede evaluar Cuidador post-Paseo', async () => {
    const evaluation = {
      type: 'caregiver_review',
      actor: { type: 'user', id: tutor_uid },
      target: { type: 'user', id: caregiver_uid },
      context: { type: 'walk', id: paseo_id },
      data: { rating: 5 },
    }

    const result = await ServicioEvaluacion.crear(evaluation)
    expect(result.success).toBe(true)
    expect(result.data?.id).toBeDefined()
  })

  test('No permite evaluar si Paseo no está COMPLETADO', async () => {
    const paseo_pendiente = { estado: 'PENDIENTE' }
    const result = await ServicioEvaluacion.crear(evaluation_for_pending)
    expect(result.success).toBe(false)
    expect(result.error).toContain('no está completado')
  })

  test('Cloud Function actualiza PerfilPublico', async () => {
    // Trigger onEvaluationCreated
    // Verificar que PerfilPublico.rating_promedio cambió
    const perfil = await ServicioPerfilPublico.obtenerPorId(caregiver_uid)
    expect(perfil.data?.rating_promedio).toBeGreaterThan(0)
  })
})
```

---

## 14. REFERENCIAS RÁPIDAS

**Archivo de Modelos:**

- `models/Evaluation.ts` (nuevo)
- `models/EvaluationSummary.ts` (nuevo)

**Archivo de Servicio:**

- `services/firebase/firestore/colecciones/evaluacion.ts` (nuevo)

**Cloud Functions:**

- `functions/src/evaluaciones/onEvaluationCreated.ts` (nuevo)

**UI Modificada:**

- `screens/tutor/PaseoFinalizado.tsx` (conectar onRate)

**UI Nueva:**

- `screens/cuidador/PaseoFinalizadoCuidador.tsx` (agregar)

**Firestore:**

- Colección `evaluaciones/` (nueva)
- Colección `evaluation_summaries/` (nueva)
- Actualizar `perfiles_publicos/` (campos rating)

---

## 15. Checklist Pre-Implementación

**ANTES de escribir cualquier código, validar:**

- [ ] Invariantes claros: actor + objetivo + contexto = única por paseo
- [ ] Firestore Rules correctas: `request.resource.data` en create
- [ ] Rating validado 1-5 en Rules, no solo en servicio
- [ ] ResumenEvaluacion separado por tipo, by_type OBLIGATORIO
- [ ] PerfilPublico.rating_promedio solo de evaluaciones_cuidador
- [ ] cantidad_paseos_realizados desde query de Paseos, no Evaluation
- [ ] Idioma español consistente en todos los campos
- [ ] Reutilizar ServicioCrudBase, patrones Paw-Path (CrudResult, toDb, etc.)
- [ ] Cloud Function solo actualiza ResumenEvaluacion + cache en PerfilPublico
- [ ] pet_behavior: máximo 1 observación por mascota por paseo
- [ ] system_performance SEPARADO de promedio humano

---

## 16. DECISIÓN FINAL APROBADA

**APROBADO PARA FASE 1 CON AJUSTES IMPLEMENTADOS**

✅ Seguridad: Firestore Rules corregidas  
✅ Arquitectura: ResumenEvaluacion por tipos  
✅ Datos: cantidad_paseos desde Paseo  
✅ Idioma: Español consistente  
✅ Reutilización: Patrones Paw-Path respetados  
✅ Invariantes: Documentados y claros

**Orden a seguir:**

1. Modelos TypeScript
2. ServicioEvaluacion
3. Firestore Rules
4. Tests
5. Cloud Function
6. Conectar UI
7. E2E

**NO iniciar PaseoFinalizado.tsx hasta que Fase 1 esté 100% funcional.**
