import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

// Recursos base (solo ES por ahora)
import esCommon from './locales/es/common.json'
import esErrors from './locales/es/errors.json'
import type { ErrorCode } from '@/constants/errors'

// Detección opcional del idioma del dispositivo sin forzar dependencia inmediata
function detectDeviceLanguage(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Localization = require('expo-localization') as { locale: string }
    const locale = (Localization?.locale || 'es').split('-')[0]
    return locale
  } catch {
    return 'es'
  }
}

// Inicialización única
if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    compatibilityJSON: 'v4',
    resources: {
      es: {
        common: esCommon,
        errors: esErrors as any,
      },
    },
    ns: ['common', 'errors'],
    defaultNS: 'common',
    fallbackLng: 'es',
    lng: detectDeviceLanguage() || 'es',
    supportedLngs: ['es'],
    interpolation: { escapeValue: false },
    returnNull: false,
    returnEmptyString: false,
    saveMissing: false,
    react: { useSuspense: false },
  })
}

export function setLanguage(lang: string) {
  const next = ['es'].includes(lang) ? lang : 'es'
  return i18n.changeLanguage(next)
}

export function getCurrentLanguage() {
  return i18n.language || 'es'
}

export { i18n }

// Helper: traducir códigos de error a mensajes legibles, usando namespace 'errors'
export function tError(code: ErrorCode, vars?: Record<string, unknown>) {
  return i18n.t(`errors:${code}`, { defaultValue: code, ...vars })
}

/**
 * Traduce un posible código de error a mensaje. Si no existe clave de traducción,
 * devuelve el texto original o un fallback opcional.
 */
export function tErrorMaybe(
  codeOrMessage?: string,
  fallback?: string,
  vars?: Record<string, unknown>
) {
  if (!codeOrMessage)
    return fallback ?? i18n.t('common:comun.intentaNuevamente')
  const key = `errors:${codeOrMessage}`
  if (i18n.exists(key)) return i18n.t(key, vars)
  return codeOrMessage
}
