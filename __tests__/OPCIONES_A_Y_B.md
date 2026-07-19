/**

- DOCUMENTACIÓN: Cómo funcionan Opción A y B
-
- Opción A: Detección de patrones simples en cliente
- Opción B: Agregación territorial
  */

// OPCIÓN A — Detección de patrones
// ================================
// Cuando se registra un evento de tipo 'bitacora':
//
// 1. Se leen los últimos 5 eventos del paseo
// 2. Se detecta si hay secuencia de acciones conocidas
// 3. Ejemplos:
// - [tomo_agua, descanso] → patron_inferido: "agua_descanso"
// - [juego, descanso] → patron_inferido: "juego_descanso"
// - [corrio, descanso] → patron_inferido: "actividad_descanso"
//
// El patrón se guarda en el evento para análisis posterior

// OPCIÓN B — Agregación territorial
// ==================================
// Después de guardar cada evento:
//
// 1. Se obtiene o crea documento: territorios/{h3_r9}
// 2. Se incrementan contadores por acción
// 3. Se actualizan estadísticas:
// - Clima predominante
// - Temperatura promedio
// - Distribución de actividad por hora
// - Acciones top 3
//
// Estructura de territorio/{h3_r9}:
// {
// h3_r9: "89282e9ffffffff",
// h3_r8: "89282e1ffffffff",
// total_eventos: 45,
// eventos_por_tipo: {
// juego: 20,
// tomo_agua: 15,
// descanso: 10
// },
// acciones_top: [
// { accion: "juego", count: 20, porcentaje: 44 },
// { accion: "tomo_agua", count: 15, porcentaje: 33 },
// { accion: "descanso", count: 10, porcentaje: 22 }
// ],
// clima: {
// clima_predominante: "soleado",
// temperatura_promedio: 22.5,
// temperatura_max: 28,
// temperatura_min: 18
// },
// actividad_por_hora: {
// "14": 12,
// "15": 18,
// "16": 15
// },
// hora_pico: 15
// }

// FLUJO COMPLETO
// ==============
// 1. Cuidador: "Jugó" + ubicación GPS
// 2. RegistrarMomentoPaseo normaliza y llama registrarBitacora()
// 3. ServicioPaseo.registrarEvento():
// a) Capa 1: Calcula H3 R8/R9, duración, timestamp
// b) Capa 2: Obtiene hora local, clima, elevación (APIs)
// c) Opción A: Lee últimos 5 eventos, detecta patrón
// d) Guarda evento con patron_inferido
// e) Opción B: Actualiza territorio/{h3_r9}
// 4. Evento completo en Firestore con:
// - hechoTerritorial (H3, timestamp, duración)
// - contextoTerritorial (hora, clima, elevación, dirección)
// - patron_inferido (si aplica)
//
// 5. Territorio actualizado con:
// - Contadores de eventos por tipo
// - Estadísticas de clima y temperatura
// - Distribución horaria de actividad

// PRÓXIMAS FASES
// ==============
// Fase 3: Cloud Function procesa patrones históricos
// Fase 4: Agregador de territorios con recomendaciones
// Fase 5+: Integraciones OSM, sensores, etc.

// CÓMO CONSULTAR LOS DATOS
// ========================
//
// Eventos con patrones:
// db.collection('paseos').doc(paseoId).collection('eventos')
// .where('patron_inferido', '==', 'agua_descanso')
//
// Territorio con más actividad:
// db.collection('territorios')
// .where('h3_r9', '==', '89282e9ffffffff')
//
// Actividad por zona y hora:
// db.collection('territorios')
// .orderBy('total_eventos', 'desc')
// .limit(10)

export const DOCUMENTACION_OPCIONES_A_Y_B = true
