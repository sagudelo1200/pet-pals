/**
 * TIER 1.3: Cloud Tasks para Escalada Automática de Solicitudes Expiradas
 *
 * Estrategia de BAJO COSTO:
 * - onCrearPaseoDirecto: Trigger cuando se crea paseo DIRECTA
 *   └─→ Crea Cloud Task con delay de 10 minutos (escalada programada)
 * - escalarPaseoIndividual: HTTP function ejecutada por Cloud Tasks
 *   └─→ Escala el paseo específico (borra id_cuidador)
 *
 * Ventajas vs Scheduler cada minuto:
 * ✓ Costo: ~$0.01-0.05/mes vs ~$0.50-1/mes (50x más barato)
 * ✓ Sin polling: Solo ejecuta cuando es necesario
 * ✓ Latencia exacta: 10 minutos ± 1 segundo
 * ✓ Escalable: Miles de solicitudes sin overhead
 */

import {onDocumentCreated} from "firebase-functions/v2/firestore";
import {onRequest} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {CloudTasksClient} from "@google-cloud/tasks";

if (!admin.apps || admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();

// Configuración de Cloud Tasks
const LOCATION = "us-central1";
const QUEUE_NAME = "escaladas-directas";
const ESCALADA_DELAY_SECONDS = 600; // 10 minutos

// Inicializar CloudTasksClient de forma lazy (solo cuando se necesite)
let tasksClient: CloudTasksClient | null = null;
const getTasksClient = (): CloudTasksClient => {
  if (!tasksClient) {
    tasksClient = new CloudTasksClient();
  }
  return tasksClient;
};

/**
 * TRIGGER 1: Se dispara cuando se crea un paseo PENDIENTE con id_cuidador (DIRECTA)
 * Crea una Cloud Task programada para 10 minutos después
 */
export const onCrearPaseoDirecto = onDocumentCreated("paseos", async (event) => {
  const paseo = event.data?.data() as any;
  const paseoId = event.data?.id;

  // Solo procesar paseos DIRECTA (tienen id_cuidador y estado PENDIENTE)
  if (
    !paseoId ||
    !paseo ||
    !paseo.id_cuidador ||
    paseo.estado !== "PENDIENTE"
  ) {
    return;
  }

  try {
    // Obtener project ID desde context de Firebase (más fiable que env)
    const projectId = process.env.GCLOUD_PROJECT;
    if (!projectId) {
      console.error("[CloudTasks] GCLOUD_PROJECT no configurado");
      return;
    }

    // Construir el endpoint de la función
    const fnName = "escalarPaseoIndividual";
    const functionUrl = `https://${LOCATION}-${projectId}.cloudfunctions.net/${fnName}`;

    // Calcular tiempo de ejecución: ahora + ESCALADA_DELAY_SECONDS
    const ahora = Math.floor(Date.now() / 1000);
    const tiempoEjecucion = ahora + ESCALADA_DELAY_SECONDS;

    // Payload para la función
    const payload = {
      paseoId,
      cuidadorOriginal: paseo.id_cuidador,
      cuidadorNombre: paseo.cuidador_nombre_visual || "Desconocido",
    };

    // Construir la request para Cloud Tasks
    const tasksClientInstance = getTasksClient();
    const parent = tasksClientInstance.queuePath(
      projectId,
      LOCATION,
      QUEUE_NAME
    );
    const task = {
      httpRequest: {
        httpMethod: "POST" as const,
        url: functionUrl,
        headers: {"Content-Type": "application/json"},
        body: Buffer.from(JSON.stringify(payload)).toString("base64"),
        // OIDC token para autenticación segura
        oidcToken: {
          serviceAccountEmail: `firebase-adminsdk@${projectId}.iam.gserviceaccount.com`,
        },
      },
      scheduleTime: {
        seconds: tiempoEjecucion,
      },
    };

    // Crear la tarea en la queue
    await tasksClientInstance.createTask({parent, task});

    console.log(
      `[CloudTasks] ✅ Escalada programada para paseo ${paseoId} ` +
        `en ${ESCALADA_DELAY_SECONDS / 60} minutos`
    );
  } catch (error) {
    // Si falla la creación de task, loguear pero NO fallar la creación del paseo
    // (usuarios pueden escalar manualmente o esperar al siguiente intento)
    console.warn(
      `[CloudTasks] ⚠️ Error programando escalada para ${paseoId}:`,
      error instanceof Error ? error.message : String(error)
    );
  }
});

/**
 * FUNCTION 2: HTTP endpoint ejecutado por Cloud Tasks
 * Escala un paseo específico: borra id_cuidador para hacerlo ABIERTA
 */
export const escalarPaseoIndividual = onRequest(
  {cors: false},
  async (req, res) => {
    // Validar que sea POST
    if (req.method !== "POST") {
      res.status(405).json({error: "Method not allowed"});
      return;
    }

    try {
      const {paseoId, cuidadorOriginal, cuidadorNombre} = req.body;

      // Validaciones básicas
      if (!paseoId || typeof paseoId !== "string") {
        res.status(400).json({error: "paseoId requerido y debe ser string"});
        return;
      }

      const paseoRef = db.collection("paseos").doc(paseoId);

      // Transacción: Validar estado y escalar de forma atómica
      const resultado = await db.runTransaction(async (transaction) => {
        const docSnap = await transaction.get(paseoRef);

        if (!docSnap.exists) {
          return {success: false, razon: "Paseo no existe"};
        }

        const docData = docSnap.data() as any;

        // Validación 1: Estado debe ser PENDIENTE
        if (docData.estado !== "PENDIENTE") {
          return {
            success: false,
            razon: `Estado no es PENDIENTE (es: ${docData.estado})`,
          };
        }

        // Validación 2: Debe tener id_cuidador (si no, ya es ABIERTA)
        if (!docData.id_cuidador) {
          return {success: false, razon: "Ya es solicitud abierta"};
        }

        // Validación 3: Verificar que creado_por existe (para notificación)
        if (!docData.creado_por) {
          return {
            success: false,
            razon: "Paseo sin tutor asociado (creado_por vacío)",
          };
        }

        // ✅ Escalar: borrar id_cuidador y campos relacionados
        transaction.update(paseoRef, {
          id_cuidador: admin.firestore.FieldValue.delete(),
          cuidador_nombre_visual: admin.firestore.FieldValue.delete(),
          cuidador_foto_visual: admin.firestore.FieldValue.delete(),
          actualizado_en: admin.firestore.Timestamp.now(),
          actualizado_por: "SISTEMA_ESCALADA",
        });

        // Registrar evento en subcollection (auditoría)
        const eventRef = paseoRef.collection("eventos").doc();
        transaction.set(eventRef, {
          evento: "ESCALADA_AUTOMATICA",
          payload: {
            razon: "Cuidador no respondió en los primeros 10 minutos",
            cuidador_anterior: cuidadorOriginal,
            cuidador_anterior_nombre: cuidadorNombre,
          },
          actor: "SISTEMA",
          creado_en: admin.firestore.Timestamp.now(),
          creado_por: "SISTEMA",
          actualizado_en: admin.firestore.Timestamp.now(),
          actualizado_por: "SISTEMA",
        });

        // Retornar docData para usar en notificación
        return {success: true, docData};
      });

      if (!resultado.success) {
        console.log(
          `[Escalada] Paseo ${paseoId} no escalado: ${resultado.razon}`
        );
        res.status(200).json({
          success: false,
          paseoId,
          razon: resultado.razon,
        });
        return;
      }

      console.log(
        `[Escalada] ✅ Paseo ${paseoId} escalado a ABIERTA ` +
          `(era directo a ${cuidadorNombre})`
      );

      // Fire-and-forget: Notificar al tutor (no bloquea la respuesta)
      if (resultado.docData?.creado_por) {
        notificarTutorEscalada(paseoId, resultado.docData.creado_por).catch((e) =>
          console.warn("[Escalada] Error en notificación:", e)
        );
      }

      res.status(200).json({
        success: true,
        paseoId,
        mensaje: "Escalada exitosa",
      });
    } catch (error) {
      console.error("[Escalada] Error en escalarPaseoIndividual:", error);
      res.status(500).json({
        error: "Error procesando escalada",
        detalles: error instanceof Error ? error.message : "Error desconocido",
      });
    }
  }
);

/**
 * Notifica al tutor que su solicitud ha sido escalada
 * No bloquea la ejecución principal
 */
async function notificarTutorEscalada(
  paseoId: string,
  tutorId: string
): Promise<void> {
  try {
    if (!tutorId) {
      console.warn("[Escalada] tutorId vacío, omitiendo notificación");
      return;
    }

    const notifRef = db
      .collection("usuarios")
      .doc(tutorId)
      .collection("notificaciones")
      .doc();

    await notifRef.set({
      tipo: "SOLICITUD_ESCALADA",
      paseo_id: paseoId,
      titulo: "✅ Tu solicitud está disponible",
      cuerpo:
        "El cuidador asignado no respondió. Otros cuidadores pueden verla ahora.",
      leido: false,
      creado_en: admin.firestore.Timestamp.now(),
      datos: {
        paseo_id: paseoId,
        accion: "abrir_solicitud",
      },
    });

    console.log(`[Escalada] 🔔 Notificación registrada para tutor ${tutorId}`);
  } catch (error) {
    console.warn(
      "[Escalada] No se pudo crear notificación:",
      error instanceof Error ? error.message : String(error)
    );
    // No falla la escalada si la notificación no se crea
  }
}
