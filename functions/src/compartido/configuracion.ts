/* eslint-disable camelcase */
/**
 * Catálogo único de la CONFIGURACIÓN OPERATIVA de Paw-Path.
 *
 * Compartido por la app y las Cloud Functions (TypeScript puro, sin
 * dependencias): describe cada valor una sola vez y de aquí salen la
 * validación, los valores por defecto, el formulario del admin y el seed.
 *
 * Configuración operativa = vale el valor actual (no es retroactiva).
 * Lo que afecta dinero o derechos (precios, comisiones, términos) NO va aquí:
 * es una política versionada (ver versionables.ts).
 *
 * Firestore: configuracion/{area} con los valores en la raíz, más
 * actualizado_en / actualizado_por, y configuracion/{area}/historial/{id}.
 */

export interface ConfiguracionAreas {
  paseos: {
    max_mascotas: number
    escalada_minutos: number
  }
  auth: {
    otp_minutos_expiracion: number
    otp_segundos_reenvio: number
    otp_max_intentos: number
  }
  evaluaciones: {
    dias_revelacion: number[]
  }
  funcionalidades: {
    paseo_compartido: boolean
  }
}

export type AreaConfiguracion = keyof ConfiguracionAreas;

export type TipoValor = 'entero' | 'booleano' | 'lista_enteros';

export interface DefinicionValor<V> {
  tipo: TipoValor
  titulo: string
  descripcion: string
  porDefecto: V
  /** Rango permitido (enteros y cada elemento de las listas) */
  min?: number
  max?: number
  unidad?: string
}

export interface DefinicionArea<A extends AreaConfiguracion> {
  titulo: string
  /**
   * publica: la leen los usuarios autenticados (la app la necesita).
   * servidor: solo la leen las Cloud Functions.
   */
  lectura: 'publica' | 'servidor'
  valores: {
    [K in keyof ConfiguracionAreas[A]]-?: DefinicionValor<ConfiguracionAreas[A][K]>
  }
}

export const CATALOGO_CONFIGURACION: {
  [A in AreaConfiguracion]: DefinicionArea<A>
} = {
  paseos: {
    titulo: 'Paseos',
    lectura: 'publica',
    valores: {
      max_mascotas: {
        tipo: 'entero', titulo: 'Máximo de mascotas por paseo',
        descripcion: 'Límite de mascotas en un mismo paseo (también compartido)',
        porDefecto: 4, min: 1, max: 10,
      },
      escalada_minutos: {
        tipo: 'entero', titulo: 'Escalar solicitud dirigida tras',
        descripcion: 'Si el cuidador elegido no responde, la solicitud se abre ' +
          'a otros cuidadores',
        porDefecto: 30, min: 5, max: 240, unidad: 'min',
      },
    },
  },
  auth: {
    titulo: 'Verificación de email (OTP)',
    lectura: 'publica',
    valores: {
      otp_minutos_expiracion: {
        tipo: 'entero', titulo: 'Validez del código',
        descripcion: 'Minutos durante los que el código enviado es válido',
        porDefecto: 10, min: 1, max: 60, unidad: 'min',
      },
      otp_segundos_reenvio: {
        tipo: 'entero', titulo: 'Espera para reenviar',
        descripcion: 'Segundos entre envíos de código (evita abuso y costos)',
        porDefecto: 60, min: 15, max: 600, unidad: 's',
      },
      otp_max_intentos: {
        tipo: 'entero', titulo: 'Intentos permitidos',
        descripcion: 'Intentos fallidos antes de bloquear el código',
        porDefecto: 3, min: 1, max: 10,
      },
    },
  },
  evaluaciones: {
    titulo: 'Evaluaciones',
    lectura: 'servidor',
    valores: {
      dias_revelacion: {
        tipo: 'lista_enteros', titulo: 'Días posibles de revelación',
        descripcion: 'Una evaluación sin contraparte se revela en uno de estos ' +
          'días, al azar (el evaluado no sabe cuándo)',
        porDefecto: [6, 9, 12], min: 1, max: 30, unidad: 'días',
      },
    },
  },
  funcionalidades: {
    titulo: 'Funcionalidades',
    lectura: 'publica',
    valores: {
      paseo_compartido: {
        tipo: 'booleano', titulo: 'Paseo compartido',
        descripcion: 'Permite elegir paseos compartidos al reservar',
        porDefecto: false,
      },
    },
  },
};

