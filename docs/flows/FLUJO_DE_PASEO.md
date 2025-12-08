# Documentación Funcional: Flujo de Servicio de Paseo (Estado Actual)

Este documento describe detalladamente el ciclo de vida de un paseo en la aplicación **Pet Pals**, desde que un Tutor lo solicita hasta que un Cuidador lo acepta. Se centra en la experiencia del usuario y las reglas de negocio, evitando términos técnicos de programación.

---

## 1. Actores Involucrados

- **Tutor (Cliente):** Dueño de la mascota que necesita el servicio.
- **Cuidador (Prestador):** Persona verificada que realizará el paseo.
- **Sistema (Pet Pals):** La plataforma que conecta, valida y asegura la transacción.

---

## 2. Pre-requisitos (Lo que sucede antes)

Para que el flujo inicie correctamente:

1.  **Perfiles Listos:** Ambos usuarios deben estar registrados. El sistema se encarga automáticamente de crear un "Perfil Público" (con nombre y foto) para que puedan identificarse mutuamente sin compartir datos sensibles (como teléfono o dirección exacta) antes de tiempo.
2.  **Mascotas Registradas:** El Tutor debe tener al menos una mascota creada en la aplicación.

---

## 3. Paso a Paso del Flujo

### Paso 1: La Solicitud (Realizado por el Tutor)

El Tutor inicia el proceso configurando los detalles del servicio que necesita.

1.  **Selección de Mascotas:** Elige cuál o cuáles de sus mascotas irán al paseo.
2.  **Definición de Tiempo:** Selecciona la fecha, hora de inicio y duración deseada.
3.  **Selección de Cuidador (Tipo de Solicitud):**
    - **Opción A - Solicitud Directa (Implementada):** El Tutor elige a un Cuidador específico de la lista (por ejemplo, alguien de confianza).
    - **Opción B - Solicitud General (Soportada):** El Tutor lanza la solicitud "al aire" para que cualquier cuidador disponible la tome.
4.  **Confirmación:** El Tutor ve el precio estimado y confirma la solicitud.

**Resultado:** El paseo se crea en el sistema con estado **"PENDIENTE"**.

---

### Paso 2: Notificación y Visualización (Experiencia del Cuidador)

El Cuidador ingresa a la aplicación para buscar trabajo.

1.  **Bandeja de Solicitudes:** En su pantalla principal, ve una lista de tarjetas con las solicitudes disponibles.
2.  **Reglas de Visibilidad:**
    - Si fue una **Solicitud Directa**, _solo_ ese Cuidador específico puede ver la tarjeta. Ningún otro cuidador tiene acceso a ella.
    - Si fue una **Solicitud General**, todos los cuidadores cercanos pueden verla.
3.  **Información Resumida:** En la tarjeta ve lo básico: Hora, Fecha, Ganancia estimada y distancia aproximada.

---

### Paso 3: Evaluación del Detalle

El Cuidador selecciona una solicitud para analizar si le conviene.

1.  **Información Financiera:** Ve claramente cuánto dinero ganará por ese servicio.
2.  **Información Logística:** Ve la fecha, hora y duración.
3.  **Información del Cliente (Seguridad):**
    - Ve la foto y nombre del Tutor (gracias al Perfil Público).
    - Ve si es un cliente nuevo o recurrente.
4.  **Información de las Mascotas:** Ve las fotos, nombres y razas de los perros a pasear.
5.  **Ubicación:** Ve un mapa con la zona aproximada de recogida.

---

### Paso 4: Toma de Decisión (Aceptar o Rechazar)

El Cuidador tiene dos opciones:

#### Opción A: Rechazar / Ignorar

- **Acción:** Presiona el botón "Rechazar" o simplemente regresa atrás.
- **Consecuencia:** La solicitud permanece en el sistema (si es general) o se notifica al tutor (futura implementación) de que no fue aceptada. Por ahora, simplemente deja de ser el foco de atención del cuidador.

#### Opción B: Aceptar el Paseo

- **Acción:** Presiona el botón "Aceptar".
- **Confirmación:** El sistema le pregunta: _"¿Estás seguro? Te comprometes a realizar el servicio"_.
- **Validación de Seguridad (El Sistema actúa):**
  - En ese milisegundo, el sistema verifica que el paseo siga estando disponible (que nadie más lo haya ganado por un segundo de diferencia).
  - Verifica que el paseo fuera realmente para él (en caso de solicitud directa).
- **Resultado Exitoso:**
  1.  El paseo cambia de estado a **"ACEPTADO"**.
  2.  El Cuidador queda oficialmente asignado como el responsable.
  3.  La solicitud desaparece de la lista de "Pendientes" y se mueve a la lista de "Próximos Paseos" (Agenda).

---

## 4. Resumen de Estados del Paseo

| Estado         | Significado                                 | Quién lo tiene                         |
| :------------- | :------------------------------------------ | :------------------------------------- |
| **PENDIENTE**  | El Tutor lo creó, nadie lo ha tomado aún.   | Visible en "Solicitudes" del Cuidador. |
| **ACEPTADO**   | Un Cuidador ya se comprometió a hacerlo.    | Visible en "Activos/Agenda" de ambos.  |
| **EN CURSO**   | (Futuro) El paseo está sucediendo ahora.    | Visible con GPS en tiempo real.        |
| **FINALIZADO** | (Futuro) El servicio concluyó exitosamente. | Historial.                             |

---

## 5. Reglas de Negocio Importantes

1.  **Exclusividad:** Un paseo aceptado no puede ser visto ni tomado por nadie más.
2.  **Privacidad:** Los cuidadores no ven la dirección exacta ni el teléfono del tutor hasta que aceptan el paseo (Fase siguiente).
3.  **Integridad:** Un cuidador no puede aceptar su propio paseo (si tuviera cuenta doble).
