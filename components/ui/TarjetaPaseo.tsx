import React from 'react'
import { StyleSheet, View, Text } from 'react-native'
import { useTranslation } from 'react-i18next'
import { COLOR } from '@/constants'
import Card from './Card'
import Icon from './Icon'
import { PetAvatar } from './PetAvatar'
import { AvatarGroup } from './AvatarGroup'
import { BadgeEstadoPaseo } from '@/components/paseos/BadgeEstadoPaseo'
import type { Paseo } from '@/models/Paseo'

interface TarjetaPaseoProps {
  paseo: Partial<Paseo> & {
    mascotaNombre?: string
    mascotaFoto?: string
    cuidadorNombre?: string
  }
  onPress?: () => void
}

const TarjetaPaseo: React.FC<TarjetaPaseoProps> = ({ paseo, onPress }) => {
  const { t } = useTranslation()

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-ES', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    })
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Lógica de visualización de nombre de mascota
  const nombreMascota = 
    paseo.mascota_nombre_visual || 
    paseo.mascotaNombre || 
    (paseo.es_multiple ? 'Varias Mascotas' : 'Mascota')
  
  const fotoMascota = paseo.mascota_foto_visual || paseo.mascotaFoto
  const fotosMultiples = paseo.mascotas_fotos_visual

  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={styles.header}>
        <View style={styles.petInfo}>
          {fotosMultiples && fotosMultiples.length > 1 ? (
             <AvatarGroup uris={fotosMultiples} size="small" />
          ) : (
             <PetAvatar uri={fotoMascota} size="small" />
          )}
          <View style={styles.petText}>
            <Text style={styles.petName}>
              {nombreMascota}
            </Text>
            <Text style={styles.serviceType}>
              {paseo.tipo_paseo === 'programado' ? 'Programado' : 'A demanda'}
            </Text>
          </View>
        </View>
        {paseo.estado && (
          <BadgeEstadoPaseo estado={paseo.estado} />
        )}
      </View>

      <View style={styles.divider} />

      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Icon name="calendar-alt" size={14} color={COLOR.SUBTEXTO} />
          <Text style={styles.detailText}>
            {paseo.fecha_hora_inicio &&
              formatDate(new Date(paseo.fecha_hora_inicio))}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Icon name="clock" size={14} color={COLOR.SUBTEXTO} />
          <Text style={styles.detailText}>
            {paseo.fecha_hora_inicio &&
              formatTime(new Date(paseo.fecha_hora_inicio))}
            {paseo.duracion_estimada ? ` • ${paseo.duracion_estimada} min` : ''}
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.walkerLabel}>{t('paseos:tarjeta.cuidador')}</Text>
        <Text style={styles.walkerName}>
          {paseo.cuidadorNombre || t('paseos:tarjeta.sin_cuidador')}
        </Text>
      </View>
    </Card>
  )
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  petInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  petText: {
    justifyContent: 'center',
  },
  petName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLOR.TEXTO,
  },
  serviceType: {
    fontSize: 12,
    color: COLOR.SUBTEXTO,
  },
  divider: {
    height: 1,
    backgroundColor: COLOR.BORDE,
    marginVertical: 12,
  },
  details: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    color: COLOR.TEXTO,
    fontSize: 14,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLOR.SECUNDARIO,
    marginHorizontal: -16,
    marginBottom: -16,
    marginTop: 4,
    padding: 12,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  walkerLabel: {
    fontSize: 12,
    color: COLOR.SUBTEXTO,
  },
  walkerName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLOR.ENFASIS,
  },
})

export default TarjetaPaseo
