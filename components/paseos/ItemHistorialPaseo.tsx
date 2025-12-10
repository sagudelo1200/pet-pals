import React from 'react'
import { StyleSheet, View, Text, Pressable } from 'react-native'
import { COLOR } from '@/constants'
import Icon from '@/components/ui/Icon'
import { PetAvatar } from '@/components/ui/PetAvatar'
import { AvatarGroup } from '@/components/ui/AvatarGroup'
import type { Paseo } from '@/models/Paseo'
import { useTranslation } from 'react-i18next'

interface ItemHistorialPaseoProps {
  paseo: Paseo
  onPress?: () => void
}

export const ItemHistorialPaseo: React.FC<ItemHistorialPaseoProps> = ({
  paseo,
  onPress,
}) => {
  const { t } = useTranslation()
  const fecha = new Date(paseo.fecha_hora_inicio)

  const dia = fecha.getDate()
  const mes = fecha
    .toLocaleDateString('es-ES', { month: 'short' })
    .toUpperCase()
  const hora = fecha.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  })

  const esCompartido = paseo.modalidad === 'compartido'
  const nombreMascota =
    paseo.mascota_nombre_visual ||
    (esCompartido ? 'Paseo Compartido' : 'Mascota')

  const fotoMascota = paseo.mascota_foto_visual
  const fotosMultiples = paseo.mascotas_fotos_visual

  const getStatusColor = (estado: string) => {
    switch (estado) {
      case 'COMPLETADO':
      case 'FINALIZADO':
        return COLOR.EXITO
      case 'CANCELADO':
      case 'RECHAZADO':
        return COLOR.ERROR
      default:
        return COLOR.SUBTEXTO
    }
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
    >
      {/* Fecha Box */}
      <View style={styles.dateBox}>
        <Text style={styles.dateDay}>{dia}</Text>
        <Text style={styles.dateMonth}>{mes}</Text>
      </View>

      {/* Info Principal */}
      <View style={styles.infoContainer}>
        <View style={styles.topRow}>
          <Text style={styles.petName} numberOfLines={1}>
            {nombreMascota}
          </Text>
          <Text style={styles.time}>{hora}</Text>
        </View>

        <View style={styles.bottomRow}>
          <Text
            style={[styles.status, { color: getStatusColor(paseo.estado) }]}
          >
            {t(`paseos:estados.${paseo.estado}`)}
          </Text>
          <Text style={styles.duration}>
            • {paseo.duracion_real || paseo.duracion_estimada} min
          </Text>
        </View>
      </View>

      {/* Avatar + Chevron */}
      <View style={styles.rightContainer}>
        {fotosMultiples && fotosMultiples.length > 1 ? (
          <AvatarGroup uris={fotosMultiples} size="tiny" />
        ) : (
          <PetAvatar uri={fotoMascota} size="tiny" />
        )}
        <Icon
          name="chevron-right"
          size={16}
          color={COLOR.BORDE}
          style={{ marginLeft: 12 }}
        />
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLOR.BLOQUE,
    borderRadius: 12,
    marginBottom: 8,
  },
  pressed: {
    opacity: 0.7,
  },
  dateBox: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: COLOR.SECUNDARIO,
    marginRight: 12,
  },
  dateDay: {
    fontSize: 18,
    fontWeight: '800',
    color: COLOR.TEXTO,
    lineHeight: 22,
  },
  dateMonth: {
    fontSize: 10,
    fontWeight: '700',
    color: COLOR.SUBTEXTO,
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  petName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLOR.TEXTO,
    flex: 1,
    marginRight: 8,
  },
  time: {
    fontSize: 12,
    color: COLOR.SUBTEXTO,
    fontWeight: '500',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  status: {
    fontSize: 13,
    fontWeight: '600',
  },
  duration: {
    fontSize: 13,
    color: COLOR.SUBTEXTO,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
})
