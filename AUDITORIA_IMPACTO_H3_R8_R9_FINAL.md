# AUDITORÍA DE IMPACTO: SOPORTE MULTI-RESOLUCIÓN H3 EN PAWPATH

## PLAN SIMPLIFICADO Y PRAGMÁTICO v3.2

**Fecha:** 2026-07-05  
**Versión:** 3.2 (Responsabilidad Única + ServicioTerritorio)  
**Filosofía:** Única responsabilidad. Solo lo necesario. Datos guían decisiones. Sin código muerto.  
**Estado:** LISTO PARA IMPLEMENTACIÓN

---

## RESUMEN EJECUTIVO

**Filosofía: UI ignora infraestructura. Servicio es el cerebro territorial.**

| Rol | Responsabilidad | Qué maneja |
|-----|-----------------|-----------|
| **UI/Hook** | Capturar coordenadas | `{latitude, longitude, tipo, mascotas}` |
| **ServicioTerritorio** | Decidir sobre territorio | `{h3_index, h3_observacion, (futuro: ciudad, barrio, etc)}` |
| **Firestore** | Persistir lo que Servicio decide | Datos completos con contexto territorial |

**Decisión arquitectónica:**

```
HOY:     Hook manda coords. Servicio decide H3. Fin.
MAÑANA:  ServicioTerritorio expande sin tocar UI.
NUNCA:   Código muerto. Funciones que nadie llama.
NUNCA:   Colecciones paralelas "por si acaso".
```

---

## CAMBIO PRINCIPAL: MÍNIMO Y COMPATIBLE

### Estrategia: Agregar + Centralizar

**Mantener intacto:**
```typescript
h3_index: string           // R8 — Ya estabilizado. SIN CAMBIOS.
```

**Agregar nuevo:**
```typescript
h3_observacion: string     // R9 — Precisión geográfica.
```

**Responsabilidad única:**
```
Hook             → coordenadas
   ↓
ServicioTerritorio → contexto territorial
   ↓
Firestore        → persistencia
```

**Por qué no calcular H3 en el Hook:**
- Duplicación: Hook + Servicio llamarían al mismo lugar
- Acoplamiento: UI sabe de infraestructura H3
- Frágil: Si cambias la decisión territorial, tocas UI
- Mejor: UI ≠ infraestructura. Nunca.

---

## ARQUITECTURA SIMPLIFICADA

### Lo que cambia (Absolutamente mínimo)

```typescript
// ExploracionTerritorial.ts
export interface ExploracionTerritorial extends BaseModel {
  id_explorador: string
  h3_index: string           // R8 — MANTENER (estabilizado)
  h3_observacion: string     // R9 — AGREGAR (nueva resolución)
  coordenadas: {latitude, longitude}
  tipo_punto: TipoPunto
  mascotas_visibles: number
  flujo_peatonal: NivelObservable
  // ... resto igual
}

// Ubicacion.ts
export interface Ubicacion extends BaseModel {
  proveedor: ProveedorMapa
  proveedor_place_id: string
  direccion_formateada: string
  coordenadas: {latitude, longitude}
  h3_index?: string          // R8 — MANTENER
  h3_observacion?: string    // R9 — AGREGAR (opcional)
  // ... resto igual
}
```

### Lo que NO cambia

```typescript
// PerfilPublico — Cobertura del cuidador
h3_home: string              // R8 (zona donde vive)
celdas_cobertura: string[]   // R8 (donde presta servicio)

// ZonaH3 — Inteligencia territorial operacional
indice_celda: string         // R8 (unidad de decisión)

// NO HAY:
// - h3_zonas_r9
// - territorio_resumen_r9
// - Servicios duplicados
```

---

## PLAN: 2 SPRINTS (MVP) + FUTURO

### SPRINT 1: Infraestructura Territorial Centralizada (4-6 horas)

**Objetivo:** Agregar R9 sin duplicar lógica. Centralizar decisiones territoriales en un único servicio.

