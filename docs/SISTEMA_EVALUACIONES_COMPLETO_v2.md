# Sistema de Evaluaciones Paw-Path — Especificación Definitiva (v2)

**Fecha:** 30 Agosto 2026  
**Versión:** MVP1 (Fase 1 con Ajustes Críticos de Seguridad)  
**Estado:** APROBADO PARA IMPLEMENTACIÓN

**Cambios v2:** Correcciones de invariantes, Firestore Rules, separación de tipos, y alineación con infraestructura Paw-Path.

---

## 1. VISIÓN

Capturar información de confianza en Paw-Path a través de evaluaciones simples que responden:

- ¿Fue confiable el cuidador?
- ¿Fue claro el tutor en instrucciones?
- ¿Cómo se comportó la mascota?
- ¿Cumplió el cuidador sus compromisos?

**Resultado:** Mejor matching, detección de problemas, reputación transparente y trust layer sólido.

---

## 2. MODELOS DE DATOS

### 2.1 Evaluacion (Entidad Principal)

```typescript
// models/Evaluacion.ts

import { BaseModel } from './BaseModel'

/** Tipos de evaluación soportados */
export type TipoEvaluacion =
  | 'caregiver_review' // Tutor evalúa Cuidador
  | 'tutor_review' // Cuidador evalúa Tutor
  | 'pet_behavior' // Cuidador evalúa Mascota
  | 'system_performance' // Sistema evalúa Cuidador (MVP2)

/** Referencia genérica a entidad del dominio */
export interface ReferenciaSistema {
  tipo: 'usuario' | 'mascota' | 'paseo'
  id: string // UID (usuario/mascota) o ID (paseo)
}

/** Evaluación de un actor sobre un objetivo en un contexto (paseo) */
export interface Evaluacion extends BaseModel {
  /** Tipo de evaluación */
  tipo: TipoEvaluacion

  /** Quién evalúa (siempre usuario) */
  actor: ReferenciaSistema

  /** Qué se evalúa (usuario o mascota) */
  objetivo: ReferenciaSistema

  /** En qué contexto (siempre paseo para MVP1) */
  contexto: ReferenciaSistema

  /** Datos específicos según el tipo */
  datos: {
    rating?: number // 1-5, requerido para caregiver_review y tutor_review
    comentario?: string // Opcional MVP2
    [key: string]: unknown // Campos específicos por tipo
  }
}

/**
 * CONVENCIÓN IDIOMA: Español consistente en Firestore y código
 * - actor: quién evalúa
 * - objetivo: qué/quién se evalúa
 * - contexto: contexto de la evaluación (siempre paseo MVP1)
 * - datos: payload de la evaluación
 */
```

### 2.2 ResumenEvaluacion (Agregado separado por tipo)

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

/** Resumen de evaluaciones para un objetivo, SEPARADO POR TIPO */
export interface ResumenEvaluacion extends BaseModel {
  /** A quién se refiere el resumen */
  objetivo: ReferenciaSistema

  /** Evaluaciones de Tutor → Cuidador (lo que ven tutores nuevos) */
  evaluaciones_cuidador?: DesglosePorTipo
  // {
  //   promedio: 4.6,
  //   cantidad: 15
  // }

  /** Evaluaciones de Cuidador → Tutor (invisible, para coaching) */
  evaluaciones_tutor?: DesglosePorTipo
  // {
  //   promedio: 4.3,
  //   cantidad: 12
  // }

  /** Evaluaciones de Cuidador → Mascota (observaciones, sin rating) */
  evaluaciones_mascota?: DesglosePorTipo
  // {
  //   promedio: 0,  // N/A
  //   cantidad: 5
  // }