export const AREAS_CONFIGURACION = Object.keys(
  CATALOGO_CONFIGURACION
) as AreaConfiguracion[];

/**
 * ¿Es un área conocida del catálogo?
 * @param {unknown} area Valor a comprobar.
 * @return {boolean} Si es un área válida.
 */
export function esAreaConfiguracion(area: unknown): area is AreaConfiguracion {
  return typeof area === 'string' &&
    (AREAS_CONFIGURACION as string[]).includes(area);
}

const esEntero = (v: unknown): v is number =>
  typeof v === 'number' && Number.isInteger(v);
const enRango = (v: number, d: DefinicionValor<unknown>) =>
  (d.min === undefined || v >= d.min) && (d.max === undefined || v <= d.max);

/**
 * Valida un valor contra su definición.
 * @param {DefinicionValor} def Definición del catálogo.
 * @param {unknown} valor Valor recibido.
 * @return {string | null} Error legible, o null si es válido.
 */
export function validarValor(
  def: DefinicionValor<unknown>,
  valor: unknown
): string | null {
  const rango = `entre ${def.min} y ${def.max}`;
  switch (def.tipo) {
  case 'booleano':
    return typeof valor === 'boolean' ? null : `${def.titulo}: debe ser sí o no`;
  case 'entero':
    return esEntero(valor) && enRango(valor, def) ?
      null : `${def.titulo}: debe ser un entero ${rango}`;
  case 'lista_enteros':
    return Array.isArray(valor) && valor.length > 0 &&
      valor.every((v) => esEntero(v) && enRango(v, def)) ?
      null : `${def.titulo}: debe ser una lista de enteros ${rango}`;
  }
}

/**
 * Valida cambios parciales de un área: claves conocidas y valores válidos.
 * @param {AreaConfiguracion} area Área.
 * @param {Record<string, unknown>} cambios Valores a guardar.
 * @return {string[]} Errores (vacío si todo es válido).
 */
export function validarCambios(
  area: AreaConfiguracion,
  cambios: Record<string, unknown>
): string[] {
  const valores = CATALOGO_CONFIGURACION[area].valores as Record<
    string, DefinicionValor<unknown>
  >;
  const claves = Object.keys(cambios ?? {});
  if (claves.length === 0) return ['No hay cambios'];
  const errores: string[] = [];
  for (const clave of claves) {
    const def = valores[clave];
    if (!def) {
      errores.push(`${clave}: no existe en ${area}`);
      continue;
    }
    const error = validarValor(def, cambios[clave]);
    if (error) errores.push(error);
  }
  return errores;
}

/**
 * Valores por defecto de un área.
 * @param {AreaConfiguracion} area Área.
 * @return {object} Valores por defecto.
 */
export function valoresPorDefecto<A extends AreaConfiguracion>(
  area: A
): ConfiguracionAreas[A] {
  const valores = CATALOGO_CONFIGURACION[area].valores as Record<
    string, DefinicionValor<unknown>
  >;
  const resultado: Record<string, unknown> = {};
  for (const [clave, def] of Object.entries(valores)) {
    resultado[clave] = def.porDefecto;
  }
  return resultado as ConfiguracionAreas[A];
}

/**
 * Combina lo guardado con el catálogo: usa cada valor guardado si es válido
 * y, si falta o es inválido, el valor por defecto (y lo informa).
 * @param {AreaConfiguracion} area Área.
 * @param {object} guardado Documento leído (puede no existir).
 * @return {object} Valores resueltos y claves que usaron el defecto.
 */
export function resolverConfiguracion<A extends AreaConfiguracion>(
  area: A,
  guardado: Record<string, unknown> | undefined
): {valores: ConfiguracionAreas[A]; faltantes: string[]} {
  const valores = CATALOGO_CONFIGURACION[area].valores as Record<
    string, DefinicionValor<unknown>
  >;
  const resultado: Record<string, unknown> = {};
  const faltantes: string[] = [];
  for (const [clave, def] of Object.entries(valores)) {
    const valor = guardado?.[clave];
    if (valor !== undefined && validarValor(def, valor) === null) {
      resultado[clave] = valor;
    } else {
      resultado[clave] = def.porDefecto;
      faltantes.push(clave);
    }
  }
  return {valores: resultado as ConfiguracionAreas[A], faltantes};
}