#### T1.1: Crear ServicioTerritorio (Cerebro Territorial)

**Archivo:** `services/territorio/ServicioTerritorio.ts` (nuevo)

```typescript
import { latLngToCell } from 'h3-js'

/**
 * Cerebro territorial de PawPath.
 * Centraliza TODAS las decisiones de contexto geográfico.
 * 
 * Responsabilidades HOY:
 * - Cálculos H3 (R8, R9)
 * 
 * Responsabilidades FUTURO (sin tocar callers):
 * - Información de contexto (ciudad, barrio, zona, timezone)
 * - Geocodificación inversa
 * - Validaciones territoriales (zona_segura, cobertura, distancias)
 * - Metadatos geográficos (clima, hora solar, etc.)
 * 
 * PRINCIPIO: UI nunca toca infraestructura territorial.
 * UI manda coordenadas. Servicio retorna contexto. Fin.
 */
export class ServicioTerritorio {
  /**
   * Obtiene el contexto completo de una ubicación.
   * 
   * VENTAJA: Hoy devuelve H3. Mañana puede devolver ciudad, barrio, zona, clima...
   * sin tocar UNA LÍNEA de código cliente.
   * 
   * @param latitude Latitud de la ubicación
   * @param longitude Longitud de la ubicación
   * @returns Contexto territorial completo
   */
  static obtenerContextoTerritorial(latitude: number, longitude: number) {
    return {
      // Jerarquía territorial H3 (HOY)
      h3_index: latLngToCell(latitude, longitude, 8),         // R8 — Decisiones operacionales
      h3_observacion: latLngToCell(latitude, longitude, 9),   // R9 — Precisión geográfica
      
      // FUTURO (expansión sin romper contrato):
      // ciudad: string
      // barrio: string
      // zona_segura: boolean
      // precision_gps: 'alta' | 'media' | 'baja'
      // proveedor_mapa: 'google' | 'osm'
      // timezone: string
      // clima: {temperatura, humedad, precipitacion}
      // hora_solar: string
    }
  }

  /**
   * Alias para retrocompatibilidad (código antiguo).
   * Prefiere la llamada directa a latLngToCell en casos raros.
   */
  static coordsAH3(latitude: number, longitude: number, resolucion: number = 8): string {
    return latLngToCell(latitude, longitude, resolucion)
  }
}
```

**Ventajas:** 
- **Única responsabilidad:** Servicio DECIDE sobre territorio. UI no sabe.
- **Agnóstico en UI:** Hook manda solo coordenadas.
- **Future-proof:** Mañana expande el retorno sin tocar callers.
- **Testing centralizado:** Un solo lugar para validar decisiones territoriales.
- **Escalabilidad semántica:** Hoy H3. Mañana ciudad + barrio + clima + seguridad. Una clase.

**Validación:** `npm run type-check`

---

#### T1.2: Actualizar Modelos (15 min)

```typescript
// models/ExploracionTerritorial.ts
export interface ExploracionTerritorial extends BaseModel {
  id_explorador: string
  h3_index: string           // ← MANTENER (R8)
  h3_observacion: string     // ← AGREGAR (R9)
  coordenadas: {latitude, longitude}
  // ... resto igual
}

// models/Ubicacion.ts
export interface Ubicacion extends BaseModel {
  // ... campos existentes
  h3_index?: string          // ← MANTENER (R8)
  h3_observacion?: string    // ← AGREGAR (R9)
}
```

**Validación:** `npm run type-check`

---

#### T1.3: Actualizar Servicios (1.5 horas)

**ServicioExploracionTerritorial.crear():**

