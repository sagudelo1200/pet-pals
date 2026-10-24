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
    foto_entrega_obligatoria: boolean
    entrega_aviso_horas: number
    entrega_revision_horas: number
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
  expediente: {
    dias_vigencia_aprendizaje: number
    repeticiones_para_firme: number
    aprendizajes_en_resumen: number
    priorizar_conocidos: boolean
  }
  emparejamiento: {
    peso_continuidad: number
    peso_calificacion: number
    peso_cercania: number
    paseos_para_confiar: number
    penalizacion_por_aviso: number
    max_resultados: number
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
        descripcion: 'Límite de mascotas en un mismo paseo (también compartido). ' +
          'Cada cuidador puede elegir trabajar con menos, nunca con más',
        porDefecto: 4, min: 1, max: 10,
      },
      escalada_minutos: {
        tipo: 'entero', titulo: 'Escalar solicitud dirigida tras',
        descripcion: 'Si el cuidador elegido no responde, la solicitud se abre ' +
          'a otros cuidadores',
        porDefecto: 30, min: 5, max: 240, unidad: 'min',
      },
      foto_entrega_obligatoria: {
        tipo: 'booleano', titulo: 'Foto de entrega obligatoria',
        descripcion: 'Exige al cuidador subir la foto del grupo para finalizar ' +
          'el paseo (activar cuando Firebase Storage esté habilitado)',
        porDefecto: false,
      },
      entrega_aviso_horas: {
        tipo: 'entero', titulo: 'Avisar al tutor tras',
        descripcion: 'Horas desde que el cuidador finaliza el paseo hasta que ' +
          'se recuerda al tutor confirmar la entrega (mensaje en el chat)',
        porDefecto: 3, min: 1, max: 48, unidad: 'h',
      },
      entrega_revision_horas: {
        tipo: 'entero', titulo: 'Enviar a revisión del equipo tras',
        descripcion: 'Horas desde que el cuidador finaliza el paseo hasta que, ' +
          'si el tutor no confirmó la entrega, pasa a la cola del equipo',
        porDefecto: 12, min: 1, max: 168, unidad: 'h',
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
  expediente: {
    titulo: 'Conocer a la mascota',
    lectura: 'publica',
    valores: {
      dias_vigencia_aprendizaje: {
        tipo: 'entero', titulo: 'Días de vigencia de un aprendizaje',
        descripcion: 'Un aprendizaje sobre la mascota ("se pone nervioso con ' +
          'motos") deja de mostrarse en el resumen si no se vuelve a ver en ' +
          'estos días. No se borra.',
        porDefecto: 360, min: 30, max: 1095, unidad: 'días',
      },
      repeticiones_para_firme: {
        tipo: 'entero', titulo: 'Veces para considerar firme un aprendizaje',
        descripcion: 'Veces que debe observarse un aprendizaje (o que lo vean ' +
          '2 cuidadores distintos) para pasar de "observado" a "firme"',
        porDefecto: 2, min: 1, max: 10,
      },
      aprendizajes_en_resumen: {
        tipo: 'entero', titulo: 'Aprendizajes por sección en el resumen previo',
        descripcion: 'Máximo de aprendizajes que ve el cuidador antes del ' +
          'paseo en cada sección (qué funciona, qué evitar, ten en cuenta)',
        porDefecto: 3, min: 1, max: 10,
      },
      priorizar_conocidos: {
        tipo: 'booleano', titulo: 'Priorizar cuidadores que ya conocen la mascota',
        descripcion: 'Al elegir cuidador, los que ya pasearon a la mascota ' +
          'aparecen primero y con su número de paseos',
        porDefecto: true,
      },
    },
  },
  emparejamiento: {
    titulo: 'Emparejamiento de cuidadores',
    lectura: 'servidor',
    valores: {
      peso_continuidad: {
        tipo: 'entero', titulo: 'Peso de conocer a la mascota',
        descripcion: 'Qué tanto sube en la lista un cuidador que ya paseó a las ' +
          'mascotas del pedido (se aplica solo si "Priorizar cuidadores que ya ' +
          'conocen la mascota" está activo)',
        porDefecto: 40, min: 0, max: 100,
      },
      peso_calificacion: {
        tipo: 'entero', titulo: 'Peso de la calificación',
        descripcion: 'Qué tanto pesa la calificación del cuidador (suavizada: ' +
          'con pocos paseos pesa menos)',
        porDefecto: 30, min: 0, max: 100,
      },
      peso_cercania: {
        tipo: 'entero', titulo: 'Peso de la cercanía',
        descripcion: 'Qué tanto pesa que el cuidador viva cerca del tutor',
        porDefecto: 30, min: 0, max: 100,
      },
      paseos_para_confiar: {
        tipo: 'entero', titulo: 'Paseos para confiar en la calificación',
        descripcion: 'Con menos paseos que estos, la calificación se mezcla con ' +
          'una inicial y el cuidador figura como "nuevo"',
        porDefecto: 5, min: 1, max: 50, unidad: 'paseos',
      },
      penalizacion_por_aviso: {
        tipo: 'entero', titulo: 'Descuento por aviso',
        descripcion: 'Cuánto baja en la lista un cuidador al que el pedido no ' +
          'le encaja del todo (un tamaño que no suele cuidar, más perros de ' +
          'los que prefiere). No lo oculta: se le avisa al tutor y el cuidador decide',
        porDefecto: 40, min: 0, max: 100,
      },
      max_resultados: {
        tipo: 'entero', titulo: 'Cuidadores que se muestran',
        descripcion: 'Máximo de cuidadores que se devuelven al tutor al elegir',
        porDefecto: 20, min: 5, max: 50,
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
