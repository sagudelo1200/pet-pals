/* eslint-disable camelcase */
/**
 * Cloud Functions del motor económico (capa delgada: autentica, valida la
 * entrada y delega en los módulos de economia/).
 *
 * No hay funciones periódicas: los recordatorios, bloqueos y cortes de
 * liquidación se agendan como tareas de un solo uso cuando hacen falta.
 */
import {onDocumentCreated, onDocumentUpdated} from 'firebase-functions/v2/firestore';
import {onCall, onRequest} from 'firebase-functions/v2/https';
import {Timestamp} from 'firebase-admin/firestore';
import admin from '../comun/firebaseAdminCompat';
import {
  OPCIONES_CALLABLE as OPCIONES,
  conErrores,
  esAdmin,
  requerirAdmin,
  requerirUid,
  texto,
} from '../comun/callables';
import {fechaColombia} from './calculo';
import {revisarCobro, siguienteRevision, type CobroPendiente} from './cobranza';
import {fijarPoliticaDePaseo, generarCobrosDePaseo, politicaDePaseo} from './cobroPaseo';
import {obtenerAdaptadorContable} from './contabilidad';
import {
  documentarPagoLiquidacion,
  enviarDocumento,
  facturarOperacion,
} from './documentos';
import {
  generarLiquidaciones,
  proximoCorte,
  registrarPagoLiquidacion,
} from './liquidacion';
import {idObligacionCobro, idOperacionEconomica} from './motor';
import {confirmarPagoTutor, iniciarPagoTutor} from './pagoTutor';
import {obtenerAdaptadorPago} from './pagos';
import {obtenerPolitica, obtenerPoliticaVigente} from './politica';
import {marcarCobroCerradoPorEquipo} from './reclamo';
import {programarTarea} from './tareas';
import {
  COLECCION,
  type PoliticaCobro,
  type PoliticaLiquidacion,
} from './tipos';

if (!admin.apps || admin.apps.length === 0) admin.initializeApp();
const db = admin.firestore();

const MARGEN_CORTE_MS = 5 * 60 * 1000;

// ---------- Agenda de tareas de un solo uso ----------

/**
 * Agenda una revisión de un cobro. El nombre (cobro + instante) evita que un
 * disparador repetido agende la misma revisión dos veces.
 * @param {string} obligacionId Cobro.
 * @param {number} cuando Momento (ms epoch).
 */
async function agendarRevision(obligacionId: string, cuando: number): Promise<void> {
  await programarTarea('revisarCobroTutor', {obligacionId}, cuando,
    `cobro-${obligacionId}-${cuando}`);
}

/**
 * Agenda la próxima revisión de un cobro (recordatorio o bloqueo), si hace falta.
 * @param {string} obligacionId Cobro del tutor.
 * @param {PoliticaCobro} cobro Política de la operación.
 */
async function agendarRevisionCobro(
  obligacionId: string,
  cobro: PoliticaCobro
): Promise<void> {
  const ref = db.collection(COLECCION.OBLIGACIONES).doc(obligacionId);
  const data = (await ref.get()).data();
  if (!data) return;
  const cuando = siguienteRevision(
    {...(data as CobroPendiente), id: obligacionId}, cobro);
  if (cuando !== null) await agendarRevision(obligacionId, cuando);
}

/**
 * Agenda el próximo corte de liquidación. Una sola tarea por fecha de corte:
 * si ya estaba agendada no se duplica.
 * @param {PoliticaLiquidacion} liq Política vigente.
 * @param {number} desdeMs Instante de referencia.
 */
async function agendarCorte(
  liq: PoliticaLiquidacion,
  desdeMs: number
): Promise<void> {
  const corteMs = proximoCorte(liq, desdeMs);
  await programarTarea('ejecutarCorteLiquidacion', {corteMs},
    corteMs + MARGEN_CORTE_MS, `corte-liquidacion-${fechaColombia(corteMs - 1)}`);
}

/**
 * HTTP function privada invocada solo por Cloud Tasks (token OIDC).
 * Un error responde 500 para que Cloud Tasks reintente.
 * @param {string} nombre Nombre para los logs.
 * @param {Function} fn Lógica con el cuerpo de la petición.
 * @return {object} HTTP function.
 */