```typescript
static async crear(
  data: Omit<ExploracionTerritorial, 'id' | 'creado_en' | 'actualizado_en' | 'creado_por' | 'actualizado_por'>
): Promise<CrudResult<ExploracionTerritorial>> {
  try {
    const colRef = collection(db, this.COLLECTION)
    const docRef = doc(colRef)
    const id = docRef.id
    const base = camposSistemaCrear()

    if (!base.creado_por) {
      return { success: false, error: 'NO_AUTENTICADO' }
    }

    // CAMBIO: Servicio es quien DECIDE sobre territorio
    // Hook nunca toca H3. Solo coordenadas.
    const { latitude, longitude } = data.coordenadas
    const contexto = ServicioTerritorio.obtenerContextoTerritorial(latitude, longitude)

    const dataFiltered = Object.entries(data).reduce((acc: any, [key, value]) => {
      if (value !== undefined) acc[key] = value
      return acc
    }, {})

    const docData = {
      id,
      ...dataFiltered,
      h3_index: contexto.h3_index,           // ← Decidido por Servicio
      h3_observacion: contexto.h3_observacion, // ← Decidido por Servicio
      estado: 'pendiente',
      ...base,
    }

    await setDoc(docRef, docData)
    const docSnap = await getDoc(docRef)

    if (docSnap.exists()) {
      return {
        success: true,
        data: { id, ...docSnap.data() } as ExploracionTerritorial,
      }
    }

    return { success: true, data: { id, ...docData } as ExploracionTerritorial }
  } catch (error: any) {
    return { success: false, error: mapFirebaseError(error) }
  }
}
```

**ServicioUbicacion.crear():** Idéntico, usa `ServicioTerritorio.obtenerContextoTerritorial()`.

**GestorUbicaciones.crearSiNoExiste():** Idéntico.

**Nota importante:** NO crear funciones que nadie llama (ej: `obtenerPorObservacionH3()`). Es código muerto. **Regla de PawPath: solo escribir lo que existe un caso de uso real para usar.**

**Validación:** `npm run test -- services/firebase/ logic/ubicaciones/`

---

#### T1.4: Actualizar useExploracionTerritorial (10 min)

```typescript
const capturar = useCallback(
  async (payload: CapturPayload): Promise<ExploracionTerritorial | null> => {
    setLoading(true)
    setError(null)

    try {
      if (!user?.uid) {
        throw new Error('Usuario no autenticado')
      }

      const position = await obtenerPosicion()
      if (!position) {
        throw new Error('No se pudo obtener la ubicación')
      }

      const { latitude, longitude } = position.coords

      // CAMBIO: Hook NO calcula H3. Solo manda coordenadas.
      // Servicio es quien DECIDE qué hacer con ellas.
      const dataToSave = {
        id_explorador: user.uid,
        coordenadas: {
          latitude,
          longitude,
        },
        tipo_punto: payload.tipo_punto,
        mascotas_visibles: payload.mascotas_visibles,
        flujo_peatonal: payload.flujo_peatonal,
        observaciones: payload.observaciones || '',
        foto_url: payload.foto_url || '',
        estado: 'pendiente' as const,
        huellas_inmediatas: 3,
      }

      // Servicio es responsable de calcular/agregar H3
      const result = await ServicioExploracionTerritorial.crear(
        dataToSave as any
      )

      if (!result.success) {
        throw new Error(
          result.error || 'Error desconocido al capturar exploración'
        )
      }

      console.log(`[useExploracionTerritorial] Capturada en: ${result.data?.h3_index}`)
      return result.data || null
    } catch (err: any) {
      const errorMsg = err.message || 'Error al capturar exploración'
      setError(errorMsg)
      console.error('[useExploracionTerritorial] Error:', err)
      return null
    } finally {
      setLoading(false)
    }
  },
  [user, obtenerPosicion]
)
```

**Beneficio:** Hook es ahora completamente agnóstico a infraestructura territorial. Si mañana necesitas barrios o ciudades, el Hook no cambia ni una línea.

**Tests:** `npm run test -- hooks/explorador/`

---

#### T1.5a: Actualizar Firestore Rules (1 hora)

**firestore.rules:**

