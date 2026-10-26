import { i18n } from '@/services/i18n'

/** Locale BCP-47 para formatear fechas, horas y montos según el idioma activo. */
export function localeActual(): string {
  return i18n.language?.startsWith('en') ? 'en-US' : 'es-CO'
}
