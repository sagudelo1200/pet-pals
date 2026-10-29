import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import { COLOR } from '@/constants'
import { Button } from '@/components/ui'
import { useAuth } from '@/context/AuthContext'
import { useDoc } from '@/hooks/useDoc'
import { avisosDeVencimiento } from '@/logic/habilitaciones/vencimiento'
import { fechaCorta } from '@/logic/habilitaciones/presentacion'
import { CATALOGO_SERVICIOS } from '@/functions/src/compartido/servicios'
import type { AuthStackParamList } from '@/navigation/types'

/**
 * Avisa, al abrir la app, que una habilitación está por vencer o ya venció, con
 * un acceso directo para renovarla. No muestra nada si no hay nada que avisar.
 */
export const AvisoVencimientoHabilitacion: React.FC = () => {
  const { t } = useTranslation()
  const navigation = useNavigation<StackNavigationProp<AuthStackParamList>>()
  const { user } = useAuth()
  const { data: perfil } = useDoc<any>('perfiles_publicos', user?.uid ?? '', {
    listen: true,
    enabled: !!user?.uid,
  })

  const [aviso] = avisosDeVencimiento(perfil, Date.now())
  if (!aviso) return null

  const vencida = aviso.estado === 'vencida'
  return (
    <View
      style={[
        styles.caja,
        { borderColor: vencida ? COLOR.ERROR : COLOR.ALERTA },
      ]}
    >
      <Text style={styles.texto}>
        {t(
          vencida
            ? 'cuidador:habilitacion.aviso.vencida'
            : 'cuidador:habilitacion.aviso.por_vencer',
          {
            servicio: t(`comun:servicios.${aviso.servicio}.titulo`, {
              defaultValue: CATALOGO_SERVICIOS[aviso.servicio].titulo,
            }),
            fecha: fechaCorta(aviso.venceEn),
          }
        )}
      </Text>
      <Button
        title={t('cuidador:habilitacion.aviso.renovar')}
        icon="clipboard-check"
        variant={vencida ? 'error' : 'alerta'}
        size="sm"
        onPress={() =>
          navigation.navigate('MiHabilitacion', { servicio: aviso.servicio })
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  caja: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginBottom: 12,
    backgroundColor: COLOR.BLOQUE,
  },
  texto: { color: COLOR.TEXTO, fontSize: 13, lineHeight: 18 },
})
