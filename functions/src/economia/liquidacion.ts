/* eslint-disable camelcase */
/**
 * Liquidación a cuidadores.
 * Sin jobs periódicos: cuando hay dinero listo para un cuidador se agenda una
 * única tarea para el próximo corte (una por fecha). Al corte agrupa por
 * cuidador las obligaciones PAGO_CUIDADOR pendientes (solo las ya
 * recaudadas si la política lo exige) en una liquidación
 * BORRADOR. El admin transfiere y registra la referencia: cada obligación
 * queda CUMPLIDA con su movimiento y la liquidación pasa a PAGADA.
 */
import type {Firestore} from 'firebase-admin/firestore';
import {Timestamp} from 'firebase-admin/firestore';
import {diaSemanaColombia, fechaColombia, inicioDiaColombia} from './calculo';

const DIA_MS = 24 * 60 * 60 * 1000;
import {pagarObligacion} from './motor';
import {COLECCION, type PoliticaLiquidacion} from './tipos';

interface ObligacionCuidador {
  id: string
  acreedor: string
  valor: number
  creado_en: Timestamp
  cobro_recaudado?: boolean
  liquidacion_id?: string
}

/**
 * ¿La obligación entra en la liquidación de este corte?
 * @param {ObligacionCuidador} o Obligación.
 * @param {PoliticaLiquidacion} liq Política.
 * @param {number} corteMs Fin del periodo (exclusivo).
 * @return {boolean} Si es liquidable.
 */
function esLiquidable(
  o: ObligacionCuidador,
  liq: PoliticaLiquidacion,
  corteMs: number
): boolean {
  return !o.liquidacion_id &&
    o.creado_en.toMillis() < corteMs &&
    (!liq.solo_recaudadas || o.cobro_recaudado === true);
}

/**
 * Genera las liquidaciones BORRADOR hasta el corte indicado.
 * Idempotente: una liquidación por cuidador y fecha de corte, y cada
 * obligación entra en una sola liquidación.
 * @param {Firestore} db Firestore.
 * @param {PoliticaLiquidacion} liq Política vigente.
 * @param {number} corteMs Fin del periodo (exclusivo), ms epoch.
 * @param {Timestamp} ahora Momento.
 * @return {Promise<object>} Liquidaciones creadas y cuidadores aplazados
 *   (no alcanzaron el monto mínimo; pasan al siguiente corte).
 */
export async function generarLiquidaciones(
  db: Firestore,
  liq: PoliticaLiquidacion,
  corteMs: number,
  ahora: Timestamp
): Promise<{creadas: string[]; aplazadas: number}> {
  const snap = await db.collection(COLECCION.OBLIGACIONES)
    .where('tipo', '==', 'PAGO_CUIDADOR')
    .where('estado', '==', 'PENDIENTE')
    .get();
  const porCuidador = new Map<string, ObligacionCuidador[]>();
  for (const d of snap.docs) {
    const o = {...(d.data() as ObligacionCuidador), id: d.id};
    if (!esLiquidable(o, liq, corteMs)) continue;
    porCuidador.set(o.acreedor, [...(porCuidador.get(o.acreedor) ?? []), o]);
  }

  const creadas: string[] = [];
  let aplazadas = 0;
  for (const [cuidadorId, lista] of porCuidador) {
    const total = lista.reduce((s, o) => s + o.valor, 0);
    if (total < liq.monto_minimo) {
      aplazadas++; // pasa al siguiente periodo
      continue;
    }

    const liqId = `${cuidadorId}_${fechaColombia(corteMs - 1)}`;
    const liqRef = db.collection(COLECCION.LIQUIDACIONES).doc(liqId);
    const creada = await db.runTransaction(async (tx) => {
      if ((await tx.get(liqRef)).exists) return false;
      const refs = lista.map((o) => db.collection(COLECCION.OBLIGACIONES).doc(o.id));
      const actuales = await Promise.all(refs.map((r) => tx.get(r)));
      const incluidas = lista.filter((o, i) =>
        actuales[i].data()?.estado === 'PENDIENTE' &&
        !actuales[i].data()?.liquidacion_id);
      if (incluidas.length === 0) return false;

      tx.set(liqRef, {
        id: liqId,
        cuidador_id: cuidadorId,
        periodo_hasta: Timestamp.fromMillis(corteMs),
        obligacion_ids: incluidas.map((o) => o.id),
        total: incluidas.reduce((s, o) => s + o.valor, 0),
        estado: 'BORRADOR',
        dia_pago_estimado: liq.dia_pago,
        creado_en: ahora,
      });
      for (const o of incluidas) {
        tx.update(db.collection(COLECCION.OBLIGACIONES).doc(o.id), {
          liquidacion_id: liqId,
        });
      }
      return true;
    });
    if (creada) creadas.push(liqId);
  }
  return {creadas, aplazadas};
}

/**
 * Próximo corte después de un instante: medianoche (hora Colombia) del día
 * siguiente al día de corte configurado.
 * @param {PoliticaLiquidacion} liq Política vigente.
 * @param {number} desdeMs Instante de referencia.
 * @return {number} Momento del corte (ms epoch), siempre futuro.
 */
export function proximoCorte(liq: PoliticaLiquidacion, desdeMs: number): number {
  const hoy = inicioDiaColombia(desdeMs);
  for (let dias = 1; dias <= 7; dias++) {
    const candidato = hoy + dias * DIA_MS;
    if (diaSemanaColombia(candidato - 1) === liq.dia_corte) return candidato;
  }
  throw new Error(`dia_corte inválido: ${liq.dia_corte}`);
}

/**
 * Registra la transferencia de una liquidación: paga cada obligación con una
 * referencia única por obligación y marca la liquidación PAGADA.
 * Reintentable: las obligaciones ya cumplidas se omiten.
 * @param {Firestore} db Firestore.
 * @param {string} liqId Liquidación.
 * @param {string} referencia Referencia de la transferencia.
 * @param {string} adminUid Quién registra.
 * @param {Timestamp} ahora Momento.
 */
export async function registrarPagoLiquidacion(
  db: Firestore,
  liqId: string,
  referencia: string,
  adminUid: string,
  ahora: Timestamp
): Promise<void> {
  const liqRef = db.collection(COLECCION.LIQUIDACIONES).doc(liqId);
  const liqDoc = (await liqRef.get()).data();
  if (!liqDoc) throw new Error(`Liquidación ${liqId} no existe`);
  if (liqDoc.estado === 'PAGADA') throw new Error('La liquidación ya está pagada');

  for (const obligId of liqDoc.obligacion_ids as string[]) {
    const oblig = (await db.collection(COLECCION.OBLIGACIONES).doc(obligId).get()).data();
    if (oblig?.estado !== 'PENDIENTE') continue;
    await pagarObligacion(db, obligId, {
      origen: 'TRANSFERENCIA',
      referencia: `${referencia}:${obligId}`,
    }, ahora);
  }
  await liqRef.update({
    estado: 'PAGADA',
    referencia_pago: referencia,
    pagado_en: ahora,
    pagado_por: adminUid,
  });
}
