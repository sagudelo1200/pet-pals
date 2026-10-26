import React from 'react'
import { Pressable, Text, StyleSheet } from 'react-native'
import { COLOR } from '@/constants/Theme'
import { useConsentimientos } from '@/hooks'
import { useTranslation } from 'react-i18next'

interface BadgeConsentimientoPendienteProps {
  tipo_documento: string
  onPress?: () => void
}

/** `texto` es la clave i18n (consentimientos:badge.*) */
const CONFIG_BADGE: Record<string, { texto: string; color: string }> = {
  EXPIRADO: { texto: 'badge.EXPIRADO', color: COLOR.ALERTA },
  VERSION_DESACTUALIZADA: {
    texto: 'badge.VERSION_DESACTUALIZADA',
    color: COLOR.ERROR,
  },
  RECHAZADO: { texto: 'badge.RECHAZADO', color: COLOR.ERROR },
  REVOCADO: { texto: 'badge.REVOCADO', color: COLOR.ALERTA },
}

/**
 * Badge que muestra si un consentimiento no está vigente.
 */
export const BadgeConsentimientoPendiente: React.FC<
  BadgeConsentimientoPendienteProps
> = ({ tipo_documento, onPress }) => {
  const { t } = useTranslation('consentimientos')
  const { evaluarVigencia } = useConsentimientos()
  const resultado = evaluarVigencia(tipo_documento)

  if (resultado.vigente) return null

  const config = CONFIG_BADGE[resultado.motivo_no_vigencia || ''] || {
    texto: 'badge.PENDIENTE',
    color: COLOR.ALERTA,
  }

  return (
    <Pressable
      style={[styles.container, { backgroundColor: config.color }]}
      onPress={onPress}
    >
      <Text style={styles.texto}>{t(config.texto)}</Text>
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
