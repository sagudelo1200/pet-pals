/* eslint-disable camelcase */
/**
 * Política comercial versionada (precios, comisión, cobro y liquidación).
 *
 * - politicas_comerciales/v{n}: una versión; inmutable una vez publicada.
 * - configuracion/comercial: { version_vigente: n }.
 *
 * Cada operación económica guarda la versión con la que nació, así un cambio
 * de política no altera operaciones anteriores.
 */
import type {Firestore, Timestamp} from 'firebase-admin/firestore';
import {
  COLECCION,
  DOC_CONFIGURACION_COMERCIAL,
  type PoliticaComercial,
} from './tipos';

type DatosPolitica = Omit<PoliticaComercial, 'version' | 'estado'>;

const esEntero = (v: unknown, min: number, max = Number.MAX_SAFE_INTEGER) =>
  typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;

/**
 * Valida los datos editables de una política. Devuelve la lista de errores
 * (vacía si es válida).
 * @param {unknown} datos Datos recibidos.
 * @return {string[]} Errores encontrados.
 */
export function validarPolitica(datos: unknown): string[] {
  const d = datos as Partial<DatosPolitica> | undefined;
  const errores: string[] = [];
  const paseo = d?.por_tipo?.paseo;
  const cobro = d?.cobro;
  const liq = d?.liquidacion;

  if (!esEntero(paseo?.precio?.base_por_hora, 1)) {
    errores.push('precio.base_por_hora debe ser un entero mayor que 0');
  }
  if (!esEntero(paseo?.precio?.mascota_adicional, 0)) {
    errores.push('precio.mascota_adicional debe ser un entero >= 0');
  }
  const pct = paseo?.comision?.porcentaje_plataforma;
  if (typeof pct !== 'number' || pct < 0 || pct > 100) {
    errores.push('comision.porcentaje_plataforma debe estar entre 0 y 100');
  }

  if (!esEntero(cobro?.plazo_pago_horas, 1)) {
    errores.push('cobro.plazo_pago_horas debe ser un entero mayor que 0');
  }
  if (
    !esEntero(cobro?.bloqueo_tras_horas, 1) ||
    (esEntero(cobro?.plazo_pago_horas, 1) &&
      (cobro?.bloqueo_tras_horas as number) < (cobro?.plazo_pago_horas as number))
  ) {
    errores.push('cobro.bloqueo_tras_horas debe ser un entero >= plazo_pago_horas');
  }
  if (!esEntero(cobro?.max_recordatorios, 0, 10)) {
    errores.push('cobro.max_recordatorios debe ser un entero entre 0 y 10');
  }
  if (!esEntero(cobro?.intervalo_recordatorios_horas, 1)) {
    errores.push('cobro.intervalo_recordatorios_horas debe ser un entero mayor que 0');
  }
  const horario = cobro?.horario_recordatorios;
  if (
    !esEntero(horario?.desde, 0, 23) ||
    !esEntero(horario?.hasta, 1, 24) ||
    (horario?.desde as number) >= (horario?.hasta as number)
  ) {
    errores.push('cobro.horario_recordatorios debe cumplir 0 <= desde < hasta <= 24');
  }

  if (liq?.frecuencia !== 'SEMANAL') {
    errores.push('liquidacion.frecuencia debe ser SEMANAL');
  }
  if (!esEntero(liq?.dia_corte, 0, 6)) {
    errores.push('liquidacion.dia_corte debe ser un día entre 0 (domingo) y 6');
  }
  if (!esEntero(liq?.dia_pago, 0, 6)) {
    errores.push('liquidacion.dia_pago debe ser un día entre 0 (domingo) y 6');
  }
  if (!esEntero(liq?.monto_minimo, 0)) {
    errores.push('liquidacion.monto_minimo debe ser un entero >= 0');
  }
  if (typeof liq?.solo_recaudadas !== 'boolean') {
    errores.push('liquidacion.solo_recaudadas debe ser verdadero o falso');
  }

  const iva = d?.impuestos?.iva_comision;
  if (typeof iva?.aplica !== 'boolean') {
    errores.push('impuestos.iva_comision.aplica debe ser verdadero o falso');
  }
  if (typeof iva?.porcentaje !== 'number' || iva.porcentaje < 0 || iva.porcentaje > 100) {
    errores.push('impuestos.iva_comision.porcentaje debe estar entre 0 y 100');
  }
  if (typeof iva?.incluido_en_precio !== 'boolean') {
    errores.push('impuestos.iva_comision.incluido_en_precio debe ser verdadero o falso');
  }
  if (typeof d?.contabilidad?.documento_soporte_cuidador !== 'boolean') {
    errores.push('contabilidad.documento_soporte_cuidador debe ser verdadero o falso');
  }
  return errores;
}

/**
 * Lee una versión concreta de la política.
 * @param {Firestore} db Firestore.
 * @param {number} version Número de versión.
 * @return {Promise<PoliticaComercial>} Política.
 */
export async function obtenerPolitica(
  db: Firestore,
  version: number
): Promise<PoliticaComercial> {
  const snap = await db.collection(COLECCION.POLITICAS).doc(`v${version}`).get();
  if (!snap.exists) {
    throw new Error(`Política comercial v${version} no existe`);
  }
  return exigirCompleta(snap.data() as PoliticaComercial);
}

/**
 * Lee la política vigente. Falla si no hay ninguna publicada (no hay valores
 * por defecto: la política se administra desde la BD).
 * @param {Firestore} db Firestore.
 * @return {Promise<PoliticaComercial>} Política vigente.
 */
