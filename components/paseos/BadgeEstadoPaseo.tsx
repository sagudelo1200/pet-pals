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
      case PaseoStatus.PENDIENTE: {
        return {
          bg: COLOR.INACTIVO,
          text: COLOR.SUBTEXTO,
          icon: 'clock',
        }
      }
      case PaseoStatus.CONFIRMADO: {
        const conf = COLOR.ESTADO.CONFIRMADO
        return {
          bg: conf.fondo,
          text: conf.primario,
          icon: 'check',
        }
      }
      case PaseoStatus.EN_RUTA: {
        const ruta = COLOR.ESTADO.EN_RUTA
        return {
          bg: ruta.fondo,
          text: ruta.primario,
          icon: 'map-pin',
        }
      }
      case PaseoStatus.EN_PROGRESO: {
        const prog = COLOR.ESTADO.EN_PROGRESO
        return {
          bg: prog.fondo,
          text: prog.primario,
          icon: 'activity',
        }
      }
      case PaseoStatus.FINALIZADO: {
        const fin = COLOR.ESTADO.FINALIZADO
        return {
          bg: fin.fondo,
          text: fin.primario,
          icon: 'flag',
        }
      }
      case PaseoStatus.COMPLETADO: {
        const comp = COLOR.ESTADO.COMPLETADO
        return {
          bg: comp.fondo,
          text: comp.primario,
          icon: 'check-circle',
        }
      }
      case PaseoStatus.CANCELADO:
      case PaseoStatus.ERROR: {
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
