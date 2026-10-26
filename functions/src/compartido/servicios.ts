/* eslint-disable camelcase */
/**
 * CATÁLOGO DE SERVICIOS Y REQUISITOS: qué se le exige a quien quiere ofrecer
 * un servicio en Paw-Path (pasear, guardería, entrenamiento...).
 *
 * Compartido por la app y las Cloud Functions (TypeScript puro, sin
 * dependencias). Es solo DATOS: agregar un servicio, un requisito o cambiar de
 * proveedor es editar este archivo; el motor (habilitacion.ts y, en el
 * servidor, functions/src/habilitaciones/) no cambia.
 *
 * Cada requisito se cumple de una de dos maneras:
 * - con una verificación (colección `verificaciones`, ver models/Verificacion.ts)
 *   que valida un `validador`: el sistema mismo (p. ej. el código al correo),
 *   una persona del equipo (`manual`) o un proveedor externo;
 * - con datos del perfil (`perfil`): se calcula, nadie lo revisa.
 *
 * Evidencia (fotos o PDF) en Firebase Storage:
 *   solicitudes/{uid}/{servicio}/{requisito}/{archivo}   (ver storage.rules)
 * Sus límites son el perfil `evidencia` de archivos.ts.
 */

import {NOMBRE_ARCHIVO} from './archivos';
import {CATALOGO_CONFIGURACION} from './configuracion';

export const TIPOS_VERIFICACION = [
  'EMAIL',
  'IDENTIDAD',
  'CERTIFICADO',
  'ANTECEDENTES',
  'TELEFONO',
  'DOMICILIO',
  'FORMACION',
] as const;

export type TipoVerificacion = typeof TIPOS_VERIFICACION[number];

/** Proveedores externos de verificación que el motor sabrá usar. */
export const PROVEEDORES_EXTERNOS = [
  'sumsub',
  'veriff',
  'onfido',
  'custom',
] as const;

export type ProveedorExterno = typeof PROVEEDORES_EXTERNOS[number];

/**
 * Quién valida un requisito:
 * - sistema: se registra sola (p. ej. el código enviado al correo)
 * - manual: lo revisa una persona del equipo (admin)
 * - un proveedor externo: la decisión llega por su respuesta
 */
export type Validador = 'sistema' | 'manual' | ProveedorExterno;

export interface DefinicionRequisito {
  id: string
  titulo: string
  descripcion: string
  /** Verificación que lo cumple; null = se comprueba con datos del perfil. */
  verificacion: TipoVerificacion | null
  /** Campos del perfil público que deben estar completos (si verificacion = null). */
  perfil?: string[]
  validador: Validador
  /** Archivos que se piden como evidencia (nombres fijos: frente, reverso...). */
  evidencia: string[]
  /**
   * Meses de validez desde que se aprueba; null = no vence. Es el valor por
   * defecto: configuracion/servicios puede cambiarlo con una clave
   * `{id}_vigencia_meses` (ver vigenciaDe en habilitacion.ts).
   */
  vigencia_meses: number | null
  /** Si no es obligatorio, suma una insignia pero no impide ofrecer el servicio. */
  obligatorio: boolean
}

/** Rol que se le otorga a quien queda habilitado para el servicio. */
export type RolDeServicio = 'cuidador';

export interface DefinicionServicio {
  titulo: string
  rol: RolDeServicio
  requisitos: DefinicionRequisito[]
}

/**
 * Tipa una definición para que sus literales (listas vacías, null) no se
 * ensanchen, conservando la clave literal de cada servicio.
 * @param {DefinicionServicio} definicion Definición del servicio.
 * @return {DefinicionServicio} La misma definición.
 */
const definir = (definicion: DefinicionServicio): DefinicionServicio => definicion;

export const CATALOGO_SERVICIOS = {
  paseo: definir({
    titulo: 'Paseos',
    rol: 'cuidador',
    requisitos: [
      {
        id: 'email',
        titulo: 'Correo verificado',
        descripcion: 'Confirmaste que el correo es tuyo con el código que te enviamos',
        verificacion: 'EMAIL',
        validador: 'sistema',
        evidencia: [],
        vigencia_meses: null,
        obligatorio: true,
      },
      {
        id: 'perfil',
        titulo: 'Perfil completo',
        descripcion: 'Cuéntanos de ti, tu horario y dónde vives, para que los ' +
          'tutores te encuentren',
        verificacion: null,
        perfil: ['biografia', 'horario_semanal', 'h3_r8'],
        validador: 'sistema',
        evidencia: [],
        vigencia_meses: null,
        obligatorio: true,
      },
      {
        id: 'identidad',
        titulo: 'Identidad',
        descripcion: 'Foto de tu documento de identidad por ambos lados',
        verificacion: 'IDENTIDAD',
        validador: 'manual',
        evidencia: ['frente', 'reverso'],
        vigencia_meses: null,
        obligatorio: true,
      },
      {
        id: 'antecedentes',
        titulo: 'Antecedentes judiciales',
        descripcion: 'Certificado de antecedentes judiciales vigente',
        verificacion: 'ANTECEDENTES',
        validador: 'manual',
        evidencia: ['certificado'],
        // El admin puede cambiarla en configuracion/servicios (ver vigenciaDe)
        vigencia_meses:
          CATALOGO_CONFIGURACION.servicios.valores.antecedentes_vigencia_meses
            .porDefecto,
        obligatorio: true,
      },
    ],
  }),
};