```firestore
// /exploraciones/{id} — crear
allow create: if autenticado()
  && es_creador()
  && tiene_campos_sistema_basicos()
  && campos_sistema_validos_crear()
  && request.resource.data.id_explorador == request.auth.uid
  && request.resource.data.h3_index is string
  && request.resource.data.h3_index.size() > 0
  && request.resource.data.h3_observacion is string        // ← AGREGAR
  && request.resource.data.h3_observacion.size() > 0      // ← AGREGAR
  && request.resource.data.tipo_punto in ['parque','calle','comercio','conjunto','otro']
  && request.resource.data.mascotas_visibles is int
  && request.resource.data.mascotas_visibles >= 0
  && request.resource.data.flujo_peatonal in ['bajo','medio','alto']
  && request.resource.data.estado == 'pendiente'
  && request.resource.data.coordenadas is map
  && 'latitude' in request.resource.data.coordenadas
  && 'longitude' in request.resource.data.coordenadas;

// /ubicaciones/{id} — update
allow update: if autenticado() && (es_admin() || resource.data.creado_por == request.auth.uid)
  && campos_sistema_validos_actualizar()
  && request.resource.data.creado_por == resource.data.creado_por
  && solo_campos_permitidos([
    'id','proveedor','proveedor_place_id','direccion_formateada','coordenadas',
    'componentes','componentes_raw','componentes_source','viewport','alias',
    'instrucciones','metadata','estado',
    'h3_index','h3_observacion',  // ← AGREGAR h3_observacion
    'creado_por','creado_en','actualizado_en','actualizado_por'
  ]);
```

**Total cambios:** +2 líneas nuevas.

**Deploy:** `firebase deploy --only firestore:rules`

---

#### T1.5b: Tests y Deploy (30 min)

```bash
npm run type-check
npm run test -- services/firebase/ logic/ubicaciones/ hooks/explorador/
firebase emulators:exec 'npm run test:firestore-rules'
firebase deploy
```

---

### SPRINT 2: Migración Histórica (OPCIONAL, futuro)

**Objetivo:** Llenar `h3_observacion` en exploraciones antiguas.

**Cuándo hacerlo:**
- ✅ Cuando tengas >1000 observaciones
- ✅ Cuando necesites análisis R9 retroactivo
- ❌ NO ahora (volumen insuficiente)

**Alternativa hoy:**
- Aceptar que observaciones antiguas no tienen R9
- Nuevas observaciones tienen ambos automáticamente
- En 3-6 meses, si es necesario, ejecutar la migración

**Si decides hacerlo después (Cloud Function):**

```typescript
// functions/src/migraciones/migraH3Observacion.ts
export const migraH3Observacion = functions.https.onCall(
  async (_, context) => {
    if (!context.auth?.token.admin) {
      throw new HttpsError('permission-denied', 'Solo admin')
    }

    const snap = await db.collection('exploraciones').get()
    const batch = db.batch()
    let count = 0

    for (const doc of snap.docs) {
      const data = doc.data()
      if (data.h3_observacion) continue  // Ya migrado
      if (!data.coordenadas?.latitude) continue

      const { latitude, longitude } = data.coordenadas
      const h3_observacion = latLngToCell(latitude, longitude, 9)

      batch.update(doc.ref, { h3_observacion })
      count++

      if (count % 500 === 0) {
        await batch.commit()
      }
    }

    await batch.commit()
    return { success: true, migratedCount: count }
  }
)
```

---

### SPRINT 3: Análisis Observacional (FUTURO, cuando haya volumen)

**NO AHORA.** Cuando tengas miles de observaciones y necesites:
- Detectar microzonas (clusters de R9)
- Reportes de puntos calientes
- Análisis de precisión territorial

**Implementar entonces:**

