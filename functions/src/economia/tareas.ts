/**
 * Tareas de un solo uso (Cloud Tasks) para el motor económico.
 * No hay jobs periódicos: cada tarea se agenda cuando hace falta, se ejecuta
 * una vez y, si queda algo pendiente, agenda solo el siguiente paso.
 *
 * Se reutiliza la cola del proyecto (escaladas-directas) y la cuenta de
 * servicio de Cloud Tasks (ver evaluaciones/cloudTasks).
 */
import {CloudTasksClient} from '@google-cloud/tasks';
import {cuentaServicioTasks} from '../evaluaciones/cloudTasks';

const LOCATION = 'us-central1';
const QUEUE_NAME = 'escaladas-directas';
// gRPC ALREADY_EXISTS: ya hay una tarea con ese nombre (deduplicación)
const YA_EXISTE = 6;

/**
 * Nombre válido para una tarea (solo letras, números, - y _).
 * @param {string} nombre Nombre deseado.
 * @return {string} Nombre saneado.
 */
export function nombreTarea(nombre: string): string {
  return nombre.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 400);
}

/**
 * ¿El error indica que la tarea ya existía? (agendar dos veces = no-op)
 * @param {unknown} error Error de Cloud Tasks.
 * @return {boolean} Si es duplicado.
 */
export function esTareaDuplicada(error: unknown): boolean {
  return (error as {code?: number})?.code === YA_EXISTE;
}

let cliente: CloudTasksClient | null = null;
const obtenerCliente = (): CloudTasksClient => {
  if (!cliente) cliente = new CloudTasksClient();
  return cliente;
};

/**
 * Agenda la invocación de una HTTP function privada para un momento dado.
 * Con `nombre`, una tarea con el mismo nombre no se agenda dos veces.
 * Sin GCLOUD_PROJECT (tests/emulador) no hace nada.
 * @param {string} funcion Nombre de la HTTP function.
 * @param {object} payload Cuerpo JSON.
 * @param {number} ejecutarEnMs Momento de ejecución (ms epoch).
 * @param {string} nombre Nombre único opcional (letras, números, - y _).
 * @return {Promise<boolean>} true si quedó agendada (o ya existía).
 */
export async function programarTarea(
  funcion: string,
  payload: Record<string, unknown>,
  ejecutarEnMs: number,
  nombre?: string
): Promise<boolean> {
  const projectId = process.env.GCLOUD_PROJECT;
  if (!projectId) return false;

  const tasks = obtenerCliente();
  const parent = tasks.queuePath(projectId, LOCATION, QUEUE_NAME);
  try {
    await tasks.createTask({
      parent,
      task: {
        ...(nombre && {name: `${parent}/tasks/${nombreTarea(nombre)}`}),
        httpRequest: {
          httpMethod: 'POST',
          url: `https://${LOCATION}-${projectId}.cloudfunctions.net/${funcion}`,
          headers: {'Content-Type': 'application/json'},
          body: Buffer.from(JSON.stringify(payload)).toString('base64'),
          oidcToken: {serviceAccountEmail: cuentaServicioTasks(projectId)},
        },
        scheduleTime: {seconds: Math.floor(ejecutarEnMs / 1000)},
      },
    });
    return true;
  } catch (error) {
    if (esTareaDuplicada(error)) return true;
    throw error;
  }
}
