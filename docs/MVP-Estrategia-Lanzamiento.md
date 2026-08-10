# MVP Estrategia de Lanzamiento - Pet Pals

**Documento:** Decisiones estratégicas de producto para MVP 1.0  
**Fecha:** 20 de julio de 2026  
**Audiencia:** Equipo de producto, desarrollo, inversores  
**Propósito:** Alineación entre lo que documentamos (arquitectura completa) y lo que lanzamos (core validable)

---

## Resumen Ejecutivo

La arquitectura de Pet Pals (documentada en `Paw-Path.md`) está bien diseñada, pero **contiene 4 roles, H3 multiresolution, auto-escaladas y gamificación** que son excelentes features pero **no son críticas para validar el producto en el mercado**.

**La pregunta clave es:** ¿Qué es lo MÍNIMO que necesito para demostrar que:
- Un tutor PUEDE solicitar un paseo
- Un cuidador PUEDE aceptarlo
- Ambos pueden comunicarse en tiempo real
- El tutor ve dónde está su mascota

**Respuesta:** Dos roles, un matching simple, GPS y un chat. Todo lo demás es "salsa".

---

## 1. Diagnóstico: Brecha entre Código y MVP

### Lo Que Existe (Código Actual)

```
✓ 4 Roles (Tutor, Cuidador, Explorador, Admin)
✓ Matching estricto (H3 + horario + excepciones + conflictos)
✓ Auto-escalada (10 minutos)
✓ GPS (foreground + background)
✓ Chat integrado
✓ Códigos de recogida
✓ Captura territorial (Exploradores)
✓ Máquina de estados robusta
✓ Firestore bien estructurado
```

### Lo Que el Primer Usuario Necesita Validar

```
✓ ¿Puedo crear una mascota en 2 minutos?
✓ ¿Puedo solicitar un paseo sin tanta fricción?
✓ ¿Veo cuidadores disponibles (sin filtro perfecto)?
✓ ¿Puedo aceptar como cuidador?
✓ ¿Veo en tiempo real dónde está el cuidador?
✓ ¿Puedo chatear de verdad?
✓ ¿Cómo sé que la mascota regresó (código + confirmación)?

---

✗ ¿Funciona la inteligencia territorial?
✗ ¿Los exploradores generan datos valiosos?
✗ ¿El admin tiene un dashboard útil?
✗ ¿La auto-escalada con Cloud Tasks es resilente?
✗ ¿Gano huellas por explorar?
```

### El Riesgo

Si lanzas TODO a la vez, cosas que pueden fallar:

| Riesgo | Probabilidad | Impacto |
|--------|------------|--------|
| Matching filtra demasiado → Cuidador ve 0 paseos | Alta | Crítico |
| Auto-escalada en 10min aburre a cuidador | Alta | Alto |
| GPS falla → Tutor entra en pánico | Media | Crítico |
| Explorador no entiende el flujo de captura | Media | Bajo |
| Admin se espera analytics que no existen | Baja | Medio |

---

## 2. Estrategia: 3 Fases de Lanzamiento

### FASE MVP 1.0 (Semana 1-2 de Lanzamiento)

**Objetivo:** Validar el core: Solicitar paseo → Aceptar → Rastrear → Completar

**Roles Activos:**
- ✓ **Tutor** (100%)
- ✓ **Cuidador** (100%)
- ✗ **Explorador** (deshabilitado)
- ✗ **Admin** (solo logs, sin UI)

**Features del Core:**

```
TUTOR:
✓ Crear mascota (nombre + foto mínimo, nivel 1)
✓ Solicitar paseo (mascota, fecha, hora)
✓ Ver cuidadores disponibles (BROADCAST sin filtro estricto)
✓ Rastrear en tiempo real
✓ Chat durante paseo
✓ Recibir código de recogida
✓ Validar código (o timeout automático en 15min)

CUIDADOR:
✓ Ver todas las solicitudes en su zona (H3_R8)
✓ Aceptar solicitud
✓ Sistema valida en ACEPTACIÓN (no antes)
✓ Si no disponible: mensaje claro ("No puedes aceptar")
✓ Ejecutar paseo: EN_CAMINO → EN_PROGRESO → FINALIZADO
✓ Rastrear GPS (con botón "Reportar Ubicación" si falla)
✓ Registrar eventos básicos (llegada, inicio, fin)
✓ Chat durante paseo
```

**Cambios de Comportamiento vs. Código Actual:**

