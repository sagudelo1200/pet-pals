import { View, Text, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { COLOR } from '@/constants/Theme'
import { ESTADOS_PASEO } from '@/models/Paseo'
import { Feather } from '@expo/vector-icons'

interface Props {
  estado: ESTADOS_PASEO
}

export const BadgeEstadoPaseo = ({ estado }: Props) => {
  const { t } = useTranslation()

  // Configuración de colores e iconos según estado
  const getConfig = (estado: ESTADOS_PASEO) => {
    switch (estado) {
      case ESTADOS_PASEO.PENDIENTE: {
        return {
          bg: COLOR.INACTIVO,
          text: COLOR.SUBTEXTO,
          icon: 'clock',
        }
      }
      case ESTADOS_PASEO.CONFIRMADO: {
        const conf = COLOR.ESTADO.CONFIRMADO
        return {
          bg: conf.fondo,
          text: conf.primario,
          icon: 'check',
        }
      }
      case ESTADOS_PASEO.EN_CAMINO: {
        const ruta = COLOR.ESTADO.EN_CAMINO
        return {
          bg: ruta.fondo,
          text: ruta.primario,
          icon: 'map-pin',
        }
      }
      case ESTADOS_PASEO.EN_PROGRESO: {
        const prog = COLOR.ESTADO.EN_PROGRESO
        return {
          bg: prog.fondo,
          text: prog.primario,
          icon: 'activity',
        }
      }
      case ESTADOS_PASEO.FINALIZADO: {
        const fin = COLOR.ESTADO.FINALIZADO
        return {
          bg: fin.fondo,
          text: fin.primario,
          icon: 'flag',
        }
      }
      case ESTADOS_PASEO.COMPLETADO: {
        const comp = COLOR.ESTADO.COMPLETADO
        return {
          bg: comp.fondo,
          text: comp.primario,
          icon: 'check-circle',
        }
      }
      case ESTADOS_PASEO.CANCELADO:
      case ESTADOS_PASEO.ERROR: {
        const err = COLOR.ESTADO.ERROR
        return {
          bg: err.fondo,
          text: err.primario,
          icon: 'x-circle',
        }
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
