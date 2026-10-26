/**
 * PROVEEDORES DE VALIDACIÓN: quién decide que un requisito se cumple.
 *
 * Cada requisito del catálogo (compartido/servicios.ts) declara su `validador`.
 * Hoy solo existe `manual`: el equipo mira la evidencia y decide desde la cola
 * de revisión. Un proveedor externo (sumsub, veriff, onfido...) se agrega aquí
 * con su `iniciar` (abrir la verificación con el proveedor) y su respuesta
 * llama a `aplicarDecisionRequisito` (habilitaciones.ts), la misma función que
 * usa el equipo: el resto del motor no cambia.
 */
import {ErrorNegocio} from '../comun/errores';
import type {TipoServicio, Validador} from '../compartido/servicios';

export interface ContextoValidacion {
  usuarioId: string
  servicio: TipoServicio
  requisito: string
  /** Rutas en Storage de la evidencia ya subida. */
  rutas: string[]
}

export interface ProveedorValidacion {
  validador: Validador
  /** ¿Lo decide una persona del equipo desde la cola de revisión? */
  decideEquipo: boolean
  /** Se llama cuando el requisito pasa a revisión (p. ej. abrir la sesión). */
  iniciar(contexto: ContextoValidacion): Promise<void>
}

const MANUAL: ProveedorValidacion = {
  validador: 'manual',
  decideEquipo: true,
  // No hay nada que iniciar: el equipo lo ve en la cola de revisión
  iniciar: async () => undefined,
};

const REGISTRO: Partial<Record<Validador, ProveedorValidacion>> = {
  manual: MANUAL,
};

/**
 * Proveedor que valida un requisito.
 * @param {Validador} validador Validador declarado en el catálogo.
 * @return {ProveedorValidacion} Proveedor.
 */
export function proveedorDe(validador: Validador): ProveedorValidacion {
  const proveedor = REGISTRO[validador];
  if (!proveedor) {
    throw new ErrorNegocio('failed-precondition',
      `El proveedor "${validador}" todavía no está configurado`);
  }
  return proveedor;
}