export type TipoServicio = keyof typeof CATALOGO_SERVICIOS;

export const TIPOS_SERVICIO = Object.keys(CATALOGO_SERVICIOS) as TipoServicio[];

/**
 * ¿Es un servicio del catálogo?
 * @param {unknown} servicio Valor a comprobar.
 * @return {boolean} Si es un servicio válido.
 */
export function esTipoServicio(servicio: unknown): servicio is TipoServicio {
  return typeof servicio === 'string' && servicio in CATALOGO_SERVICIOS;
}

/**
 * Requisitos de un servicio, en el orden en que se muestran.
 * @param {TipoServicio} servicio Servicio.
 * @return {DefinicionRequisito[]} Requisitos.
 */
export function requisitosDe(servicio: TipoServicio): DefinicionRequisito[] {
  return CATALOGO_SERVICIOS[servicio].requisitos;
}

/**
 * Un requisito de un servicio, o undefined si no existe.
 * @param {TipoServicio} servicio Servicio.
 * @param {string} id Id del requisito.
 * @return {DefinicionRequisito | undefined} Requisito.
 */
export function requisitoDe(
  servicio: TipoServicio,
  id: string
): DefinicionRequisito | undefined {
  return requisitosDe(servicio).find((r) => r.id === id);
}

/**
 * Ruta en Storage de un archivo de evidencia.
 * @param {string} uid Dueño de la habilitación.
 * @param {TipoServicio} servicio Servicio.
 * @param {string} requisito Id del requisito.
 * @param {string} archivo Nombre del archivo (de `evidencia` del requisito).
 * @return {string} Ruta.
 */
export function rutaEvidencia(
  uid: string,
  servicio: TipoServicio,
  requisito: string,
  archivo: string
): string {
  return `solicitudes/${uid}/${servicio}/${requisito}/${archivo}`;
}

/**
 * Errores de coherencia del catálogo (vacío si está bien armado). Lo usa un
 * test: un catálogo mal escrito no debe llegar a producción.
 * @param {Record} catalogo Catálogo a revisar.
 * @return {string[]} Errores encontrados.
 */
export function erroresDelCatalogo(
  catalogo: Record<string, DefinicionServicio> = CATALOGO_SERVICIOS
): string[] {
  const errores: string[] = [];
  for (const [servicio, def] of Object.entries(catalogo)) {
    const donde = (id: string) => `${servicio}/${id}`;
    if (!def.requisitos.some((r) => r.obligatorio)) {
      errores.push(`${servicio}: necesita al menos un requisito obligatorio`);
    }
    const vistos = new Set<string>();
    for (const r of def.requisitos) {
      if (!NOMBRE_ARCHIVO.test(r.id)) {
        errores.push(`${donde(r.id)}: id inválido`);
      }
      if (vistos.has(r.id)) errores.push(`${donde(r.id)}: id repetido`);
      vistos.add(r.id);

      if (r.verificacion === null) {
        if (!r.perfil || r.perfil.length === 0) {
          errores.push(`${donde(r.id)}: sin verificación, debe pedir campos del perfil`);
        }
        if (r.validador !== 'sistema') {
          errores.push(`${donde(r.id)}: un requisito del perfil lo valida el sistema`);
        }
        if (r.evidencia.length > 0 || r.vigencia_meses !== null) {
          errores.push(
            `${donde(r.id)}: un requisito del perfil no tiene evidencia ni vence`);
        }
      } else if (r.perfil) {
        errores.push(`${donde(r.id)}: no mezcla verificación y campos del perfil`);
      }

      if (r.validador === 'sistema' && r.evidencia.length > 0) {
        errores.push(`${donde(r.id)}: lo que valida el sistema no lleva evidencia`);
      }
      if (new Set(r.evidencia).size !== r.evidencia.length ||
        !r.evidencia.every((a) => NOMBRE_ARCHIVO.test(a))) {
        errores.push(`${donde(r.id)}: nombres de evidencia inválidos o repetidos`);
      }
      if (r.vigencia_meses !== null &&
        !(Number.isInteger(r.vigencia_meses) && r.vigencia_meses > 0)) {
        errores.push(`${donde(r.id)}: vigencia en meses enteros mayores que 0`);
      }
    }
  }
  return errores;
}
