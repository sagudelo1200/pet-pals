import React from 'react'
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native'
import Screen from '@/components/ui/Screen'
import { Card, Icon } from '@/components/ui'
import { COLOR } from '@/constants'
import { useTranslation } from 'react-i18next'
import { useHistorialExploraciones } from '@/hooks/explorador/useHistorialExploraciones'
import { ExploracionTerritorial } from '@/models/ExploracionTerritorial'

/**
 * Pantalla de historial de exploraciones estilo Strava.
 * Muestra logros con badges visuales, estados y huellas conseguidas.
 */
const HistorialExploraciones = () => {
  const { t } = useTranslation()
  const { exploraciones, loading, refetch } = useHistorialExploraciones()

  const renderExploracion = ({
    item,
    index,
  }: {
    item: ExploracionTerritorial
    index: number
  }) => {
    const estadoConfig = {
      pendiente: {
        badge: '🟡',
        label: t('explorador:pendiente_confirmacion'),
        color: COLOR.ALERTA,
        icon: 'clock',
      },
      validada: {
        badge: '✔',
        label: t('explorador:validada_recientemente'),
        color: COLOR.EXITO,
        icon: 'check-circle',
      },
      rechazada: {
        badge: '❌',
        label: t('explorador:rechazada'),
        color: COLOR.ERROR,
        icon: 'times-circle',
      },
    }[item.estado]

    const tipoLabel = {
      parque: t('explorador:tipo_parque'),
      calle: t('explorador:tipo_calle'),
      comercio: t('explorador:tipo_comercio'),
      conjunto: t('explorador:tipo_conjunto'),
      otro: t('explorador:tipo_otro'),
    }[item.tipo_punto]

    // Renderizar badge de descubrimiento
    const renderDiscoveryBadge = () => {
      if (index === 0) {
        return (
          <View style={styles.discoveryBadgeRow}>
            <Icon name="star" size={14} color={COLOR.ENFASIS} />
            <Text style={styles.discoveryBadgeText}>
              {t('explorador:primera_exploracion_hoy')}
            </Text>
          </View>
        )
      }
      return null
    }

    const timestamp =
      item.creado_en instanceof Date ? item.creado_en : new Date()
    const formattedDate = new Intl.DateTimeFormat('es-ES', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(timestamp)

    return (
      <View>
        {renderDiscoveryBadge()}
        <Card style={styles.explorationCard}>
          {/* Header: Tipo + Estado */}
          <View style={styles.cardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{tipoLabel}</Text>
              <Text style={styles.cardTime}>{formattedDate}</Text>
            </View>
            <View
              style={[styles.estadoBadge, { borderColor: estadoConfig.color }]}
            >
              <Text style={styles.estadoEmoji}>{estadoConfig.badge}</Text>
            </View>
          </View>

          {/* Body: Detalles de la exploración */}
          <View style={styles.cardBody}>
            {/* Fila 1: Mascotas vistas */}
            <View style={styles.dataRow}>
              <Icon name="paw" size={14} color={COLOR.SUBTEXTO} />
              <Text style={styles.dataText}>
                {item.mascotas_visibles}{' '}
                {item.mascotas_visibles === 1 ? 'perro' : 'perros'} visto
                {item.mascotas_visibles !== 1 ? 's' : ''}
              </Text>
            </View>

            {/* Fila 2: Flujo peatonal */}
            <View style={styles.dataRow}>
              <Icon name="users" size={14} color={COLOR.SUBTEXTO} />
              <Text style={styles.dataText}>
                Movimiento:{' '}
                {item.flujo_peatonal === 'bajo'
                  ? '🟢 Tranquilo'
                  : item.flujo_peatonal === 'medio'
                    ? '🟡 Normal'
                    : '🔴 Muy concurrido'}
              </Text>
            </View>

            {/* Fila 3: Huellas (solo si validada) */}
            {item.estado === 'validada' && (
              <View style={styles.huellaRow}>
                <Icon name="star" size={16} color={COLOR.ENFASIS} />
                <Text style={styles.huellaText}>
                  +{item.huellas_otorgadas || 0} 🐾
                </Text>
              </View>
            )}

            {/* Fila 4: Huellas inmediatas (siempre) */}
            <View style={styles.immediatePawsRow}>
              <Icon name="bolt" size={12} color={COLOR.PRIMARIO} />
              <Text style={styles.immediatePawsText}>+3 🐾 por explorar</Text>
            </View>

            {/* Observaciones si existen */}
            {item.observaciones && (
              <View style={styles.observacionesBox}>
                <Text style={styles.observacionesText}>
                  {item.observaciones}
                </Text>
              </View>
            )}
          </View>

          {/* Footer: Estado text */}
          <View style={styles.cardFooter}>
            <Text style={[styles.estadoLabel, { color: estadoConfig.color }]}>
              {estadoConfig.label}
            </Text>
          </View>
        </Card>
      </View>
    )
  }

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Icon name="map" size={64} color={COLOR.INACTIVO} />
      <Text style={styles.emptyTitle}>
        {t('explorador:sin_exploraciones_aun')}
      </Text>
      <Text style={styles.emptyText}>
        {t('explorador:realiza_primera_exploracion')}
      </Text>
    </View>
  )

  return (
    <Screen style={styles.container} includeTopInset={true}>
      <FlatList
        data={exploraciones}
        renderItem={renderExploracion}
        keyExtractor={item => item.id}
        contentContainerStyle={[
          styles.listContent,
          exploraciones.length === 0 && styles.emptyListContent,
        ]}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refetch} />
        }
        scrollEnabled={true}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLOR.BASE,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  discoveryBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  discoveryBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLOR.ENFASIS,
  },
  explorationCard: {
    borderRadius: 12,
    backgroundColor: COLOR.BLOQUE,
    borderLeftWidth: 3,
    borderLeftColor: COLOR.PRIMARIO,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLOR.TEXTO,
  },
  cardTime: {
    fontSize: 11,
    color: COLOR.SUBTEXTO,
    marginTop: 2,
  },
  estadoBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLOR.BASE,
  },
  estadoEmoji: {
    fontSize: 20,
  },
  cardBody: {
    gap: 8,
    marginBottom: 12,
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dataText: {
    fontSize: 12,
    color: COLOR.TEXTO,
    fontWeight: '500',
  },
  huellaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLOR.PRIMARIO + '20',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  huellaText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLOR.PRIMARIO,
  },
  immediatePawsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLOR.ENFASIS + '15',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  immediatePawsText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLOR.ENFASIS,
  },
  observacionesBox: {
    backgroundColor: COLOR.INFO + '15',
    borderLeftColor: COLOR.INFO,
    borderLeftWidth: 3,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginTop: 4,
  },
  observacionesText: {
    fontSize: 12,
    color: COLOR.SUBTEXTO,
    lineHeight: 16,
    fontStyle: 'italic',
  },
  cardFooter: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLOR.BORDE,
  },
  estadoLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLOR.TEXTO,
    marginTop: 16,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: COLOR.SUBTEXTO,
    marginTop: 8,
    textAlign: 'center',
    maxWidth: '80%',
  },
})

export default HistorialExploraciones