  /** Evaluaciones del Sistema (MVP2, independiente) */
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
 * - NO existe "promedio general" que mezcle tipos
 * - Cada tipo es independiente
 * - Paw-Path decide qué mostrar, no promedio automático
 */
```

---

## 2.3 Invariantes Críticas (ANTES DE CUALQUIER CÓDIGO)

### Unicidad Por Paseo (CAMBIO CRÍTICO)

```
actor + objetivo + contexto (paseo_id) = ÚNICA
```

**Esto significa:**

- Tutor A puede evaluar Cuidador B en Paseo 1 ✅
- Tutor A puede evaluar Cuidador B en Paseo 2 ✅ (diferente contexto)
- Tutor A SOLO puede evaluar Cuidador B UNA VEZ en Paseo 1 ❌ (intento duplicado)

**NO es:** Tutor A solo puede evaluar Cuidador B una vez en su vida

### Participación Explícita

- `actor` debe ser participante del `contexto` (Paseo):
  - caregiver_review: actor = Paseo.creado_por (Tutor)
  - tutor_review: actor = Paseo.id_cuidador (Cuidador)
  - pet_behavior: actor = Paseo.id_cuidador (Cuidador)
  - system_performance: actor = {tipo: 'sistema', id: 'sistema'}

- `objetivo` debe ser participante del `contexto` (Paseo):
  - caregiver_review: objetivo = Paseo.id_cuidador
  - tutor_review: objetivo = Paseo.creado_por
  - pet_behavior: objetivo ∈ Paseo.mascota_ids
  - system_performance: objetivo = Paseo.id_cuidador

### Observación Final de Mascota (Pet Behavior)

- UNA observación final por mascota por paseo
- Si queremos tracking temporal (10:30, 11:00, 11:30 cambios), va en `EventoPaseo`
- `Evaluacion` tipo `pet_behavior` es la consolidación FINAL del comportamiento

### Cantidad de Paseos Realizados (CRÍTICO)

```typescript
// ❌ INCORRECTO (no hacer):
cantidad_paseos = ResumenEvaluacion.evaluaciones_cuidador.cantidad

// ✅ CORRECTO:
cantidad_paseos = COUNT(Paseos WHERE id_cuidador = uid AND estado IN [COMPLETADO, FINALIZADO])
```

**Razón:** Si tutor no evalúa, el paseo igual se realizó.

### Separación de Tipos

```
ResumenEvaluacion {
  evaluaciones_cuidador:     {promedio: 4.6, cantidad: 15},   // Tutor → Cuidador
  evaluaciones_tutor:        {promedio: 4.3, cantidad: 12},   // Cuidador → Tutor
  evaluaciones_mascota:      {promedio: 0, cantidad: 5},      // Cuidador → Mascota (sin rating)
  evaluaciones_sistema:      {promedio: 4.2, cantidad: 8}     // Sistema → Cuidador (MVP2)
}
```

**Cadena de Verdad:**

```
Evaluacion (individual)
    ↓
ResumenEvaluacion (agregado, FUENTE DE VERDAD)
    ↓
PerfilPublico.rating_promedio (CACHE, solo evaluaciones_cuidador)
```

---

## 3. CASOS DE USO DETALLADOS

### Caso 1: Tutor Evalúa Cuidador ✅ MVP1 CRÍTICA

```
DÍA: Tutor completa paseo → ve PaseoFinalizadoCard → selecciona 1-5 ⭐
Datos guardados:
{
  tipo: 'caregiver_review',
  actor: {tipo: 'usuario', id: paseo.creado_por},          // UID Tutor
  objetivo: {tipo: 'usuario', id: paseo.id_cuidador},      // UID Cuidador
  contexto: {tipo: 'paseo', id: paseo.id},
  datos: {
    rating: 5,
    // comentario: "..." (MVP2)
  }
}

Flujo de persistencia:
ServicioEvaluacion.crear() ←→ Firestore /evaluaciones/{id}
                                 ↓
                        Cloud Function onDocumentCreated
                                 ↓
                        Calcula ResumenEvaluacion (POR TIPO)
                                 ↓
                        Actualiza PerfilPublico.rating_promedio (CACHE)
```

**Impacto de Confianza:**

- Cuidador con 4.8/5 ⭐ en `evaluaciones_cuidador` → Tutores lo buscan primero
- Cuidador con 2.2/5 ⭐ → Admin investiga
- (NUNCA se mezcla con `evaluaciones_sistema` o `evaluaciones_mascota`)

---

### Caso 2: Cuidador Evalúa Tutor 🟡 MVP1

```
DÍA: Cuidador completa paseo → ve PaseoFinalizadoCuidador.tsx (NUEVA)
Estructura idéntica a Caso 1, pero:
{
  tipo: 'tutor_review',
  actor: {tipo: 'usuario', id: paseo.id_cuidador},
  objetivo: {tipo: 'usuario', id: paseo.creado_por},
  contexto: {tipo: 'paseo', id: paseo.id},
  datos: {rating: 4}
}

Impacto: Tutor con evaluaciones bajas → instrucciones poco claras
```

---

### Caso 3: Cuidador Evalúa Mascota 🟡 MVP1

```
DURANTE o DESPUÉS: Cuidador en ControlPaseo.tsx → "Registrar Observación"
UNA observación FINAL por mascota por paseo:
{
  tipo: 'pet_behavior',
  actor: {tipo: 'usuario', id: paseo.id_cuidador},
  objetivo: {tipo: 'mascota', id: mascota_id},
  contexto: {tipo: 'paseo', id: paseo.id},
  datos: {
    ritmo: 'tranquilo' | 'rapido' | 'adelante' | 'explorador',
    compania: 'solo' | 'un_perro' | 'varios_perros' | 'grupo_grande',
    tolerancia: 'ignora' | 'intenta_una' | 'insiste' | 'se_altera',
    tamano_compatible: 'pequeño' | 'mediano' | 'grande' | 'gigante',
    incidentes?: 'ninguno' | 'menor' | 'moderado' | 'critico',
    notas?: string
  }
}

Impacto:
- Mascota con "insiste" → Cuidadores la evitan
- Mascota con "tranquilo" → Muy solicitada
- Histórico disponible para matching futuro
```

---

### Caso 4: Sistema Evalúa Cuidador 🟢 MVP2

```
FUTURO: Cloud Function monitorea EventoPaseo
{
  tipo: 'system_performance',
  actor: {tipo: 'sistema', id: 'sistema'},
  objetivo: {tipo: 'usuario', id: paseo.id_cuidador},
  contexto: {tipo: 'paseo', id: paseo.id},
  datos: {
    on_time: boolean,
    arrival_delay_minutes: number,
    gps_integrity_percent: number,
    duration_variance_percent: number
  }
}

INDEPENDIENTE de promedio humano:
ResumenEvaluacion.evaluaciones_sistema ≠ evaluaciones_cuidador
```

---

## 4. ARQUITECTURA: SERVICIO

### ServicioEvaluacion

**Ubicación:** `services/firebase/firestore/colecciones/evaluacion.ts`

**Responsabilidades:**

1. Validar invariantes: actor + objetivo + contexto (paseo) = única
2. Validar participación en Paseo
3. Persistir en Firestore
4. Usar patrones Paw-Path: CrudResult<T>, ServicioCrudBase

**Validaciones críticas:**

```
✅ Actor es usuario autenticado (request.auth.uid == actor.id)
✅ Rating 1-5 si aplica
✅ Paseo está COMPLETADO o FINALIZADO
✅ actor + objetivo + contexto (paseo_id) no existe aún
✅ actor/objetivo son participantes del Paseo
```

**NO valida en Firestore Rules (es caro):**

- Participación en Paseo → Backend/ServicioEvaluacion
- Existencia del Paseo → Backend

---

## 5. FIRESTORE RULES (CRÍTICO: SEGURIDAD)

```
// firestore.rules

match /evaluaciones/{docId} {
  // LECTURA: Solo participantes de la evaluación
  allow read: if request.auth.uid == resource.data.actor.id ||
                 request.auth.uid == resource.data.objetivo.id;

  // CREACIÓN: Validaciones estrictas
  allow create: if
    // 1. Usuario autenticado
    request.auth != null &&

    // 2. Actor es el usuario autenticado (ANTI-SUPLANTACIÓN)
    request.auth.uid == request.resource.data.actor.id &&

    // 3. Tipo válido
    request.resource.data.tipo in [
      'caregiver_review', 'tutor_review',
      'pet_behavior', 'system_performance'
    ] &&

    // 4. Estructura correcta (CRITICAL: request.resource.data)
    request.resource.data.actor.tipo == 'usuario' &&
    request.resource.data.actor.id != null &&
    request.resource.data.objetivo.tipo in ['usuario', 'mascota'] &&
    request.resource.data.objetivo.id != null &&
    request.resource.data.contexto.tipo == 'paseo' &&
    request.resource.data.contexto.id != null &&

    // 5. Datos existen
    request.resource.data.datos != null &&

    // 6. Rating validado (1-5) para tipos que lo requieren
    (request.resource.data.tipo == 'pet_behavior' ||
     (request.resource.data.datos.rating >= 1 &&
      request.resource.data.datos.rating <= 5)) &&

    // 7. Documento nuevo (evita sobrescritura)
    !exists(/databases/$(database)/documents/evaluaciones/$(docId));

  // NO permitir ediciones/eliminaciones (INMUTABLE MVP1)
  allow update, delete: if false;
}

match /resumenes_evaluacion/{userId} {
  allow read: if true;   // Público (para perfiles, matching)
  allow write: if false; // Solo Cloud Functions
}
```

**PUNTOS CRÍTICOS:**

1. **`request.resource.data` vs `resource.data`:**
   - `request.resource.data` = documento NUEVO (en allow create)
   - `resource.data` = documento EXISTENTE (en allow read/update)
   - ERROR COMÚN: Usar `resource.data` en create (rompe)

2. **Anti-suplantación:**
   - `request.auth.uid == request.resource.data.actor.id`
   - El cliente NO puede crear evaluaciones como otro usuario

3. **Rating:**
   - Validado 1-5 en Rules (evita datos inválidos desde cliente)
   - `datos.rating >= 1 && datos.rating <= 5`

4. **Participación:**
   - NO validar en Rules (caro + complejo)
   - Validar en Backend/ServicioEvaluacion

---

## 6. CLOUD FUNCTION: Agregación por Tipo

**Ubicación:** `functions/src/evaluaciones/alCrearEvaluacion.ts`

**Trigger:** `onDocumentCreated('evaluaciones/{evaluacionId}')`

**Lógica:**

```typescript
1. Lee Evaluacion creada
2. Obtiene TODAS las evaluaciones del objetivo
3. Calcula promedios SEPARADOS por tipo:
   - evaluaciones_cuidador: filter(tipo='caregiver_review')
   - evaluaciones_tutor: filter(tipo='tutor_review')
   - evaluaciones_mascota: filter(tipo='pet_behavior')
   - evaluaciones_sistema: filter(tipo='system_performance')
4. Actualiza ResumenEvaluacion/{objetivo.id} (FUENTE DE VERDAD)
5. Actualiza PerfilPublico.rating_promedio (CACHE, solo caregiver_review)
6. NO actualiza cantidad_paseos_realizados (viene de query Paseos)
```

**Resultado esperado:**

```json
// resumenes_evaluacion/{cuidador_uid}
{
  "objetivo": { "tipo": "usuario", "id": "cuidador_uid" },
  "evaluaciones_cuidador": {
    "promedio": 4.6,
    "cantidad": 15
  },
  "evaluaciones_tutor": {
    "promedio": 4.3,
    "cantidad": 12
  },
  "evaluaciones_mascota": {
    "promedio": 0,
    "cantidad": 5
  },
  "evaluaciones_sistema": {
    "promedio": 4.2,
    "cantidad": 8
  },
  "actualizado_en": "2026-08-30T15:00:00Z"
}
```

---

## 7. TIMELINE IMPLEMENTACIÓN (ORDEN CRÍTICO)

### FASE 1 (3-4 días) — CIMIENTOS + SEGURIDAD

```
PASO 1: Modelos TypeScript
  ✅ models/Evaluacion.ts
     ├─ TipoEvaluacion enum
     ├─ ReferenciaSistema interface
     └─ Evaluacion extends BaseModel

