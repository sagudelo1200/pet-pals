import React from 'react'
import { StyleSheet, View, Text, Image, Pressable } from 'react-native'
import { Icon } from '@/components/ui'
import { Paseo } from '@/models/Paseo'
import { COLOR } from '@/constants'
import { useTranslation } from 'react-i18next'

interface Props {
  solicitud: Paseo
  // eslint-disable-next-line no-unused-vars
  onPress?: (solicitud: Paseo) => void
}
export const TarjetaSolicitud: React.FC<Props> = ({ solicitud, onPress }) => {
  const { t } = useTranslation()

  // Formateo de fecha
  const fecha =
    solicitud.fecha_hora_inicio instanceof Date
      ? solicitud.fecha_hora_inicio
      : new Date((solicitud.fecha_hora_inicio as any).seconds * 1000)

  const fechaStr = fecha.toLocaleDateString('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
  const horaStr = fecha.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  })

  const precioStr = (solicitud.precio || 0).toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  })

  // Determinar tipo de solicitud
  const esDirecta = !!solicitud.id_cuidador

  const accentColor = esDirecta ? COLOR.PRIMARIO : COLOR.INFO

  const Wrapper: any = onPress ? Pressable : View

  return (
    <Wrapper
      onPress={onPress ? () => onPress(solicitud) : undefined}
      style={[
        styles.card,
        { borderLeftColor: accentColor },
        esDirecta && styles.shadow,
      ]}
    >
      {/* Header: Badge y Fecha */}
      <View style={styles.header}>
        <View
          style={[
            styles.badge,
            {
              backgroundColor: esDirecta
                ? 'rgba(29, 143, 115, 0.15)'
                : 'rgba(42, 134, 168, 0.15)',
            },
          ]}
        >
          <Text style={[styles.badgeText, { color: accentColor }]}>
            {esDirecta
              ? t('cuidador:solicitudes.directa').toUpperCase()
              : t('cuidador:solicitudes.abierta', 'DISPONIBLE').toUpperCase()}
          </Text>
        </View>
        <Text style={styles.fechaText}>
          {fechaStr} • {horaStr}
        </Text>
      </View>

      {/* Body: Mascota e Info */}
      <View style={styles.body}>
        {solicitud.mascota_foto_visual ? (
          <Image
            source={{ uri: solicitud.mascota_foto_visual }}
            style={styles.avatar}
          />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Icon name="paw" size={24} color={COLOR.SUBTEXTO} />
          </View>
        )}

        <View style={styles.infoContainer}>
          <Text style={styles.nombreMascota} numberOfLines={1}>
            {solicitud.mascota_nombre_visual ||
              t('cuidador:solicitudes.mascota')}
            {solicitud.mascotas_count && solicitud.mascotas_count > 1 && (
              <Text style={styles.mascotasCount}>
                {' '}
                +{solicitud.mascotas_count - 1}
              </Text>
            )}
          </Text>

          <View style={styles.row}>
            <Icon name="map-marker-alt" size={12} color={COLOR.SUBTEXTO} />
            <Text style={styles.ubicacionText} numberOfLines={1}>
              {solicitud.ubicacion_inicio_txt ||
                (typeof solicitud.ubicacion_inicio === 'object'
                  ? solicitud.ubicacion_inicio.alias ||
                    solicitud.ubicacion_inicio.direccion_formateada
                  : solicitud.ubicacion_inicio) ||
                t('cuidador:solicitudes.ubicacion_por_definir')}
            </Text>
          </View>
        </View>

        {onPress ? (
          <Icon name="chevron-right" size={16} color={COLOR.BORDE} />
        ) : null}
      </View>

      {/* Footer: Precio y Duración */}
      <View style={styles.footer}>
        <View style={styles.row}>
          <Icon
            name="clock"
            size={14}
            color={COLOR.SUBTEXTO}
            style={{ marginRight: 6 }}
          />
          <Text style={styles.duracionText}>
            {solicitud.duracion_estimada} min
          </Text>
        </View>
        <Text
          style={[
            styles.precioText,
            { color: esDirecta ? COLOR.ENFASIS : COLOR.TEXTO },
          ]}
        >
          {precioStr}
        </Text>
      </View>
    </Wrapper>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLOR.BLOQUE,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLOR.BORDE,
    borderLeftWidth: 4, // El indicador "Premium"
    padding: 16,
  },
  shadow: {
    // Sombra sutil solo para las directas para darles jerarquía
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  fechaText: {
    color: COLOR.SUBTEXTO,
    fontSize: 12,
    fontWeight: '500',
  },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 12, // Cuadrado redondeado moderno
    marginRight: 16,
    backgroundColor: COLOR.SECUNDARIO,
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLOR.BORDE,
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 8,
  },
  nombreMascota: {
    fontSize: 18,
    fontWeight: '700',
    color: COLOR.TEXTO,
    marginBottom: 4,
  },
  mascotasCount: {
    fontSize: 14,
    fontWeight: '400',
    color: COLOR.SUBTEXTO,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ubicacionText: {
    fontSize: 13,
    color: COLOR.SUBTEXTO,
    marginLeft: 6,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLOR.BORDE,
  },
  duracionText: {
    color: COLOR.SUBTEXTO,
    fontSize: 14,
    fontWeight: '500',
  },
  precioText: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
})
