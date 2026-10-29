import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  FlatList,
} from 'react-native'
import { COLOR, SPACING } from '@/constants/Theme'
import type {
  CuidadorEnZona,
  SolicitudEnZona,
} from '@/hooks/admin/useDetallesZonaH3'
import { useTranslation } from 'react-i18next'
import { localeActual } from '@/utils/locale'

interface PanelDetallesZonaProps {
  h3_id: string
  estado: string
  cuidadores: number
  demanda: number
  activos: number
  // Datos cargados
  cuidadoresLista: CuidadorEnZona[]
  solicitudesLista: SolicitudEnZona[]
  cargando: boolean
  error: string | null
}

/**
 * Panel lateral que muestra detalles de una zona H3:
 * - Resumen de estadísticas
 * - Lista de cuidadores con horarios
 * - Solicitudes pendientes
 */
export const PanelDetallesZona: React.FC<PanelDetallesZonaProps> = ({
  h3_id,
  estado,
  cuidadores,
  demanda,
  activos,
  cuidadoresLista,
  solicitudesLista,
  cargando,
  error,
}) => {
  const { t } = useTranslation('admin')
  const getColorEstado = (estado: string): string => {
    switch (estado) {
      case 'activa':
        return '#10B981'
      case 'en_operacion':
        return '#F59E0B'
      case 'sin_cobertura':
        return COLOR.ERROR
      case 'saturada':
        return '#EF4444'
      default:
        return '#6B7280'
    }
  }

  const formatearHora = (fecha: Date): string => {
    return new Date(fecha).toLocaleTimeString(localeActual(), {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const obtenerHorarioHoy = (franja: any): string => {
    if (!franja) return t('territorio.detalle.inactivo')
    return `${franja.inicio} - ${franja.fin}`
  }

  return (
    <View style={styles.contenedor}>
      {/* Header con zona ID */}
      <View style={styles.header}>
        <Text style={styles.titulo}>{t('territorio.detalle.titulo')}</Text>
        <Text style={styles.zonaId}>{h3_id}</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Resumen de Estadísticas */}
        <View style={styles.seccion}>
          <Text style={styles.seccionTitulo}>
            {t('territorio.detalle.estado_zona')}
          </Text>
          <View style={styles.grid}>
            <View style={styles.stat}>
              <View
                style={[
                  styles.estadoBadge,
                  { backgroundColor: getColorEstado(estado) },
                ]}
              >
                <Text style={styles.estadoText}>
                  {t(`territorio.estados.${estado}`, {
                    defaultValue: estado,
                  }).toUpperCase()}
                </Text>
              </View>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>
                {t('territorio.detalle.cuidadores')}
              </Text>
              <Text style={styles.statValor}>{cuidadores}</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>
                {t('territorio.detalle.demanda')}
              </Text>
              <Text style={styles.statValor}>{demanda}</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>
                {t('territorio.detalle.activos')}
              </Text>
              <Text style={styles.statValor}>{activos}</Text>
            </View>
          </View>
        </View>

        {/* Cuidadores Disponibles */}
        <View style={styles.seccion}>
          <Text style={styles.seccionTitulo}>
            {t('territorio.detalle.cuidadores_lista', {
              count: cuidadoresLista.length,
            })}
          </Text>

          {cargando ? (
            <ActivityIndicator size="small" color={COLOR.PRIMARIO} />
          ) : error ? (
            <Text style={styles.textoError}>{error}</Text>
          ) : cuidadoresLista.length === 0 ? (
            <Text style={styles.textoVacio}>
              {t('territorio.detalle.sin_cuidadores')}
            </Text>
          ) : (
            <FlatList
              scrollEnabled={false}
              data={cuidadoresLista}
              keyExtractor={item => item.uid}
              renderItem={({ item }) => (
                <View style={styles.itemCuidador}>
                  <View style={styles.cuidadorInfo}>
                    <Text style={styles.cuidadorNombre}>{item.nombre}</Text>
                    {item.habilitado && (
                      <Text style={styles.badge}>
                        {t('territorio.detalle.habilitado')}
                      </Text>
                    )}
                  </View>

                  <View style={styles.cuidadorDetalles}>
                    {item.rating_promedio !== undefined && (
                      <Text style={styles.rating}>
                        ⭐ {item.rating_promedio.toFixed(1)}
                      </Text>
                    )}
                    {item.horario_hoy && (
                      <Text style={styles.horario}>
                        🕐 {obtenerHorarioHoy(item.horario_hoy)}
                      </Text>
                    )}
                  </View>
                </View>
              )}
            />
          )}
        </View>

        {/* Solicitudes Pendientes */}
        <View style={styles.seccion}>
          <Text style={styles.seccionTitulo}>
            {t('territorio.detalle.solicitudes', {
              count: solicitudesLista.length,
            })}
          </Text>

          {cargando ? (
            <ActivityIndicator size="small" color={COLOR.PRIMARIO} />
          ) : error ? (
            <Text style={styles.textoError}>{error}</Text>
          ) : solicitudesLista.length === 0 ? (
            <Text style={styles.textoVacio}>
              {t('territorio.detalle.sin_solicitudes')}
            </Text>
          ) : (
            <FlatList
              scrollEnabled={false}
              data={solicitudesLista}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <View style={styles.itemSolicitud}>
                  <View>
                    <Text style={styles.mascotaNombre}>
                      🐾 {item.mascota_nombre}
                    </Text>
                    <Text style={styles.tutorNombre}>
                      👤 {item.tutor_nombre}
                    </Text>
                  </View>
                  <Text style={styles.horaSolicitud}>
                    {formatearHora(item.hora_solicitud)}
                  </Text>
                </View>
              )}
            />
          )}
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: COLOR.BASE,
    borderLeftWidth: 1,
    borderLeftColor: COLOR.BORDE,
  },
  header: {
    backgroundColor: '#0A3F37',
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLOR.BORDE,
  },
  titulo: {
    fontSize: 16,
    fontWeight: '700',
    color: COLOR.ENFASIS,
    marginBottom: 4,
  },
  zonaId: {
    fontSize: 12,
    color: COLOR.SUBTEXTO,
    fontFamily: 'monospace',
  },
  scroll: {
    flex: 1,
    paddingHorizontal: SPACING.base,
  },
  seccion: {
    marginTop: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  seccionTitulo: {
    fontSize: 13,
    fontWeight: '600',
    color: COLOR.TEXTO,
    marginBottom: SPACING.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  stat: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLOR.BLOQUE,
    padding: SPACING.sm,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLOR.BORDE,
  },
  estadoBadge: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    borderRadius: 4,
  },
  estadoText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: COLOR.SUBTEXTO,
    marginBottom: 4,
  },
  statValor: {
    fontSize: 18,
    fontWeight: '700',
    color: COLOR.ENFASIS,
  },
  itemCuidador: {
    backgroundColor: COLOR.BLOQUE,
    padding: SPACING.sm,
    marginBottom: SPACING.xs,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLOR.BORDE,
  },
  cuidadorInfo: {
    marginBottom: SPACING.xs,
  },
  cuidadorNombre: {
    fontSize: 12,
    fontWeight: '600',
    color: COLOR.TEXTO,
  },
  badge: {
    fontSize: 10,
    color: '#10B981',
    marginTop: 2,
  },
  cuidadorDetalles: {
    gap: 2,
  },
  rating: {
    fontSize: 11,
    color: '#F59E0B',
  },
  horario: {
    fontSize: 11,
    color: COLOR.SUBTEXTO,
  },
  itemSolicitud: {
    backgroundColor: COLOR.BLOQUE,
    padding: SPACING.sm,
    marginBottom: SPACING.xs,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLOR.BORDE,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mascotaNombre: {
    fontSize: 12,
    fontWeight: '600',
    color: COLOR.TEXTO,
    marginBottom: 2,
  },
  tutorNombre: {
    fontSize: 11,
    color: COLOR.SUBTEXTO,
  },
  horaSolicitud: {
    fontSize: 11,
    color: COLOR.ENFASIS,
    fontWeight: '600',
  },
  textoVacio: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    paddingVertical: SPACING.md,
  },
  textoError: {
    fontSize: 12,
    color: COLOR.ERROR,
    paddingVertical: SPACING.md,
  },
})
