import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

// Recursos base (ES)
import esComun from './locales/es/comun.json'
import esAuth from './locales/es/auth.json'
import esMascotas from './locales/es/mascotas.json'
import esPaseos from './locales/es/paseos.json'
import esCargando from './locales/es/cargando.json'
import esPerfil from './locales/es/perfil.json'
import esCuidador from './locales/es/cuidador.json'
import esTutor from './locales/es/tutor.json'
import { ERR, type ErrorCode } from '@/constants/errors'

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
        comun: esComun,
        auth: esAuth as any,
        mascotas: esMascotas as any,
        paseos: esPaseos as any,
        cargando: esCargando as any,
        perfil: esPerfil as any,
        cuidador: esCuidador as any,
        tutor: esTutor as any,
      },
    },
    ns: [
      'comun',
      'auth',
      'mascotas',
      'paseos',
      'cargando',
      'perfil',
      'cuidador',
      'tutor',
    ],
    defaultNS: 'comun',
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
  try {
    const codeStr = String(code)

    // 1) formato 'DOMINIO.CODIGO' -> probar namespace dominio (singular/plural)
    if (codeStr.includes('.')) {
      const parts = codeStr.split('.')
      const domain = parts[0].toLowerCase()
      const keyPart = parts.slice(1).join('.')
      const candidates = [domain, `${domain}s`]
      for (const d of candidates) {
        const keyDomain = `${d}:errores.${keyPart}`
        if (i18n.exists(keyDomain))
          return i18n.t(keyDomain, { defaultValue: codeStr, ...vars })
      }
    }

    // 2) formato 'DOMINIO_CODIGO' -> intentar namespace dominio (singular/plural)
    if (codeStr.includes('_')) {
      const prefix = codeStr.split('_')[0].toLowerCase()
      const candidates = [prefix, `${prefix}s`]
      for (const p of candidates) {
        const keyDomain = `${p}:errores.${codeStr}`
        if (i18n.exists(keyDomain))
          return i18n.t(keyDomain, { defaultValue: codeStr, ...vars })
      }
    }

    // 3) si el valor coincide con alguna hoja dentro de ERR (p.ej. ERR.AUTH.* -> 'usuario_no_encontrado')
    try {
      const entries = Object.entries(ERR) as [string, any][]
      for (const [k, v] of entries) {
        if (typeof v === 'object' && v !== null) {
          const leafValues = Object.values(v) as string[]
          if (leafValues.includes(codeStr)) {
            const domain = k.toLowerCase()
            const key = `${domain}:errores.${codeStr}`
            if (i18n.exists(key))
              return i18n.t(key, { defaultValue: codeStr, ...vars })
          }
        }
      }
    } catch {
      /* ignore */
    }

    // 4) intentar en 'comun:errores'
    const keyComun = `comun:errores.${String(code)}`
    if (i18n.exists(keyComun))
      return i18n.t(keyComun, { defaultValue: String(code), ...vars })
  } catch {
    /* ignore */
  }

  // Si no hay traducción en dominios ni en comunes, devolver el código sin traducir
  return String(code)
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
  if (!codeOrMessage) return fallback ?? i18n.t('comun:intenta_nuevamente')
  // Primero intentar resolver por dominio (p. ej. `ERR.AUTH.*` o formatos
  // 'DOMINIO.CODIGO' / 'DOMINIO_CODIGO' -> namespace 'auth')
  try {
    const codeStr = String(codeOrMessage)
    // Soportar formatos: 'DOMINIO.CODIGO', 'DOMINIO_CODIGO' o 'credenciales_invalidas'
    // 1) Si viene como 'dominio.CODIGO' -> buscar en namespace dominio
    if (codeStr.includes('.')) {
      const parts = codeStr.split('.')
      const domain = parts[0].toLowerCase()
      const keyPart = parts.slice(1).join('.')
      const candidates = [domain, `${domain}s`]
      for (const d of candidates) {
        const keyDomain = `${d}:errores.${keyPart}`
        if (i18n.exists(keyDomain)) return i18n.t(keyDomain, vars)
      }
    }

    // 2) Si viene como 'DOMINIO_CODIGO' -> intentar namespace dominio (singular/plural)
    if (codeStr.includes('_')) {
      const prefix = codeStr.split('_')[0].toLowerCase()
      const candidates = [prefix, `${prefix}s`]
      for (const p of candidates) {
        const keyDomain = `${p}:errores.${codeStr}`
        if (i18n.exists(keyDomain)) return i18n.t(keyDomain, vars)
      }
    }

    // 3) Si el valor corresponde a alguna hoja en ERR (p.ej. 'usuario_no_encontrado'),
    //    intentar resolver en el namespace correspondiente (p.ej. auth:errores.usuario_no_encontrado)
    try {
      // Buscar dominio que contenga ese valor
      const entries = Object.entries(ERR) as [string, any][]
      for (const [k, v] of entries) {
        if (typeof v === 'object' && v !== null) {
          const leafValues = Object.values(v) as string[]
          if (leafValues.includes(codeStr)) {
            const domain = k.toLowerCase()
            const keyAuth = `${domain}:errores.${codeStr}`
            if (i18n.exists(keyAuth)) return i18n.t(keyAuth, vars)
          }
        }
      }
    } catch {
      /* ignore */
    }
  } catch {
    /* ignore */
  }

  // Intentar también en 'comun:errores' para errores comunes
  try {
    const keyComun = `comun:errores.${codeOrMessage}`
    if (i18n.exists(keyComun)) return i18n.t(keyComun, vars)
  } catch {
    /* ignore */
  }

  const keyErrores = `errores:${codeOrMessage}`
  if (i18n.exists(keyErrores)) return i18n.t(keyErrores, vars)
  return codeOrMessage
}