function tareaPrivada(
  nombre: string,
  fn: (body: Record<string, unknown>) => Promise<void>
) {
  return onRequest(
    {cors: false, invoker: 'private', region: 'us-central1'},
    async (req, res) => {
      if (req.method !== 'POST') {
        res.status(405).json({error: 'Method not allowed'});
        return;
      }
      try {
        await fn((req.body ?? {}) as Record<string, unknown>);
        res.status(200).json({ok: true});
      } catch (error) {
        console.error(`[economia] ${nombre} falló:`, error);
        res.status(500).json({
          error: error instanceof Error ? error.message : 'Error',
        });
      }
    }
  );
}

// ---------- Triggers del paseo ----------

/** Fija la versión de política comercial con la que se cobrará el paseo. */
export const alCrearPaseoEconomia = onDocumentCreated(
  'operaciones/{operacionId}',
  async (event) => {
    const paseo = event.data?.data();
    if (!paseo || paseo.tipo !== 'paseo') return;
    const version = await fijarPoliticaDePaseo(db, event.params.operacionId, paseo);
    console.log(`[economia] Paseo ${event.params.operacionId}: política v${version}`);
  }
);

/**
 * Tutores que acaban de validar el código de entrega (pasó a true).
 * @param {object} antes Paseo antes del cambio.
 * @param {object} despues Paseo después del cambio.
 * @return {string[]} UIDs de los tutores.
 */
export function tutoresQueValidaronEntrega(
  antes: Record<string, unknown> | undefined,
  despues: Record<string, unknown>
): string[] {
  const previo = (antes?.codigo_entrega_validado_por_tutor ?? {}) as
    Record<string, boolean>;
  const actual = (despues.codigo_entrega_validado_por_tutor ?? {}) as
    Record<string, boolean>;
  return Object.keys(actual).filter((t) => actual[t] === true && previo[t] !== true);
}

/**
 * Cuando un tutor valida el código de entrega nace su deuda y el pago al
 * cuidador (en paseos compartidos, cada tutor al validar el suyo).
 */
export const alValidarEntregaEconomia = onDocumentUpdated(
  'operaciones/{operacionId}',
  async (event) => {
    const antes = event.data?.before.data();
    const despues = event.data?.after.data();
    if (!despues || despues.tipo !== 'paseo') return;
    const validaron = tutoresQueValidaronEntrega(antes, despues);
    if (validaron.length === 0) return;

    const paseoId = event.params.operacionId;
    const ahora = Timestamp.now();
    const tutores = await generarCobrosDePaseo(db, paseoId, despues, ahora, validaron);
    console.log(
      `[economia] Paseo ${paseoId}: cobros para [${tutores.join(', ')}]`);
    if (tutores.length === 0) return;

    // La operación se completa con la política acordada al crear el paseo
    const politica = await politicaDePaseo(db, despues);
    // Cobros nacidos de un cierre del equipo: el tutor puede reclamar en la
    // ventana de la política del paseo
    if (despues.cierre_por_equipo) {
      const reclamoHasta = Timestamp.fromMillis(
        ahora.toMillis() + politica.entrega.ventana_reclamo_horas * 60 * 60 * 1000);
      await Promise.all(tutores.map((tutorId) => marcarCobroCerradoPorEquipo(
        db, idObligacionCobro(idOperacionEconomica(paseoId, tutorId)), reclamoHasta)));
    }
    // Factura a crédito por tutor: se emite al recibir la mascota
    const contabilidad = obtenerAdaptadorContable();
    for (const tutorId of tutores) {
      await facturarOperacion(db, idOperacionEconomica(paseoId, tutorId),
        politica.cobro.plazo_pago_horas, contabilidad, ahora);
    }
    // Cada cobro agenda su primera revisión (recordatorio o bloqueo)
    await Promise.all(tutores.map((tutorId) => agendarRevisionCobro(
      idObligacionCobro(idOperacionEconomica(paseoId, tutorId)), politica.cobro)));
    // Si se liquida sin esperar el pago del tutor, ya hay dinero para el corte
    if (!politica.liquidacion.solo_recaudadas) {
      const {liquidacion} = await obtenerPoliticaVigente(db);
      await agendarCorte(liquidacion, ahora.toMillis());
    }
  }
);

// ---------- Pago del tutor ----------

export const iniciarPagoOperacion = onCall(OPCIONES, (request) =>
  conErrores(async () => {
    const uid = requerirUid(request);
    const opId = texto(request.data?.operacionId, 'operacionId');
    return iniciarPagoTutor(db, opId, uid, obtenerAdaptadorPago(), Timestamp.now());
  })
);

