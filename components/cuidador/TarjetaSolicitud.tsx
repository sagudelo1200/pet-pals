import React from 'react'
import { StyleSheet, View, Text, Image } from 'react-native'
import { Card, Icon, Badge } from '@/components/ui'
import { Paseo } from '@/models/Paseo'
import { COLOR } from '@/constants'
import { useTranslation } from 'react-i18next'

interface Props {
  solicitud: Paseo
  // eslint-disable-next-line no-unused-vars
  onPress: (solicitud: Paseo) => void
}

export const TarjetaSolicitud: React.FC<Props> = ({ solicitud, onPress }) => {
  const { t } = useTranslation()

  // Formateo de fecha
  // Nota: En producción idealmente usar date-fns o similar para mejor i18n
  const fecha =
    solicitud.fecha_hora_inicio instanceof Date
      ? solicitud.fecha_hora_inicio
      : new Date((solicitud.fecha_hora_inicio as any).seconds * 1000) // Fallback si viene como Timestamp

  const fechaStr = fecha.toLocaleDateString('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
  const horaStr = fecha.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  })

  // Determinar tipo de solicitud
  const esDirecta = !!solicitud.id_cuidador
  const esAbierta = !solicitud.id_cuidador

  const precioStr = (solicitud.precio || 0).toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  })

  return (
    <Card
      onPress={() => onPress(solicitud)}
      style={[
        styles.card,
        esDirecta && styles.cardDirecta,
        esAbierta && styles.cardAbierta,
      ]}
      contentStyle={styles.content}
      elevated={esDirecta} // Solo elevar las directas para más énfasis
    >
      <View style={styles.header}>
        <View style={styles.fechaContainer}>
          <Icon
            name="calendar-alt"
            size={14}
            color={esDirecta ? COLOR.PRIMARIO : COLOR.ENFASIS}
          />
          <Text
            style={[
              styles.fechaText,
              esDirecta && { color: COLOR.PRIMARIO, fontWeight: 'bold' },
            ]}
          >
            {fechaStr} • {horaStr}
          </Text>
        </View>
        {esDirecta && (
          <Badge
            label={t('cuidador:solicitudes.directa')}
            variant="primario"
            size="sm"
          />
        )}
        {esAbierta && (
          <Badge
            label={t('cuidador:solicitudes.abierta', 'Solicitud Abierta')}
            variant="info"
            size="sm"
          />
        )}
      </View>

      <View style={styles.body}>
        <View style={styles.mascotasContainer}>
          {solicitud.mascota_foto_visual ? (
            <Image
              source={{ uri: solicitud.mascota_foto_visual }}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Icon name="paw" size={20} color={COLOR.SUBTEXTO} />
            </View>
          )}
          <View style={styles.infoMascota}>
            <Text style={styles.nombreMascota}>
              {solicitud.mascota_nombre_visual ||
                t('cuidador:solicitudes.mascota')}
              {solicitud.mascotas_count &&
                solicitud.mascotas_count > 1 &&
                ` +${solicitud.mascotas_count - 1}`}
            </Text>
            <View style={styles.ubicacionContainer}>
              <Icon name="map-marker-alt" size={12} color={COLOR.SUBTEXTO} />
              <Text style={styles.ubicacionText} numberOfLines={1}>
                {solicitud.ubicacion_inicio ||
                  t('cuidador:solicitudes.ubicacion_por_definir')}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.duracionContainer}>
          <Icon name="clock" size={14} color={COLOR.SUBTEXTO} />
          <Text style={styles.duracionText}>
            {solicitud.duracion_estimada} {t('cuidador:solicitudes.min')}
          </Text>
        </View>
        <Text style={styles.precioText}>{precioStr}</Text>
      </View>
    </Card>
  )
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLOR.BORDE,
    backgroundColor: COLOR.BLOQUE,
  },
  cardDirecta: {
    borderColor: COLOR.PRIMARIO,
    backgroundColor: 'rgba(29, 143, 115, 0.05)', // Sutil tinte verde
  },
  cardAbierta: {
    borderColor: COLOR.INFO,
    borderStyle: 'dashed',
    backgroundColor: 'rgba(42, 134, 168, 0.05)', // Sutil tinte azul
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  fechaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(45, 179, 145, 0.1)', // COLOR.ENFASIS con opacidad
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  fechaText: {
    color: COLOR.ENFASIS,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
    textTransform: 'capitalize',
  },
  body: {
    marginBottom: 16,
  },
  mascotasContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    borderWidth: 2,
    borderColor: COLOR.BORDE,
  },
  avatarPlaceholder: {
    backgroundColor: COLOR.SECUNDARIO,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoMascota: {
    flex: 1,
    justifyContent: 'center',
  },
  nombreMascota: {
    fontSize: 16,
    fontWeight: '700',
    color: COLOR.TEXTO,
    marginBottom: 4,
  },
  ubicacionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ubicacionText: {
    fontSize: 13,
    color: COLOR.SUBTEXTO,
    marginLeft: 4,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLOR.BORDE,
    paddingTop: 12,
    marginTop: 4,
  },
  duracionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  duracionText: {
    color: COLOR.SUBTEXTO,
    fontSize: 13,
    marginLeft: 6,
  },
  precioText: {
    fontSize: 18,
    fontWeight: '800',
    color: COLOR.TEXTO,
  },
})
