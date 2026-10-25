import React, { useState } from 'react'
import { Alert, StyleSheet, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { COLOR } from '@/constants'
import { Button } from '@/components/ui'
import { avisarCuandoLleguen } from '@/services/firebase/zonas'
import type {
  EstadoServicio,
  RolInteres,
} from '@/functions/src/compartido/zonas'

interface Props {
  /** Desde dónde se lee el aviso: quien pide paseos o quien los ofrece. */
  rol: RolInteres
  /** Celda de cobertura sin servicio. */
  celda: string
  servicio: EstadoServicio
}

/**
 * "Aún no llegamos a tu sector": dice por qué no hay servicio y deja pedir que
 * le avisen cuando lleguemos. Quien lo ve ya quedó anotado como interesado.
 */
export const AvisoSinServicio: React.FC<Props> = ({ rol, celda, servicio }) => {
  const { t } = useTranslation()
  const [enviando, setEnviando] = useState(false)
  const [avisado, setAvisado] = useState(false)

  const pedirAviso = async () => {
    setEnviando(true)
    try {
      await avisarCuandoLleguen({ celda, rol })
      setAvisado(true)
    } catch (error) {
      console.warn('[AvisoSinServicio] No se pudo registrar el aviso:', error)
      Alert.alert(t('comun:error'), t('comun:error_desconocido'))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <View style={styles.contenedor}>
      <Text style={styles.titulo}>{t(`paseos:servicio.${rol}.titulo`)}</Text>
      <Text style={styles.texto}>
        {t(`paseos:servicio.${rol}.${servicio.motivo ?? 'sin_zona'}`, {
          zona: servicio.zona,
        })}
      </Text>
      {avisado ? (
        <Text style={styles.confirmacion}>{t('paseos:servicio.avisaremos')}</Text>
      ) : (
        <Button
          title={t('paseos:servicio.avisame')}
          variant="contorno"
          onPress={pedirAviso}
          loading={enviando}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  contenedor: {
    padding: 16,
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLOR.ALERTA,
    backgroundColor: COLOR.BLOQUE,
  },
  titulo: { color: COLOR.TEXTO, fontSize: 16, fontWeight: '700' },
  texto: { color: COLOR.SUBTEXTO, fontSize: 14, lineHeight: 20 },
  confirmacion: { color: COLOR.EXITO, fontSize: 14, fontWeight: '600' },
})
