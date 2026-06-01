import React, { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from 'react-native'
import { COLOR } from '@/constants/Theme'

interface DebugMatchingData {
  h3TutorZona: string | null
  h3CeldasCercanas: string[]
  candidatosRaw: any[]
  candidatosConDetalle: Array<{
    id: string
    nombre: string
    h3_home: string | null
    enZonaH3: boolean
    horario: {
      pasa: boolean
      razon?: string
    }
    disponibilidad: {
      pasa: boolean
      razon?: string
    }
    final: boolean
  }>
}

interface MatchingDebugOverlayProps {
  isVisible: boolean
  debugMatching: DebugMatchingData
  onClose: () => void
  cargando?: boolean
}

export const MatchingDebugOverlay: React.FC<MatchingDebugOverlayProps> = ({
  isVisible,
  debugMatching,
  onClose,
  cargando = false,
}) => {
  const [expandedCuidador, setExpandedCuidador] = useState<string | null>(null)

  if (!isVisible) return null

  const toggleExpanded = (id: string) => {
    setExpandedCuidador(expandedCuidador === id ? null : id)
  }

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.title}>🔍 Matching Debug</Text>
            <Text style={styles.subtitle}>
              {cargando ? 'Buscando...' : 'Búsqueda completada'}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Zona H3 Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📍 Zona de Búsqueda</Text>
            {debugMatching.h3TutorZona ? (
              <>
                <View style={styles.infoRow}>
                  <Text style={styles.label}>H3 Principal:</Text>
                  <Text style={styles.value}>{debugMatching.h3TutorZona}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Celdas Cercanas:</Text>
                  <Text style={styles.value}>
                    {debugMatching.h3CeldasCercanas.length} zonas
                  </Text>
                </View>
              </>
            ) : (
              <Text style={styles.noData}>Sin coordenadas de búsqueda</Text>
            )}
          </View>

          {/* Resumen */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📊 Resumen</Text>
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statNumber}>
                  {debugMatching.candidatosRaw.length}
                </Text>
                <Text style={styles.statLabel}>Candidatos</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statNumber}>
                  {
                    debugMatching.candidatosConDetalle.filter(c => c.final)
                      .length
                  }
                </Text>
                <Text style={styles.statLabel}>Disponibles</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statNumber}>
                  {
                    debugMatching.candidatosConDetalle.filter(c => c.enZonaH3)
                      .length
                  }
                </Text>
                <Text style={styles.statLabel}>En Zona</Text>
              </View>
            </View>
          </View>

          {/* Lista de Cuidadores */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>👥 Cuidadores</Text>
            {debugMatching.candidatosConDetalle.length === 0 ? (
              <Text style={styles.noData}>Sin candidatos</Text>
            ) : (
              debugMatching.candidatosConDetalle.map(cuidador => (
                <TouchableOpacity
                  key={cuidador.id}
                  style={[
                    styles.cuidadorCard,
                    {
                      borderLeftColor: cuidador.final
                        ? COLOR.EXITO
                        : COLOR.ERROR,
                    },
                  ]}
                  onPress={() => toggleExpanded(cuidador.id)}
                >
                  {/* Card Header */}
                  <View style={styles.cardHeader}>
                    <View style={styles.cardTitle}>
                      <Text
                        style={[
                          styles.cardName,
                          { color: cuidador.final ? '#333' : '#999' },
                        ]}
                      >
                        {cuidador.nombre}
                      </Text>
                      <View style={styles.statusBadges}>
                        {cuidador.enZonaH3 && (
                          <View
                            style={[
                              styles.badge,
                              { backgroundColor: COLOR.EXITO },
                            ]}
                          >
                            <Text style={styles.badgeText}>Zona ✓</Text>
                          </View>
                        )}
                        {cuidador.horario.pasa && (
                          <View
                            style={[
                              styles.badge,
                              { backgroundColor: '#4CAF50' },
                            ]}
                          >
                            <Text style={styles.badgeText}>Horario ✓</Text>
                          </View>
                        )}
                        {cuidador.disponibilidad.pasa && (
                          <View
                            style={[
                              styles.badge,
                              { backgroundColor: '#2196F3' },
                            ]}
                          >
                            <Text style={styles.badgeText}>Libre ✓</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <Text style={styles.expandIcon}>
                      {expandedCuidador === cuidador.id ? '▼' : '▶'}
                    </Text>
                  </View>

                  {/* Expanded Details */}
                  {expandedCuidador === cuidador.id && (
                    <View style={styles.cardDetails}>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>H3:</Text>
                        <Text style={styles.detailValue}>
                          {cuidador.h3_home || 'N/A'}
                        </Text>
                      </View>

                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>🗺 Zona:</Text>
                        <View
                          style={[
                            styles.checkmark,
                            {
                              backgroundColor: cuidador.enZonaH3
                                ? '#4CAF50'
                                : '#f44336',
                            },
                          ]}
                        >
                          <Text style={styles.checkmarkText}>
                            {cuidador.enZonaH3 ? '✓' : '✕'}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>📅 Horario:</Text>
                        <View
                          style={[
                            styles.checkmark,
                            {
                              backgroundColor: cuidador.horario.pasa
                                ? '#4CAF50'
                                : '#f44336',
                            },
                          ]}
                        >
                          <Text style={styles.checkmarkText}>
                            {cuidador.horario.pasa ? '✓' : '✕'}
                          </Text>
                        </View>
                      </View>
                      {cuidador.horario.razon && (
                        <Text style={styles.detailRazon}>
                          {cuidador.horario.razon}
                        </Text>
                      )}

                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>
                          ⏱ Disponibilidad:
                        </Text>
                        <View
                          style={[
                            styles.checkmark,
                            {
                              backgroundColor: cuidador.disponibilidad.pasa
                                ? '#4CAF50'
                                : '#f44336',
                            },
                          ]}
                        >
                          <Text style={styles.checkmarkText}>
                            {cuidador.disponibilidad.pasa ? '✓' : '✕'}
                          </Text>
                        </View>
                      </View>
                      {cuidador.disponibilidad.razon && (
                        <Text style={styles.detailRazon}>
                          {cuidador.disponibilidad.razon}
                        </Text>
                      )}

                      <View style={styles.finalResult}>
                        <Text
                          style={[
                            styles.finalText,
                            {
                              color: cuidador.final ? '#4CAF50' : '#f44336',
                            },
                          ]}
                        >
                          {cuidador.final
                            ? '✓ Resultado Final: MATCH'
                            : '✕ Resultado Final: SIN MATCH'}
                        </Text>
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
              ))
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#aaa',
  },
  closeBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
    backgroundColor: 'rgba(244, 67, 54, 0.3)',
  },
  closeBtnText: {
    fontSize: 24,
    color: '#f44336',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
  scrollContent: {
    padding: 12,
  },
  section: {
    marginBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: COLOR.PRIMARIO,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  infoRow: {
    marginBottom: 6,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  label: {
    fontSize: 12,
    color: '#aaa',
    marginBottom: 2,
  },
  value: {
    fontSize: 13,
    color: '#fff',
    fontFamily: 'monospace',
    fontWeight: '500',
  },
  noData: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 8,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 6,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLOR.PRIMARIO,
  },
  statLabel: {
    fontSize: 10,
    color: '#aaa',
    marginTop: 2,
  },
  cuidadorCard: {
    marginBottom: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    overflow: 'hidden',
    borderLeftWidth: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  cardTitle: {
    flex: 1,
  },
  cardName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  statusBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  badgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '500',
  },
  expandIcon: {
    fontSize: 14,
    color: '#aaa',
    marginLeft: 8,
  },
  cardDetails: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  detailLabel: {
    fontSize: 12,
    color: '#aaa',
    flex: 1,
  },
  detailValue: {
    fontSize: 11,
    color: '#fff',
    fontFamily: 'monospace',
    flex: 1,
    textAlign: 'right',
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: 'bold',
  },
  detailRazon: {
    fontSize: 11,
    color: '#bbb',
    fontStyle: 'italic',
    marginLeft: 12,
    marginBottom: 8,
    marginTop: -4,
  },
  finalResult: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  finalText: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
})
