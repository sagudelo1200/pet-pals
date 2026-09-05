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

  const task = {
    httpRequest: {
      httpMethod: 'POST' as const,
      url: functionUrl,
      headers: {'Content-Type': 'application/json'},
      body: Buffer.from(JSON.stringify({evaluacionId})).toString('base64'),
      // Autenticación: solo Cloud Tasks (mismo patrón que escalarSolicitudes)
      oidcToken: {
        serviceAccountEmail: `firebase-adminsdk@${projectId}.iam.gserviceaccount.com`,
      },
    },
    scheduleTime: {seconds: tiempoEjecucion},
  };

  const client = getTasksClient();
  await client.createTask({
    parent: client.queuePath(projectId, LOCATION, QUEUE_NAME),
    task,
  });
}