| Funcionalidad | Actual | MVP 1.0 | Razón |
|---------------|--------|---------|-------|
| **Matching** | Filtro estricto pre-aceptación | Broadcast → Validar en aceptación | Cuidador siente actividad |
| **Auto-escalada** | 10 minutos | 45 minutos (o disabled para MVP 1.0) | Menos frustración |
| **Mascota completitud** | Nivel 2 para solicitar | Nivel 1 (nombre + foto) | Menos fricción inicial |
| **GPS fallback** | Sin fallback | Botón "Reportar Ubicación" | Evita pánico tutor |
| **Códigos timeout** | Manual | 15 minutos automático | Evita bloqueos |
| **Exploradores** | Activos | Deshabilitados | Simplificar MVP |
| **Admin** | Dashboard visual | Solo logs CLI | No necesario para validación |

---

### FASE MVP 2.0 (Semana 3-4)

**Cuando:** Después de 50-100 paseos exitosos

**Objetivo:** Mejorar matching y experiencia de cuidador

```
◇ Relax aún más de matching: Mostrar "fuera de zona" con aviso
◇ Auto-escalada activada (30-45 minutos, 2 recordatorios)
◇ Mascota completitud: Permitir solicitud con nivel 1, advertencia de "mejor matching con nivel 2"
◇ Gamificación mínima: Huellas básicas por paseo completado
◇ Calificaciones simples: ⭐⭐⭐⭐⭐ post-paseo
```

---

### FASE MVP 3.0 (Semana 5+)

**Cuando:** Tutor y cuidador validados, necesitas escalar

```
◇ Exploradores activados: Captura territorial real
◇ H3 inteligencia: Índices de bienestar/seguridad
◇ Admin dashboard: KPIs visuales
◇ Notificaciones push: Firebase Cloud Messaging
◇ Paseos compartidos: Múltiples mascotas en mismo paseo
◇ Gamificación completa: Huellas, XP, badges, leaderboards
```

---

## 3. Mitigación de Riesgos Específicos

### Riesgo A: Matching Filtra Demasiado → "App Muerta"

**Síntoma:** Cuidador abre app → 0 solicitudes

**Causa Raíz:** Filtro estricto (zona + horario + excepciones + conflictos)

**Solución MVP 1.0:**

```typescript
// CAMBIO: En lugar de filtrar ANTES de mostrar...

// ACTUAL (Código actual - Riesgo):
const solicitudesVisibles = paseos.filter(p => 
  estaEnZona(p) && 
  estaDisponible(p) && 
  sinExcepciones(p) && 
  sinConflictos(p)
)
// → Resultado: 0 paseos si falta UNA condición

// MVP 1.0 (Broadcast, valida en aceptación):
const solicitudesVisibles = paseos.filter(p => 
  estaEnZona(p, H3_R8) // Zona más amplia
)
// → Resultado: 5-10 paseos siempre

// Al ACEPTAR:
const puedeAceptar = () => {
  if (!estaDisponible()) return { ok: false, msg: "No disponible ese horario" }
  if (tieneCflicto()) return { ok: false, msg: "Tienes otro paseo" }
  return { ok: true }
}
```

**Implementación:** 2 horas  
**Impacto:** Cuidador ve actividad, experiencia mejora 10x

---

### Riesgo B: Auto-Escalada en 10min = Abandono Silencioso

**Síntoma:** Cuidador no recibe notificación a tiempo, paseo se escala sin enterarse

**Causa Raíz:** 10 minutos es insuficiente (latencia push + lectura + decisión)

**Solución MVP 1.0:**

```
Opción A (Recomendada): DESACTIVAR auto-escalada en MVP 1.0
  → Paseo queda en PENDIENTE indefinidamente
  → Tutor ve "Esperando confirmación..."
  → Cuidador ve en app (sin presión)
  
Opción B: Aumentar tiempo
  → 1er recordatorio: 15 min
  → 2do recordatorio: 35 min
  → Escalada: 60 min → ABIERTA
```

**Mi recomendación:** Opción A para MVP 1.0. Auto-escalada es un "nice to have", no core.

**Implementación:** Cambiar flag en ServicioPaseo.crearPaseo()

---

### Riesgo C: GPS Falla → Tutor en Pánico

**Síntoma:** Ubicación no se actualiza hace 5 minutos → Tutor piensa que el cuidador desapareció

**Causa Raíz:** 
- Permisos denegados
- Batería agotada
- Sin datos
- Background task no inició

**Solución MVP 1.0:**

```typescript
// FALLBACK MANUAL: Botón en ControlPaseo (Cuidador)
<Button onPress={() => {
  // Obtener ubicación actual (aunque sea stale)
  const ubicacion = await getCurrentLocation()
  // Si getLocation falla, permitir ingreso manual
  if (!ubicacion) {
    showModal("¿Dónde estás ahora?", {
      onConfirm: (manualLocation) => {
        publicarUbicacion(idPaseo, manualLocation)
      }
    })
  }
}}>
  Reportar Ubicación
</Button>

// En PaseoActivo (Tutor):
if (sinActualizacionesEnUltimos5Min) {
  mostrarBanner(
    "⚠️ Ubicación no actualiza. " +
    "Si el cuidador perdió señal, puede reportar manualmente."
  )
}
```

