import React from 'react'
import { Pressable, Text, StyleSheet } from 'react-native'
import { COLOR } from '@/constants/Theme'
import { useConsentimientos } from '@/hooks'

interface BadgeConsentimientoPendienteProps {
  tipo_documento: string
  onPress?: () => void
}

const CONFIG_BADGE: Record<string, { texto: string; color: string }> = {
  EXPIRADO: { texto: '⏰ Reconfirma tu consentimiento', color: COLOR.ALERTA },
  VERSION_DESACTUALIZADA: {
    texto: '📝 Nuevos términos disponibles',
    color: COLOR.ERROR,
  },
  RECHAZADO: { texto: '❌ Debes aceptar para continuar', color: COLOR.ERROR },
  REVOCADO: { texto: '↩️ Reactivar consentimiento', color: COLOR.ALERTA },
}

/**
 * Badge que muestra si un consentimiento no está vigente.
 */
export const BadgeConsentimientoPendiente: React.FC<
  BadgeConsentimientoPendienteProps
> = ({ tipo_documento, onPress }) => {
  const { evaluarVigencia } = useConsentimientos()
  const resultado = evaluarVigencia(tipo_documento)

  if (resultado.vigente) return null

  const config = CONFIG_BADGE[resultado.motivo_no_vigencia || ''] || {
    texto: '✋ Consentimiento pendiente',
    color: COLOR.ALERTA,
  }

  return (
    <Pressable
      style={[styles.container, { backgroundColor: config.color }]}
      onPress={onPress}
    >
      <Text style={styles.texto}>{config.texto}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginVertical: 8,
  },
  texto: {
    color: COLOR.TEXTO,
    fontSize: 14,
    fontWeight: '600',
  },
})