  ✅ models/ResumenEvaluacion.ts
     ├─ DesglosePorTipo
     └─ ResumenEvaluacion extends BaseModel

  ✅ Actualizar models/index.ts (exportar)

PASO 2: Firestore Rules (SEGURIDAD PRIMERO)
  ✅ firestore.rules
     ├─ allow create: request.resource.data (CORRECCIÓN CRÍTICA)
     ├─ Rating 1-5 validado
     ├─ Estructura validada
     └─ Inmutabilidad
  ✅ Deploy a Firestore
  ✅ Probar que vieja colección no interfiere

PASO 3: ServicioEvaluacion
  ✅ services/firebase/firestore/colecciones/evaluacion.ts
     ├─ crear(data): CrudResult<Evaluacion>
     ├─ validarEvaluacion(): privado
     ├─ evaluacionExistePorPaseo(): invariante actor+objetivo+contexto
     ├─ obtenerPorObjetivo(): para ResumenEvaluacion
     └─ Reutilizar ServicioCrudBase, patrones Paw-Path

PASO 4: Cloud Function
  ✅ functions/src/evaluaciones/alCrearEvaluacion.ts
     ├─ Cálculos POR TIPO (separado)
     ├─ ResumenEvaluacion es fuente de verdad
     ├─ PerfilPublico.rating_promedio = CACHE
     ├─ NO actualizar cantidad_paseos_realizados
     └─ Manejo de errores + logging

PASO 5: Tests (Backend)
  ✅ __tests__/evaluaciones.test.ts
     ├─ Tutor evalúa Cuidador ✅
     ├─ No permite duplicado en mismo paseo ❌
     ├─ Permite mismo Cuidador en diferentes Paseos ✅
     ├─ Rating 1-5 validado ❌
     ├─ Paseo debe estar COMPLETADO ❌
     ├─ Cloud Function calcula ResumenEvaluacion ✅
     └─ PerfilPublico.rating_promedio se actualiza ✅

PASO 6: Conectar UI Tutor (Caso 1)
  ✅ screens/tutor/PaseoFinalizado.tsx
     └─ onRate: (rating) => ServicioEvaluacion.crear({...})

PASO 7: Flujo E2E
  ✅ Crear Paseo → Completar → Evaluar
  ✅ Verificar ResumenEvaluacion creado
  ✅ Verificar PerfilPublico.rating_promedio actualizado

RESULTADO FASE 1:
  ✅ Tutor puede evaluar Cuidador
  ✅ Invariantes respetados (actor+objetivo+contexto único por paseo)
  ✅ ResumenEvaluacion separado por tipos
  ✅ PerfilPublico.rating_promedio = CACHE de evaluaciones_cuidador
  ✅ Seguridad: Firestore Rules correctas
  ✅ Sin duplicados, sin suplantación
```

### FASE 2 (2-3 días después) — CASOS 2 Y 3

```
PASO 8: Caso 2 - Cuidador Evalúa Tutor
  🟡 screens/cuidador/PaseoFinalizadoCuidador.tsx
  🟡 Flujo idéntico a Caso 1, pero tipo: 'tutor_review'

PASO 9: Caso 3 - Cuidador Evalúa Mascota
  🟡 Agregar "Registrar Observación" en ControlPaseo.tsx
  🟡 Modal para seleccionar comportamiento
  🟡 Guardar tipo: 'pet_behavior'
  🟡 Validar: UNA observación por mascota por paseo

PASO 10: UI para ResumenEvaluacion
  🟡 PerfilCuidadorCard: mostrar rating_promedio + cantidad
  🟡 PerfilMascota: mostrar histórico comportamiento
  🟡 Lecturas desde ResumenEvaluacion (fuente verdad)

PASO 11: Query cantidad_paseos_realizados
  🟡 Hook useContarPaseosRealizados(cuidador_uid)
       └─ Query: Paseos.where(id_cuidador).where(estado IN [COMPLETADO, FINALIZADO]).count()
  🟡 Actualizar PerfilPublico para mostrar cantidad correcta
```

### FASE 3 (MVP2, futuro) — CASO 4 Y EXTENSIONES

```
🟢 Caso 4: Sistema Evalúa Cuidador
   └─ Cloud Function monitorea EventoPaseo
   └─ Crea Evaluation tipo: 'system_performance'
   └─ SEPARADO de evaluaciones humanas

🟢 Extensiones:
   └─ Agregar data.comentario a evaluaciones humanas
   └─ Criterios multidimensionales
   └─ Analytics sobre ResumenEvaluacion
```

---

## 8. CHECKLIST PRE-IMPLEMENTACIÓN

### Modelos TypeScript

- [ ] `ReferenciaSistema` con tipo: 'usuario' | 'mascota' | 'paseo' e id: string
- [ ] `TipoEvaluacion` enum: caregiver_review, tutor_review, pet_behavior, system_performance
- [ ] `Evaluacion` extends BaseModel con tipo, actor, objetivo, contexto, datos
- [ ] `ResumenEvaluacion` con `by_type` OBLIGATORIO separado
- [ ] `DesglosePorTipo`: {promedio: number, cantidad: number}
- [ ] Exportar en models/index.ts
- [ ] Idioma español: "objetivo", "contexto", "datos", no "target", "context", "data"

### Firestore Rules

- [ ] ✅ `request.resource.data` en allow create (NO `resource.data`)
- [ ] ✅ Rating validado 1-5 en Rules
- [ ] ✅ Tipos permitidos en Rules
- [ ] ✅ Estructura básica validada
- [ ] ✅ Inmutabilidad: create sí, update/delete no
- [ ] ✅ ResumenEvaluacion: read true, write false
- [ ] ✅ Deploy sin errores

### ServicioEvaluacion

- [ ] Reutilizar ServicioCrudBase
- [ ] Patrón Paw-Path: CrudResult<Evaluacion>
- [ ] Invariante: actor + objetivo + contexto (paseo_id) = única
- [ ] Query: evaluacionExistePorPaseo(tipo, actor, objetivo, paseo)
- [ ] Validar: Paseo COMPLETADO o FINALIZADO
- [ ] Validar: actor es participante del Paseo

### Cloud Function

- [ ] Cálculos SEPARADOS por tipo
- [ ] ResumenEvaluacion = fuente de verdad
- [ ] PerfilPublico.rating_promedio = CACHE (solo caregiver_review)
- [ ] cantidad_paseos_realizados NO actualizar aquí
- [ ] system_performance SEPARADO

### Integración Paw-Path

- [ ] Idioma español: objetivo, contexto, datos, comentario, evaluaciones_*
- [ ] Reutilizar: EntityReference, BaseModel, CrudResult
- [ ] Patrones: ServicioCrudBase, toDb(), conversores
- [ ] Firestore: 'evaluaciones', 'resumenes_evaluacion'
- [ ] Sin conflictos con colecciones existentes

### Invariantes

- [ ] actor + objetivo + contexto (paseo_id) = única (NO de por vida)
- [ ] UNA observación por mascota por paseo
- [ ] Tutor evalúa mismo Cuidador en múltiples paseos ✅
- [ ] cantidad_paseos desde query Paseos
- [ ] system_performance independiente

### Testing

- [ ] Tutor evalúa Cuidador en Paseo 1 ✅
- [ ] Tutor intenta evaluar mismo Cuidador en Paseo 1 nuevamente ❌
- [ ] Tutor evalúa MISMO Cuidador en Paseo 2 ✅
- [ ] Rating fuera de 1-5 ❌
- [ ] Paseo ≠ COMPLETADO ❌
- [ ] Cloud Function actualiza ResumenEvaluacion ✅
- [ ] PerfilPublico.rating_promedio se actualiza ✅

---

## 9. EJEMPLO END-TO-END: TUTOR EVALÚA CUIDADOR

```
DÍA 1 - Tutor solicita paseo:
┌─────────────────────────────┐
│ Selecciona Cuidador "Juan"  │
│ (4.2 ⭐, 8 paseos) → Paseo   │
│ estado = PENDIENTE          │
└─────────────────────────────┘

DÍA 1 - Juan acepta:
┌─────────────────────────────┐
│ Paseo → CONFIRMADO          │
│ Chat auto-creado            │
└─────────────────────────────┘

DÍA 1 - Ejecución:
┌─────────────────────────────┐
│ Paseo → FINALIZADO →        │
│ Paseo → COMPLETADO          │
└─────────────────────────────┘

DÍA 1 - Tutor ve PaseoFinalizadoCard:
┌─────────────────────────────┐
│ Tutor selecciona 5 ⭐        │
│ "Excelente, puntual"        │
│ Presiona "Finalizar"        │
└─────────────────────────────┘

CLIENTE → ServicioEvaluacion.crear():
┌─────────────────────────────┐
│ {                           │
│   tipo: 'caregiver_review', │
│   actor: {tipo: 'usuario',  │
│     id: tutor_uid},         │
│   objetivo: {tipo: 'usuario'│
│     id: juan_uid},          │
│   contexto: {tipo: 'paseo', │
│     id: paseo_id},          │
│   datos: {rating: 5}        │
│ }                           │
└─────────────────────────────┘

FIRESTORE:
┌─────────────────────────────┐
│ /evaluaciones/{id}          │
│ documento creado ✅          │
└─────────────────────────────┘

CLOUD FUNCTION onDocumentCreated:
┌─────────────────────────────┐
│ 1. Lee evaluaciones de Juan │
│ 2. Filtra tipo              │
│    'caregiver_review': 9 ✅  │
│    ratings: [4.2, 5]        │
│    promedio: 4.27 ⭐         │
│ 3. Actualiza               │
│    resumenes_evaluacion/    │
│    {juan_uid}:             │
│    {promedio: 4.27,        │
│     cantidad: 9}           │
│ 4. Actualiza               │
│    PerfilPublico.          │
│    rating_promedio: 4.27   │
└─────────────────────────────┘

RESULTADO:
┌─────────────────────────────┐
│ Juan ve su perfil: 4.27 ⭐  │
│ (9 evaluaciones)            │
│ Próximos tutores lo buscan  │
│ Sistema lo sugiere más      │
└─────────────────────────────┘
```

---

## 10. DECISIÓN FINAL APROBADA

**ESTADO: APROBADO PARA FASE 1**

✅ **Invariantes claros:** actor + objetivo + contexto (paseo_id) = única  
✅ **Seguridad:** Firestore Rules corregidas (request.resource.data)  
✅ **Arquitectura:** ResumenEvaluacion separado por tipos  
✅ **Datos:** cantidad_paseos desde query Paseos  
✅ **Idioma:** Español consistente (objetivo, contexto, datos)  
✅ **Reutilización:** Patrones Paw-Path (CrudResult, ServicioCrudBase)  
✅ **MVP2 listo:** system_performance diseñado pero no implementado

**Próximo paso:** FASE 1 - Implementación de modelos y servicio