**Implementación:** 1 hora  
**Impacto:** Evita pánico, mantiene confianza

---

### Riesgo D: Códigos de Recogida Bloqueados

**Síntoma:** Cuidador finaliza paseo (FINALIZADO) pero tutor se olvida de validar código → Paseo queda "colgado"

**Causa Raíz:** No hay timeout automático

**Solución MVP 1.0:**

```typescript
// En ServicioPaseo, al cambiar estado a FINALIZADO:
const cambiarAFinalizado = async (paseoId) => {
  await update(`/paseos/${paseoId}`, {
    estado: 'FINALIZADO',
    fecha_fin_real: Date.now(),
    timeout_validacion_en: Date.now() + (15 * 60 * 1000) // 15 min
  })
  
  // Cloud Function (scheduled, cada 1 min):
  if (paseo.estado === 'FINALIZADO' && Date.now() > paseo.timeout_validacion_en) {
    await update(`/paseos/${paseoId}`, {
      estado: 'COMPLETADO',
      validado_automaticamente: true
    })
    notificarTutor("Tu paseo fue confirmado automáticamente")
  }
}
```

**Implementación:** 1 hora (logic + Cloud Function)  
**Impacto:** Cuidador no queda esperando indefinidamente

---

### Riesgo E: Explorador Confundido

**Síntoma:** Usuario sin rol "cuidador" abre app → Ve modal "Captura Territorial" sin contexto

**Solución MVP 1.0:**

```
✗ DESACTIVAR rol Explorador completamente en MVP 1.0
  → AuthContext.agregarRolAutomatico() NO agrega 'explorador'
  → Usuarios solo tienen Tutor/Cuidador
  
FASE MVP 2.0:
  → Reactivar Exploradores como "feature opt-in"
  → "¿Quieres ganar huellas explorando?" (bandera en Inicio)
```

**Implementación:** 30 minutos  
**Impacto:** Reduce confusión inicial

---

## 4. Cambios de Código: Lista de TODO

### Cambios Estratégicos (MUST HAVE para MVP 1.0)

```
[ ] 1. ServicioPaseo: Relax de matching
      → Mostrar solicitudes con H3_R8 (no filtro estricto)
      → Validar estrictamente en aceptación
      
[ ] 2. ServicioPaseo: Timeout de validación (15min)
      → Si FINALIZADO + 15min → auto-COMPLETADO
      
[ ] 3. ControlPaseo: Botón "Reportar Ubicación"
      → Fallback si GPS falla
      
[ ] 4. PaseoActivo: Banner de advertencia GPS
      → "Ubicación no actualiza" con explicación
      
[ ] 5. Auto-escalada: DESACTIVAR (comentar Cloud Task)
      → Reactivar en MVP 2.0
      
[ ] 6. AuthContext: NO agregar 'explorador' automático
      → Solo Tutor/Cuidador en MVP 1.0
      
[ ] 7. Mascota completitud: Reducir a Nivel 1
      → Nombre + foto = listo para solicitar paseo
      
[ ] 8. UX: Mostrar advertencia en solicitud si mascota < Nivel 2
      → "Mejora el perfil de tu mascota para mejor matching"
```

### Cambios Menores (NICE TO HAVE)

```
[ ] 9. Chat: Mostrar mensaje "El cuidador sin conexión"
      → Si GPS lleva 3+ min sin actualizar
      
[ ] 10. Agenda (Cuidador): Agrupar por estado
       → CONFIRMADO, EN_PROGRESO, FINALIZADO
```

---

## 5. Hoja de Ruta: Semanas 1-4

### Semana 1: Preparar MVP 1.0

```
[ ] Lunes: Implementar cambios 1-7 (matching relax, timeout, fallback)
[ ] Martes: Testing (crear 3-4 paseos de prueba)
[ ] Miércoles: Ajustes UX (banners, mensajes de error)
[ ] Jueves: Review con equipo
[ ] Viernes: Documentar cambios en código
```

### Semana 2: Test Interno

```
[ ] Lunes: Prueba con equipo interno (5 personas)
[ ] Martes-Miércoles: Debugging
[ ] Jueves: Prueba con 3-4 usuarios reales (amigos, familia)
[ ] Viernes: Iteración rápida basada en feedback
```

### Semana 3: Pre-Lanzamiento

```
[ ] Testing de GPS (real en calles)
[ ] Testing de chat (latencia, notificaciones)
[ ] Testing de códigos (validación, timeout)
[ ] Testing de permisos (Android 10+, iOS)
[ ] Documentación de bugs encontrados
```

### Semana 4: Lanzamiento MVP 1.0 + Preparar MVP 2.0

```
[ ] Lanzar a primeros usuarios
[ ] Monitorear errores en backend (Cloud Functions)
[ ] Empezar a planificar MVP 2.0
```

