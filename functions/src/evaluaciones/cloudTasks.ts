import {CloudTasksClient} from '@google-cloud/tasks';

/**
 * Programación de la materialización de la ventana del doble ciego.
 *
 * En lugar de un job periódico (que pregunta constantemente si hay algo por
 * hacer, con costo aunque no haya nada), se programa UNA Cloud Task con
 * delay de 6 días POR evaluación unidireccional. Si la contraparte llega
 * antes, la tarea es un no-op al ejecutarse (el doc ya está revelado).
 */

const LOCATION = 'us-central1';
// Se reutiliza la cola de Cloud Tasks existente del proyecto (cero setup;
// la cola solo agenda tareas, cada tarea lleva su propia URL y payload).
const QUEUE_NAME = 'escaladas-directas';

// Plazo de revelación ALEATORIO: el evaluado no puede saber el día exacto en
// que se revela la identidad (protección anti-presión). Se elige al azar
// entre 6, 9 o 12 días al programar cada tarea.
export const DIAS_POSIBLES_REVELACION = [6, 9, 12];

/** Elige al azar el plazo (en ms) para la revelación de una evaluación. */
export function elegirDelayRevelacion(): number {
  const dias =
    DIAS_POSIBLES_REVELACION[
      Math.floor(Math.random() * DIAS_POSIBLES_REVELACION.length)
    ];
  return dias * 24 * 60 * 60 * 1000;
}

/**
 * Cuenta de servicio con la que Cloud Tasks firma el token OIDC al invocar
 * las HTTP functions privadas. Configurable con TASKS_SA_EMAIL (functions/.env);
 * por defecto, la cuenta de servicio de App Engine del proyecto.
 * Debe tener rol `roles/run.invoker` sobre las functions invocadas.
 */
export function cuentaServicioTasks(projectId: string): string {
  return (
    process.env.TASKS_SA_EMAIL || `${projectId}@appspot.gserviceaccount.com`
  );
}

let tasksClient: CloudTasksClient | null = null;
const getTasksClient = (): CloudTasksClient => {
  if (!tasksClient) {
    tasksClient = new CloudTasksClient();
  }
  return tasksClient;
};

/**
 * Programa la HTTP function `revelarEvaluacionVencida` para dentro de 6 días.
 * Fire-and-forget: el llamador decide si loguear los errores.
 * Sin `GCLOUD_PROJECT` (emulador/tests) no hace nada.
 */
export async function programarRevelacion(evaluacionId: string): Promise<void> {
  const projectId = process.env.GCLOUD_PROJECT;
  if (!projectId) return;

  const fnName = 'revelarEvaluacionVencida';
  const functionUrl = `https://${LOCATION}-${projectId}.cloudfunctions.net/${fnName}`;
  const tiempoEjecucion = Math.floor((Date.now() + elegirDelayRevelacion()) / 1000);

  const client = getTasksClient();
  const parent = client.queuePath(projectId, LOCATION, QUEUE_NAME);
  const task = {
    // Una sola revelación por evaluación aunque el disparador se repita
    name: `${parent}/tasks/${nombreTareaRevelacion(evaluacionId)}`,
    httpRequest: {
      httpMethod: 'POST' as const,
      url: functionUrl,
      headers: {'Content-Type': 'application/json'},
      body: Buffer.from(JSON.stringify({evaluacionId})).toString('base64'),
      // Autenticación: solo Cloud Tasks (mismo patrón que escalarSolicitudes)
      oidcToken: {
        serviceAccountEmail: cuentaServicioTasks(projectId),
      },
    },
    scheduleTime: {seconds: tiempoEjecucion},
  };

  try {
    await client.createTask({parent, task});
  } catch (error) {
    // ALREADY_EXISTS (6): ya estaba programada
    if ((error as {code?: number})?.code !== 6) throw error;
  }
}

/**
 * Nombre de la tarea de revelación (solo letras, números, - y _).
 * @param {string} evaluacionId Evaluación.
 * @return {string} Nombre.
 */
export function nombreTareaRevelacion(evaluacionId: string): string {
  return `revelacion-${evaluacionId}`.replace(/[^A-Za-z0-9_-]/g, '_');
}
