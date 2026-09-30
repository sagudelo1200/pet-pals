// Importaciones de recursos por idioma
import * as es from './locales/es'
import * as en from './locales/en'

// Lista de namespaces (debe estar sincronizada con locales/{lang}/index.ts)
const NAMESPACE_LIST = [
  'comun',
  'auth',
  'mascotas',
  'paseos',
  'paseos_control',
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

// Mapa de módulos por idioma (agregar pt, fr, etc. aquí)
const LOCALE_MODULES = { es, en }

// Recursos auto-organizados por idioma y namespace
export const resources = Object.fromEntries(
  Object.entries(LOCALE_MODULES).map(([lang, module]) => [
    lang,
    Object.fromEntries(
      NAMESPACE_LIST.map(ns => {
        // Caso especial: paseos + paseos_control
        if (ns === 'paseos') {
          return [
            ns,
            { ...(module as any).paseos, ...(module as any).paseos_control },
          ]
        }
        return [ns, (module as any)[ns]]
      })
    ),
  ])
)
