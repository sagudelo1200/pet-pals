# POLÍTICA DE GEOLOCALIZACIÓN

**Versión**: 1.0  
**Fecha de entrada en vigor**: [A DEFINIR]  
**Última actualización**: 22 de junio de 2026

---

## ¿POR QUÉ NECESITA PAWPATH TU UBICACIÓN?

PawPath es una app de paseos. Sin GPS, es imposible:

- Conectar tutores con cuidadores cercanos.
- Rastrear el paseo en vivo.
- Validar recogida/entrega.
- Garantizar que el cuidador llegue al lugar.

---

## 1. CUÁNDO Y POR QUÉ CAPTURAMOS UBICACIÓN

### TUTOR:

- **Registro de recogida**: Dirección "home" (donde vive).
- **Durante paseo**: Ve ubicación en vivo del Cuidador (en mapa).

**Propósito**: Conectar con cuidadores cercanos, ver paseo en tiempo real.

### CUIDADOR:

- **Publicar disponibilidad**: Comparte su ubicación cuando se conecta (H3 index = territorio).
- **Durante paseo**: Captura GPS cada 9 segundos (o cada 9 metros si se mueve rápido).

**Propósito**: Ser visible para tutores que buscan cuidador, permitir rastreo en vivo.

### EXPLORADOR:

- **Observaciones territoriales**: Coordenadas de donde observó un espacio.

**Propósito**: Mapear espacios pet-friendly, seguridad, flujo peatonal, etc.

---

## 2. CÓMO FUNCIONA EL RASTREO GPS

### Secuencia de Paseo:

```
PENDIENTE
    ↓
CONFIRMADO (cuidador aceptó, va en camino)
    ↓
EN_CAMINO ← GPS COMIENZA (cada 9 seg o 9 metros)
    │
    ├─ Cuidador se acerca a recogida
    ├─ Tutor valida con código (6 dígitos)
    ├─ Estado = CONFIRMADO (recogida validada)
    │
    ↓
EN_PROGRESO (paseo ocurriendo) ← GPS CONTINÚA
    │
    ├─ Cuidador camina con mascota
    ├─ Tutor ve ruta en vivo (actualiza cada 9 seg)
    │
    ↓
FINALIZADO ← GPS DETIENE
    │
    ├─ Cuidador valida con código (entrega)
    ├─ Paseo termina
    │
    ↓
COMPLETADO (después: rating, fotos, etc.)
```

**Resumen**: GPS solo durante EN_CAMINO + EN_PROGRESO (no antes, no después).

---

## 3. QUÉ DATOS GPS SE ALMACENAN

### Lo Que Sí Se Guarda:

- ✅ Coordenadas (latitud/longitud)
- ✅ Timestamp (hora exacta)
- ✅ Precisión del GPS (metros)
- ✅ Cuidador ID (quién fue)
- ✅ Paseo ID (cuál paseo)

### Lo Que NO Se Guarda:

- ❌ Nombre de Cuidador
- ❌ Teléfono
- ❌ Historial completo del mes
- ❌ Predicciones de rutina

---

## 4. POLÍTICA DE RETENCIÓN GPS

Esta es la política de **cuánto tiempo guardamos** tu ubicación:

### FASE 1: Alta Precisión (0-7 días)

- Datos: Coordenadas exactas con precisión ±5 metros.
- Uso: Auditoría de disputas ("¿Dónde llegó realmente?").
- Acceso: Solo equipo PawPath en casos de disputa.

### FASE 2: Agregada (8-60 días)

- Datos: Reducidos a "zona general" (radio ~500 metros).
- Uso: Análisis de rutas populares, inteligencia territorial anónima.
- Privacidad: No se puede identificar tutor específico.

### FASE 3: Eliminación (Post-60 días)

- Datos: Borrados automáticamente.
- No recuperable.
- Excepción: Si disputa legal abierta, se retiene indefinidamente.

---

## 5. QUIÉN VE TU UBICACIÓN

### EN VIVO (Durante paseo):

- **Tutor**: Ve ubicación exacta del Cuidador en mapa (tiempo real).
- **Cuidador**: Ve su propia ubicación (la que transmite).

### DESPUÉS (Post-paseo):

