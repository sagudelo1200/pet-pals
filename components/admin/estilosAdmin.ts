import { StyleSheet } from 'react-native'
import { COLOR } from '@/constants'

/** Estilos comunes de los formularios del admin. */
export const estilosAdmin = StyleSheet.create({
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLOR.TEXTO,
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    backgroundColor: COLOR.BLOQUE,
    borderColor: COLOR.BORDE,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLOR.TEXTO,
  },
  areaTexto: {
    height: 180,
    paddingVertical: 12,
  },
  ayudaCampo: {
    fontSize: 12,
    color: COLOR.SUBTEXTO,
    marginTop: 4,
  },
  ayuda: {
    fontSize: 13,
    color: COLOR.SUBTEXTO,
    lineHeight: 18,
  },
  vigente: {
    fontSize: 13,
    color: COLOR.EXITO,
    fontWeight: '600',
    marginBottom: 8,
  },
  errores: {
    fontSize: 12,
    color: COLOR.ERROR,
    marginVertical: 8,
    lineHeight: 18,
  },
  acciones: {
    marginTop: 16,
    gap: 8,
  },
})
