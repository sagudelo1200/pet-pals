/**
 * Evidencia de un requisito para quien la revisa (el equipo). Los archivos son
 * privados: no hay lectura por reglas, el servidor los lee y los entrega solo a
 * un admin, sin direcciones que se puedan compartir.
 */
import type {Firestore} from 'firebase-admin/firestore';
import {ErrorNegocio} from '../comun/errores';
import type {ArchivoEvidencia} from '../compartido/habilitacion';
import {requisitoDe, rutaEvidencia} from '../compartido/servicios';
import {cargarHabilitacion} from './habilitaciones';

export interface ArchivoLeido {
  contentType: string
  base64: string
}

export interface DependenciasLectura {
  /** Contenido del archivo, o null si no existe. */
  leerArchivo(ruta: string): Promise<ArchivoLeido | null>
}

/**
 * Archivos de evidencia de un requisito de una habilitación.
 * @param {Firestore} db Firestore.
 * @param {string} id Habilitación.
 * @param {string} requisito Requisito.
 * @param {DependenciasLectura} deps Acceso a Storage.
 * @return {Promise<ArchivoEvidencia[]>} Un elemento por archivo que pide el catálogo.
 */
export async function evidenciaDeRequisito(
  db: Firestore,
  id: string,
  requisito: string,
  deps: DependenciasLectura
): Promise<ArchivoEvidencia[]> {
  const h = await cargarHabilitacion(db, id);
  const def = requisitoDe(h.servicio, requisito);
  if (!def || def.evidencia.length === 0) {
    throw new ErrorNegocio('invalid-argument', 'Ese requisito no lleva evidencia');
  }
  return Promise.all(def.evidencia.map(async (archivo) => {
    const leido = await deps.leerArchivo(
      rutaEvidencia(h.uid, h.servicio, requisito, archivo));
    return leido ?
      {archivo, existe: true, ...leido} :
      {archivo, existe: false};
  }));
}