```typescript
// logic/territorio/analizadorObservaciones.ts (futuro)
export class AnalizadorObservaciones {
  /**
   * Agrupa observaciones por microzzona (R9) dentro de una zona territorial (R8).
   * Se ejecuta bajo demanda, sin sincronización automática.
   */
  static async obtenerMicrozonasEnZona(territorio_h3: string) {
    const explorations = await ServicioExploracionTerritorial
      .obtenerPorH3Index(territorio_h3)

    if (!explorations.success) {
      return { microzonas: [], total: 0 }
    }

    // Agrupa por h3_observacion
    const microzonas = {}
    for (const exp of explorations.data) {
      const h3 = exp.h3_observacion
      if (!microzonas[h3]) {
        microzonas[h3] = []
      }
      microzonas[h3].push(exp)
    }

    // Calcula estadísticas
    const stats = Object.entries(microzonas).map(([h3_obs, exps]: any) => ({
      h3_observacion: h3_obs,
      capturas: exps.length,
      mascotas_visibles: exps.reduce((s: number, e: any) => s + e.mascotas_visibles, 0),
      flujo_peatonal_predominante: this.calcularFlujoMayoritario(exps),
      exploradores_unicos: new Set(exps.map((e: any) => e.id_explorador)).size,
    }))

    // Ordena por densidad
    stats.sort((a, b) => b.capturas - a.capturas)

    return { microzonas: stats, total: stats.length }
  }

  private static calcularFlujoMayoritario(exps: any[]) {
    const flujos = { bajo: 0, medio: 0, alto: 0 }
    for (const exp of exps) {
      flujos[exp.flujo_peatonal]++
    }
    return Object.keys(flujos).reduce((a, b) =>
      flujos[a] > flujos[b] ? a : b
    ) as 'bajo' | 'medio' | 'alto'
  }
}
```

---

## CRONOGRAMA

| Sprint                 | Duración | Bloqueos   | Estado                           |
|------------------------|----------|------------|----------------------------------|
| 1. Infraestructura     | 4-6h     | Ninguno    | **OBLIGATORIO (Semana 1)**       |
| 2. Migración histórica | 3-4h     | Sprint 1 ✓ | **OPCIONAL (Futuro, >1000 obs)** |
| 3. Análisis R9         | ⏳       | Sprint 2 ✓ | **FUTURO (cuando haya volumen)** |
| **TOTAL MVP**          | **4-6h** | —          | **1 semana**                     |

---

## PRINCIPIO ARQUITECTÓNICO: Inteligencia Territorial Progresiva

> **PawPath nunca almacena información geográfica "por si acaso".**
>
> **PawPath nunca escribe código que nadie llama.**
>
> Cada decisión territorial debe responder una pregunta concreta del negocio:
>
> - ¿Necesitamos esta información para una decisión operacional?
> - ¿Tenemos suficientes datos para justificar el análisis?
> - ¿La complejidad que agregamos es menor que el valor que aporta?
> - ¿Alguien realmente va a usar esta función?
>
> Si la respuesta es **no** a cualquiera, **no la implementamos todavía**.

**Aplicación práctica:**
- HOY: R8 (decisiones) + R9 (almacenado, no analizado)
- MAÑANA: Cuando haya 10k+ observaciones, talvez analizar microzonas
- NUNCA: Crear `h3_zonas_r9` "por si acaso"
- NUNCA: Crear `obtenerPorObservacionH3()` "por si acaso"

Esto reduce significativamente la deuda técnica, la sobreingeniería y el código muerto.

---

## BENEFICIOS DE ESTA ARQUITECTURA

✅ **Pragmático:** Solo lo que necesitas hoy (4-6 horas).

✅ **Estable:** Mantiene `h3_index` intacto, agregar es seguro.

✅ **Responsabilidad única:** Hook manda coords. Servicio DECIDE. UI nunca sabe de infraestructura.

✅ **Agnóstico en UI:** Cambios territoriales futuros = cambios solo en Servicio.

✅ **Future-proof:** Hoy H3. Mañana expande `obtenerContextoTerritorial()` sin tocar clientes.

✅ **Bajo riesgo:** Cambios quirúrgicos, nunca destructivos.

✅ **Retrocompatible:** 100% compatible con código existente.