export async function obtenerPoliticaVigente(
  db: Firestore
): Promise<PoliticaComercial> {
  const config = await db
    .collection(COLECCION.CONFIGURACION)
    .doc(DOC_CONFIGURACION_COMERCIAL)
    .get();
  const version = config.data()?.version_vigente;
  if (typeof version !== 'number') {
    throw new Error(
      'No hay política comercial vigente (ejecuta npm run seed:politica-comercial)'
    );
  }
  return obtenerPolitica(db, version);
}

/**
 * Exige que una política tenga impuestos y contabilidad (versiones creadas
 * antes de esos campos deben completarse: npm run seed:politica-comercial
 * -- --completar).
 * @param {PoliticaComercial} p Política leída.
 * @return {PoliticaComercial} La misma política.
 */
function exigirCompleta(p: PoliticaComercial): PoliticaComercial {
  if (!p.impuestos?.iva_comision || !p.contabilidad) {
    throw new Error(`Política comercial v${p.version} sin impuestos/contabilidad: ` +
      'complétala con npm run seed:politica-comercial -- --completar');
  }
  return p;
}

/**
 * Copia solo los campos conocidos, en orden fijo: lo guardado nunca trae
 * campos extra y dos políticas iguales se comparan como iguales.
 * @param {DatosPolitica} d Datos ya validados.
 * @return {DatosPolitica} Datos normalizados.
 */
function normalizarPolitica(d: DatosPolitica): DatosPolitica {
  const {precio, comision} = d.por_tipo.paseo;
  const iva = d.impuestos.iva_comision;
  const c = d.cobro;
  const l = d.liquidacion;
  return {
    por_tipo: {
      paseo: {
        precio: {
          base_por_hora: precio.base_por_hora,
          mascota_adicional: precio.mascota_adicional,
        },
        comision: {porcentaje_plataforma: comision.porcentaje_plataforma},
      },
    },
    impuestos: {
      iva_comision: {
        aplica: iva.aplica,
        porcentaje: iva.porcentaje,
        incluido_en_precio: iva.incluido_en_precio,
      },
    },
    cobro: {
      plazo_pago_horas: c.plazo_pago_horas,
      bloqueo_tras_horas: c.bloqueo_tras_horas,
      max_recordatorios: c.max_recordatorios,
      intervalo_recordatorios_horas: c.intervalo_recordatorios_horas,
      horario_recordatorios: {
        desde: c.horario_recordatorios.desde,
        hasta: c.horario_recordatorios.hasta,
      },
    },
    liquidacion: {
      frecuencia: l.frecuencia,
      dia_corte: l.dia_corte,
      dia_pago: l.dia_pago,
      monto_minimo: l.monto_minimo,
      solo_recaudadas: l.solo_recaudadas,
    },
    contabilidad: {
      documento_soporte_cuidador: d.contabilidad.documento_soporte_cuidador,
    },
  };
}

/**
 * ¿Dos políticas tienen los mismos datos? Una versión antigua con otra forma
 * (p. ej. sin impuestos) se considera distinta.
 * @param {unknown} a Política guardada.
 * @param {DatosPolitica} b Política normalizada.
 * @return {boolean} Si son iguales.
 */
function mismaPolitica(a: unknown, b: DatosPolitica): boolean {
  try {
    return JSON.stringify(normalizarPolitica(a as DatosPolitica)) === JSON.stringify(b);
  } catch {
    return false;
  }
}

/**
 * Publica una nueva versión (vigente desde ya) y archiva la anterior.
 * Idempotente: si los datos son iguales a la versión vigente no crea otra
 * (p. ej. doble toque en "Publicar") y devuelve la vigente.
 * @param {Firestore} db Firestore.
 * @param {DatosPolitica} datos Datos ya validados.
 * @param {string} publicadoPor UID del admin.
 * @param {Timestamp} ahora Momento de publicación.
 * @return {Promise<number>} Número de la nueva versión.
 */
export async function publicarPolitica(
  db: Firestore,
  datos: DatosPolitica,
  publicadoPor: string,
  ahora: Timestamp
): Promise<number> {
  const configRef = db
    .collection(COLECCION.CONFIGURACION)
    .doc(DOC_CONFIGURACION_COMERCIAL);

  const normalizada = normalizarPolitica(datos);
  return db.runTransaction(async (tx) => {
    const config = await tx.get(configRef);
    const anterior = config.data()?.version_vigente;
    if (typeof anterior === 'number') {
      const vigente = (await tx.get(
        db.collection(COLECCION.POLITICAS).doc(`v${anterior}`))).data();
      if (vigente && mismaPolitica(vigente, normalizada)) return anterior;
    }
    const nueva = typeof anterior === 'number' ? anterior + 1 : 1;

    tx.set(db.collection(COLECCION.POLITICAS).doc(`v${nueva}`), {
      ...normalizada,
      version: nueva,
      estado: 'ACTIVA',
      vigente_desde: ahora,
      publicado_por: publicadoPor,
    });
    if (typeof anterior === 'number') {
      tx.update(db.collection(COLECCION.POLITICAS).doc(`v${anterior}`), {
        estado: 'HISTORICA',
        vigente_hasta: ahora,
      });
    }
    tx.set(configRef, {version_vigente: nueva, actualizado_en: ahora});
    return nueva;
  });
}
