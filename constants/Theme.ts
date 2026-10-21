export const COLOR = {
  BASE: '#0A0F0E',
  BLOQUE: '#121918',
  SECUNDARIO: '#182422',
  BORDE: '#1F2D2A',
  PRIMARIO: '#1D8F73',
  ENFASIS: '#2DB391',
  TEXTO: '#EBF4F2',
  SUBTEXTO: '#98A7A4',
  EXITO: '#1C7F52',
  ERROR: '#C96B67',
  INFO: '#2A86A8',
  ALERTA: '#C9AA45',
  INACTIVO: '#2C3432',
  ORO: '#FFD700',
  SOMBRA: '#030505',
  HUESO: '#F5F5DC', // Beige claro

  // Estados de Paseo - Colores dinámicos
  ESTADO: {
    PENDIENTE: {
      primario: '#6B7280', // Gris
      fondo: '#6B728015',
      texto: '#D1D5DB',
    },
    CONFIRMADO: {
      primario: '#3B82F6', // Azul info
      fondo: '#3B82F615',
      texto: '#93C5FD',
    },
    EN_CAMINO: {
      primario: '#F59E0B', // Ámbar
      fondo: '#F59E0B15',
      texto: '#FCD34D',
    },
    EN_PUNTO_RECOGIDA: {
      primario: '#A855F7', // Púrpura - Punto de recogida
      fondo: '#A855F715',
      texto: '#D8B4FE',
    },
    EN_PROGRESO: {
      primario: '#10B981', // Verde éxito
      fondo: '#10B98115',
      texto: '#6EE7B7',
    },
    FINALIZADO: {
      primario: '#6366F1', // Índigo
      fondo: '#6366F115',
      texto: '#A5B4FC',
    },
    COMPLETADO: {
      primario: '#10B981', // Verde éxito
      fondo: '#10B98115',
      texto: '#6EE7B7',
    },
    CANCELADO: {
      primario: '#EF4444', // Rojo error
      fondo: '#EF444415',
      texto: '#FCA5A5',
    },
    ERROR: {
      primario: '#EF4444',
      fondo: '#EF444415',
      texto: '#FCA5A5',
    },
  },
} as const

export const SPACING = {
  xs: 4,
  sm: 8,
  base: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const
