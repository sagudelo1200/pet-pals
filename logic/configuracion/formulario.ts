/**
 * Conversión entre los valores de configuración y el texto que edita el
 * admin (números y listas se escriben como texto; los sí/no, con un switch).
 */
import type { DefinicionValor } from '@/functions/src/compartido/configuracion'

/** Valor tal como se edita en el formulario. */
export type ValorEditable = string | boolean

/** Valor guardado → valor editable ("6, 9, 12" para listas). */
export function aEditable(valor: unknown): ValorEditable {
  if (typeof valor === 'boolean') return valor
  return Array.isArray(valor) ? valor.join(', ') : String(valor)
}

/**
 * Valor editable → valor a guardar. Lo que no sea un número queda como NaN
 * para que la validación del catálogo lo rechace con su mensaje.
 */
export function desdeEditable(
  def: DefinicionValor<unknown>,
  valor: ValorEditable
): unknown {
  if (def.tipo === 'booleano') return valor
  const texto = String(valor)
  if (def.tipo === 'lista_enteros') {
    return texto
      .split(',')
      .map(v => v.trim())
      .filter(Boolean)
      .map(Number)
  }
  return texto.trim() === '' ? NaN : Number(texto)
}

/** Solo las claves cuyo valor editado difiere del guardado. */
export function cambiosDe(
  definiciones: Record<string, DefinicionValor<unknown>>,
  borrador: Record<string, ValorEditable>,
  actuales: Record<string, unknown>
): Record<string, unknown> {
  const cambios: Record<string, unknown> = {}
  for (const [clave, def] of Object.entries(definiciones)) {
    if (!(clave in borrador)) continue
    const valor = desdeEditable(def, borrador[clave])
    if (JSON.stringify(valor) !== JSON.stringify(actuales[clave])) {
      cambios[clave] = valor
    }
  }
  return cambios
}