export const confirmarPagoOperacion = onCall(OPCIONES, (request) =>
  conErrores(async () => {
    const uid = requerirUid(request);
    const opId = texto(request.data?.operacionId, 'operacionId');
    const ahora = Timestamp.now();
    const esAdministrador = await esAdmin(db, request);
    const resultado = await confirmarPagoTutor(db, opId, uid, esAdministrador, {
      pasarela: obtenerAdaptadorPago(),
      contabilidad: obtenerAdaptadorContable(),
    }, ahora);
    // Pago recibido: el cuidador entra en el próximo corte (calendario vigente)
    if (resultado.estado === 'APROBADO') {
      const {liquidacion} = await obtenerPoliticaVigente(db);
      await agendarCorte(liquidacion, ahora.toMillis());
    }
    return resultado;
  })
);

// ---------- Administración ----------

export const generarLiquidacionesAhora = onCall(OPCIONES, (request) =>
  conErrores(async () => {
    await requerirAdmin(db, request);
    const ahora = Timestamp.now();
    const politica = await obtenerPoliticaVigente(db);
    const {creadas} = await generarLiquidaciones(
      db, politica.liquidacion, ahora.toMillis(), ahora);
    return {creadas};
  })
);

export const pagarLiquidacion = onCall(OPCIONES, (request) =>
  conErrores(async () => {
    const uid = await requerirAdmin(db, request);
    const liqId = texto(request.data?.liquidacionId, 'liquidacionId');
    const referencia = texto(request.data?.referencia, 'referencia');
    const ahora = Timestamp.now();
    const liq = (await db.collection(COLECCION.LIQUIDACIONES).doc(liqId).get()).data();
    // Si ya estaba pagada (reintento) solo se completan los documentos
    if (liq?.estado !== 'PAGADA') {
      await registrarPagoLiquidacion(db, liqId, referencia, uid, ahora);
    }
    const documentos = await documentarPagoLiquidacion(
      db, liqId, obtenerAdaptadorContable(), ahora);
    return {ok: true, documentos};
  })
);

/** Reintenta reflejar en el sistema contable un documento que falló. */
export const reenviarDocumentoContable = onCall(OPCIONES, (request) =>
  conErrores(async () => {
    await requerirAdmin(db, request);
    const documentoId = texto(request.data?.documentoId, 'documentoId');
    const estado = await enviarDocumento(
      db, documentoId, obtenerAdaptadorContable(), Timestamp.now());
    return {estado};
  })
);

// ---------- Tareas de un solo uso (las invoca Cloud Tasks) ----------

/** Revisa un cobro y, si aún queda algo por hacer, agenda solo el siguiente paso. */
export const revisarCobroTutor = tareaPrivada('revisarCobroTutor', async (body) => {
  const obligacionId = body.obligacionId;
  if (typeof obligacionId !== 'string' || obligacionId === '') {
    throw new Error('obligacionId requerido');
  }
  // Plazos y recordatorios: los de la política de la operación
  const ref = db.collection(COLECCION.OBLIGACIONES).doc(obligacionId);
  const cobro = (await ref.get()).data();
  if (cobro?.estado !== 'PENDIENTE') return; // pagado o inexistente: fin
  const {cobro: plazos} = await obtenerPolitica(db, cobro.politica_version);
  const siguiente = await revisarCobro(db, obligacionId, plazos, Timestamp.now());
  if (siguiente !== null) await agendarRevision(obligacionId, siguiente);
});

/**
 * Corte de liquidación con el calendario y monto mínimo vigentes (agrupa
 * muchas operaciones); cada obligación aporta sus propios términos. Si alguien
 * no alcanzó el mínimo, agenda el siguiente corte.
 */
export const ejecutarCorteLiquidacion = tareaPrivada(
  'ejecutarCorteLiquidacion',
  async (body) => {
    const corteMs = body.corteMs;
    if (typeof corteMs !== 'number') throw new Error('corteMs requerido');
    const politica = await obtenerPoliticaVigente(db);
    const {creadas, aplazadas} = await generarLiquidaciones(
      db, politica.liquidacion, corteMs, Timestamp.now());
    console.log(`[economia] Corte ${fechaColombia(corteMs - 1)}: ` +
      `${creadas.length} liquidación(es), ${aplazadas} aplazada(s)`);
    if (aplazadas > 0) await agendarCorte(politica.liquidacion, corteMs);
  }
);