---

## 6. Decisiones de Producto (Y Por Qué)

| Decisión | Alternativa | Razón |
|----------|-------------|-------|
| **Broadcast matching** | Filtro estricto (actual) | MVP necesita demostrar tracción. Cuidador debe ver paseos. |
| **Timeout 15min códigos** | Manual (actual) | Evita bloqueos invisibles que generan frustración. |
| **Fallback GPS manual** | Solo automático (actual) | GPS falla. Tutor necesita saber dónde está el cuidador siempre. |
| **Desactivar auto-escalada** | 10 minutos (actual) | 10min es insuficiente. Mejor esperar 60+ o desactivar. |
| **Desactivar Exploradores** | Activar (actual) | MVP 1.0 = Tutor + Cuidador. Exploradores es MVP 2.0. |
| **Reducir mascota a Nivel 1** | Nivel 2 (actual) | Fricción inicial. Mejor iterar después con datos reales. |
| **Sin notificaciones push** | Con FCM (futuro) | Agrega complejidad. MVP puede funcionar con in-app. |

---

## 7. Métricas de Éxito MVP 1.0

Para medir si el MVP funciona, monitorear:

```
✓ Paseos completados exitosamente: Target > 80%
✓ Cuidadores que ven solicitudes: > 90% de apertura
✓ Tiempo promedio de aceptación: < 5 minutos
✓ GPS uptime: > 95%
✓ Tutor permanencia: > 70% completan paseo
✓ Bugs críticos: 0 (o manejables)
```

Si estos números son buenos, MVP 1.0 es exitoso. Entonces procedes a MVP 2.0.

---

## 8. Riesgos Residuales (Aceptados)

Incluso con estas mitigaciones, hay riesgos que **aceptamos para MVP:**

```
⚠️  Matching aún requiere zona H3_R8
    → Si usuario está fuera, no ve nada
    → Mitigación: Comunicar "Somos locales"
    
⚠️  Chat sin FCM = solo in-app
    → Si cuidador cierra app, no ve mensaje
    → Mitigación: "Revisa la app regularmente"
    
⚠️  GPS background requiere permisos Android 10+
    → Android < 10: sin background
    → Mitigación: Documentar, soporte manual
    
⚠️  Códigos no tienen QR scanner
    → Ingreso manual de 6 dígitos
    → Mitigación: MVP 2.0 con QR scanner
```

---

## 9. Resumen: Core MVP 1.0 en 1 Página

```
┌─────────────────────────────────────────────────────┐
│              MVP 1.0 CORE FLOW                      │
├─────────────────────────────────────────────────────┤
│                                                      │
│  TUTOR                      CUIDADOR                │
│  ├─ Crear mascota           ├─ Ver solicitudes     │
│  │  (Nivel 1 OK)            │  (H3_R8, broadcast) │
│  │                          │                      │
│  ├─ Solicitar paseo         ├─ Aceptar             │
│  │  (fecha, hora)           │  (Sistema valida)    │
│  │                          │                      │
│  ├─ Esperar aceptación      ├─ Ejecutar            │
│  │  (sin auto-escalada)     │  GPS + eventos       │
│  │                          │                      │
│  ├─ Rastrear GPS            ├─ Finalizar           │
│  │  (con fallback manual)   │  → FINALIZADO        │
│  │                          │                      │
│  ├─ Recibir código          ├─ Chat               │
│  │                          │ (Integrado)          │
│  │                          │                      │
│  ├─ Validar código          ├─ Esperar validación  │
│  │  (o timeout 15min)       │  (o timeout auto)    │
│  │                          │                      │
│  └─ Ver resumen             └─ Confirmación        │
│     COMPLETADO              ✓ COMPLETADO          │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

## 10. Próximos Pasos

### Hoy (20 de julio):

1. **Revisar este documento** con equipo de producto
2. **Alinearse** en: ¿Aceptamos estos cambios?
3. **Priorizar** los cambios (¿empezamos por matching o GPS?)

### Mañana:

1. **Implementar cambios** (8 items en lista de TODO)
2. **Testing** con equipo

### Esta Semana:

1. **Prueba con usuarios reales**
2. **Iteración rápida**

### Próximas 2 Semanas:

1. **Lanzamiento MVP 1.0**

---

## Conclusión

**Pet Pals tiene una arquitectura excelente.** Pero MVP 1.0 no necesita toda esa potencia. Necesita demostrar que:

1. Tutor y cuidador pueden conectar
2. Pueden ejecutar un paseo juntos
3. Hay confianza (código + chat + GPS)

**El resto es "salsa." La agregamos después.**

Con estas mitigaciones, creo que lanzamos algo viable en 2 semanas y validamos el core en 4 semanas.

🐾 **Adelante con Paw-Path.**
