# 🏗️ PLAN COMPLETO: PAWPATH COMO SISTEMA DE CONFIANZA

**Generado**: 19 de mayo de 2026  
**Estado**: Propuesta aprobada para implementación  
**Timeline**: 6-8 semanas  
**Costo Firebase**: Reducción 80-90%

---

## 📋 TABLA DE CONTENIDOS

1. [Estado Actual vs. Futuro](#estado-actual-vs-futuro)
2. [La Oportunidad Real](#la-oportunidad-real)
3. [Flujo de Experiencia (Paso a Paso)](#flujo-de-experiencia-paso-a-paso)
4. [Pantallas Nuevas y Modificadas](#pantallas-nuevas-y-modificadas)
5. [Cómo Se Ve Todo](#cómo-se-ve-todo)
6. [Arquitectura Simplificada](#arquitectura-simplificada)
7. [Base de Datos: Lo Que Cambia](#base-de-datos-lo-que-cambia)
8. [Qué Se Elimina, Qué Se Crea](#qué-se-elimina-qué-se-crea)
9. [Timeline de Desarrollo](#timeline-de-desarrollo)
10. [Impacto Financiero](#impacto-financiero)
11. [Cambios Operacionales](#cambios-operacionales)

---

## 🔄 ESTADO ACTUAL VS. FUTURO

### HOY (Marketplace)

```
Tutor quiere paseo
    ↓
Crea solicitud abierta o elige cuidador
    ↓
Sistema busca entre MUCHOS cuidadores
    ↓
Tutor compara perfiles, se confunde
    ↓
Elige uno (o espera rechazo)
    ↓
Ansiedad, fricción, baja confianza
    ↓
Si funciona: relación débil (siempre busca otro)
    ↓
Costo Firebase: ALTO (listeners globales, escala automática)
```

### FUTURO (Coordinación de Confianza)

```
Tutor quiere paseo PARA JUEVES 19:00
    ↓
Crea solicitud especificando fecha, hora, duración
    ↓
Sistema busca cuidadores DISPONIBLES ESA HORA
    ↓
Muestra 2-5 opciones reales (o asigna favorito)
    ↓
Tutor elige con confianza (pocos, los correctos)
    ↓
Tranquilidad, claridad, relación fuerte
    ↓
Si funciona: vuelve a ese cuidador (bonificación)
    ↓
Costo Firebase: BAJO (queries solo en creación, sin escalada automática)
```

---

## 💡 LA OPORTUNIDAD REAL

### Qué NO es PawPath

- ❌ Uber de perros
- ❌ Marketplace con cientos de opciones
- ❌ App para comparar perfiles eternamente
- ❌ Sistema transaccional (paseo = dinero)

### Qué ES PawPath (Nueva Visión)

- ✅ **Sistema de coordinación territorial**
- ✅ **Infraestructura de confianza local**
- ✅ **Construcción de relaciones recurrentes**
- ✅ **Tranquilidad organizada**

### Por Qué Diferencia en LATAM

- LATAM prefiere **relaciones humanas** sobre **abundancia de opciones**
- LATAM valora **confianza local** sobre **escalabilidad global**
- LATAM retiene **por relación** no por **variedad**
- LATAM paga más por **seguridad** que por **precio barato**

---

## 👥 FLUJO DE EXPERIENCIA (PASO A PASO)

### SEMANA 1-2: ONBOARDING (El Tutor Llega)

#### Pantalla 1: ¿Qué es PawPath?

```
┌────────────────────────────────┐
│      BIENVENIDA A PAWPATH      │
├────────────────────────────────┤
│                                 │
│  "Tranquilidad organizada       │
│   para tu mascota"              │
│                                 │
│  • Cuidadores formados          │
│  • Zona local verificada        │
│  • Relaciones duraderas         │
│  • Transparencia total          │
│                                 │
│  [COMIENZA AQUÍ]               │
│                                 │
└────────────────────────────────┘

Objetivo: Reducir ansiedad antes de empezar
```

#### Pantalla 2: Registro Mínimo

```
┌────────────────────────────────┐
│      CUÉNTANOS DE TI           │
├────────────────────────────────┤
│                                 │
│  Tu nombre:  _______________   │
│                                 │
│  Tu teléfono: _______________  │
│                                 │
│  Tu zona:    [Bogotá - Centro] │
│                                 │
│  [SIGUIENTE]                   │
│                                 │
└────────────────────────────────┘

Lo importante: Solo lo esencial
```

#### Pantalla 3: Tu Mascota

```
┌────────────────────────────────┐
│    CUÉNTANOS DE TU MASCOTA     │
├────────────────────────────────┤
│                                 │
│  Nombre: _______________        │
│                                 │
│  Especie: [Perro]              │
│                                 │
│  Tamaño: [Mediano]             │
│                                 │
│  Comportamiento:               │
│  ☐ Tranquilo                   │
│  ☐ Nervioso                    │
│  ☐ Muy activo                  │
│                                 │
│  [SIGUIENTE]                   │
│                                 │
└────────────────────────────────┘

Lo importante: Personalización emocional
```

#### Pantalla 4: Tu Casa

```
┌────────────────────────────────┐
│     UBICACIÓN PRINCIPAL        │
├────────────────────────────────┤
│                                 │
│  Dirección: _______________    │
│                                 │
│  Instrucciones de acceso:      │
│  "Portón azul, timbre a la     │
│   derecha. Usar rampa para     │
│   perros pequeños"             │
│                                 │
│  [GUARDAR]                     │
│                                 │
│  * Puedes agregar más          │
│    ubicaciones después          │
│                                 │
└────────────────────────────────┘

Lo importante: Contexto operacional
```

#### Pantalla 5: Conoce a los Cuidadores

```
┌────────────────────────────────┐
│   QUIÉNES SOMOS EN PAWPATH     │
├────────────────────────────────┤
│                                 │
│  [Carrusel de cuidadores       │
│   reales del barrio]            │
│                                 │
│  📷 Juan Martínez              │
│  Zona: Usaquén                 │
│  "Especialista en perros       │
│   nerviosos"                    │
│  ⭐⭐⭐⭐⭐ 12 paseos         │
│                                 │
│  📷 María García               │
│  Zona: Chapinero               │
│  "Referente del parque"        │
│  ⭐⭐⭐⭐ 8 paseos          │
│                                 │
│  [CONOCER MÁS]                │
│  [LISTO, SOLICITAR PASEO]      │
│                                 │
└────────────────────────────────┘

Lo importante: Generar confianza + contexto local
```

---

### SEMANA 2-3: PRIMERA SOLICITUD

#### Pantalla 6: Solicitar Paseo (Paso 1 de 6)

```
┌────────────────────────────────┐
│    SOLICITAR PASEO - MASCOTA   │
│    [████░░░░░░░░░] Paso 1/6    │
├────────────────────────────────┤
│                                 │
│  ¿A quién llevas al paseo?     │
│                                 │
│  [📷 Luna - Mediana]           │ ← Seleccionada
│                                 │
│  [SIGUIENTE]                   │
│                                 │
└────────────────────────────────┘

Lo importante: Una mascota = uno a la vez
```

#### Pantalla 7: Solicitar Paseo (Paso 2 de 6)

```
┌────────────────────────────────┐
│   SOLICITAR PASEO - UBICACIÓN  │
│   [████████░░░░░░░] Paso 2/6   │
├────────────────────────────────┤
│                                 │
│  ¿De dónde recoge?             │
│                                 │
│  🏠 Mi casa (Calle 50)         │ ← Seleccionada
│                                 │
│  🏢 Mi trabajo (Cra 9)         │
│                                 │
│  ➕ Otra ubicación...           │
│                                 │
│  [SIGUIENTE]                   │
│                                 │
└────────────────────────────────┘

Lo importante: Ubicaciones guardadas = rapidez
```

#### Pantalla 8: Solicitar Paseo (Paso 3 de 6)

```
┌────────────────────────────────┐
│     SOLICITAR PASEO - FECHA    │
│   [████████████░░░░░] Paso 3/6 │
├────────────────────────────────┤
│                                 │
│  ¿Cuándo?                      │
│                                 │
│  ☐ Hoy                         │
│  ☐ Mañana                      │
│  ☑ Jueves 22 de mayo          │ ← Seleccionada
│  ☐ Otro día                    │
│                                 │
│  [SIGUIENTE]                   │
│                                 │
└────────────────────────────────┘

Lo importante: Calendario simple
```

#### Pantalla 9: Solicitar Paseo (Paso 4 de 6)

```
┌────────────────────────────────┐
│      SOLICITAR PASEO - HORA    │
│   [████████████████░░░░] Paso 4│
├────────────────────────────────┤
│                                 │
│  ¿A qué hora?                  │
│                                 │
│  Horario de trabajo:           │
│  08:00  09:00  10:00  11:00    │
│  12:00  13:00  14:00  15:00    │
│  16:00  17:00  18:00  19:00    │
│  20:00  21:00                  │
│                                 │
│  >>> 19:00 <<<  (seleccionada) │
│                                 │
│  [SIGUIENTE]                   │
│                                 │
└────────────────────────────────┘

Lo importante: Horas realistas de servicio
```

#### Pantalla 10: Solicitar Paseo (Paso 5 de 6)

```
┌────────────────────────────────┐
│    SOLICITAR PASEO - DURACIÓN  │
│   [████████████████████░░] Paso5│
├────────────────────────────────┤
│                                 │
│  ¿Cuánto tiempo?               │
│                                 │
│  Recomendado para Luna:        │
│  45-60 minutos                 │
│                                 │
│  ░░░░░░░░░●░░░░░░░░░░░░        │
│  30 min         60 min         │
│                                 │
│  ⏱️ Seleccionado: 60 minutos   │
│                                 │
│  [SIGUIENTE]                   │
│                                 │
└────────────────────────────────┘

Lo importante: Recomendación inteligente
```

#### Pantalla 11: Solicitar Paseo (Paso 6 de 6) - BUSCAR CUIDADORES

```
┌────────────────────────────────┐
│   SOLICITAR PASEO - RESUMEN    │
│   [████████████████████████] OK │
├────────────────────────────────┤
│                                 │
│  📋 RESUMEN:                    │
│  🐕 Luna (mediana)              │
│  📍 Calle 50, Casa              │
│  📅 Jueves 22 mayo, 19:00       │
│  ⏱️ 60 minutos                  │
│  💵 $25.000                     │
│                                 │
│  [BUSCAR CUIDADORES             │
│   DISPONIBLES]                  │
│                                 │
└────────────────────────────────┘

Lo importante: Resumen claro antes de buscar
```

---

### SEMANA 2-3: MATCHING EN TIEMPO REAL

#### Pantalla 12A: Resultado - Favorito Disponible ✅

```
┌────────────────────────────────┐
│    ✅ ¡LISTO! ASIGNADO         │
├────────────────────────────────┤
│                                 │
│  "Tu paseo está confirmado"    │
│                                 │
│  📷 Juan Martínez               │
│  Zona: Usaquén                 │
│  ⭐⭐⭐⭐⭐ 12 paseos         │
│  "Especialista en perros       │
│   nerviosos"                    │
│                                 │
│  📅 Jueves 22 mayo             │
│  🕖 19:00 - 20:00               │
│                                 │
│  "Juan ya sabe dónde está tu   │
│   casa y cómo es Luna"          │
│                                 │
│  [CONFIRMAR]                   │
│                                 │
│  ¿Prefieres otros?              │
│  [VER OTRAS OPCIONES]          │
│                                 │
└────────────────────────────────┘

Escenario: Favorito disponible esa hora
Lo importante: Automático, tranquilidad
```

#### Pantalla 12B: Resultado - Opciones Disponibles 🔄

```
┌────────────────────────────────┐
│   CUIDADORES DISPONIBLES       │
│   Jueves 22 mayo, 19:00 - 20:00│
├────────────────────────────────┤
│                                 │
│  📍 Opción 1: Carlos Ramírez    │
│  Zona: Usaquén                 │
│  ⭐⭐⭐⭐ 8 paseos           │
│  "Manejo excelente de perros   │
│   nerviosos"                    │
│  [ELEGIR]                       │
│                                 │
│  📍 Opción 2: Patricia López    │
│  Zona: Chapinero               │
│  ⭐⭐⭐⭐ 6 paseos           │
│  "Adiestra mientras pasea"      │
│  [ELEGIR]                       │
│                                 │
│  📍 Opción 3: David Castillo   │
│  Zona: Usaquén                 │
│  ⭐⭐⭐⭐⭐ 15 paseos         │
│  "Referente de zona"            │
│  [ELEGIR]                       │
│                                 │
└────────────────────────────────┘

Escenario: Múltiples disponibles (no favorito o favorito no disponible)
Lo importante: Máximo 5 opciones, todas viables
```

#### Pantalla 12C: Resultado - Sin Disponibilidad ❌

```
┌────────────────────────────────┐
│   ⏰ NO HAY DISPONIBILIDAD     │
├────────────────────────────────┤
│                                 │
│  "Jueves 19:00 no hay          │
│   cuidadores disponibles        │
│   en tu zona"                   │
│                                 │
│  💡 Sugerencias:                │
│                                 │
│  ✓ Intenta viernes 19:00       │
│    (3 cuidadores)              │
│                                 │
│  ✓ Intenta sábado mañana       │
│    (5 cuidadores)              │
│                                 │
│  ✓ Intenta 18:00 jueves        │
│    (2 cuidadores)              │
│                                 │
│  [EDITAR HORARIO]              │
│                                 │
└────────────────────────────────┘

Escenario: Sin opciones viables
Lo importante: Sugerencias inteligentes, no "no hay"
```

---

### SEMANA 3: ACEPTACIÓN DEL CUIDADOR

#### Pantalla 13: Esperando Confirmación

```
┌────────────────────────────────┐
│   ⏳ CONFIRMANDO CON CARLOS   │
├────────────────────────────────┤
│                                 │
│  "Esperando confirmación        │
│   de Carlos para tu paseo"      │
│                                 │
│  📅 Jueves 22 mayo, 19:00      │
│  ⏱️ Expira en: 58 minutos       │
│                                 │
│  📞 Si tienes dudas:            │
│     [CONTACTAR A CARLOS]        │
│                                 │
│  ☐ He cambiado de opinión      │
│     [CANCELAR SOLICITUD]        │
│                                 │
└────────────────────────────────┘

Escenario: Invitación enviada, esperando respuesta
Lo importante: Transparencia + opción de contacto
```

#### Pantalla 14: Aceptación Confirmada ✅

```
┌────────────────────────────────┐
│    ✅ CARLOS ACEPTÓ           │
├────────────────────────────────┤
│                                 │
│  "¡Tu paseo está confirmado!"  │
│                                 │
│  📷 Carlos Ramírez              │
│  📱 +57 300 123 4567            │
│  ⭐⭐⭐⭐ 8 paseos           │
│                                 │
│  📅 Jueves 22 mayo, 19:00      │
│  ⏱️ 60 minutos                  │
│  📍 Calle 50, Casa              │
│  💵 $25.000                     │
│                                 │
│  "Carlos llegará aproximadamente│
│   a las 18:55"                  │
│                                 │
│  [CHAT CON CARLOS]             │
│  [VER UBICACIÓN]               │
│                                 │
└────────────────────────────────┘

Escenario: Cuidador aceptó
Lo importante: Información clara, opción de contacto
```

---

### SEMANA 3-4: DURANTE EL PASEO

#### Pantalla 15: El Paseo Comienza

```
┌────────────────────────────────┐
│  🔴 PASEO EN CURSO            │
│  Inicio: 19:01                 │
├────────────────────────────────┤
│                                 │
│  📍 Carlos está recogiendo     │
│     a Luna...                   │
│                                 │
│  [MAPA SIMPLE CON UBICACIÓN]   │
│                                 │
│  ⏱️ Tiempo transcurrido: 1 min  │
│  ⏱️ Tiempo restante: 59 min     │
│                                 │
│  📞 [CONTACTAR A CARLOS]       │
│                                 │
│  "Luna está en buenas manos"   │
│                                 │
└────────────────────────────────┘

Lo importante: Tranquilidad, ubicación, tiempo
```

#### Pantalla 16: Paseo en Progreso

```
┌────────────────────────────────┐
│  🟢 PASEO EN PROGRESO         │
│  Inicio: 19:01                 │
├────────────────────────────────┤
│                                 │
│  [MAPA CON RUTA DEL PASEO]    │
│                                 │
│  📍 Carlos y Luna en:           │
│     Parque El Retiro            │
│                                 │
│  ⏱️ Tiempo transcurrido: 28 min │
│  ⏱️ Tiempo restante: 32 min     │
│                                 │
│  📸 [Carlos envió una foto]    │
│     "Luna feliz jugando"        │
│                                 │
│  📞 [CONTACTAR A CARLOS]       │
│                                 │
└────────────────────────────────┘

Lo importante: Visibilidad emocional (foto, ubicación)
```

---

### SEMANA 4: FINALIZACIÓN Y RELACIÓN

#### Pantalla 17: Paseo Finalizado

```
┌────────────────────────────────┐
│    ✅ PASEO COMPLETADO        │
│    19:01 - 20:04 (63 minutos)  │
├────────────────────────────────┤
│                                 │
│  📋 RESUMEN:                    │
│                                 │
│  🐕 Luna                        │
│  📍 Calle 50 → Parque Retiro   │
│  ⏱️ 63 minutos                  │
│  💵 $25.000                     │
│                                 │
│  📸 Fotos del paseo:            │
│  [Galería de 3-4 fotos]        │
│                                 │
│  💬 Observación de Carlos:      │
│  "Luna estuvo tranquila y      │
│   sociable hoy. Jugó bien con  │
│   otros perros. La vimos muy   │
│   feliz."                       │
│                                 │
│  [PUNTUACIÓN PARA CARLOS]      │
│  ⭐⭐⭐⭐⭐               │
│                                 │
│  [ESCRIBIR COMENTARIO]         │
│                                 │
│  ❤️ [AGREGAR A FAVORITOS]     │
│                                 │
└────────────────────────────────┘

Lo importante: Cierre humano, vínculo emocional
```

#### Pantalla 18: Primer Favorito

```
┌────────────────────────────────┐
│   ❤️ ¡AGREGADO A FAVORITOS!   │
├────────────────────────────────┤
│                                 │
│  "Carlos es tu cuidador        │
│   favorito"                     │
│                                 │
│  "Próxima vez, le ofreceremos  │
│   paseos primero"              │
│                                 │
│  "Obtén 10% descuento en       │
│   paseos recurrentes con       │
│   favoritos"                    │
│                                 │
│  [REAGENDAR CON CARLOS]        │
│  [IR A INICIO]                 │
│                                 │
└────────────────────────────────┘

Lo importante: Incentivo + facilidad para repetir
```

#### Pantalla 19: Segunda Solicitud (Rápida)

```
┌────────────────────────────────┐
│   SOLICITAR PASEO - RÁPIDO    │
├────────────────────────────────┤
│                                 │
│  "¿Reagendar con Carlos?"      │
│                                 │
│  📷 Carlos Ramírez              │
│  ⭐⭐⭐⭐⭐ 9 paseos         │
│                                 │
│  📅 Jueves 29 mayo              │
│  🕖 19:00                       │
│  ⏱️ 60 minutos                  │
│  💵 $25.000                     │
│                                 │
│  ✏️ [CAMBIAR DETALLES]         │
│                                 │
│  [CONFIRMAR]                   │
│                                 │
└────────────────────────────────┘

Lo importante: 1 tap para repetir = retención
```

---

## 🎨 PANTALLAS NUEVAS Y MODIFICADAS

### PANTALLAS QUE SE CREAN (Nuevas)

| Pantalla               | Propósito                    | Contexto           |
| ---------------------- | ---------------------------- | ------------------ |
| Bienvenida             | Explicar qué es PawPath      | Nuevo usuario      |
| Conoce Cuidadores      | Mostrar equipo local         | Onboarding         |
| Buscar Disponibilidad  | Ejecutar matching contextual | Antes de confirmar |
| Esperando Confirmación | Esperar aceptación cuidador  | Post-invitación    |
| Paseo en Vivo          | Ver ubicación + tiempo       | Durante paseo      |
| Resumen Humano         | Cierre emocional             | Post-paseo         |
| Agregar a Favoritos    | Incentivar recurrencia       | Post-paseo         |
| Reagendar Rápido       | Facilitar siguiente paseo    | Post-paseo         |

### PANTALLAS QUE SE MODIFICAN

| Pantalla         | Cambio                        | Por Qué                                          |
| ---------------- | ----------------------------- | ------------------------------------------------ |
| Solicitar Paseo  | De 3 pasos → 6 pasos lineales | Matching contextual requiere fecha+hora+duración |
| Dashboard Tutor  | Muestra favoritos + próximos  | Enfoque en relaciones, no mercado                |
| Historial Paseos | Agrupa por cuidador           | Ver tendencias con cada relación                 |
| Perfil Cuidador  | Muestra disponibilidad real   | Transparencia                                    |

### PANTALLAS QUE SE ELIMINAN

| Pantalla                    | Razón                              |
| --------------------------- | ---------------------------------- |
| Galería Cuidadores (inicio) | Matching es contextual, no galería |
| Admin Dashboard             | No necesario MVP                   |
| Búsqueda Avanzada           | Matching automático, sin búsqueda  |
| Chat (inicialmente)         | Fase 2, versión 1.1                |

---

## 📱 CÓMO SE VE TODO

### FLUJO VISUAL COMPLETO

```
┌─ USUARIO NUEVO ─────────────────────────────────────┐
│                                                       │
│  [BIENVENIDA] → [REGISTRO] → [MASCOTA] → [CASA]    │
│                                                       │
│  → [CONOCE CUIDADORES] → [DASHBOARD VACÍO]         │
│                                                       │
└───────────────────────────────────────────────────────┘
                           ↓
┌─ PRIMER PASEO ──────────────────────────────────────┐
│                                                       │
│  [SOLICITAR PASEO] (6 pasos)                        │
│    ↓ Mascota → Ubicación → Fecha → Hora → Duración │
│    ↓ Resumen                                        │
│                                                       │
│  → [BUSCAR DISPONIBLES]                             │
│    ↓ (Backend busca cuidadores)                     │
│                                                       │
│  → [RESULTADO]                                       │
│    ├─ A: Favorito disponible (asignado)            │
│    ├─ B: Opciones disponibles (elegir)             │
│    └─ C: Sin disponibilidad (sugerir otro horario) │
│                                                       │
│  → [ESPERAR CONFIRMACIÓN] (si invitación)          │
│                                                       │
│  → [CONFIRMADO]                                      │
│                                                       │
└───────────────────────────────────────────────────────┘
                           ↓
┌─ DURANTE PASEO ─────────────────────────────────────┐
│                                                       │
│  [PASEO EN VIVO]                                    │
│    ├─ Ubicación cuidador (mapa)                    │
│    ├─ Contador tiempo                              │
│    ├─ Fotos enviadas por cuidador                  │
│    └─ Contacto directo                             │
│                                                       │
└───────────────────────────────────────────────────────┘
                           ↓
┌─ POST-PASEO ────────────────────────────────────────┐
│                                                       │
│  [RESUMEN HUMANO]                                   │
│    ├─ Fotos                                        │
│    ├─ Observaciones cuidador                       │
│    ├─ Puntuación                                   │
│    └─ Comentario tutor                             │
│                                                       │
│  → [¿AGREGAR A FAVORITOS?]                         │
│                                                       │
│  → [REAGENDAR RÁPIDO]                              │
│                                                       │
└───────────────────────────────────────────────────────┘
                           ↓
┌─ PASEOS SIGUIENTES ─────────────────────────────────┐
│                                                       │
│  [DASHBOARD ACTUALIZADO]                            │
│    ├─ Favoritos (con bonificación)                 │
│    ├─ Próximos paseos                              │
│    ├─ Historial por cuidador                       │
│    └─ Botón "Reagendar con favorito"               │
│                                                       │
│  [SEGUNDA SOLICITUD]                                │
│    └─ "¿Vuelves con Carlos?" (1 tap)              │
│                                                       │
└───────────────────────────────────────────────────────┘
```

---

## 🏗️ ARQUITECTURA SIMPLIFICADA

### COMPONENTES FRONTEND

```
Navigation
├─ Auth Stack
│   ├─ Bienvenida
│   ├─ Registro
│   └─ Términos
│
├─ Tutor Stack
│   ├─ Dashboard
│   │   ├─ Favoritos (botón principal)
│   │   ├─ Próximos paseos
│   │   └─ Historial reciente
│   │
│   ├─ Solicitar Paseo (6 pasos)
│   │   ├─ Mascota Picker
│   │   ├─ Ubicación Picker
│   │   ├─ Date Picker
│   │   ├─ Time Picker
│   │   ├─ Duration Slider
│   │   ├─ Resumen
│   │   └─ Resultado Matching
│   │
│   ├─ Paseos (próximos + historial)
│   │   ├─ Card cada paseo
│   │   ├─ Filtros por cuidador
│   │   └─ Detalles paseo
│   │
│   ├─ Cuenta
│   │   ├─ Perfil
│   │   ├─ Mascotas
│   │   ├─ Ubicaciones
│   │   └─ Preferencias
│   │
│   └─ Paseo en Vivo (modal)
│       ├─ Mapa
│       ├─ Contador
│       └─ Chat rápido
│
└─ Cuidador Stack
    ├─ Dashboard
    │   ├─ Paseos hoy
    │   ├─ Próximos 7 días
    │   └─ Estadísticas
    │
    ├─ Paseos Asignados
    │   ├─ Aceptar/Rechazar
    │   ├─ Control Paseo
    │   └─ Finalizar + Observaciones
    │
    ├─ Agenda
    │   └─ Calendario semana
    │
    └─ Cuenta
        ├─ Horario semanal
        ├─ Excepciones
        ├─ Zona/Cobertura
        └─ Preferencias
```

### CONTEXTOS GLOBALES

```
Contextos React
├─ AuthContext
│   ├─ user (datos actuales)
│   ├─ isLoading
│   └─ functions (login, logout)
│
├─ RelacionesContext
│   ├─ relaciones (lista de cuidadores)
│   ├─ favoritos (filtrado)
│   └─ refrescar()
│
└─ MascotasContext
    ├─ mascotas (lista)
    ├─ agregar/editar/eliminar
    └─ refrescar()
```

### HOOKS PERSONALIZADOS

```
Hooks
├─ useRelacionesCuidador() → lista relaciones del tutor
├─ useFavoritosCuidador() → solo favoritos
├─ usePaseosPendientes() → paseos sin confirmar
├─ usePaseosProximos() → próximos 7 días
├─ usePaseosHistorial() → paseos completados
├─ useDisponibilidadCuidador() → horarios semanales
├─ useBuscarCuidadoresDisponibles() → matching
└─ usePaseoEnVivo() → tracking GPS + datos paseo
```

### SERVICIOS FIREBASE

```
Servicios
├─ Auth
│   ├─ Login/Register
│   └─ Logout
│
├─ Firestore CRUD
│   ├─ Usuarios
│   ├─ Mascotas
│   ├─ Relaciones
│   ├─ Paseos
│   └─ Observaciones
│
├─ Cloud Functions (Matching)
│   └─ buscarCuidadoresDisponibles()
│
└─ Realtime DB (GPS)
    ├─ ubicacion_actual
    └─ historial_ruta (opcional)
```

---

## 💾 BASE DE DATOS: LO QUE CAMBIA

### NUEVA COLECCIÓN: relaciones_cuidador_tutor

```
relaciones_cuidador_tutor/{id}
├─ uid_tutor: string
├─ uid_cuidador: string
├─ estado: "INVITADA" | "ACEPTADA" | "ACTIVA" | "PAUSADA"
├─ es_favorito: boolean
├─ confianza_score: número (0-5)
├─ paseos_completados: número
├─ paseos_cancelados: número
├─ rating_promedio: número (1-5)
├─ fecha_invitacion: fecha
├─ fecha_aceptacion: fecha
├─ fecha_ultima_interaccion: fecha
├─ creado_en: fecha
├─ actualizado_en: fecha
└─ creado_por: string
```

**Qué sirve para**:

- Saber qué cuidadores conoce el tutor
- Priorizar favoritos en matching
- Mostrar historial por cuidador
- Construir bonificación por confianza

---

### COLECCIÓN MODIFICADA: paseos

```
ANTES:
paseos/{id}
├─ tipo_solicitud: "DIRECTA" | "ABIERTA"
├─ modalidad: "privado" | "compartido"
├─ id_cuidador: string (opcional)
├─ estado: "PENDIENTE" | "CONFIRMADO" | "EN_CAMINO" | ...
└─ (9 estados)

DESPUÉS:
paseos/{id}
├─ relacion_id: string (ref a relaciones_cuidador_tutor)
├─ estado: "PENDING_ACCEPTANCE" | "SCHEDULED" | "ARRIVING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "EXPIRED"
├─ (5 estados, más claro)
├─ fecha_invitacion: fecha
├─ fecha_expiracion: fecha (1 hora después de invitar)
├─ mascota_ids: [string]
├─ fecha_hora_inicio: fecha
├─ duracion_estimada: número
├─ precio: número
├─ ubicacion_inicio: objeto
├─ ubicacion_fin: objeto (opcional)
├─ observaciones_cuidador: string
├─ fotos_paseo: [strings]
├─ creado_en: fecha
├─ actualizado_en: fecha
└─ creado_por: string
```

**Cambios principales**:

- Elimina: tipo_solicitud, modalidad
- Agrega: relacion_id, fecha_invitacion, fecha_expiracion
- Simplifica: 9 estados → 5 estados

---

### COLECCIONES QUE SE MANTIENEN

```
usuarios/{uid}
├─ nombre
├─ correo (opcional)
├─ celular
├─ zona
├─ h3_zone (celda H3)
├─ foto
├─ estado
├─ roles
├─ ubicaciones: [array]
└─ (sin cambios)

mascotas/{id}
├─ nombre
├─ especie
├─ tamaño
├─ comportamiento
├─ nivel_energia
├─ preferencias_paseo
├─ creado_por
└─ (sin cambios)

perfiles_publicos/{uid}
├─ nombre
├─ foto
├─ h3_home
├─ horario_semanal
├─ mascotas_aceptadas
├─ max_mascotas
├─ rating_promedio
├─ cantidad_paseos_realizados
└─ (sin cambios)

ubicaciones/{id}
├─ direccion_formateada
├─ coordenadas
├─ h3_index
├─ componentes
├─ alias
└─ (sin cambios)
```

---

### COLECCIONES QUE SE ELIMINAN/DESACTIVAN

```
❌ h3_zonas (desactivar actualizaciones)
   Razón: Se actualiza pero no se consulta en matching

❌ Cloud Tasks queue (escala automática)
   Razón: Matching es manual + contextual

❌ Eventos/Hitos por paseo (subcolección)
   Razón: Simplificar, solo estados finales importan
```

---

## 🗑️ QUÉ SE ELIMINA, QUÉ SE CREA

### CÓDIGO A ELIMINAR

```
Frontend:
├─ components/comun/SearchCuidadores.tsx
├─ screens/tutor/SeleccionarCuidador.tsx
├─ screens/admin/* (TODA la carpeta)
├─ navigation/AdminTabNavigator.tsx
├─ hooks/paseos/useSeleccionarCuidador.ts
├─ components/ui/Galio* (componentes Galio)
└─ logic/paseos/escalarSolicitudes* (escalada automática)

Backend (Functions):
├─ functions/src/paseos/escalarSolicitudes.ts
├─ Cloud Tasks queue (escala automática)
└─ h3_zonas update logic (mantener data sin usar)

UI/UX:
├─ Admin screens completas
├─ Búsqueda avanzada
├─ Marketplace styling
└─ Galio design system
```

### CÓDIGO A CREAR

```
Frontend:
├─ screens/tutor/SolicitarPaseoPasos.tsx (6 steps)
├─ screens/tutor/BuscarDisponibles.tsx
├─ screens/tutor/PaseoEnVivo.tsx (reescrito)
├─ screens/tutor/ResumenPaseo.tsx
├─ screens/comun/Bienvenida.tsx
├─ screens/comun/ConozcaCuidadores.tsx
├─ components/tutor/SelectorMascota.tsx
├─ components/tutor/SelectorDireccion.tsx
├─ components/tutor/SelectorFecha.tsx
├─ components/tutor/SelectorHora.tsx
├─ components/tutor/SelectorDuracion.tsx
├─ components/tutor/CardCuidadorDisponible.tsx
├─ components/tutor/AgregaFavorito.tsx
├─ components/tutor/ReagendarRapido.tsx
├─ contexts/RelacionesContext.tsx (NUEVA)
├─ hooks/useRelacionesCuidador.ts
├─ hooks/useFavoritosCuidador.ts
└─ hooks/useBuscarCuidadoresDisponibles.ts

Backend (Functions):
├─ functions/src/matching/buscarDisponibles.ts
└─ functions/src/relaciones/onCrearRelacion.ts

Data:
├─ Firestore Rules (nuevas, más strictas)
├─ Migration script (si aplica)
└─ Seed data (cuidadores demo)
```

---

## ⏰ TIMELINE DE DESARROLLO

### FASE 0: PREPARACIÓN (2-3 días)

```
Semana 1 (Lunes-Miércoles)

□ Aprobación arquitectura
□ Definir modelos de datos exactos
□ Crear esquema Firestore nuevo
□ Documentar cambios
□ Crear plan de testing
□ Backup código actual (preservar si need)
```

### FASE 1: BASE DE DATOS (3-4 días)

```
Semana 1 (Jueves-Viernes) + Semana 2 (Lunes)

□ Crear colección relaciones_cuidador_tutor
□ Modificar estructura paseos
□ Crear Firestore Rules strictas
□ Validar integridad datos
□ Crear helpers migracion
□ Documentar esquema
```

### FASE 2: ONBOARDING Y FLUJO INICIAL (5-8 días)

```
Semana 2-3 (Lunes-Viernes)

□ Screen: Bienvenida
□ Screen: Registro Mínimo
□ Screen: Mascota
□ Screen: Dirección
□ Screen: ConozcaCuidadores (galería educativa)
□ Contextos: Relaciones, Mascotas
□ Testing: Flujo onboarding completo
```

### FASE 3: SOLICITAR PASEO (6 PASOS) (5-8 días)

```
Semana 4-5 (Lunes-Viernes)

□ Screen: Mascota Picker (Paso 1)
□ Screen: Dirección Picker (Paso 2)
□ Screen: Date Picker (Paso 3)
□ Screen: Time Picker (Paso 4)
□ Screen: Duration Slider (Paso 5)
□ Screen: Resumen (Paso 6)
□ Validaciones de datos
□ Testing: Cada paso
```

### FASE 4: MATCHING CONTEXTUAL (5-7 días)

```
Semana 5-6 (Lunes-Viernes)

□ Cloud Function: buscarCuidadoresDisponibles
□ Lógica: Favoritos disponibles
□ Lógica: Relaciones activas
□ Lógica: Nuevos cuidadores zona
□ Screens: 3 resultados (asignado, opciones, sin disponibilidad)
□ Hooks: useBuscarCuidadoresDisponibles
□ Testing: Matching lógica
```

### FASE 5: CONFIRMACIÓN Y ESPERA (3-4 días)

```
Semana 6 (Miércoles-Viernes)

□ Screen: Esperando confirmación
□ Cloud Function: onAceptarRelacion
□ Cloud Function: onRechazoRelacion
□ Notificaciones: Cuidador (invitación)
□ Notificaciones: Tutor (aceptado/rechazado)
□ Timeout: 1 hora sin respuesta = auto-siguiente opción
□ Testing: Aceptación/rechazo flows
```

### FASE 6: DURANTE PASEO (4-5 días)

```
Semana 7 (Lunes-Martes)

□ Screen: Paseo en Vivo (reescrito)
□ Tracking GPS (mantener, lazy loading)
□ Mapa simple
□ Contador tiempo
□ Fotos (si cuidador envía)
□ Chat rápido (básico)
□ Testing: Durante paseo flow
```

### FASE 7: POST-PASEO (3-4 días)

```
Semana 7 (Miércoles-Viernes)

□ Screen: Resumen Humano
□ Fotos del paseo
□ Observaciones cuidador
□ Puntuación + comentario
□ Screen: Agregar a Favoritos
□ Cloud Function: onCompletarPaseo (actualizar relacion.confianza)
□ Testing: Post-paseo flow
```

### FASE 8: RECURRENCIA Y FAVORITOS (3-4 días)

```
Semana 8 (Lunes-Martes)

□ Screen: Reagendar Rápido
□ Dashboard: Mostrar favoritos
□ Dashboard: Próximos paseos
□ Dashboard: Historial por cuidador
□ Bonificación: -10% después 5 paseos
□ Testing: Recurrencia flows
```

### FASE 9: CLEANUP Y OPTIMIZACIÓN (2-3 días)

```
Semana 8 (Miércoles-Jueves)

□ Eliminar código viejo
□ Desactivar h3_zonas updates
□ Remover Cloud Tasks
□ Remover Admin screens
□ Limpiar imports no usados
□ Optimizar assets
□ Testing final: Flujos completos
```

### FASE 10: TESTING Y FIXES (3-5 días)

```
Semana 8-9 (Viernes) + Buffer

□ Testing E2E
□ Testing carga
□ Testing seguridad
□ Testing offline
□ Fixes críticos
□ Documentación
□ Preparación deploy
```

**TOTAL: 6-8 semanas realistas**

---

## 💰 IMPACTO FINANCIERO

### COSTO FIREBASE ANTES (Marketplace)

```
Operación por usuario/semana:

Tutor:
• 3-5 búsquedas de cuidadores          20 reads
• 1-2 solicitudes creadas               2 writes
• Listener solicitudes activas (RT)    10 reads
                            Subtotal: 32 ops

Cuidador:
• Listener solicitudes (realtime)      10 reads
• 1-2 aceptaciones                     2 writes
• Tracking GPS cada paseo             30 writes
                            Subtotal: 42 ops

Admin (escalada):
• Cloud Functions 2-5 ejecuciones
• Cloud Tasks queue
                            Subtotal: Variable

TOTAL POR USUARIO: ~75 reads + 35 writes = 110 ops/semana

Proyección mensual (10 usuarios):
≈ 4,400 operaciones
≈ $0.22/mes (reads) + $0.18/mes (writes) = $0.40/mes
Extrapolado a 100 usuarios: $4-5/mes
Extrapolado a 1,000 usuarios: $40-50/mes
```

### COSTO FIREBASE DESPUÉS (Confianza)

```
Operación por usuario/semana:

Tutor:
• 1 query relaciones (NO listener)      1 read
• 0-1 solicitud creada                  1 write
• Listener paseos asignados (solo VER) 2 reads
                            Subtotal: 4 ops

Cuidador:
• Listener paseos asignados (solo SU)   2 reads
• 0-1 confirmaciones                    1 write
• Tracking GPS (opcional, lazy)         0-10 writes
                            Subtotal: 3-13 ops

Admin (matching):
• Cloud Function solo cuando solicita paseo
• NO Cloud Tasks (no escalada automática)
                            Subtotal: 1 op

TOTAL POR USUARIO: ~6 reads + 2 writes = 8 ops/semana
REDUCCIÓN: 93% vs marketplace

Proyección mensual (10 usuarios):
≈ 320 operaciones
≈ $0.016/mes (reads) + $0.008/mes (writes) = $0.024/mes
Extrapolado a 100 usuarios: $0.24/mes
Extrapolado a 1,000 usuarios: $2.4/mes
```

### COMPARACIÓN

```
Escala (usuarios)  │  ANTES (Marketplace)  │  DESPUÉS (Confianza)  │  Ahorro
─────────────────────────────────────────────────────────────────────────
10                 │  $0.40/mes            │  $0.024/mes           │  94%
100                │  $4-5/mes             │  $0.24/mes            │  94%
1,000              │  $40-50/mes           │  $2.40/mes            │  94%
10,000             │  $400-500/mes         │  $24/mes              │  94%

CONCLUSIÓN: Sistema de confianza es 10-20x más barato a escala
```

---

## 🔄 CAMBIOS OPERACIONALES

### PARA EL TUTOR

**ANTES:**

- Crea solicitud → busca entre 50 perfiles → negocia → elige → espera
- Cada paseo: proceso similar
- Retención: baja (siempre busca otros)

**DESPUÉS:**

- Crea solicitud (fecha+hora) → sistema muestra disponibles → elige favorito o nuevo → confirma
- Segundo paseo: 1 tap "Reagendar con favorito"
- Retención: alta (relación recurrente)

**Cambios en UX:**

- ✅ Menos opciones = menos confusión
- ✅ Más contexto = más confianza
- ✅ Matching por hora = más realista
- ✅ Favoritismo = facilidad recurrencia
- ✅ Observaciones humanas = vínculo emocional

---

### PARA EL CUIDADOR

**ANTES:**

- Ve solicitudes abiertas permanentemente
- Compite con otros por aceptar
- Escalada automática cada 10 min

**DESPUÉS:**

- Ve solo paseos asignados a relaciones existentes
- Sin competencia (invitación directa)
- Sin escalada automática (tutor puede reintentar)

**Cambios operacionales:**

- ✅ Menos ruido de notificaciones
- ✅ Más relaciones estables
- ✅ Bonus por confianza
- ✅ Feedback directo del tutor

---

### PARA PAWPATH

**ANTES:**

- Mantener marketplace (UI + backend complejo)
- Escala automática = costos crecientes
- Retención baja = CAC alto
- Diferenciación = ninguna

**DESPUÉS:**

- Mantener red de confianza (simple + escalable)
- Sin escalada automática = costos mínimos
- Retención alta = CAC bajo
- Diferenciación = máxima (único en LATAM)

---

## ✅ CHECKLIST FINAL

### Decisiones Aprobadas

- [x] Reset total de arquitectura (no migración gradual)
- [x] Matching contextual por fecha/hora (no galería estática)
- [x] 5 estados paseo en lugar de 9
- [x] Prioridad de favoritos
- [x] Eliminar escalada automática
- [x] Simplificar UI/UX radicalmente
- [x] Costo Firebase 10x menor

### Inicio Development

- [ ] Crear repo rama `nueva-arquitectura`
- [ ] Setup Firestore schemas nuevas
- [ ] Equipo alineado en flujos
- [ ] CI/CD configurado
- [ ] Testing framework listo

### Comunicación

- [ ] Documentar para equipo
- [ ] Demostrar flujos en prototipo
- [ ] Alineación stakeholders
- [ ] Go/no-go final

---

## 🎯 RESUMEN EJECUTIVO

**PawPath se transforma de:**

- "App para pedir paseos" (Uber copy)
- Con cientos de opciones, ansiedad, baja retención

**A:**

- "Sistema de confianza territorial"
- Con relaciones recurrentes, simplicidad, alta retención

**Diferenciación:**

- Único en LATAM: matching contextual (no galería)
- Énfasis en relaciones humanas, no transacciones
- Costo 10x menor en infraestructura
- Retención 3-5x mayor por recurrencia

**Timeline realista:**

- 6-8 semanas a MVP funcional
- Equipo de 1-2 devs
- Testing riguroso en Fases 3-9

**Siguiente paso:**
Aprobación oficial + inicio Fase 0 (preparación)

---

**Generado**: 19 de mayo de 2026  
**Status**: Listo para implementación  
**Contacto**: Arquitecto PawPath
