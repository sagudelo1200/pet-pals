# Flujo: Solicitar Paseo (Tutor)

Este documento describe la implementación incremental del flujo de "Solicitar Paseo" para el Tutor.

## Objetivo
Permitir a un Tutor agendar un paseo para una o más de sus mascotas, seleccionando fecha, hora y cuidador.

## Piezas de Implementación

### Pieza 0: Preparación
- Configuración de docs, mocks y i18n base.

### Pieza 1: CTA y Apertura
- Botón flotante `BotonSolicitarPaseo` en pantalla de Mascotas.
- Abre `SolicitarPaseoModal` (inicialmente stub).

### Pieza 2: Step A - Seleccionar Mascota
- Selección de mascotas del tutor.

### Pieza 3: Step B - Fecha y Hora
- Selección de cuándo será el paseo.

### Pieza 4: Step C - Buscar y Seleccionar Cuidador
- Lista de cuidadores con filtros básicos.

### Pieza 5: Step D - Confirmación
- Resumen y "pago" (simulado).

### Pieza 6: Estado Solicitado
- Feedback de éxito y opción de chat.

### Pieza 7: Paseo en Progreso
- Vista de mapa y estado del paseo.

### Pieza 8: Finalización y Reseña
- Resumen post-paseo y calificación.

## Mocks
Los datos de prueba se encuentran en `mocks/paseos.mock.ts`.