✅ **Escalable:** Hoy H3. Mañana: ciudad + barrio + zona + clima + seguridad. Una clase, sin tocar UI.

✅ **Mantenible:** Un código, no duplicado. Deuda técnica mínima.

✅ **Sin código muerto:** Solo funciones que existen un caso de uso real para usar.

✅ **Inteligente:** Principios arquitectónicos que prohiben sobreingeniería.

---

## ROLLBACK

Si algo falla:

1. **Sprint 1 falla:** `git revert` + `firebase deploy`
2. **Cualquier momento:** Cambios son aditivos, nunca destructivos

**Cero riesgo de corrupción.** Todo es opt-in y reversible.

---

## DECISIONES CLAVE

| Decisión                                    | Por qué                                                                                        |
|---------------------------------------------|------------------------------------------------------------------------------------------------|
| Mantener `h3_index` (R8) sin cambios        | Ya estabilizado. Cambiar por estética ≠ valor.                                                 |
| Agregar nuevo campo `h3_observacion`        | Cambios quirúrgicos, sin tocar legado.                                                         |
| **Hook NO calcula H3**                      | Única responsabilidad. Servicio decide. UI nunca toca infraestructura.                          |
| **Servicio calcula H3**                     | Única fuente de verdad. Futuro: agregar ciudad, barrio, clima sin tocar Hook.                  |
| Renombrar a `ServicioTerritorio`            | Prepara para crecer. Hoy H3, mañana el "cerebro territorial" de PawPath.                       |
| Método: `obtenerContextoTerritorial()`      | Semántico, future-proof, escalable. Mañana devuelve 20 campos, Hook no cambia.                 |
| NO crear `obtenerPorObservacionH3()` HOY   | Código muerto. Se crea cuando existe caso de uso real. **Regla: no escribir sin llamadas.**    |
| No migrar datos HOY                         | Volumen insuficiente (120 obs). Recaptura es opción. Sprint 2 es futuro.                       |
| Prohibir código muerto + sobreingeniería    | Prohibición estructural: solo lo que existe un problema real para resolver.                    |

---

## PRÓXIMOS PASOS

1. ✅ Revisar este plan con el equipo
2. 🚀 **Sprint 1 (Semana 1):**
   - Crear `ServicioTerritorio`
   - Actualizar modelos
   - Actualizar servicios
   - Actualizar Firestore Rules
   - Deploy
3. 📊 **Observar:**
   - Recolectar observaciones nuevas
   - Validar que ambos índices se guardan
   - UI manda solo coordenadas
4. 🤔 **En 3-6 meses:**
   - ¿Necesitamos Sprint 2 (migración)?
   - ¿Necesitamos Sprint 3 (análisis)?
   - ¿Qué nuevas preguntas surgen del negocio?
   - ¿Qué funciones nunca fueron llamadas?

---

## EVOLUCIÓN: REVISIONES ANTERIORES

