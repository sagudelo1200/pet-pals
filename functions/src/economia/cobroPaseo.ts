/* eslint-disable camelcase */
/**
 * Puente paseo → economía.
 * - Al crear el paseo se fija la versión de política con la que se cobrará.
 * - Cuando cada tutor valida el código de entrega nace su operación
 *   económica, con el precio calculado en el servidor según sus mascotas y
 *   la duración del paseo.
 */
import type {Firestore, Timestamp} from 'firebase-admin/firestore';
import {calcularPrecioPaseo, desglosarCobro} from './calculo';
import {generarCobroServicio} from './motor';
import {obtenerPolitica, obtenerPoliticaVigente} from './politica';

const DURACION_POR_DEFECTO_MIN = 60;

/**
 * Fija en el paseo la versión vigente de la política comercial.
 * @param {Firestore} db Firestore.
 * @param {string} paseoId Paseo.
 * @param {Record<string, unknown>} paseo Datos del paseo.
 * @return {Promise<number | null>} Versión fijada (null si ya tenía).
 */
export async function fijarPoliticaDePaseo(
  db: Firestore,
  paseoId: string,
  paseo: Record<string, unknown>
): Promise<number | null> {
  if (typeof paseo.politica_version === 'number') return null;
  const politica = await obtenerPoliticaVigente(db);
  await db.collection('operaciones').doc(paseoId).update({
    politica_version: politica.version,
  });
  return politica.version;
}

/**
 * Genera los cobros de un paseo (uno por tutor). Idempotente.
 * @param {Firestore} db Firestore.
 * @param {string} paseoId Paseo.
 * @param {Record<string, unknown>} paseo Datos del paseo.
 * @param {Timestamp} ahora Momento.
 * @param {string[]} soloTutores Si se indica, solo cobra a estos tutores
 *   (los que acaban de validar la entrega).
 * @return {Promise<string[]>} Tutores a los que se les generó cobro.
 */
export async function generarCobrosDePaseo(
  db: Firestore,
  paseoId: string,
  paseo: Record<string, unknown>,
  ahora: Timestamp,
  soloTutores?: string[]
): Promise<string[]> {
  const cuidadorId = paseo.id_cuidador;
  if (typeof cuidadorId !== 'string' || cuidadorId === '') {
    throw new Error(`Paseo ${paseoId} finalizado sin cuidador asignado`);
  }

  const politica = typeof paseo.politica_version === 'number' ?
    await obtenerPolitica(db, paseo.politica_version) :
    await obtenerPoliticaVigente(db);
  const tarifas = politica.por_tipo.paseo;
  const duracion = typeof paseo.duracion_estimada === 'number' &&
    paseo.duracion_estimada > 0 ?
    paseo.duracion_estimada :
    DURACION_POR_DEFECTO_MIN;

  // Mascotas por tutor (en compartidos cada tutor paga solo lo suyo)
  const mascotas = await db.collection('operaciones').doc(paseoId)
    .collection('mascotas').get();
  const porTutor = new Map<string, number>();
  for (const m of mascotas.docs) {
    const tutor = m.data().id_usuario;
    if (typeof tutor === 'string' && tutor !== '') {
      porTutor.set(tutor, (porTutor.get(tutor) ?? 0) + 1);
    }
  }

  const generados: string[] = [];
  for (const [tutorId, numMascotas] of porTutor) {
    if (soloTutores && !soloTutores.includes(tutorId)) continue;
    const precio = calcularPrecioPaseo(tarifas, numMascotas, duracion);
    if (precio <= 0) continue;
    const desglose = desglosarCobro(tarifas, politica.impuestos, precio);
    const creado = await generarCobroServicio(db, {
      servicioId: paseoId,
      tipoServicio: 'paseo',
      tutorId,
      cuidadorId,
      desglose,
      politicaVersion: politica.version,
      detallePrecio: {
        num_mascotas: numMascotas,
        duracion_minutos: duracion,
        precio_servicio: precio,
        base_por_hora: tarifas.precio.base_por_hora,
        mascota_adicional: tarifas.precio.mascota_adicional,
        porcentaje_plataforma: tarifas.comision.porcentaje_plataforma,
        porcentaje_iva: politica.impuestos.iva_comision.aplica ?
          politica.impuestos.iva_comision.porcentaje : 0,
      },
    }, ahora);
    if (creado) generados.push(tutorId);
  }
  return generados;
}
