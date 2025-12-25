/* eslint-env jest */

// Mockear constantes para evitar cargar `react-native` y dependencias no deseadas
const MOCK_ERR = {
  COMUN: {
    NO_AUTENTICADO: 'NO_AUTENTICADO',
    PERMISOS_INSUFICIENTES: 'PERMISOS_INSUFICIENTES',
    DOCUMENTO_NO_ENCONTRADO: 'DOCUMENTO_NO_ENCONTRADO',
    ERROR_DESCONOCIDO: 'ERROR_DESCONOCIDO',
  },
  AUTH: {},
  MASCOTAS: {},
  PASEOS: {},
}

jest.mock('@/constants', () => ({ ERR: MOCK_ERR }))

const { mapFirebaseError } = require('@/services/firebase/comun')

describe('mapFirebaseError - mapeo de errores', () => {
  // Devuelve el mismo código si ya se le pasa un código válido de ERR
  test('devuelve el mismo código ERR si se le pasa uno', () => {
    const code = MOCK_ERR.COMUN.NO_AUTENTICADO
    expect(mapFirebaseError(code)).toBe(code)
  })

  // Mapea códigos de Firebase (permission-denied) a nuestros códigos de dominio
  test('mapea permission-denied a PERMISOS_INSUFICIENTES', () => {
    const out = mapFirebaseError({ code: 'permission-denied' })
    expect(out).toBe(MOCK_ERR.COMUN.PERMISOS_INSUFICIENTES)
  })

  // Si se pasa una cadena no reconocida, devolver el error desconocido por defecto
  test('cadena desconocida devuelve ERROR_DESCONOCIDO', () => {
    expect(mapFirebaseError('ALGO_RARO')).toBe(MOCK_ERR.COMUN.ERROR_DESCONOCIDO)
  })
})
