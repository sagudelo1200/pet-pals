import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { COLOR } from '@/constants/Theme'
import { PaseoStatus } from '@/models/Paseo'
import { Feather } from '@expo/vector-icons'

interface Props {
  estado: PaseoStatus
}

export const BadgeEstadoPaseo = ({ estado }: Props) => {
  const { t } = useTranslation()

  // Configuración de colores e iconos según estado
  const getConfig = (estado: PaseoStatus) => {
    switch (estado) {
      case PaseoStatus.PENDIENTE:
        return {
          bg: COLOR.INACTIVO,
          text: COLOR.SUBTEXTO,
          icon: 'clock',
        }
      case PaseoStatus.ACEPTADO:
        return {
          bg: COLOR.INFO + '30', // Opacidad añadida
          text: COLOR.INFO,
          icon: 'check',
        }
      case PaseoStatus.PROGRAMADO:
        return {
          bg: COLOR.INFO + '30',
          text: COLOR.INFO,
          icon: 'calendar',
        }
      case PaseoStatus.EN_RUTA:
        return {
          bg: COLOR.ALERTA + '30',
          text: COLOR.ALERTA,
          icon: 'map-pin',
        }
      case PaseoStatus.EN_PROGRESO:
        return {
          bg: COLOR.ENFASIS + '30',
          text: COLOR.ENFASIS,
          icon: 'activity',
        }
      case PaseoStatus.FINALIZADO:
        return {
          bg: COLOR.EXITO + '30',
          text: COLOR.EXITO,
          icon: 'flag',
        }
      case PaseoStatus.COMPLETADO:
        return {
          bg: COLOR.EXITO + '30',
          text: COLOR.EXITO,
          icon: 'check-circle',
        }
      case PaseoStatus.CANCELADO:
      case PaseoStatus.ERROR:
        return {
          bg: COLOR.ERROR + '30',
          text: COLOR.ERROR,
          icon: 'x-circle',
        }
      default:
        return {
          bg: COLOR.INACTIVO,
          text: COLOR.SUBTEXTO,
          icon: 'help-circle',
        }
    }
  }

  const { bg, text, icon } = getConfig(estado)

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <Feather name={icon as any} size={14} color={text} style={styles.icon} />
      <Text style={[styles.text, { color: text }]}>
        {t(`paseos.estados.${estado}`, estado)}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  icon: {
    marginRight: 6,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
})
