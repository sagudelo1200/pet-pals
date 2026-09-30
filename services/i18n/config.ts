/**
 * Configuración centralizada de idiomas y namespaces.
 *
 * Para agregar un idioma nuevo:
 * 1. Agregar imports en resources.ts
 * 2. Agregar idioma en resources.ts: pt: { comun: ptComun, ... }
 * 3. Agregar 'pt' en SUPPORTED_LANGUAGES abajo
 *
 * ¡Sin cambios en config.ts!
 */

import { resources } from './resources'

/** Idiomas soportados */
export const SUPPORTED_LANGUAGES = ['es', 'en'] as const
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]

/** Namespaces de traducciones */
export const NAMESPACES = [
  'comun',
  'auth',
  'mascotas',
  'paseos',
  'cargando',
  'perfil',
  'cuidador',
  'tutor',
  'ubicaciones',
  'explorador',
  'usuarios',
  'chat',
  'evaluaciones',
  'consentimientos',
] as const

export type Namespace = (typeof NAMESPACES)[number]

/**
 * Retorna los recursos pre-importados de i18n.
 * Validados y tipados en tiempo de compilación.
 */
export function loadLocales() {
  return resources
}
