import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, Alert, ScrollView } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import {
  Avatar,
  Badge,
  BottomSheet,
  Button,
  Chip,
  Divider,
  Icon,
  MascotaHorizontal,
  Skeleton,
  Spacer,
} from '@/components/ui'
import { COLOR } from '@/constants'
import { Paseo } from '@/models/Paseo'
import { useTranslation } from 'react-i18next'
import { GestorPaseos } from '@/logic/paseos'
import { GestorMascotas } from '@/logic/mascotas'
import { useGestorPaseoActivo } from '@/hooks/paseos/useGestorPaseoActivo'
import { GestorPerfilPublico } from '@/logic/usuarios/perfilPublico'
import { PerfilPublico } from '@/models/PerfilPublico'
import { usePedirCelularSiFalta } from '@/hooks/usePedirCelularSiFalta'
import { ModalCompletarCelular } from '@/components/paseos/ModalCompletarCelular'

interface Props {
  visible: boolean
  paseo?: Paseo | null
  onClose: () => void
}

const SolicitudModal: React.FC<Props> = ({ visible, paseo, onClose }) => {
  const { t } = useTranslation()
  const navigation = useNavigation<any>()
  const { acciones, gestion } = useGestorPaseoActivo()
  const [loading, setLoading] = useState(false)
  const [mascotas, setMascotas] = useState<any[]>([])
  const [loadingMascotas, setLoadingMascotas] = useState(false)
  const [tutor, setTutor] = useState<PerfilPublico | null>(null)
  const [loadingTutor, setLoadingTutor] = useState(false)
  const [modalCelularVisible, setModalCelularVisible] = useState(false)
  const {
    tieneCelular,
    guardarCelular,
    cargando: cargandoCelular,
  } = usePedirCelularSiFalta({
    onCompletado: () => {
      setModalCelularVisible(false)
      handleAceptarInterno()
    },
  })

  useEffect(() => {
    let mounted = true
    const load = async () => {
      if (!paseo) return
      setLoadingMascotas(true)
      const ids: string[] = (paseo as any).mascota_ids || []
      try {
        if (ids.length === 0 && paseo.mascotas_fotos_visual) {
          const fotos = paseo.mascotas_fotos_visual || []
          const items = fotos.map((f, i) => ({ id: `f-${i}`, foto: f }))
          if (mounted) setMascotas(items)
        } else if (ids.length > 0) {
          const results: any[] = []
          for (const id of ids.slice(0, 8)) {
            const res = await GestorMascotas.obtenerPorId(id)
            if (res.success && res.data) results.push(res.data)
          }
          if (mounted) setMascotas(results)
        }

        // Cargar Tutor
        const tutorId = (paseo as any).tutor_ids?.[0] || (paseo as any).id_tutor
        if (tutorId && mounted) {
          setLoadingTutor(true)
          const resTutor = await GestorPerfilPublico.obtenerPorId(tutorId)
          if (resTutor.success && mounted) {
            setTutor(resTutor.data as PerfilPublico)
          }
          setLoadingTutor(false)
        }
      } catch (_e) {
        // ignore
      } finally {
        if (mounted) setLoadingMascotas(false)
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [paseo])

  if (!paseo) return null

  const mascotasAMostrar = mascotas

  const precioStr = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format((paseo as any).precio || 0)

  const handleAceptar = () => {
    if (!tieneCelular()) {
      setModalCelularVisible(true)
      return
    }
    handleAceptarInterno()
  }

  const handleAceptarInterno = async () => {
    setLoading(true)
    try {
      gestion.seleccionar(paseo)
      const res = await acciones.aceptar()
      setLoading(false)
      if (res.success) {
        onClose()
        navigation.navigate('ControlPaseo', { paseoId: paseo.id })
      } else {
        gestion.limpiar()
        Alert.alert(t('comun:error'), res.error || t('comun:error_desconocido'))
      }
    } catch (_e) {
      setLoading(false)
      gestion.limpiar()
      Alert.alert(t('comun:error'), t('comun:error_desconocido'))
    }
  }

  const handleRechazar = async () => {
    const tipo = (paseo as any).tipo_solicitud
    const esDirecta = tipo === 'DIRECTA' || !!(paseo as any).id_cuidador

    if (esDirecta) {
      Alert.alert(
        t('cuidador:solicitudes.ahora_no'),
        t('cuidador:solicitudes.confirmar_ahora_no'),
        [
          { text: t('comun:cancelar'), style: 'cancel' },
          {
            text: t('comun:confirmar'),
            onPress: async () => {
              setLoading(true)
              try {
                await GestorPaseos.rechazarPaseo(paseo.id)
              } catch (_e) {
                // ignore
              }
              setLoading(false)
              onClose()
            },
          },
        ]
      )
    } else {
      onClose()
    }
  }

  const fechaFormat = paseo.fecha_hora_inicio
    ? new Intl.DateTimeFormat('es-ES', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }).format(
        paseo.fecha_hora_inicio instanceof Date
          ? paseo.fecha_hora_inicio
          : (paseo.fecha_hora_inicio as any).toDate?.() ||
              new Date(paseo.fecha_hora_inicio)
      )
    : ''

  const esPrivado = paseo.modalidad === 'privado'

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View style={styles.headerContainer}>
          <Text style={styles.headerPrice}>{precioStr}</Text>
          <View style={styles.direccionContainer}>
            <Icon
              name="map-marker-alt"
              size={14}
              color={COLOR.PRIMARIO}
              style={{ marginRight: 6 }}
            />
            <Text style={styles.headerDireccion} numberOfLines={2}>
              {paseo.ubicacion_inicio_txt ||
                (typeof paseo.ubicacion_inicio === 'object'
                  ? (paseo.ubicacion_inicio as any).alias ||
                    paseo.ubicacion_inicio.direccion_formateada
                  : paseo.ubicacion_inicio) ||
                ''}
            </Text>
          </View>

          <View style={styles.badgeRow}>
            <Chip
              label={fechaFormat}
              leftIconName="calendar-alt"
              style={styles.chip}
            />
            <Chip
              label={`${paseo.duracion_estimada} min`}
              leftIconName="clock"
              style={styles.chip}
            />
          </View>
        </View>

        <View style={styles.body}>
          {/* Sección Tutor */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {t('cuidador:solicitudes.solicitado_por')}
            </Text>
            <Badge
              label={t(
                esPrivado
                  ? 'paseos:modalidad_privado'
                  : 'paseos:modalidad_compartido',
                esPrivado ? 'Privado' : 'Compartido'
              )}
              variant={esPrivado ? 'info' : 'exito'}
            />
          </View>

          {loadingTutor ? (
            <View style={styles.tutorRow}>
              <Skeleton circle width={44} height={44} />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Skeleton width="60%" height={14} />
                <Skeleton width="40%" height={10} style={{ marginTop: 6 }} />
              </View>
            </View>
          ) : (
            <View style={styles.tutorRow}>
              <Avatar uri={tutor?.foto} size={48} />
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.tutorName}>{tutor?.nombre || 'Tutor'}</Text>
                <Text style={styles.tutorMeta}>
                  {t('cuidador:solicitudes.cliente_nuevo')}
                </Text>
              </View>
            </View>
          )}

          <Divider style={{ marginVertical: 16 }} />

          {/* Sección Mascotas */}
          <Text style={styles.sectionTitle}>
            {t('paseos:pasos.seleccionar_mascota.titulo')}
          </Text>

          {loadingMascotas ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.mascotasList}
            >
              {[1, 2].map(i => (
                <View key={i} style={styles.mascotaItemHorizontal}>
                  <Skeleton circle width={64} height={64} />
                  <Skeleton width={72} height={12} style={{ marginTop: 8 }} />
                </View>
              ))}
            </ScrollView>
          ) : mascotasAMostrar.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.mascotasList}
            >
              {mascotasAMostrar.map(mascota => (
                <MascotaHorizontal key={mascota.id} mascota={mascota} />
              ))}
            </ScrollView>
          ) : (
            <Text style={styles.emptyText}>
              {t('cuidador:solicitudes.sin_mascotas')}
            </Text>
          )}

          <Spacer size={24} />

          {/* Acciones */}
          <View style={styles.footerActions}>
            <Button
              title={t('cuidador:solicitudes.ahora_no')}
              variant="bloque"
              onPress={handleRechazar}
              style={{ flex: 0.8 }}
            />
            <Button
              title={t('cuidador:solicitudes.aceptar')}
              onPress={handleAceptar}
              loading={loading}
              variant="primario"
              icon="check"
              style={{ flex: 1.2, marginLeft: 12 }}
            />
          </View>
        </View>
      </ScrollView>
      <ModalCompletarCelular
        visible={modalCelularVisible}
        onClose={() => setModalCelularVisible(false)}
        onCelularConfirmado={guardarCelular}
        cargando={cargandoCelular}
        titulo={t('usuarios.perfil.celular.titulo_modal_cuidador')}
        descripcion={t('usuarios.perfil.celular.descripcion_modal_cuidador')}
      />
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  headerContainer: {
    padding: 24,
    backgroundColor: COLOR.SECUNDARIO,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLOR.BORDE,
  },
  headerPrice: {
    fontSize: 28,
    fontWeight: '900',
    color: COLOR.TEXTO,
    marginBottom: 8,
  },
  direccionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  headerDireccion: {
    fontSize: 14,
    color: COLOR.SUBTEXTO,
    textAlign: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  chip: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  body: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLOR.SUBTEXTO,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tutorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLOR.BLOQUE,
    padding: 12,
    borderRadius: 16,
  },
  tutorName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLOR.TEXTO,
  },
  tutorMeta: {
    fontSize: 12,
    color: COLOR.PRIMARIO,
    fontWeight: '600',
  },
  mascotasList: {
    paddingVertical: 10,
  },
  mascotaItemHorizontal: {
    alignItems: 'center',
    marginRight: 16,
  },
  emptyText: {
    color: COLOR.SUBTEXTO,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 10,
  },
  footerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
  },
})

export default SolicitudModal
