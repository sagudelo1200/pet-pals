# 🏗️ PLAN COMPLETO: PAWPATH COMO INFRAESTRUCTURA TERRITORIAL

**Generado**: 19 de mayo de 2026 (V2 - Ajustes Estratégicos)  
**Estado**: Propuesta aprobada para implementación  
**Timeline**: 6-8 semanas  
**Costo Firebase**: Reducción 93-94%  
**Diferenciación**: Infraestructura social territorial (no app)

---

## 📋 TABLA DE CONTENIDOS

1. [Estado Actual vs. Futuro](#estado-actual-vs-futuro)
2. [La Verdadera Oportunidad](#la-verdadera-oportunidad)
3. [Arquitectura Territorial](#arquitectura-territorial)
4. [Disponibilidad: Simple](#disponibilidad-simple)
5. [GPS: Emocional No Telemetría](#gps-emocional-no-telemetría)
6. [Rituales: Lo Que Importa](#rituales-lo-que-importa)
7. [Flujo de Experiencia (Paso a Paso)](#flujo-de-experiencia-paso-a-paso)
8. [Pantallas y UX](#pantallas-y-ux)
9. [Base de Datos: Lo Que Cambia](#base-de-datos-lo-que-cambia)
10. [Qué Se Elimina, Qué Se Crea](#qué-se-elimina-qué-se-crea)
11. [Timeline de Desarrollo](#timeline-de-desarrollo)
12. [Impacto Financiero](#impacto-financiero)
13. [Estrategia Territorial](#estrategia-territorial)

---

## 🔄 ESTADO ACTUAL VS. FUTURO

### HOY (Marketplace)

```
Tutor quiere paseo
    ↓
Crea solicitud abierta o elige cuidador
    ↓
Sistema busca entre MUCHOS cuidadores (pool global)
    ↓
Tutor compara perfiles, se confunde
    ↓
Elige uno (o espera rechazo)
    ↓
Ansiedad, fricción, baja confianza
    ↓
Si funciona: relación débil (siempre busca otro)
    ↓
Costo Firebase: ALTO (listeners globales, escalada automática)
```

### FUTURO (Infraestructura Territorial)

```
Tutor quiere paseo PARA JUEVES 19:00
    ↓
Crea solicitud especificando fecha, hora, duración
    ↓
Sistema busca en TERRITORIO (Laureles, no Medellín)
    ↓
Pregunta: ¿Mi cuidador favorito?
    ↓
A) SÍ → Confirma (1 tap)
B) NO → Muestra opciones de su zona (2-5 máximo)
    ↓
Tutor elige con confianza
    ↓
Tranquilidad, claridad, relación fuerte
    ↓
Si funciona: vuelve a ese cuidador (ritual recurrente)
    ↓
Grafo territorial crece: densidad → reputación → comunidad
    ↓
Costo Firebase: BAJO (queries solo en creación, sin escalada automática)
```

---

## 🌍 LA VERDADERA OPORTUNIDAD

### Qué NO es PawPath

- ❌ Uber de perros
- ❌ Marketplace con cientos de opciones
- ❌ App para comparar perfiles eternamente
- ❌ Sistema transaccional (paseo = dinero)
- ❌ Crecimiento horizontal (conquistar ciudades completas)

### Qué ES PawPath

- ✅ **Sistema de coordinación territorial**
- ✅ **Infraestructura de confianza local** (grafo territorial, no pool global)
- ✅ **Construcción de relaciones recurrentes y densas**
- ✅ **Tranquilidad organizada a nivel barrio**
- ✅ **Crecimiento territorial** (profundidad en zonas)

### La Visión Estratégica Real

**PawPath NO crece horizontalmente:**

```
Medellín completa → Bogotá → Cali → ... (escala sin densidad)
```

**PawPath crece territorialmente:**

```
LAURELES funciona perfecto
  ↓ (densidad, repetición, familiaridad, reputación)

BELÉN funciona perfecto
  ↓ (comunidad natural establecida)

ENVIGADO funciona perfecto
  ↓ (modelo replicable en otras ciudades)
```

### El Verdadero Activo

- ❌ Paseos (commoditizado, copiable)
- ✅ **Grafo de confianza territorial** (extremadamente difícil de copiar)

```
Tutor A ↔ Cuidador B
         ↔ Parque C
         ↔ Zona D (Laureles)
         ↔ Mascotas E, F, G
         ↔ Referente territorial H
```

**Esto es infraestructura social urbana, no "app".**

### Por Qué Diferencia en LATAM

- LATAM prefiere **relaciones humanas** sobre **abundancia de opciones**
- LATAM valora **confianza territorial** sobre **escalabilidad global**
- LATAM retiene **por relación recurrente** no por **variedad**
- LATAM paga más por **seguridad emocional** que por **precio barato**
- LATAM entiende **comunidad local** como recurso escaso y valioso

---

## 🏛️ ARQUITECTURA TERRITORIAL

### TerritoryNode: Estructura Base

PawPath se organiza alrededor de **nodos territoriales** basados en H3 (resolución 8 ≈ 460m):

```
TerritoryNode
├─ h3_index: "8827c4f9b8df7ff" (Laureles, Medellín)
├─ nombre: "Laureles"
├─ ciudad: "Medellín"
├─ referentes: [Cuidador B, Cuidador D, ...]
├─ estadisticas:
│   ├─ tutores_activos: 45
│   ├─ cuidadores_activos: 12
│   ├─ paseos_mes: 180
│   └─ confianza_promedio: 4.8/5
├─ parques_principales: [Parque Bolívar, Parque Berrío, ...]
├─ status: "OPERACIONAL" | "CRECIENTE" | "SATURADO"
└─ fecha_apertura: "2026-06-01"
```

### Relación Cuidador-Territorio

Cada cuidador pertenece a:

- **1 nodo principal** (donde reside)
- **1-2 nodos secundarios** (donde puede trabajar)

```
Cuidador B
├─ h3_principal: "8827c4f9b8df7ff" (Laureles)
├─ h3_secundarios: ["8827c4f9b8df7ff", "8827c4f9b8cf7ff"]
├─ zona_cobertura: ["Parque Bolívar", "Parque Arvi"]
└─ horario_semanal: {...}
```

### Beneficios Arquitectónicos

1. **Matching contextual geográfico**: Busca en territorio, no en pool global
2. **Densidad real**: Puedes alcanzar densidad sin escalar indefinidamente
3. **Reputación territorial**: Referentes del barrio son visibles
4. **Sostenibilidad**: Crecimiento territorial = crecimiento sostenible
5. **Defensa contra copias**: Red territorial es muy costosa de replicar

---

## ⏰ DISPONIBILIDAD: SIMPLE

### Lo Que NO Necesitas (MVP)

- ❌ Calendar engine complejo
- ❌ AI de predicción
- ❌ Análisis histórico de disponibilidad
- ❌ Bloques visuales hiper-granulares

### Lo Que SÍ Necesitas

**Estructura simple: `weekly_template + manual_exceptions`**

```
horario_semanal: {
  "lunes": { inicio: "17:00", fin: "21:00" },
  "martes": { inicio: "17:00", fin: "21:00" },
  "miércoles": { inicio: "08:00", fin: "12:00" },
  "jueves": null,  // No disponible
  "viernes": { inicio: "17:00", fin: "21:00" },
  "sabado": { inicio: "09:00", fin: "18:00" },
  "domingo": null
}

excepciones_manuales: [
  { fecha: "2026-05-23", estado: "UNAVAILABLE", razon: "Lluvia" },
  { fecha: "2026-05-25", estado: "AVAILABLE_EXTRA", inicio: "08:00", fin: "12:00" },
  { fecha: "2026-06-15", estado: "UNAVAILABLE", razon: "Viaje" }
]
```

### Por Qué Esto Funciona

La realidad humana:

```
Trabajo          ← Cambia semana a semana
Universidad      ← Varía por semestre
Lluvia           ← Impredecible
Fatiga           ← Decide el día
Transporte       ← Puede fallar
Eventos          ← Emergen
Agotamiento      ← Personal
```

**NO puedes predecir con calendar engine.**

Mejor: **template predecible + override manual semanal.**

---

## 📍 GPS: EMOCIONAL NO TELEMETRÍA

### Lo Que NO Necesitas (MVP)

- ❌ Tracking realtime agresivo (cada 3 segundos)
- ❌ Rutas hiper-detalladas con polyline
- ❌ Histórico de ruta completo
- ❌ Análisis geoespacial
- ❌ Alertas automáticas de desviación

### Lo Que SÍ Necesitas

**4 momentos críticos que tranquilizan:**

```
INICIO
  "Carlos está en camino a casa"
  Timestamp + coordenadas simples
  ↓ (3-5 minutos)

CHECKPOINT
  "Carlos está en el parque"
  Foto rápida enviada por cuidador
  Timestamp + ubicación aprox
  ↓ (durante paseo)

CHECKPOINT (múltiples)
  "Luna está feliz jugando"
  Foto + comentario
  ↓ (final)

FINALIZÓ
  "Luna volvió a casa"
  Timestamp + observación del cuidador
```

### Estructura de Datos

```
// GPS: Mínimo necesario
paseo_gps: {
  inicio: {
    timestamp: "2026-05-22T19:00:00Z",
    coordenadas: { lat: 6.24, lon: -75.58 }
  },
  checkpoints: [
    { timestamp, coordenadas, foto: url, comentario: "" }
  ],
  finalizacion: {
    timestamp: "2026-05-22T20:01:00Z",
    coordenadas: { lat: 6.24, lon: -75.58 },
    observacion: "Luna estuvo feliz"
  }
}

// NO guardar:
// - Polyline detallado
// - GPS cada 3 segundos
// - Histórico de ruta completo
```

### Beneficios

1. **Menor costo Firebase**: 90% menos storage que tracking continuo
2. **Menor batería**: No escaneando GPS constantemente
3. **Mejor UX**: No "viendo al cuidador" (invasivo), "sabiendo qué pasó"
4. **Ritual emocional**: Inicio → momento feliz → final

---

## 🎭 RITUALES: LO QUE IMPORTA

### La Percepción de Confianza Nace De

- ✅ Consistencia
- ✅ Pequeños detalles
- ✅ Rituales repetidos
- ✅ Lenguaje coherente
- ✅ Expectativa cumplida

### NO Nace De

- ❌ Dashboards
- ❌ Analytics
- ❌ Marketplace features
- ❌ Gamificación
- ❌ Bonificación de puntos

### Rituales Clave (Versión 1.0)

#### Ritual de Inicio

```
NOTIFICACIÓN:
"Carlos inició el paseo de Luna"
Timestamp + status de ruta
```

#### Ritual de Tranquilidad

```
CHECKPOINT:
"Luna ya está en el parque"
Foto de Luna feliz
Comentario: "Muy social hoy"
```

#### Ritual de Cierre

```
FINALIZÓ:
"Luna volvió a casa feliz"
Foto final + observación:
"Estuvo tranquila. Comió bien.
Sugiero menos duración próxima vez."
```

#### Ritual de Relación

```
DESPUÉS DEL PASEO:
"Carlos es tu cuidador favorito"
✓ Próxima vez, le ofreceremos primero
✓ Obtén 10% descuento en paseos recurrentes
```

#### Ritual de Recurrencia

```
SEGUNDA SOLICITUD:
"¿Vuelves con Carlos el viernes 19:00?"
[SÍ - 1 TAP] [CAMBIAR]
```

### Implementación en UI/UX

Cada ritual debe tener:

1. **Notificación clara** (no ruido)
2. **Lenguaje humano** (no técnico)
3. **Contexto visual** (foto, emoji, icono)
4. **Momento correcto** (no anticipado, no retrasado)
5. **Consistencia** (mismo ritual siempre = confianza)

---

## 👥 FLUJO DE EXPERIENCIA (PASO A PASO)

### SEMANA 1-2: ONBOARDING (El Tutor Llega)

#### Pantalla 1: Bienvenida

```
┌────────────────────────────────┐
│      BIENVENIDA A PAWPATH      │
├────────────────────────────────┤
│                                 │
│  "Tranquilidad organizada       │
│   para tu mascota"              │
│                                 │
│  • Cuidadores de tu barrio      │
│  • Zona local verificada        │
│  • Relaciones duraderas         │
│  • Transparencia total          │
│                                 │
│  [COMIENZA AQUÍ]               │
│                                 │
└────────────────────────────────┘

UX: Reduce ansiedad antes de empezar
Rituales: Tono empático, no vendedor
```

#### Pantalla 2-5: Onboarding (Progressive Sheet)

```
Bottom Sheet progresivo:

┌─ Sheet 1: Registro Mínimo ─────────┐
│ Tu nombre: ____________            │
│ Tu teléfono: ____________          │
│ Tu zona: [Laureles]                │
│ [SIGUIENTE]                        │
└────────────────────────────────────┘

↓

┌─ Sheet 2: Tu Mascota ──────────────┐
│ Nombre: ____________               │
│ Especie: [Perro]                   │
│ Tamaño: [Mediano]                  │
│ Nivel energía: [Alto]              │
│ [SIGUIENTE]                        │
└────────────────────────────────────┘

↓

┌─ Sheet 3: Tu Casa ─────────────────┐
│ Dirección: ____________            │
│ Instrucciones: "Portón azul..."    │
│ [GUARDAR]                          │
└────────────────────────────────────┘

UX: Progressive = menos fricción
Sin 6 screens completas = más rápido
Rituales: Cada sheet es checkpoint
```

#### Pantalla 6: Conoce Cuidadores (Educación)

```
┌────────────────────────────────┐
│   QUIÉNES SOMOS EN LAURELES   │
├────────────────────────────────┤
│                                 │
│  [Carrusel de cuidadores]       │
│                                 │
│  📷 Juan Martínez              │
│  "Especialista perros nerv."    │
│  ⭐⭐⭐⭐⭐ 15 paseos         │
│  "5 años en el barrio"          │
│                                 │
│  [CONOCER SIGUIENTE]            │
│                                 │
│  [LISTO, SOLICITAR PASEO]      │
│                                 │
└────────────────────────────────┘

UX: Educación, no transacción
Rituales: Familiaridad con referentes
```

---

### SEMANA 2-3: PRIMERA SOLICITUD

#### Flow: Solicitar Paseo (Progressive Sheet)

```
Bottom Sheet con pasos inline:

Sheet 1: Mascota
├─ [Luna] ← Seleccionada
├─ [Rocco]
└─ [➕ Nueva]

Siguiente: ↓

Sheet 2: Dirección
├─ [🏠 Casa]
├─ [🏢 Trabajo]
└─ [➕ Otra]

Siguiente: ↓

Sheet 3: Fecha
├─ [Hoy]
├─ [Mañana]
├─ [📅 Jueves 22]  ← Seleccionada
└─ [Otro día]

Siguiente: ↓

Sheet 4: Hora
├─ 08:00  09:00  10:00
├─ 17:00  18:00  [19:00] ← Seleccionada
└─ 20:00  21:00

Siguiente: ↓

Sheet 5: Duración
├─ Slider: 30min ←─●──→ 90min
│ Seleccionado: 60min
└─ "Recomendado para Luna: 45-60min"

Siguiente: ↓

Sheet 6: Resumen
├─ 🐕 Luna
├─ 📍 Casa
├─ 📅 Jueves 22, 19:00
├─ ⏱️ 60 minutos
├─ 💵 $25.000
└─ [BUSCAR CUIDADORES DISPONIBLES]
```

**UX Ventajas:**

- Todo en 1 bottom sheet (no 6 screens)
- Siguiente/anterior fluido
- Revisiones inline
- Muito mais rápido

---

### SEMANA 2-3: BÚSQUEDA TERRITORIAL

#### Escenario A: Favorito Disponible ✅

```
┌────────────────────────────────┐
│    ✅ ¡LISTO! ASIGNADO         │
├────────────────────────────────┤
│                                 │
│  "Tu favorito está disponible"  │
│                                 │
│  📷 Carlos Ramírez              │
│  Zona: Laureles (200m)          │
│  ⭐⭐⭐⭐⭐ 12 paseos         │
│  "Carlos sabe cómo es Luna"     │
│                                 │
│  📅 Jueves 22, 19:00-20:00     │
│  💵 $25.000                     │
│                                 │
│  [CONFIRMAR Y ESPERAR]          │
│                                 │
│  [VER OTRAS OPCIONES]           │
│                                 │
└────────────────────────────────┘
```

#### Escenario B: Opciones Territoriales 🔄

```
┌────────────────────────────────┐
│   CUIDADORES DISPONIBLES        │
│   Tu zona - Jueves 19:00 - 1h   │
├────────────────────────────────┤
│                                 │
│  🥇 Carlos Ramírez (200m)      │
│     ⭐⭐⭐⭐⭐ Especialista  │
│     [ELEGIR]                    │
│                                 │
│  🥈 Patricia López (450m)       │
│     ⭐⭐⭐⭐ Activa            │
│     [ELEGIR]                    │
│                                 │
│  🥉 David Castillo (600m)       │
│     ⭐⭐⭐⭐⭐ Referente    │
│     [ELEGIR]                    │
│                                 │
│  Máximo 5 opciones viables     │
│                                 │
└────────────────────────────────┘

UX: Distancia visible (territorio)
Rituales: Pequeña recomendación (🥇)
```

#### Escenario C: Sin Disponibilidad ❌

```
┌────────────────────────────────┐
│   ⏰ NO HAY DISPONIBILIDAD     │
├────────────────────────────────┤
│                                 │
│  "Nadie disponible hoy a esa   │
│   hora en tu zona"              │
│                                 │
│  💡 Intenta:                    │
│                                 │
│  ✓ Viernes 19:00 (3 disponibles)│
│  ✓ Sábado mañana (5 disponibles)│
│  ✓ Hoy 18:00 (2 disponibles)   │
│                                 │
│  [CAMBIAR HORARIO]              │
│                                 │
└────────────────────────────────┘
```

---

### SEMANA 3: CONFIRMACIÓN Y ESPERA

#### Pantalla: Esperando Confirmación

```
┌────────────────────────────────┐
│   ⏳ CONFIRMANDO CON CARLOS   │
├────────────────────────────────┤
│                                 │
│  "Esperando confirmación"       │
│  📅 Jueves 22, 19:00            │
│  ⏱️ Expira en: 58 minutos       │
│                                 │
│  📞 [CONTACTAR A CARLOS]        │
│  ☐ [CANCELAR SOLICITUD]         │
│                                 │
└────────────────────────────────┘

Ritual: Transparencia en tiempo real
Timeout: 1 hora → automático siguiente opción
```

#### Pantalla: Aceptación Confirmada ✅

```
┌────────────────────────────────┐
│    ✅ CARLOS ACEPTÓ           │
├────────────────────────────────┤
│                                 │
│  📷 Carlos Ramírez              │
│  📱 +57 300 123 4567            │
│  📍 Laureles (200m)             │
│  ⭐⭐⭐⭐⭐ 12 paseos         │
│                                 │
│  📅 Jueves 22, 19:00-20:00     │
│  💵 $25.000                     │
│                                 │
│  [CHAT CON CARLOS]              │
│  [VER EN MAPA]                  │
│                                 │
└────────────────────────────────┘

Ritual: Cierre emocional
```

---

### SEMANA 3-4: DURANTE PASEO

#### Pantalla: Paseo en Curso

```
┌────────────────────────────────┐
│  🔴 PASEO EN CURSO            │
├────────────────────────────────┤
│                                 │
│  INICIO: Carlos en camino       │
│  Timestamp: 19:01               │
│                                 │
│  [Mapa simple - ubicación aprox]│
│                                 │
│  ⏱️ Tiempo: 1 min / 60 min      │
│  📍 "En camino a Parque Bolívar"│
│                                 │
│  📞 [CONTACTAR]                 │
│                                 │
│  "Luna está en buenas manos"   │
│                                 │
└────────────────────────────────┘

Ritual: Tranquilidad en tiempo real
```

#### Pantalla: En Progreso

```
┌────────────────────────────────┐
│  🟢 PASEO EN PROGRESO         │
├────────────────────────────────┤
│                                 │
│  CHECKPOINT: Luna en el parque  │
│  Timestamp: 19:15               │
│                                 │
│  [Foto enviada por Carlos]      │
│  "Luna feliz jugando con otros" │
│                                 │
│  ⏱️ Tiempo: 15 min / 60 min     │
│                                 │
│  📞 [CONTACTAR]                 │
│                                 │
└────────────────────────────────┘

Ritual: Validación emocional
```

---

### SEMANA 4: FINALIZACIÓN Y RELACIÓN

#### Pantalla: Paseo Finalizado

```
┌────────────────────────────────┐
│    ✅ PASEO COMPLETADO        │
│    19:01 - 20:04 (63 minutos)  │
├────────────────────────────────┤
│                                 │
│  FINALIZÓ: Luna volvió a casa   │
│                                 │
│  📸 Fotos:                      │
│  [Galería de 2-3 fotos]         │
│                                 │
│  💬 Observación de Carlos:      │
│  "Luna tranquila y social.      │
│   Sugiero próxima vez 45 min"   │
│                                 │
│  ⭐⭐⭐⭐⭐ Puntúa           │
│  [Escribir comentario]          │
│                                 │
│  ❤️ [AGREGAR A FAVORITOS]     │
│                                 │
└────────────────────────────────┘

Ritual: Cierre humanizado
```

#### Pantalla: Agregar a Favoritos

```
┌────────────────────────────────┐
│   ❤️ ¡FAVORITO AGREGADO!     │
├────────────────────────────────┤
│                                 │
│  "Carlos es tu cuidador         │
│   favorito"                     │
│                                 │
│  • Próxima vez le ofrecemos     │
│    paseos primero               │
│  • 10% descuento en recurrentes │
│                                 │
│  [REAGENDAR CON CARLOS]         │
│  [IR A INICIO]                  │
│                                 │
└────────────────────────────────┘

Ritual: Incentivo = confianza + recurrencia
```

#### Pantalla: Reagendar Rápido

```
┌────────────────────────────────┐
│   SOLICITAR PASEO - RÁPIDO    │
├────────────────────────────────┤
│                                 │
│  "¿Vuelves con Carlos?"         │
│                                 │
│  📷 Carlos Ramírez              │
│  ⭐⭐⭐⭐⭐ 13 paseos         │
│                                 │
│  📅 Jueves 29 mayo              │
│  🕖 19:00                       │
│  ⏱️ 60 minutos                  │
│  💵 $25.000 (-10%)              │
│                                 │
│  [SÍ, CONFIRMAR]               │
│  [CAMBIAR DETALLES]             │
│                                 │
└────────────────────────────────┘

Ritual: 1-tap recurrencia = lock-in natural
```

---

## 📱 PANTALLAS Y UX

### Principios de Diseño

1. **Progressive Sheet**: Menos screens completas, bottom sheets fluidas
2. **Lenguaje humano**: No técnico, empático, local
3. **Rituales sobre features**: Consistencia > funcionalidad
4. **Minimal pero completo**: Toda la info necesaria, nada más
5. **Territorio visible**: Distancia, zona, referentes

### Pantallas MVP (Mínimas)

**Tutor:**

- Bienvenida
- Onboarding (progressive sheet, 3 pasos)
- Conoce Cuidadores (carrusel educativo)
- Dashboard (favoritos, próximos paseos)
- Solicitar Paseo (progressive sheet, 6 pasos)
- Paseo en Vivo (mapa simple + tiempo)
- Resumen Paseo (fotos + observación)
- Historial (paseos completados)

**Cuidador:**

- Dashboard (paseos asignados hoy + próximos 7 días)
- Paseos Asignados (aceptar/rechazar)
- Control Paseo (mapa simple + inicio/fin)
- Horario Semanal (editar disponibilidad)

**Admin (Reducido):**

- Dashboard Territorial (por zona)
- Cuidadores (validar, suspender, metricas)
- Tutores (ver incidentes, revisar)
- Soporte (casos abiertos)
- Observar Zonas (Territorio Vivo adaptado)

### Lo Que NO Hacemos (MVP)

- ❌ Chat avanzado
- ❌ Video llamadas
- ❌ Búsqueda avanzada
- ❌ Marketplace de cuidadores
- ❌ Admin dashboard enterprise

---

## 💾 BASE DE DATOS: LO QUE CAMBIA

### NUEVA: TerritoryNode

```
territories/{h3_index}
├─ h3_index: string (resolución 8)
├─ nombre: string
├─ ciudad: string
├─ referentes: [uid_cuidador]
├─ estadisticas:
│   ├─ tutores_activos: number
│   ├─ cuidadores_activos: number
│   ├─ paseos_mes: number
│   ├─ confianza_promedio: number (1-5)
│   └─ actualizacion: timestamp
├─ parques_principales: [string]
├─ status: "CRECIENTE" | "OPERACIONAL" | "SATURADO"
├─ creado_en: timestamp
└─ actualizado_en: timestamp
```

### NUEVA: relaciones_cuidador_tutor

```
relaciones_cuidador_tutor/{id}
├─ uid_tutor: string
├─ uid_cuidador: string
├─ h3_territorio: string
├─ estado: "INVITADA" | "ACEPTADA" | "ACTIVA" | "PAUSADA"
├─ es_favorito: boolean
├─ confianza_score: number (0-5)
├─ paseos_completados: number
├─ paseos_cancelados: number
├─ rating_promedio: number (1-5)
├─ fecha_invitacion: timestamp
├─ fecha_aceptacion: timestamp
├─ fecha_ultima_interaccion: timestamp
├─ creado_en: timestamp
└─ actualizado_en: timestamp
```

### MODIFICADA: usuarios

```
usuarios/{uid}
├─ nombre: string
├─ correo: string (opcional)
├─ celular: string
├─ h3_principal: string (territorio principal)
├─ h3_secundarios: [string] (solo cuidadores)
├─ foto: string (url)
├─ rol: "TUTOR" | "CUIDADOR" | "ADMIN"
├─ estado: "ACTIVO" | "SUSPENDIDO" | "CANCELADO"
├─ ubicaciones: [object]
│   ├─ alias: string
│   ├─ direccion: string
│   ├─ coordenadas: {lat, lon}
│   ├─ h3_index: string
│   └─ instrucciones: string
├─ creado_en: timestamp
└─ actualizado_en: timestamp
```

### MODIFICADA: perfiles_publicos (solo cuidadores)

```
perfiles_publicos/{uid}
├─ nombre: string
├─ foto: string
├─ h3_principal: string
├─ h3_secundarios: [string]
├─ horario_semanal: object
│   ├─ lunes: {inicio: "17:00", fin: "21:00"}
│   ├─ martes: {inicio: "17:00", fin: "21:00"}
│   └─ ... (domingo)
├─ excepciones_manuales: [object]
│   ├─ fecha: timestamp
│   ├─ estado: "AVAILABLE_EXTRA" | "UNAVAILABLE"
│   └─ razon: string
├─ rating_promedio: number (1-5)
├─ cantidad_paseos: number
├─ especialidades: [string]
├─ zona_cobertura: [string]
└─ actualizado_en: timestamp
```

### MODIFICADA: paseos

```
paseos/{id}
├─ relacion_id: string (ref relaciones_cuidador_tutor)
├─ h3_territorio: string
├─ mascota_ids: [string]
├─ estado: "PENDING_ACCEPTANCE" | "SCHEDULED" | "ARRIVING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "EXPIRED"
│ (5 estados simples)
├─ fecha_invitacion: timestamp
├─ fecha_expiracion: timestamp (1h después invitar)
├─ fecha_hora_inicio: timestamp
├─ duracion_estimada: number (minutos)
├─ precio: number
├─ ubicacion_inicio: object
│   ├─ h3_index: string
│   ├─ coordenadas: {lat, lon}
│   └─ alias: string
├─ ubicacion_fin: object (opcional)
├─ paseo_gps: object
│   ├─ inicio: {timestamp, coordenadas}
│   ├─ checkpoints: [object]
│   │   ├─ timestamp
│   │   ├─ coordenadas
│   │   ├─ foto: string (url)
│   │   └─ comentario: string
│   └─ finalizacion: {timestamp, coordenadas, observacion}
├─ observaciones_cuidador: string
├─ fotos_paseo: [string]
├─ rating_tutor: number (1-5)
├─ comentario_tutor: string
├─ creado_en: timestamp
└─ actualizado_en: timestamp
```

### SE ELIMINAN/DESACTIVAN

- ❌ h3_zonas (se actualiza pero no se usa)
- ❌ Cloud Tasks (escalada automática)
- ❌ Subcolección eventos/hitos (simplificar)
- ❌ Perfil marketplace (competencia)

---

## 🗑️ QUÉ SE ELIMINA, QUÉ SE CREA

### CÓDIGO A ELIMINAR

**Frontend:**

```
- components/comun/SearchCuidadores.tsx
- screens/tutor/SeleccionarCuidador.tsx
- screens/admin/* (completa)
- navigation/AdminTabNavigator.tsx (mantener pero simplificado)
- hooks/paseos/useSeleccionarCuidador.ts
- logic/paseos/escalarSolicitudes.ts (autescalada)
```

**Backend (Functions):**

```
- escalarSolicitudes.ts
- Cloud Tasks queue (desactivar)
- h3_zonas update logic (mantener data pero no actualizar)
```

### CÓDIGO A CREAR

**Frontend - Screens:**

```
screens/comun/
├─ Bienvenida.tsx (nueva)
├─ OnboardingProgresivo.tsx (nueva, progressive sheet)
└─ ConozcaCuidadores.tsx (nueva, carrusel educativo)

screens/tutor/
├─ SolicitarPaseoProgresivo.tsx (nueva, bottom sheet 6 pasos)
├─ BuscarDisponiblesTerritorial.tsx (nueva, matching)
├─ PaseoEnVivo.tsx (reescrito, minimal)
├─ ResumenPaseo.tsx (reescrito, ritual)
├─ ReagendarRapido.tsx (nueva, 1-tap)
└─ Historial.tsx (modificado, por cuidador)

screens/cuidador/
├─ Disponibilidad.tsx (nueva, weekly + exceptions)
└─ ControlPaseo.tsx (simplificado)

screens/admin/
├─ TerritorioVivo.tsx (adaptado del actual)
├─ CuidadoresValidacion.tsx (nuevo)
└─ SoporteIncidentes.tsx (nuevo)
```

**Frontend - Components:**

```
components/tutor/
├─ SeleccionadorMascota.tsx
├─ SeleccionadorDireccion.tsx
├─ SeleccionadorFecha.tsx
├─ SeleccionadorHora.tsx
├─ SeleccionadorDuracion.tsx
├─ CardCuidadorDisponible.tsx
└─ AgregaFavorito.tsx

components/cuidador/
├─ DisponibilidadSemanal.tsx
├─ ExcepcionesEditor.tsx
└─ ControlPaseoMinimal.tsx

components/admin/
└─ TerritorioStats.tsx (adaptado)
```

**Frontend - Contexts & Hooks:**

```
contexts/
├─ RelacionesContext.tsx (NUEVA)
└─ (mantener AuthContext, MascotasContext)

hooks/
├─ useRelacionesCuidador.ts (nueva)
├─ useFavoritosCuidador.ts (nueva)
├─ usePaseosPendientes.ts (nueva)
├─ usePaseosProximos.ts (nueva)
├─ useBuscarCuidadoresDisponibles.ts (nueva)
├─ usePaseoEnVivo.ts (simplificado)
└─ useDisponibilidadCuidador.ts (nueva)
```

**Backend - Functions:**

```
functions/src/matching/
├─ buscarCuidadoresDisponibles.ts (NUEVA, crítica)
└─ validarDisponibilidad.ts (helper)

functions/src/relaciones/
├─ onCrearRelacion.ts (nueva)
├─ onAceptarRelacion.ts (nueva)
└─ onCompletarPaseo.ts (nueva)

functions/src/territorio/
├─ calcularTerritorioStats.ts (nueva)
└─ actualizarTerritorioNode.ts (nueva)
```

**Data & Config:**

```
Firestore Rules (completas, territoriales)
Migration script (si aplica)
Seed data (cuidadores demo por territorio)
Index definitions (búsquedas territoriales)
```

**Services (mantener existentes, extender):**

```
services/firebase/
├─ firestore/colecciones/
│   ├─ relaciones.ts (nueva)
│   ├─ territorio.ts (nueva)
│   └─ (mantener existentes)
├─ territories.ts (nueva)
└─ matching.ts (nueva)
```

---

## ⏰ TIMELINE DE DESARROLLO

### FASE 0: PREPARACIÓN (2-3 días)

```
Semana 1 (Lunes-Miércoles)

✓ Aprobación arquitectura territorial
✓ Definir TerritoryNode exactamente
✓ Crear esquema Firestore nuevo (incluye territories)
✓ Documentar consistencia de nombres
✓ Crear plan de testing operacional
✓ Backup código actual
```

### FASE 1: BASE DE DATOS Y TERRITORIO (3-4 días)

```
Semana 1 (Jueves-Viernes) + Semana 2 (Lunes)

✓ Crear colección territories/{h3_index}
✓ Crear colección relaciones_cuidador_tutor
✓ Modificar usuarios (agregar h3_principal, h3_secundarios)
✓ Modificar perfiles_publicos (horario_semanal + excepciones)
✓ Modificar paseos (relacion_id, paseo_gps simple)
✓ Crear Firestore Rules territoriales
✓ Crear seed data (territorio demo + 5-10 cuidadores demo)
```

### FASE 2: ONBOARDING PROGRESIVO (4-5 días)

```
Semana 2 (Martes-Viernes)

✓ Screen Bienvenida
✓ Screen OnboardingProgresivo (progressive sheet, 3 pasos)
✓ Screen ConozcaCuidadores (carrusel educativo)
✓ Context RelacionesContext
✓ Hooks para relaciones
✓ Testing: flujo onboarding completo
```

### FASE 3: SOLICITAR PASEO PROGRESIVO (5-6 días)

```
Semana 3 (Lunes-Viernes)

✓ Screen SolicitarPaseoProgresivo (bottom sheet, 6 pasos)
✓ Componentes selectores (mascota, dirección, fecha, hora, duración)
✓ Validaciones en tiempo real
✓ Resumen pre-búsqueda
✓ Testing: cada paso del progresivo
```

### FASE 4: MATCHING TERRITORIAL (5-7 días)

```
Semana 4-5 (Lunes-Miércoles)

✓ Cloud Function buscarCuidadoresDisponibles
  - Valida horario_semanal + excepciones_manuales
  - Busca en territorio (h3_index del tutor)
  - Prioriza favoritos disponibles
  - Retorna máximo 5 opciones
✓ Screen BuscarDisponiblesTerritorial (3 escenarios)
✓ Hook useBuscarCuidadoresDisponibles
✓ Testing: matching lógica completa
```

### FASE 5: CONFIRMACIÓN Y ESPERA (3-4 días)

```
Semana 5 (Jueves-Viernes) + Semana 6 (Lunes)

✓ Screen Esperando Confirmación
✓ Cloud Function onAceptarRelacion
✓ Cloud Function onRechazoRelacion
✓ Notificaciones: cuidador (invitación)
✓ Notificaciones: tutor (aceptado/rechazado)
✓ Timeout: 1 hora → auto-siguiente opción
✓ Testing: aceptación/rechazo flows
```

### FASE 6: DURANTE PASEO (EMOCIONAL) (3-4 días)

```
Semana 6 (Martes-Viernes)

✓ Screen PaseoEnVivo (minimal: inicio + checkpoint + finalizó)
✓ GPS simple (4 momentos: inicio, checkpoint(s), finalizó)
✓ Mapa simple (ubicación aproximada)
✓ Contador tiempo
✓ Fotos checkpoint (si envía cuidador)
✓ Testing: durante paseo flow
```

### FASE 7: POST-PASEO Y RITUALES (3-4 días)

```
Semana 7 (Lunes-Martes)

✓ Screen ResumenPaseo (ritual de cierre)
✓ Fotos + observaciones cuidador
✓ Puntuación + comentario tutor
✓ Screen AgregaFavorito (ritual de relación)
✓ Cloud Function onCompletarPaseo
  - Actualizar relacion.confianza
  - Actualizar territorio.estadisticas
✓ Testing: post-paseo flow
```

### FASE 8: RECURRENCIA Y FAVORITOS (2-3 días)

```
Semana 7 (Miércoles-Viernes)

✓ Screen ReagendarRapido (1-tap)
✓ Dashboard actualizado (favoritos + próximos)
✓ Historial por cuidador
✓ Bonificación -10% después 5 paseos
✓ Testing: recurrencia flows
```

### FASE 9: ADMIN SIMPLIFICADO (2-3 días)

```
Semana 8 (Lunes-Martes)

✓ Screen TerritorioVivo (adaptado del actual)
✓ Screen CuidadoresValidacion (validar, suspender)
✓ Screen SoporteIncidentes (ver casos)
✓ Métricas territoriales básicas
✓ Testing: admin flows
```

### FASE 10: DISPONIBILIDAD CUIDADOR (2-3 días)

```
Semana 8 (Miércoles-Viernes)

✓ Screen DisponibilidadSemanal (weekly_template editor)
✓ ExcepcionesEditor (manual overrides)
✓ Validación en tiempo real
✓ Testing: disponibilidad flows
```

### FASE 11: CLEANUP Y OPTIMIZACIÓN (2 días)

```
Semana 9 (Lunes)

✓ Eliminar código viejo (marketplace features)
✓ Desactivar h3_zonas updates
✓ Remover Cloud Tasks
✓ Limpiar imports no usados
✓ Optimizar assets
✓ Testing final: flujos completos
```

### FASE 12: TESTING Y FIXES (3-5 días)

```
Semana 9 (Martes-Viernes) + Buffer

✓ Testing E2E (usuario nuevo → primer paseo → favorito)
✓ Testing territorial (múltiples zonas)
✓ Testing disponibilidad (excepciones, timeouts)
✓ Testing offline (qué se queda)
✓ Testing seguridad (Firestore Rules)
✓ Fixes críticos
✓ Documentación
```

**TOTAL: 7-9 semanas realistas (1 semana más que anterior, pero más sólido)**

---

## 💰 IMPACTO FINANCIERO

### COSTO FIREBASE ANTES (Marketplace)

```
Operación por usuario/semana:

Tutor:
• 3-5 búsquedas (listeners globales)    20 reads
• 1-2 solicitudes creadas                2 writes
• Listener solicitudes realtime          10 reads
                              Subtotal: 32 ops

Cuidador:
• Listener solicitudes realtime          10 reads
• 1-2 aceptaciones                       2 writes
• Tracking GPS agresivo                  30 writes
                              Subtotal: 42 ops

Admin (escalada automática):
• Cloud Functions 2-5 veces
• Cloud Tasks queue
                              Subtotal: Variable

TOTAL POR USUARIO: ~75 reads + 35 writes
ESCALA: $0.40/mes por usuario (10 usuarios)
        $4-5/mes (100 usuarios)
        $40-50/mes (1,000 usuarios)
```

### COSTO FIREBASE DESPUÉS (Territorial + Emocional)

```
Operación por usuario/semana:

Tutor:
• 1 query relaciones (sin listener)     1 read
• 0-1 solicitud creada                  1 write
• Listener paseos asignados (solo VER)  2 reads
                              Subtotal: 4 ops

Cuidador:
• Listener paseos asignados              2 reads
• 0-1 confirmaciones                     1 write
• GPS emocional (4 momentos, no continuo) 0-5 writes
                              Subtotal: 3-8 ops

Admin (matching):
• Cloud Function solo cuando solicita
• NO Cloud Tasks (búsqueda manual)
                              Subtotal: 1 op

TOTAL POR USUARIO: ~6 reads + 2 writes = 8 ops/semana
REDUCCIÓN: 93-94% vs marketplace

ESCALA: $0.024/mes por usuario (10 usuarios)
        $0.24/mes (100 usuarios)
        $2.4/mes (1,000 usuarios)
        $24/mes (10,000 usuarios)
```

### COMPARACIÓN CLARA

```
Usuarios │ MARKETPLACE    │ TERRITORIAL    │ AHORRO
─────────┼────────────────┼────────────────┼──────────
10       │ $0.40/mes      │ $0.024/mes     │ 94%
100      │ $4-5/mes       │ $0.24/mes      │ 94%
1,000    │ $40-50/mes     │ $2.40/mes      │ 94%
10,000   │ $400-500/mes   │ $24/mes        │ 94%
100,000  │ $4000-5000/mes │ $240/mes       │ 94%
```

**A 10,000 usuarios, PawPath Territorial cuesta $24/mes vs $400-500/mes en modelo marketplace.**

---

## 🌍 ESTRATEGIA TERRITORIAL

### No Pienses En Expansión Horizontal

**INCORRECTO:**

```
Medellín (completa) → Bogotá → Cali → Barranquilla
500K usuarios potenciales cada una
Imposible de operar
```

### Piensa En Densidad Territorial

**CORRECTO:**

```
FASE 1: Laureles (Medellín)
  • Población: ~150K
  • Mascotas (estimado): 30-40K
  • Target MVP: 100 tutores, 15-20 cuidadores
  • Densidad: Todos se conocen, repetición natural
  • Duración: 4-6 meses

FASE 2: Belén (Medellín)
  • Población: ~200K
  • Mascotas (estimado): 40-50K
  • Target: 150 tutores, 20-25 cuidadores
  • Densidad: Red natural + aprenden de Laureles
  • Duración: 3-4 meses (modelo conocido)

FASE 3: Envigado (Medellín)
  • Población: ~130K
  • Mascotas (estimado): 25-30K
  • Target: 100 tutores, 15-20 cuidadores
  • Densidad: Modelo replicable de Laureles

FASE 4: Otras ciudades
  • Bogotá: Usaquén (modelo Laureles)
  • Cali: San Alejo (modelo Laureles)
  • Barranquilla: Altamira (modelo Laureles)
```

### Ventajas de Estrategia Territorial

1. **Densidad = Retención**
   - Más opciones locales = más contexto
   - Mismo parque, mismo cuidador = ritual

2. **Operación Real**
   - Puedes validar cuidadores en persona
   - Puedes saber qué funciona
   - Puedes arreglar problemas rápido

3. **Crecimiento Sostenible**
   - No escalas sin entender
   - Costo por usuario = constante
   - Modelo replicable exactamente

4. **Diferenciación Real**
   - Competencia es global
   - PawPath es territorial
   - Casi imposible copiar

5. **Valor para Usuario**
   - No "mil opciones"
   - "Los 5 cuidadores que todos quieren"
   - Confianza real

### Métrica de Éxito Territorial

Para considerar zona "exitosa":

```
✓ 30% de disponibilidad semanal (cuidadores cubiertos)
✓ 70% de solicitudes respondidas en <1 hora
✓ 80%+ de paseos con rating 4+
✓ 40%+ de recurrencia (mismo cuidador 2+ paseos)
✓ Net Promoter Score >60 (recomendaría a amigos)
```

Cuando un territorio alcanza esto, replica el modelo en la siguiente zona.

---

## ✅ CHECKLIST PRE-CONSTRUCCIÓN

### Decisiones Aprobadas

- [x] PawPath es infraestructura territorial (no marketplace)
- [x] Crecimiento es territorial (densidad, no expansión)
- [x] Matching es contextual territorial (favoritos → zona → nuevos)
- [x] Disponibilidad simple (weekly_template + excepciones)
- [x] GPS emocional (inicio → checkpoint → finalizó, no telemetría)
- [x] Rituales > features (consistencia = confianza)
- [x] Progressive sheet para UX (no 6 screens completas)
- [x] Admin reducido pero presente (territorio vivo adaptado)
- [x] Costo Firebase 94% menor
- [x] Retención por recurrencia (no descuentos)

### Antes de Iniciar Desarrollo

- [ ] Validar TerritoryNode architecture con equipo
- [ ] Ejecutar 5-10 simulaciones operacionales manuales
- [ ] Definir rituales clave exactamente
- [ ] Listar funciones admin mínimo necesario
- [ ] Elegir territorio MVP (Laureles propuesto)
- [ ] Definir equipo (1-2 devs, cuánto tiempo dedicado)
- [ ] Setup CI/CD listo
- [ ] Testing framework definido

### Comunicación

- [ ] Documentar para equipo (este plan)
- [ ] Demostrar rituales en prototipo (figma)
- [ ] Alineación stakeholders
- [ ] Go/no-go final antes de FASE 0

---

## 🎯 RESUMEN EJECUTIVO

### Transformación Estratégica

**DE:** App para pedir paseos (Uber copy)

- Cientos de opciones
- Ansiedad, baja retención
- Costo Firebase crece con escala

**A:** Infraestructura territorial de confianza

- Relaciones recurrentes densas
- Tranquilidad, alta retención
- Costo Firebase 94% menor
- Modelo extremadamente difícil de copiar

### Diferenciales Críticos

1. **Matching territorial** (no galería global)
2. **Énfasis en rituales** (no features)
3. **Disponibilidad simple** (no calendar engine)
4. **GPS emocional** (no telemetría)
5. **Crecimiento territorial** (densidad, no expansión)
6. **Grafo de confianza** como activo real

### Timeline Realista

- **7-9 semanas** a MVP funcional territorial
- **1-2 devs** con tiempo dedicado
- **1 territorio piloto** (Laureles)
- **Testing riguroso** en operación real

### Siguiente Paso

**Aprobación estratégica:**

- Validar vision de infraestructura territorial
- Elegir territorio MVP
- Inicio Fase 0 (preparación)

---

**Generado**: 19 de mayo de 2026 (V2 - Arquitectura Territorial)  
**Status**: Listo para aprobación estratégica + inicio Fase 0  
**Contacto**: Arquitecto PawPath