- **Tutor**: Puede ver "ruta del paseo" (resumen visual).
- **Cuidador**: Puede ver su propia ruta historicizada.
- **PawPath**: Acceso a datos en soporte/auditoría.
- **Otros usuarios**: ❌ NO ven tu ubicación.
- **Autoridades**: Sí, si orden judicial lo requiere.

---

## 6. UBICACIÓN "HOME" (NO ES GPS)

Tu dirección de recogida es diferente:

- Registrada al crear cuenta.
- NO es GPS en tiempo real.
- Solo visible para Cuidador después de aceptar paseo.
- Se usa para cálculo de H3 index (territorio).

**Privacidad**: No compartida públicamente.

---

## 7. CONSENTIMIENTO Y PERMISOS

### Android:

```
Permiso: ACCESS_FINE_LOCATION
Razón: Capturar GPS durante paseos
Uso: Mostrar ubicación exacta cuidador en mapa
```

### iOS:

```
Permiso: Location Services (Precise)
Razón: Rastreo en vivo durante paseo
Uso: Mostrar ubicación y ruta
```

### Cuándo Otorgar Permiso:

- **Si eres Tutor**: Necesario para buscar cuidadores y ver paseo.
- **Si eres Cuidador**: Obligatorio durante EN_CAMINO/EN_PROGRESO.

### Cómo Revocar:

- **Android**: Ajustes → Aplicaciones → PawPath → Permisos → Ubicación.
- **iOS**: Ajustes → Privacidad → Ubicación → PawPath → Cambiar.

---

## 8. UBICACIÓN EN BACKGROUND

### Nota Técnica:

PawPath solicita permiso para GPS en segundo plano (background).

**Por qué**: Si cierra la app durante paseo, sigue capturando (cuidador puede cerrar pantalla).

**Privacidad**: Solo activo durante EN_CAMINO/EN_PROGRESO. Se detiene automáticamente.

**Android**: Se muestra notificación "PawPath usando ubicación".

---

## 9. AGREGACIÓN E INTELIGENCIA TERRITORIAL

PawPath usa datos GPS agregados (sin identificar individual) para:

✅ Mapear rutas populares de paseos.  
✅ Identificar espacios pet-friendly.  
✅ Detectar zonas de alto tránsito peatonal.  
✅ Evaluar seguridad percibida de territorios.  
✅ Optimizar recomendaciones de cuidadores.

**Privacidad**: Datos generan mapas/reportes sin mostrar "Tutor X pasó por Y".

---

## 10. RIESGOS CONOCIDOS

### PawPath No Garantiza:

- ❌ Cobertura de GPS en zonas rurales (sin señal).
- ❌ Precisión exacta si hay edificios altos.
- ❌ Funcionamiento si GPS está desactivado.
- ❌ Que no haya delays si internet es lento.

### Responsabilidad del Usuario:

- ✓ Asegúrate de tener GPS y datos móviles activos.
- ✓ Si GPS falla, no se puede rastrear.
- ✓ PawPath no es responsable por GPS del dispositivo.

---

## 11. DISPUTAS Y AUDITORÍA

Si hay disputa (ej: "Cuidador no llegó a la hora"):

1. **PawPath accede** a datos GPS precisos (fase 1, 0-7 días).
2. **Valida**: ¿Dónde estuvo cuidador? ¿A qué hora?
3. **Resuelve**: Con evidencia GPS.
4. **Datos GPS**: Se retienen indefinidamente mientras disputa esté abierta.

---

## 12. CUMPLIMIENTO LEGAL

Basada en:

- Ley 1581 de 2012 (Datos Personales).
- Decreto 1377 de 2013.
- Ley de Protección al Consumidor (datos sensibles de localización).

---

## 13. CAMBIOS A ESTA POLÍTICA

Si PawPath cambia esta política:

- **Notificación**: Se publica en app.
- **Plazo**: Entra en vigor inmediatamente.
- **Usuario puede**: Solicitar eliminación de cuenta si no está de acuerdo.

---

## 14. CONTACTO

**Preguntas sobre GPS**: [email - POR DEFINIR]  
**Solicitar datos GPS**: [email - POR DEFINIR]  
**Reporte de problema**: [email - POR DEFINIR]

---

**Fin del Documento**
