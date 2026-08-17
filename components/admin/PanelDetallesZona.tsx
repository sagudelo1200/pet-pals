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
  const getColorEstado = (estado: string): string => {
    switch (estado) {
      case 'activa':
        return '#10B981'
      case 'en_operacion':
        return '#F59E0B'
      case 'sin_cobertura':
        return '#C96B67'
      case 'saturada':
        return '#EF4444'
      default:
        return '#6B7280'
    }
  }

  const formatearHora = (fecha: Date): string => {
    return new Date(fecha).toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const obtenerHorarioHoy = (franja: any): string => {
    if (!franja) return 'Inactivo'
    return `${franja.inicio} - ${franja.fin}`
  }

  return (
    <View style={styles.contenedor}>
      {/* Header con zona ID */}
      <View style={styles.header}>
        <Text style={styles.titulo}>⬡ Detalles de Zona</Text>
        <Text style={styles.zonaId}>{h3_id}</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Resumen de Estadísticas */}
        <View style={styles.seccion}>
          <Text style={styles.seccionTitulo}>📊 Estado de Zona</Text>
          <View style={styles.grid}>
            <View style={styles.stat}>
              <View
                style={[
                  styles.estadoBadge,
                  { backgroundColor: getColorEstado(estado) },
                ]}
              >
                <Text style={styles.estadoText}>{estado.toUpperCase()}</Text>
              </View>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Cuidadores</Text>
              <Text style={styles.statValor}>{cuidadores}</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Demanda</Text>
              <Text style={styles.statValor}>{demanda}</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Activos</Text>
              <Text style={styles.statValor}>{activos}</Text>
            </View>
          </View>
        </View>

        {/* Cuidadores Disponibles */}
        <View style={styles.seccion}>
          <Text style={styles.seccionTitulo}>
            🐕 Cuidadores ({cuidadoresLista.length})
          </Text>

          {cargando ? (
            <ActivityIndicator size="small" color={COLOR.PRIMARIO} />
          ) : error ? (
            <Text style={styles.textoError}>{error}</Text>
          ) : cuidadoresLista.length === 0 ? (
            <Text style={styles.textoVacio}>Sin cuidadores en esta zona</Text>
          ) : (
            <FlatList
              scrollEnabled={false}
              data={cuidadoresLista}
              keyExtractor={item => item.uid}
              renderItem={({ item }) => (
                <View style={styles.itemCuidador}>
                  <View style={styles.cuidadorInfo}>
                    <Text style={styles.cuidadorNombre}>{item.nombre}</Text>
                    {item.verificado && (
                      <Text style={styles.badge}>✓ Verificado</Text>
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
            📋 Solicitudes Pendientes ({solicitudesLista.length})
          </Text>

          {cargando ? (
            <ActivityIndicator size="small" color={COLOR.PRIMARIO} />
          ) : error ? (
            <Text style={styles.textoError}>{error}</Text>
          ) : solicitudesLista.length === 0 ? (
            <Text style={styles.textoVacio}>Sin solicitudes pendientes</Text>
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
    borderLeftColor: '#1F2D2A',
  },
  header: {
    backgroundColor: '#0A3F37',
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2D2A',
  },
  titulo: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2DB391',
    marginBottom: 4,
  },
  zonaId: {
    fontSize: 12,
    color: '#98A7A4',
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
    color: '#EBF4F2',
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
    backgroundColor: '#121918',
    padding: SPACING.sm,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#1F2D2A',
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
    color: '#98A7A4',
    marginBottom: 4,
  },
  statValor: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2DB391',
  },
  itemCuidador: {
    backgroundColor: '#121918',
    padding: SPACING.sm,
    marginBottom: SPACING.xs,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#1F2D2A',
  },
  cuidadorInfo: {
    marginBottom: SPACING.xs,
  },
  cuidadorNombre: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EBF4F2',
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
    color: '#98A7A4',
  },
  itemSolicitud: {
    backgroundColor: '#121918',
    padding: SPACING.sm,
    marginBottom: SPACING.xs,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#1F2D2A',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mascotaNombre: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EBF4F2',
    marginBottom: 2,
  },
  tutorNombre: {
    fontSize: 11,
    color: '#98A7A4',
  },
  horaSolicitud: {
    fontSize: 11,
    color: '#2DB391',
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
    color: '#C96B67',
    paddingVertical: SPACING.md,
  },
})
