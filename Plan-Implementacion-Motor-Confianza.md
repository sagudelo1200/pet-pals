# Plan de Implementación del Motor de Confianza Territorial

**Versión**: 1.0  
**Fecha**: Julio 2026  
**Estado**: Documento Fundacional - Guía Arquitectónica Viva

---

## Tabla de Contenidos

1. [Estado Actual del Sistema](#estado-actual-del-sistema)
2. [Principios del Motor de Confianza](#principios-del-motor-de-confianza)
3. [Roadmap por Fases](#roadmap-por-fases)
4. [Fase 1: Consolidar Elegibilidad](#fase-1-consolidar-elegibilidad)
5. [Fase 2: Afinidad Básica](#fase-2-afinidad-básica)
6. [Fase 3: Experiencia Territorial](#fase-3-experiencia-territorial)
7. [Fase 4: Confianza Compuesta](#fase-4-confianza-compuesta)
8. [Fase 5: Explicabilidad](#fase-5-explicabilidad)
9. [Fase 6: Motor Completo](#fase-6-motor-completo)
10. [Inteligencia Territorial como Fundamento](#inteligencia-territorial-como-fundamento)
11. [Principios Arquitectónicos Permanentes](#principios-arquitectónicos-permanentes)

---

## Estado Actual del Sistema

### ✅ Infraestructura Existente (NO Cambiar)

#### **1. Core de Matching: LogicMatching**

**Ubicación**: `logic/paseos/matching.ts`

**Responsabilidades**:
- ✅ Validar disponibilidad horaria exacta
- ✅ Aplicar excepciones semanales
- ✅ Enforcing límites globales (05:30-22:30)
- ✅ Buffer y margen de cortesía

**Contrato inmutable**:
```typescript
esCuidadorDisponible(
  perfil: PerfilPublico,
  params: ParametrosMatching,
  excepcion?: ExcepcionDisponibilidad
): boolean
```

**Garantía**: NUNCA debe cambiar esta signatura. Extensiones se agregan EN PARALELO, no aquí.

---

#### **2. Búsqueda Geoespacial O(1): ServicioTerritorio + Índice H3**

**Ubicación**: 
- `services/territorio/ServicioTerritorio.ts` → Cálculo central H3
- `services/firebase/firestore/colecciones/indice_cobertura.ts` → Índice invertido

**Responsabilidades**:
- ✅ Consulta `/indice_cobertura/{celda}/cuidadores` en O(1)
- ✅ Centraliza TODOS los cálculos H3 (único punto de cálculo)
- ✅ Devuelve ContextoTerritorial inmutable

**Garantía**: Nunca se calcula H3 afuera de ServicioTerritorio. El índice es immutable en estructura.

---

#### **3. Flujo Cliente: useSeleccionarCuidador**

**Ubicación**: `hooks/paseos/useSeleccionarCuidador.ts`

**Responsabilidades**:
- ✅ Consulta índice geoespacial
- ✅ Aplica LogicMatching
- ✅ Mapea a lista visual (nombre, foto, rating, distancia)
- ✅ Expone debugMatching para overlay

**Garantía**: Este hook es el orquestador actual. Las nuevas señales de confianza se agregan aquí, no en un nuevo hook.

---

#### **4. Modelo de Datos: PerfilPublico**

**Ubicación**: `models/PerfilPublico.ts`

**Campos actuales**:
- `horario_semanal`: Disponibilidad por día
- `h3_r8`: Celda origen (indexación primaria)
- `celdas_cobertura?`: Cobertura manual (override)
- `rating_promedio`: Calificación (sin cálculo automático)
- `cantidad_paseos_realizados`: Contador histórico
- `verificacion`: Estado seguridad

**Garantía**: Extensible. Nuevos campos de confianza se agregan aquí.

---

#### **5. Máquina de Estados: Paseo**

**Ubicación**: `logic/paseos/maquinaEstados.ts` + `models/Paseo.ts`

**Estados garantizados**:
```
PENDIENTE → CONFIRMADO → EN_CAMINO → EN_PROGRESO → FINALIZADO → COMPLETADO
```

**Garantía**: La máquina NO cambia. Nuevas señales de confianza se extraen del historial de transiciones, no de nuevos estados.

---

### ⚠️ Lo que EXISTE pero está Incompleto

1. **Ranking de cuidadores**: Hoy es solo `rating_promedio`. Mañana será multi-factor.
2. **Explicabilidad**: No existe. Hoy se muestra lista; mañana se explica cada decisión.
3. **Historial territorial**: No está sistematizado. Datos dispersos en paseos.
4. **Inteligencia colectiva**: No se agrega valor a H3 con cada paseo.

---

### ❌ Lo que NO Existe (No Intentar Construir en Fase 1-2)

1. Machine Learning / Modelos predictivos
2. Redis / Caching distribuido
3. Microservicios
4. Event Sourcing / CQRS
5. Kafka / Pub-Sub messaging
6. Complejos sistemas de puntajes (con 20+ variables)
7. Recomendadores tipo Netflix

---

## Principios del Motor de Confianza

### Principio 1: Elegibilidad antes que Confianza

**Definición**: Un cuidador debe pasar elegibilidad ANTES de considerar confianza.

**Implementación**:
```
if (!LogicMatching.esCuidadorDisponible(...)) {
  // NUNCA considerar este cuidador, sin importar su confianza
  return null
}
// Solo AQUÍ considerar confianza territorial
```

**Por qué**: Recomendarle un cuidador de confianza que no está disponible es peor que no recomendación.

---

### Principio 2: Simplicidad Explicable

**Definición**: Toda decisión debe poder explicarse en una frase.

**Ejemplo MALO**:
> "Puntuación: 7.3 (ponderación: 0.3*rating + 0.25*distancia + 0.2*historial + 0.15*especializacion + 0.1*disponibilidad_futura)"

**Ejemplo BUENO**:
> "Carlos vive en La Candelaria, ha realizado 387 paseos aquí y nunca ha cancelado."

---

### Principio 3: Reutilizar Antes de Crear

**Tabla de Reutilización**:

| Necesidad | ¿Existe? | ¿Reutilizar? | ¿Crear? |
|-----------|----------|-------------|---------|
| Horario disponible | ✅ LogicMatching | ✅ Sí | ❌ No |
| H3 territorial | ✅ ServicioTerritorio | ✅ Sí | ❌ No |
| Búsqueda O(1) | ✅ indice_cobertura | ✅ Sí | ❌ No |
| Ranking simple | ❌ No | - | ✅ Sí (pero mínimo) |
| Historial zona | ❌ Parcial | ⚠️ Quizás | ⚠️ Quizás |
| Confianza compuesta | ❌ No | - | ✅ Sí |
| Explicabilidad | ❌ No | - | ✅ Sí |

---

### Principio 4: Inteligencia Territorial, no Artificial

**Diferencia clave**:

| IA | Inteligencia Territorial |
|---|---|
| Entrenar modelo con datos históricos | Aprender de cada paseo real |
| Black box: "El modelo dice que 78%" | Transparencia: "387 paseos, 0 incidentes" |
| Requiere ML engineers | Requiere arquitecto de datos |
| Desconectado de negocio | Directamente de negocio |
| Costoso computacionalmente | Cheap: queries a Firestore |
| Mejora lentamente | Mejora con cada paseo |

**Principio**: Construir inteligencia desde datos reales de Paw-Path, no desde modelos abstractos.

---

### Principio 5: Datos como Moneda de Confianza

**Máxima**: La mejor recomendación es aquella respaldada por datos propios, no externos.

**Ejemplo**:
- ❌ "Confiamos en este cuidador porque Stripe lo verifica"
- ✅ "Carlos ha realizado 387 paseos en esta zona, los últimos 12 consecutivos sin incidentes"

---

## Roadmap por Fases

### Vision General

```
Hoy (2026)
    ↓
Fase 1: Consolidar Elegibilidad
    ↓ (Baseline estable para evolucion)
Fase 2: Afinidad Básica
    ↓ (Primeras señales de compatibilidad)
Fase 3: Experiencia Territorial
    ↓ (Inteligencia de zona)
Fase 4: Confianza Compuesta
    ↓ (Multi-factor, explicable)
Fase 5: Explicabilidad
    ↓ (Por qué este cuidador)
Fase 6: Motor Completo + Inteligencia Comunitaria
    ↓
2030+: Territorio Vivo
```

---

## Fase 1: Consolidar Elegibilidad

**Duración estimada**: 1-2 sprints  
**Complejidad**: **BAJA**  
**Riesgo**: **BAJO**

### Objetivo

Asegurar que LogicMatching + índice H3 sean la base inmutable y bien probada del sistema.

### Justificación

Hoy el matching funciona, pero:
- No hay tests exhaustivos
- Debug data está in-house, no es accesible
- La elegibilidad es la capa más crítica

Consolidar significa: formalizar, probar exhaustivamente, documentar.

### Servicios Reutilizados

- ✅ `LogicMatching.esCuidadorDisponible()`
- ✅ `ServicioTerritorio.obtenerContextoTerritorial()`
- ✅ `indice_cobertura.obtenerCuidadoresPorCelda()`

### Modelos Reutilizados

- ✅ `PerfilPublico`
- ✅ `Paseo`
- ✅ `ParametrosMatching`
- ✅ `ExcepcionDisponibilidad`

### Colecciones Reutilizadas

- ✅ `/perfiles_publicos/{uid}`
- ✅ `/indice_cobertura/{celda}/cuidadores/{uid}`
- ✅ `/paseos/{id}`

### Hooks Reutilizados

- ✅ `useSeleccionarCuidador` (sin cambios en signatura)

### Componentes Reutilizados

- ✅ `MatchingDebugOverlay` (expandir con nuevos datos)

### Nuevos Campos Necesarios

**PerfilPublico**:
```typescript
// Agregar campo de debugging para entender por qué se filtra
debug_ultima_elegibilidad_check?: {
  fecha: Date
  resultado: 'disponible' | 'ocupado' | 'fuera_horario' | 'otra_razon'
  razon?: string
}
```

**Paseo**:
```typescript
// Registrar decisión de matching para análisis
matching_decision?: {
  elegibilidad_evaluados: number
  elegibilidad_aprobados: number
  razon_filtrados?: string
}
```

### Nuevos Documentos

❌ Ninguno. Reutilizar completamente.

### Acciones Concretas

1. **Tests exhaustivos de LogicMatching**
   - Casos límite de horarios (00:00, 23:59, buffer)
   - Excepciones que anulan horario base
   - Fechas históricas vs futuras
   - Máx anticipación

2. **Instrumentación de useSeleccionarCuidador**
   - Agregar métricas de decisión
   - Registrar cuántos se evaluaron vs aprobaron
   - Guardar razón de rechazo principal

3. **Tests de concurrencia en aceptación**
   - Simular dos clientes aceptando simultáneamente
   - Verificar que solo uno gana

4. **Documentación de garantías**
   - Formalizar en comentarios qué NUNCA cambiará
   - Especificar extensión points

### Riesgos

- **Bajo**: Cambios mínimos. Mostly tests + docs.

### Beneficio Esperado

- ✅ Baseline segura para fases posteriores
- ✅ Confianza en transaccionalidad
- ✅ Claros extension points para confianza

### Complejidad Estimada

**BAJA** (Mostly testing + documentation)

---

## Fase 2: Afinidad Básica

**Duración estimada**: 2-3 sprints  
**Complejidad**: **MEDIA**  
**Riesgo**: **BAJO**

### Objetivo

Agregar primera capa de confianza: compatibilidad perro-cuidador.

### Justificación

Hoy el sistema es ciego a compatibilidad. Una persona con experiencia en perros grandes NO se diferencia de alguien sin experiencia.

Afinidad responde: "¿Es este cuidador compatible con ESTE perro?"

### Alcance Fase 2

**Solo lo siguiente**:
- Tipo de perro (pequeño, mediano, grande, muy grande)
- Nivel energía perro (bajo, medio, alto)
- Edad perro (cachorro, adulto, senior)
- Experiencia cuidador (sin especificar tipos de perro)

**NO incluir**:
- Compatibilidad de temperamento compleja
- Historial de mordeduras (asuntos legales)
- Alergias específicas

### Servicios Reutilizados

- ✅ `LogicMatching` (sin cambios)
- ✅ `ServicioTerritorio` (sin cambios)
- ✅ `indice_cobertura` (sin cambios)

### Modelos Reutilizados

- ✅ `PerfilPublico` (extender)
- ✅ `Mascota` (extender)
- ✅ `Paseo` (sin cambios para esta fase)

### Colecciones Reutilizadas

- ✅ `/perfiles_publicos/{uid}` (agregar campos)
- ✅ `/mascotas/{uid}/mascotas/{petId}` (ya tienen tipo/edad)
- ✅ `/paseos/{id}` (sin cambios para esta fase)

### Hooks Reutilizados

- ✅ `useSeleccionarCuidador` (agregar lógica afinidad, sin cambiar signatura)
- ✅ Nuevos: `useAfinidat()` (helper, no para UI directa)

### Componentes Reutilizados

- ✅ `MatchingDebugOverlay` (agregar datos de afinidad)

### Nuevos Campos Necesarios

**PerfilPublico**:
```typescript
interface PerfilPublico {
  // ... campos existentes ...
  
  // Afinidad: especializaciones del cuidador
  especializaciones?: {
    perros_pequenos?: boolean      // < 10 kg
    perros_medianos?: boolean      // 10-25 kg
    perros_grandes?: boolean       // 25-45 kg
    perros_muy_grandes?: boolean   // > 45 kg
    alta_energia?: boolean         // Perros con alto nivel de actividad
    baja_energia?: boolean         // Perros tranquilos/seniors
    cachorros?: boolean            // Experiencia con jóvenes
    seniors?: boolean              // Experiencia con perros mayores
  }
  
  // Histórico de perros cuidados (para análisis)
  historico_tipos_perro?: Array<{
    tipo: string // 'pequeño' | 'mediano' | 'grande' | etc
    cantidad: number
    fecha_ultimo: Date
  }>
}
```

**Mascota** (en modelos):
```typescript
interface Mascota {
  // ... campos existentes (nombre, raza, foto, etc) ...
  
  // Atributos para afinidad
  categoria_tamaño?: 'pequeno' | 'mediano' | 'grande' | 'muy_grande'
  nivel_energia?: 'bajo' | 'medio' | 'alto'
  edad_categoria?: 'cachorro' | 'adulto' | 'senior'
}
```

### Nuevos Documentos

❌ Ninguno. Usar campos en PerfilPublico y Mascota.

### Acciones Concretas

1. **Actualizar PerfilPublico**
   - Agregar especializaciones (boolean flags)
   - Migración: todos los cuidadores verificados tienen todas marcadas true (fase de transición)

2. **Actualizar Mascota model**
   - Si el tutor aún no especificó categoria_tamaño: inferir de raza
   - Agregar a formulario de creación de mascota

3. **Crear lógica de afinidad en useSeleccionarCuidador**
   ```typescript
   function calcularAfinidad(perfil: PerfilPublico, mascota: Mascota): number {
     let puntos = 0
     
     if (mascota.categoria_tamaño) {
       const especKeySize = `perros_${mascota.categoria_tamaño}` as keyof typeof perfil.especializaciones
       if (perfil.especializaciones?.[especKeySize]) puntos += 1
     }
     
     if (mascota.nivel_energia && perfil.especializaciones?.[`${mascota.nivel_energia}_energia`]) {
       puntos += 0.5
     }
     
     if (mascota.edad_categoria) {
       if (mascota.edad_categoria === 'cachorro' && perfil.especializaciones?.cachorros) puntos += 0.5
       if (mascota.edad_categoria === 'senior' && perfil.especializaciones?.seniors) puntos += 0.5
     }
     
     return puntos // 0-3
   }
   ```

4. **Ordenamiento: Elegibilidad → Afinidad**
   ```typescript
   // En useSeleccionarCuidador
   let filtrados = LogicMatching.filtrarDisponibles(...)
   
   // Agregar score de afinidad
   const conAfinidad = filtrados.map(perfil => ({
     ...perfil,
     afinidadScore: mascota ? calcularAfinidad(perfil, mascota) : 0
   }))
   
   // Ordenar: primero por afinidad (descendente), luego por rating
   conAfinidad.sort((a, b) => 
     (b.afinidadScore - a.afinidadScore) || 
     (Number(b.rating_promedio) - Number(a.rating_promedio))
   )
   ```

5. **Actualizar MatchingDebugOverlay**
   - Mostrar score de afinidad por candidato
   - Mostrar qué especializaciones coinciden

### Riesgos

- **Medio**: Cambio en ordenamiento puede afectar UX
  - *Mitigación*: A/B test en 10% usuarios, rollback fácil

- **Medio**: Especializaciones iniciales pueden ser imprecisas
  - *Mitigación*: Booleanos simples (fácil corregir), no pesos complejos

### Beneficio Esperado

- ✅ Primeros candidatos con mejor compatibilidad
- ✅ Usuarios perciben recomendaciones más relevantes
- ✅ Base para futuras capas de confianza

### Complejidad Estimada

**MEDIA** (Model changes + sorting logic + frontend display)

---

## Fase 3: Experiencia Territorial

**Duración estimada**: 2-4 sprints  
**Complejidad**: **MEDIA-ALTA**  
**Riesgo**: **MEDIO**

### Objetivo

Agregar segunda capa de confianza: "¿Cuánta experiencia tiene este cuidador en ESTA zona?"

### Justificación

H3 hoy solo sirve para "¿Está cerca?" Mañana debe servir para "¿Conoce este lugar?"

Los datos ya existen en historial de paseos. Solo necesitan sistematizarse.

### Alcance Fase 3

**Agregar inteligencia a H3 R8**:
- Paseos completados en esta zona
- Tiempo de presencia (primer paseo - último paseo)
- Parques / lugares específicos mapeados (R9)
- Tasa de incidentes en zona (cancelaciones, rechazos, denuncias)

**NO incluir**:
- Riesgos de seguridad (ciudades peligrosas)
- Análisis socioeconómico
- Datos de terceros

### Servicios Reutilizados

- ✅ `LogicMatching` (sin cambios)
- ✅ `ServicioTerritorio` (extender ContextoTerritorial si aplica)
- ✅ `indice_cobertura` (sin cambios en estructura)

### Modelos Reutilizados

- ✅ `PerfilPublico` (extender)
- ✅ `Paseo` (sin cambios)
- ✅ Nuevo: `EstadisticasTerritorio` (derivado, no core)

### Colecciones Reutilizadas

- ✅ `/perfiles_publicos/{uid}` (agregar referencia a zonas)
- ✅ `/paseos/{id}` (datos ya existen, solo procesarlos)
- ✅ `/h3_zonas/{celda}` (actualizar con estadísticas cuidador-específicas)

### Hooks Reutilizados

- ✅ `useSeleccionarCuidador` (agregar lógica de experiencia territorial)
- ✅ Nuevo: `useExperienciaTerritorial()` (helper)

### Componentes Reutilizados

- ✅ `MatchingDebugOverlay` (agregar datos territoriales)

### Nuevos Campos Necesarios

**PerfilPublico**:
```typescript
interface PerfilPublico {
  // ... campos existentes ...
  
  // Experiencia territorial
  zonas_presencia?: Array<{
    h3_r8: string                          // Celda H3
    paseos_completados: number             // En esta zona
    primer_paseo?: Date                    // Cuándo empezó a trabajar aquí
    ultimo_paseo?: Date                    // Última presencia
    incidentes: number                     // Cancelaciones, rechazos, etc
    lugares_visitados_count?: number       // R9 microzones exploradas
  }>
  
  // Resumen de experiencia total
  zonas_totales?: number                   // Cuántas H3 R8 ha trabajado
  paseos_totales_all_time?: number         // Contador global
}
```

**Estadísticas por zona** (nueva subcolección, NO document):
```
/h3_zonas/{celda}/estadisticas_cuidador/{uid}
{
  h3_r8: string
  uid_cuidador: string
  paseos_completados: number
  primer_paseo: Date
  ultimo_paseo: Date
  incidentes: number
  lugares_r9: Array<string>  // Lista de celdas R9 visitadas
  tasa_exito: number // 0-1
  dias_consecutivos_reciente: number // Cuántos días seguidos en últimos 30
}
```

### Nuevos Documentos

⚠️ **Cuidado**: Crear subcolección `/h3_zonas/{celda}/estadisticas_cuidador/{uid}` SOLO si la query es frecuente.

**Alternativa más simple (recomendada para Fase 3)**:
- Agregar campos a PerfilPublico.zonas_presencia (es un array)
- Calcular bajo demanda en Cloud Function (async, no blocking)
- Cachear en sesión del usuario (30 min)

### Acciones Concretas

1. **Crear modelo EstadisticasTerritorio**
   ```typescript
   export interface EstadisticasTerritorio {
     h3_r8: string
     paseos_completados: number
     primer_paseo: Date | null
     ultimo_paseo: Date | null
     tasa_exito: number // 0-1
     dias_presencia: number // (ultimo - primer) / 86400000
   }
   ```

2. **Cloud Function: actualizarEstadisticasTerritorio()**
   - Trigger: Cuando un paseo pasa a COMPLETADO
   - Acción:
     ```
     1. Extraer h3_r8 del paseo (desde ContextoTerritorial)
     2. Buscar PerfilPublico.zonas_presencia[h3_r8]
     3. Si existe: incrementar contador, actualizar ultimo_paseo
     4. Si no existe: crear entrada nueva
     5. Recalcular tasa_exito = completados / (completados + incidentes)
     ```

3. **Función: calcularExperienciaTerritorial()**
   ```typescript
   function calcularExperienciaTerritorial(
     perfil: PerfilPublico,
     h3TutorZona: string
   ): EstadisticasTerritorio | null {
     const zona = perfil.zonas_presencia?.find(z => z.h3_r8 === h3TutorZona)
     if (!zona) return null
     
     const diasPresencia = zona.ultimo_paseo && zona.primer_paseo
       ? (zona.ultimo_paseo.getTime() - zona.primer_paseo.getTime()) / 86400000
       : 0
     
     return {
       h3_r8: h3TutorZona,
       paseos_completados: zona.paseos_completados,
       primer_paseo: zona.primer_paseo || null,
       ultimo_paseo: zona.ultimo_paseo || null,
       tasa_exito: zona.incidentes > 0
         ? zona.paseos_completados / (zona.paseos_completados + zona.incidentes)
         : 1.0,
       dias_presencia: diasPresencia
     }
   }
   ```

4. **Actualizar useSeleccionarCuidador**
   ```typescript
   const conExperiencia = conAfinidad.map(perfil => ({
     ...perfil,
     experienciaTerritorial: calcularExperienciaTerritorial(perfil, h3TutorZona)
   }))
   
   // Score de experiencia: paseos en zona + antigüedad
   const scoreExperiencia = (exp: EstadisticasTerritorio | null) => {
     if (!exp) return 0
     // 0-2 puntos por experiencia en zona
     return Math.min(2, (exp.paseos_completados / 100) + (exp.dias_presencia / 365))
   }
   
   conExperiencia.sort((a, b) =>
     (scoreExperiencia(b.experienciaTerritorial) - scoreExperiencia(a.experienciaTerritorial)) ||
     (b.afinidadScore - a.afinidadScore) ||
     (Number(b.rating_promedio) - Number(a.rating_promedio))
   )
   ```

5. **Actualizar MatchingDebugOverlay**
   - Mostrar "387 paseos en La Candelaria"
   - Mostrar "Lleva 2 años en esta zona"
   - Mostrar "Tasa de éxito: 98%"

### Riesgos

- **Medio**: Cloud Function debe ser idempotente
  - *Mitigación*: Escribir de forma que múltiples triggers = resultado mismo

- **Medio**: Datos históricos pueden tener ruido
  - *Mitigación*: Ignorar primeros 30 días de datos (cuidador aprendiendo)

- **Bajo**: Query performance
  - *Mitigación*: Array en PerfilPublico, no subcollection

### Beneficio Esperado

- ✅ Experiencia territorial visible en UI
- ✅ Candidatos con historial en zona tienen prioridad clara
- ✅ Inteligencia colectiva comienza a emerger
- ✅ H3 comienza a tener memoria

### Complejidad Estimada

**MEDIA-ALTA** (Cloud Function + model changes + sorting + analytics)

---

## Fase 4: Confianza Compuesta

**Duración estimada**: 2-3 sprints  
**Complejidad**: **MEDIA**  
**Riesgo**: **BAJO**

### Objetivo

Combinar elegibilidad + afinidad + experiencia territorial en un score de confianza unificado.

### Justificación

Hasta Fase 3, tenemos 3 señales independientes. Fase 4 las integra en una decisión coherente.

**NO es Machine Learning**: Es lógica explícita, explicable.

### Alcance Fase 4

Crear `ScoreConfianza`:
```
Score = 0-10

Componentes:
  - Elegibilidad (gatekeep: 0 = rechazo automático)
  - Afinidad (0-3 puntos)
  - Experiencia Territorial (0-4 puntos)
  - Historial de Confiabilidad (0-2 puntos)
  - Recencia (0-1 puntos)
  
Ordenamiento por Score DESC, luego Rating DESC
```

### Servicios Reutilizados

- ✅ Todos los anteriores (sin cambios)

### Modelos Reutilizados

- ✅ Todos los anteriores
- ✅ Nuevo: `ScoreConfianza` (simple interface)

### Colecciones Reutilizadas

- ✅ Todas las anteriores

### Hooks Reutilizados

- ✅ `useSeleccionarCuidador` (mejorar lógica de scoring)
- ✅ Nuevo: `useScoreConfianza()` (helper)

### Componentes Reutilizados

- ✅ `MatchingDebugOverlay` (mostrar breakdown de score)

### Nuevos Campos Necesarios

**ScoreConfianza** (no persistence, computed):
```typescript
interface ScoreConfianza {
  total: number // 0-10
  desglose: {
    afinidad: number // 0-3
    experiencia_territorial: number // 0-4
    confiabilidad: number // 0-2
    recencia: number // 0-1
  }
  explicacion: string // Frase para mostrar al usuario
}
```

### Acciones Concretas

1. **Crear función calcularScoreConfianza()**
   ```typescript
   function calcularScoreConfianza(
     perfil: PerfilPublico,
     mascota: Mascota,
     h3TutorZona: string
   ): ScoreConfianza {
     // 1. Validar elegibilidad (gatekeep)
     // → Ya hecho en LogicMatching, aquí asumir que pasó
     
     // 2. Score afinidad (0-3)
     const scoreAfinidad = calcularAfinidad(perfil, mascota)
     
     // 3. Score experiencia territorial (0-4)
     const expTerr = calcularExperienciaTerritorial(perfil, h3TutorZona)
     const scoreExp = expTerr
       ? Math.min(4, (expTerr.paseos_completados / 100) * 2 + (expTerr.dias_presencia / 365) * 2)
       : 0
     
     // 4. Score confiabilidad (0-2)
     // Basado en: rating, cancelaciones, rechazos
     const scoreConfiabilidad = Math.min(2, (Number(perfil.rating_promedio) || 0) / 5)
     
     // 5. Score recencia (0-1)
     // ¿Trabajó recientemente? (Última semana = 1, Última semana = 0.5, Más atrás = 0)
     const diasDesdeUltimoPaseo = expTerr?.ultimo_paseo
       ? Math.floor((Date.now() - expTerr.ultimo_paseo.getTime()) / 86400000)
       : 999
     const scoreRecencia = diasDesdeUltimoPaseo <= 7 ? 1 : diasDesdeUltimoPaseo <= 30 ? 0.5 : 0
     
     const total = scoreAfinidad + scoreExp + scoreConfiabilidad + scoreRecencia
     
     return {
       total: Math.min(10, total),
       desglose: {
         afinidad: scoreAfinidad,
         experiencia_territorial: scoreExp,
         confiabilidad: scoreConfiabilidad,
         recencia: scoreRecencia
       },
       explicacion: generarExplicacion({
         scoreAfinidad,
         scoreExp,
         scoreConfiabilidad,
         scoreRecencia,
         perfil,
         expTerr
       })
     }
   }
   ```

2. **Función generarExplicacion() → Explicabilidad**
   ```typescript
   function generarExplicacion(ctx: {
     scoreAfinidad: number
     scoreExp: number
     scoreConfiabilidad: number
     scoreRecencia: number
     perfil: PerfilPublico
     expTerr: EstadisticasTerritorio | null
   }): string {
     const puntos: string[] = []
     
     if (ctx.scoreAfinidad >= 2) {
       puntos.push('✓ Compatible con' + categoriaPerro(ctx.afinidad))
     }
     
     if (ctx.expTerr && ctx.expTerr.paseos_completados >= 10) {
       puntos.push(`✓ ${ctx.expTerr.paseos_completados} paseos en esta zona`)
     }
     
     if (ctx.scoreConfiabilidad >= 1.5) {
       puntos.push(`✓ ${ctx.perfil.rating_promedio} ⭐ de calificación`)
     }
     
     if (ctx.scoreRecencia >= 0.5) {
       puntos.push('✓ Activo recientemente')
     }
     
     // Resultado: "✓ Compatible ✓ 387 paseos ✓ 4.9⭐"
     return puntos.join(' ')
   }
   ```

3. **Actualizar ordenamiento en useSeleccionarCuidador**
   ```typescript
   const conScore = conExperiencia.map(perfil => ({
     ...perfil,
     scoreConfianza: calcularScoreConfianza(perfil, mascota, h3TutorZona)
   }))
   
   conScore.sort((a, b) => b.scoreConfianza.total - a.scoreConfianza.total)
   ```

4. **Mostrar score en UI**
   - Badge con número (0-10) o estrella + número
   - Al expandir, mostrar desglose
   - Siempre mostrar explicacion breve

### Riesgos

- **Bajo**: Pesos pueden no ser óptimos
  - *Mitigación*: Fácil de ajustar (todos en el mismo lugar)

### Beneficio Esperado

- ✅ Recomendaciones coherentes y multi-factor
- ✅ Usuario entiende por qué se recomienda cada candidato
- ✅ Score de confianza está disponible para futuros ML (si se decide)

### Complejidad Estimada

**MEDIA** (Mostly formula + display)

---

## Fase 5: Explicabilidad

**Duración estimada**: 1-2 sprints  
**Complejidad**: **BAJA-MEDIA**  
**Riesgo**: **BAJO**

### Objetivo

Permitir que el usuario entienda POR QUÉ se recomienda cada cuidador.

### Justificación

Recomendación sin explicación = confianza sin base.

Ejemplo:
- ❌ "Carlos aparece primero" (opaco)
- ✅ "Carlos ✓ Compatible ✓ 387 paseos aquí ✓ 4.9⭐ ✓ Activo hoy" (transparente)

### Alcance Fase 5

**Agregar UI que muestre**:
- Qué hace a este cuidador especial para ESTE paseo
- Por qué está antes que otro
- Qué datos respaldan la recomendación

**Incluir**:
- Insignias visuales (compatible, experto local, activo, verificado)
- Desglose de score (si usuario expande)
- Diferencias con siguiente candidato

**NO incluir**:
- Predicciones futuras
- Juicios morales
- Información innecesaria

### Servicios Reutilizados

- ✅ Todos anteriores

### Modelos Reutilizados

- ✅ Todos anteriores
- ✅ Nuevo: `Explicacion` (simple interface)

### Colecciones Reutilizados

- ✅ Todas anteriores

### Hooks Reutilizados

- ✅ `useSeleccionarCuidador` (sin cambios)

### Componentes Reutilizados

- ✅ `SeleccionarCuidadorPaso` (mejorar visualización)
- ✅ `CuidadorListItem` (agregar badges + explicación)

### Nuevos Campos Necesarios

**Explicacion** (computed):
```typescript
interface Explicacion {
  titulo: string // Nombre + "Recomendado" o "Sugerido"
  insignias: Array<{
    icon: string
    label: string
    hint?: string // Tooltip
  }>
  puntos_clave: string[] // ["387 paseos aquí", "4.9⭐", "Compatible"]
  por_que_primero?: string // "Mejor experiencia en tu zona"
  descuento_vs_siguiente?: string // "20% más experiencia que el siguiente"
}
```

### Acciones Concretas

1. **Crear función generarExplicacion() completa**
   - (Parcialmente hecha en Fase 4, extender aquí)
   - Incluir insignias visuales
   - Incluir comparación con siguiente candidato

2. **Actualizar componente CuidadorListItem**
   ```typescript
   interface CuidadorListItemProps {
     cuidador: CuidadorConScore
     explicacion: Explicacion
     esRecomendado: boolean // Primer lugar
   }
   
   // Mostrar:
   // [Foto] Carlos
   //        ✓ Compatible ✓ Experto Local ✓ Verificado ✓ Activo
   //        387 paseos aquí · 4.9⭐ · Activo hoy
   //        [Expandir] para desglose de score
   ```

3. **Agregar modal de desglose**
   ```
   Score de Confianza: 9.2/10
   
   ├ Afinidad: 3/3 ✓
   │ └ Compatible con perros grandes
   │
   ├ Experiencia Territorial: 4/4 ✓
   │ └ 387 paseos en La Candelaria
   │ └ Lleva 2 años en esta zona
   │ └ Tasa de éxito: 98%
   │
   ├ Confiabilidad: 2/2 ✓
   │ └ 4.9⭐ calificación promedio
   │
   └ Recencia: 0.2/1
     └ Última actividad: 15 días atrás
   ```

4. **A/B test: Con vs sin explicación**
   - Medir: Selección primera opción vs exploración de otras
   - Hipótesis: Usuarios con explicación confían más, elige primera opción

### Riesgos

- **Bajo**: Explicaciones pueden ser confusas
  - *Mitigación*: A/B test + user research

### Beneficio Esperado

- ✅ Transparencia total
- ✅ Usuario entiende decisión
- ✅ Confianza en recomendaciones aumenta
- ✅ Menos fricción en selección

### Complejidad Estimada

**BAJA-MEDIA** (Mostly UI + string generation)

---

## Fase 6: Motor Completo + Inteligencia Comunitaria

**Duración estimada**: 2-4 sprints  
**Complejidad**: **MEDIA-ALTA**  
**Riesgo**: **MEDIO**

### Objetivo

Completar motor de confianza + agregar dimensión comunitaria (qué dice la comunidad sobre este cuidador en esta zona).

### Justificación

Fases 1-5 son sobre datos individuales (este cuidador, este paseo). Fase 6 agrega contexto: "¿Qué dice la comunidad sobre este cuidador aquí?"

Ejemplo:
- Fase 5: "Carlos tiene 387 paseos aquí"
- Fase 6: "Carlos tiene 387 paseos aquí, y otros 12 tutores lo califican como 'el mejor de la zona'"

### Alcance Fase 6

**Agregar dimensión comunitaria**:
- Tutores recurrentes (quién lo pide por nombre)
- Recomendaciones peer-to-peer (tutores que lo recomiendan)
- Especialización de zona (es conocido para cierto tipo de mascota en cierta zona)
- Indicadores de confianza comunitaria

**NO incluir**:
- Redes sociales externas
- Crowdsourcing de reseñas (evitar spam)
- Modelos predictivos

### Servicios Reutilizados

- ✅ Todos anteriores

### Modelos Reutilizados

- ✅ Todos anteriores
- ✅ Nuevo: `ConexionComunitaria` (simple)

### Colecciones Reutilizadas

- ✅ Todas anteriores
- ✅ Nueva: `/h3_zonas/{celda}/comunidad/{uid_cuidador}`
  - O mejor: agregar a `/perfiles_publicos/{uid}/zonas_presencia[].comunidad`

### Hooks Reutilizados

- ✅ `useSeleccionarCuidador` (agregar datos comunitarios)
- ✅ Nuevo: `useComunidadTerritorial()` (helper)

### Componentes Reutilizados

- ✅ Todos anteriores

### Nuevos Campos Necesarios

**PerfilPublico.zonas_presencia[]**:
```typescript
interface ZonaPresencia {
  h3_r8: string
  paseos_completados: number
  primer_paseo?: Date
  ultimo_paseo?: Date
  incidentes: number
  lugares_visitados_count?: number
  
  // NUEVO: Datos comunitarios
  comunidad?: {
    tutores_recurrentes: number        // Cuántos tutores lo piden por nombre aquí
    recomendaciones_recibidas: number  // De otros tutores
    especializacion_zona?: string      // Ej: "especialista en perros grandes"
    confianza_comunitaria: number      // 0-1, basado en tutores recurrentes
  }
}
```

### Nuevos Documentos

❌ Preferible no crear documentos nuevos. Agregar campos computados a PerfilPublico.

### Acciones Concretas

1. **Cloud Function: detectarTutoresRecurrentes()**
   - Trigger: Cuando paseo pasa a COMPLETADO
   - Acción:
     ```
     1. Buscar si este tutor + cuidador han hecho paseos antes
     2. Si sí: incrementar contador en PerfilPublico.zonas_presencia[h3].comunidad.tutores_recurrentes
     3. Recalcular confianza_comunitaria = tutores_recurrentes / total_paseos
     ```

2. **Cloud Function: detectarEspecializaciones()**
   - Trigger: Batch diaria
   - Acción:
     ```
     1. Para cada cuidador + zona:
        - Analizar últimos 50 paseos
        - ¿Qué tipo de mascota atiende más?
        - Si 70%+ son "perros grandes", marcar especialización
     2. Actualizar PerfilPublico.zonas_presencia[h3].comunidad.especializacion_zona
     ```

3. **Función calcularConfianzaComunitaria()**
   ```typescript
   function calcularConfianzaComunitaria(zona: ZonaPresencia): number {
     const confiabilidad = zona.comunidad?.tutores_recurrentes || 0
     const maxRecurrentes = Math.min(50, zona.paseos_completados / 10)
     return Math.min(1, confiabilidad / maxRecurrentes)
   }
   ```

4. **Actualizar ScoreConfianza**
   ```typescript
   interface ScoreConfianza {
     total: number // 0-10
     desglose: {
       afinidad: number
       experiencia_territorial: number
       confiabilidad: number
       recencia: number
       confianza_comunitaria: number // 0-1, nuevo
     }
     explicacion: string
   }
   
   // En calcularScoreConfianza():
   const scoreComunitario = calcularConfianzaComunitaria(expTerr?.comunidad || {}) * 1.5 // peso 0-1.5
   total = ... + scoreComunitario
   ```

5. **Actualizar explicación**
   ```
   "Carlos ✓ Compatible ✓ 387 paseos ✓ 4.9⭐ ✓ 23 tutores lo piden por nombre"
   ```

### Riesgos

- **Medio**: Detección de especialización puede fallar
  - *Mitigación*: Manual override en perfil de cuidador

- **Medio**: Comunidad puede tener sesgos
  - *Mitigación*: No usar exclusivamente para ranking (solo boost)

### Beneficio Esperado

- ✅ Inteligencia Comunitaria en el ranking
- ✅ Efecto red: Cuidadores de confianza son aún más confiables
- ✅ Comunidad auto-organiza expertise
- ✅ Diferenciador vs marketplaces

### Complejidad Estimada

**MEDIA-ALTA** (Cloud Functions + analytics + UI updates)

---

## Inteligencia Territorial como Fundamento

### Qué es Inteligencia Territorial

No es una característica. Es la **filosofía de base** de todo el motor.

**Principio**: Cada hexágono H3 es un lugar con historia.

```
Hoy (H3 = Coordenadas)
    ↓
Mañana (H3 = Lugar + Memoria)
    ↓
Futuro (H3 = Comunidad + Evolución)
```

### Datos que Viven en H3

Para cada celda H3 R8:
- Cuidadores que trabajan aquí (índice_cobertura)
- Número total de paseos por año
- Mascota tipos (distribución)
- Indicadores de seguridad (cancelaciones, incidentes)
- Lugares conocidos (parques, plazas)
- Comunidad (tutores + cuidadores conectados)

### Cómo Se Alimenta

Con cada paseo COMPLETADO:
```
1. Extraer H3 R8 + R9
2. Registrar en PerfilPublico.zonas_presencia[h3]
3. Actualizar h3_zonas/{celda} estadísticas
4. Detectar nuevos lugares (R9)
5. Agregar a comunidad de zona
6. Enriquecer perfiles
```

### Escalada Natural

```
Fase 1-2: H3 es búsqueda (O(1))
Fase 3: H3 es experiencia (historiales)
Fase 4: H3 es confianza (estadísticas)
Fase 5: H3 es explicabilidad (datos concretos)
Fase 6: H3 es comunidad (redes)
Fase 7+: H3 es inteligencia (emergente)
```

---

## Principios Arquitectónicos Permanentes

Estos principios NUNCA deben romperse. Son la columna vertebral del motor.

### 1. Elegibilidad Siempre Primero

```
Nunca recomendar un cuidador que no pasó LogicMatching.
Sin excepción.
```

**Implementación**: Gatekeep atómico en useSeleccionarCuidador.

**Justificación**: Confiar en un cuidador no disponible > error de integridad.

---

### 2. Todo Debe Ser Explicable

```
Si no puedes explicar en una frase por qué se recomienda X,
entonces la recomendación está rota.
```

**Antídoto para complejidad**: Cuando una regla necesita 10 parámetros para explicarse, algo está mal.

**Estrategia**: Mantener score/decisión simple, agregar puntos pequeños, nunca combinar más de 5 factores.

---

### 3. Reutilizar Antes de Crear

```
¿Existe un servicio que haga esto?
  ✓ Úsalo
¿Existe un modelo que lo represente?
  ✓ Extenderlo
¿Existe un documento que tenga estos datos?
  ✓ Agregarle campos
```

**Contraejemplo**: NO crear nueva colección /confianza_scores si puedes agregar a PerfilPublico.

**Beneficio**: Menos documentos, menos queries, más inteligencia centralizada.

---

### 4. Inteligencia Territorial, No Artificial

```
Los datos deben venir de Paw-Path, no de terceros.
Las decisiones deben ser deducibles de datos propios.
```

**Contraejemplo**: NO agregar "score de crédito de Equifax" al matching.

**Beneficio**: Diferencial real, datos confiables, control total.

---

### 5. H3 es Moneda de Inteligencia

```
Dentro de una celda H3 R8:
- Todos los cuidadores aprenden
- Todos los tutores se benefician
- La comunidad converge
```

**Garantía**: No permitir comportamiento mercado (competencia destructiva dentro de zona).

**Estrategia**: Ranking por zona, no global. Especialización es ventaja comunitaria.

---

### 6. Scoring es Transparencia, No Ocultar

```
∀ score, ∃ explicacion_clara.
```

**Implementación**: Score nunca sin explicación.

**UI Guarantee**: Usuario puede expandir y ver exactamente cómo se calculó.

---

### 7. Evolución No Rompe Compatibilidad

```
Cada fase debe funcionar sin cambiar signatura de anterior.
```

**Patrón**:
```typescript
// Fase 1
export function esCuidadorDisponible(...) // NUNCA cambia

// Fase 2
// Nuevo hook, no toca matching
export function useAfini() { ... }

// Fase 4
// Nuevo modelo, no toca anteriores
export interface ScoreConfianza { ... }
```

---

### 8. Base de Datos Refleja Decisiones

```
Lo que puedas ver en Firestore debe responder
"¿Por qué se tomó esta decisión?"
```

**Patrón**: Guardar contexto de decisión en Paseo + PerfilPublico.

**Contraejemplo**: NO guardar solo resultado de recomendación sin explicación.

---

### 9. Comunidad Auto-Organiza Expertise

```
No imponer especialización top-down.
Dejar que emerja de datos.
```

**Proceso**:
1. Cuidadores trabajan donde pueden (elegibilidad)
2. Comunidad los elige donde son mejores (confianza)
3. Sistema amplifica señal (recomendación)

---

### 10. Simplicidad Crece Con Demanda Real

```
Nunca agregar complejidad sin problema concreto.
```

**Checklist antes de agregar feature**:
- [ ] ¿Existe user story real?
- [ ] ¿Se puede explicar en 1 frase?
- [ ] ¿Qué pasa si NO lo hacemos? (costo de no hacer)
- [ ] ¿Hay forma más simple?

---

## Apéndice: Métricas de Éxito por Fase

### Fase 1
- [ ] LogicMatching cov coverage ≥ 95%
- [ ] Cero fallos de concurrencia en tests
- [ ] Documentación de extension points clara

### Fase 2
- [ ] Usuarios reportan recomendaciones "más relevantes"
- [ ] Conversión a compra no baja (A/B test)
- [ ] Especializaciones se reflejan en UI

### Fase 3
- [ ] Cuidadores con experiencia territorial ranking más alto
- [ ] H3 zonas tienen métricas actualizadas
- [ ] Usuarios ven "387 paseos en tu zona"

### Fase 4
- [ ] Score de confianza es reproducible
- [ ] Ranking es consistente (A→B→C cada vez)
- [ ] Desglose de score accesible

### Fase 5
- [ ] 80%+ usuarios expand "por qué este cuidador"
- [ ] Explicaciones son comprensibles (user testing)
- [ ] Confianza en recomendación sube

### Fase 6
- [ ] Tutores recurrentes visibles en profile
- [ ] Especialización de zona detectada automáticamente
- [ ] Inteligencia Comunitaria visible en recomendaciones

---

## Próximos Pasos

1. **Validar este plan** con team
2. **Comenzar Fase 1** (consolidar elegibilidad)
3. **Documentar extension points** en código
4. **Instrumentation**: Agregar logs para entender decisiones
5. **Tests**: Exhaustivo de LogicMatching
6. **Go to Fase 2**: Afinidad básica

---

**Fin del Plan. Este documento evoluciona con cada fase completada.**