| Aspecto                    | v1.0                         | v2.0              | v3.0                 | v3.1                     | v3.2 (Actual)                |
|----------------------------|------------------------------|-------------------|----------------------|--------------------------|------------------------------|
| **Campos nuevos**          | 1 (`h3_index_r9`)            | 1 (`h3_index_r9`) | 1 (`h3_observacion`) | 1 (`h3_observacion`)     | 1 (`h3_observacion`)         |
| **Cambios en modelos**     | 5 modelos                    | 2 modelos         | 2 modelos            | 2 modelos                | 2 modelos                    |
| **Colecciones nuevas**     | 2 (`r9_resumen`, `r9_zonas`) | 0                 | 0                    | 0 ✨                     | **0** ✨                     |
| **Servicios nuevos**       | 1 (`ServicioZonasH3R9`)      | 0                 | 0                    | 1 (centralizado)         | **1 + responsabilidad** ✨   |
| **Responsabilidad única**  | No                           | No                | No                   | Parcial (duplicación)    | **Sí: UI ≠ infraestructura** ✨ |
| **Hook calcula H3**        | No                           | No                | No                   | **Sí** (✗)               | **No** ✨                    |
| **Centralización H3**      | No                           | No                | No                   | Sí (pero con duplicación)| **Sí + agnóstico UI** ✨     |
| **Código muerto prohibido** | No                           | No                | No                   | No                       | **Sí** ✨                    |
| **Sprints MVP**            | 6 fases                      | 3 sprints         | 2 sprints            | 1 sprint + futuro        | **1 sprint + futuro** ✨     |
| **Duración MVP**           | 22h                          | 18h               | 7-9h                 | 4-6h                     | **4-6h** ✨                  |
| **Complejidad**            | Media                        | Baja              | Mínima               | Mínima                   | **Mínima** ✨                |
| **Riesgo**                 | Bajo                         | Bajo              | Muy bajo             | Muy bajo                 | **Muy bajo** ✨              |
| **Deuda técnica**          | Paralelas                    | Ninguna           | Ninguna              | Ninguna                  | **Ninguna** ✨               |

**Cambios en v3.2 respecto a v3.1:**
- ✨ Hook NO calcula H3 (eliminó duplicación)
- ✨ Única responsabilidad: Hook = coordenadas, Servicio = decisiones territoriales
- ✨ Renombrado `ServicioGeografia` → `ServicioTerritorio` (prepara crecimiento)
- ✨ Renombrado `obtenerIndicesH3()` → `obtenerContextoTerritorial()` (semántica, escalable)
- ✨ Eliminada función `obtenerPorObservacionH3()` (código muerto hasta caso de uso)
- ✨ Prohibición estructural de código muerto + sobreingeniería

---

## CONCLUSIÓN

### Filosofía de Implementación

Esta es la versión que encarna **arquitectura pragmática + responsabilidad única + sin código muerto**:

1. **Responsabilidad clara:** UI manda coordenadas. Servicio DECIDE territorio. Nunca al revés.
2. **Centralizar decisiones:** Un único lugar (`ServicioTerritorio`) controla todo territorial.
3. **Agnóstico en cliente:** Hook no toca H3, ciudades, barrios, nada. Ignora infraestructura.
4. **Escalable semánticamente:** `obtenerContextoTerritorial()` mañana devuelve 20 campos, Hook no cambia.
5. **Sin código muerto:** Solo crear funciones cuando exista un caso de uso real.
6. **Reducir deuda:** Cero colecciones paralelas. Cero servicios duplicados. Cero "por si acaso". Cero código muerto.

### Flujo de Datos

```
Hook captura coordenadas
  ↓
Hook llama ServicioExploracionTerritorial.crear({coordenadas, ...})
  ↓
Servicio llama ServicioTerritorio.obtenerContextoTerritorial(lat, lng)
  ↓
Servicio recibe {h3_index, h3_observacion, (futuro: ciudad, barrio...)}
  ↓
Servicio guarda todo en Firestore
  ↓
Dato completo, infraestructura centralizada, UI ignorante de detalles
```

### Resultado

- **Hoy:** 4-6 horas. Sistema listo. UI completamente agnóstica a infraestructura territorial.
- **Mañana:** `ServicioTerritorio` crece (ciudad, barrio, clima, etc.). UI y Hook nunca se enteran.
- **Diferencia:** De "arquitectura por adelantado" a "arquitectura que evoluciona bajo demanda, sin código muerto".

**Eso es lo que permite que PawPath escale sin deuda técnica y sin acumular basura.** 

Porque el código nunca escrito es el mejor código: no hay bugs, no hay mantenimiento, no hay deuda.

---

**Versión 3.2 — Responsabilidad Única + ServicioTerritorio + Sin Código Muerto**  
**Estado: LISTO PARA IMPLEMENTACIÓN**  
**Próximo paso: Sprint 1 (Semana 1)**  
**Contacto:** Revisar con el equipo antes de iniciar Sprint 1
