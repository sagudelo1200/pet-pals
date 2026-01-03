import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, Alert, ScrollView } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import {
  BottomSheet,
  Button,
  Card,
  MascotaHorizontal,
  Skeleton,
} from '@/components/ui'
import { COLOR } from '@/constants'
import { Paseo } from '@/models/Paseo'
import { useTranslation } from 'react-i18next'
import { GestorPaseos } from '@/logic/paseos'
import { GestorMascotas } from '@/logic/mascotas'
import { useGestorPaseoActivo } from '@/hooks/paseos/useGestorPaseoActivo'

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
          return
        }

        if (ids.length > 0) {
          const results: any[] = []
          for (const id of ids.slice(0, 8)) {
            const res = await GestorMascotas.obtenerPorId(id)
            if (res.success && res.data) results.push(res.data)
          }
          if (mounted) setMascotas(results)
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

  const handleAceptar = async () => {
    setLoading(true)
    try {
      // 1. Inicializamos el gestor con el paseo actual para poder operar sobre él
      gestion.seleccionar(paseo)

      // 2. Ejecutamos la acción de negocio a través del gestor
      const res = await acciones.aceptar()

      setLoading(false)

      if (res.success) {
        onClose()
        // Navegar al panel de control del paseo
        navigation.navigate('ControlPaseo', { paseoId: paseo.id })
      } else {
        // En caso de error, limpiamos el gestor para no dejar estado sucio
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

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <Card style={styles.card}>
          <View style={styles.headerSimple}>
            <Text style={styles.titlePremium} numberOfLines={1}>
              {precioStr}
            </Text>
            <Text style={styles.subtitlePremium} numberOfLines={1}>
              {paseo.ubicacion_inicio_txt ||
                (typeof paseo.ubicacion_inicio === 'object'
                  ? paseo.ubicacion_inicio.alias ||
                    paseo.ubicacion_inicio.direccion_formateada
                  : paseo.ubicacion_inicio) ||
                ''}
            </Text>

            <View style={styles.metaRowPremium}>
              <View style={styles.metaItemPremium}>
                <Text style={styles.metaLabel}>
                  {t('paseos:campos.duracion')}
                </Text>
                <Text style={styles.metaValue}>
                  {paseo.duracion_estimada} min
                </Text>
              </View>
              <View style={styles.metaItemPremium}>
                <Text style={styles.metaLabel}>
                  {t('paseos:campos.precio')}
                </Text>
                <Text style={styles.metaValue}>{precioStr}</Text>
              </View>
            </View>
          </View>

          <View style={{ marginTop: 12, minHeight: 120 }}>
            <Text style={styles.sectionTitle}>
              {t('paseos:pasos.seleccionar_mascota.titulo')}
            </Text>

            {loadingMascotas ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.mascotasList}
              >
                {[1, 2, 3].map(i => (
                  <View key={i} style={styles.mascotaItemHorizontal}>
                    <Skeleton
                      width={64}
                      height={64}
                      style={styles.mascotaPlaceholder}
                    />
                    <Skeleton width={72} height={12} style={{ marginTop: 8 }} />
                    <Skeleton width={56} height={10} style={{ marginTop: 6 }} />
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
              <Text style={{ color: COLOR.SUBTEXTO }}>
                {t('cuidador:solicitudes.sin_mascotas')}
              </Text>
            )}
          </View>

          <View style={styles.actionsPremium}>
            <Button
              title={t('cuidador:solicitudes.aceptar')}
              onPress={handleAceptar}
              loading={loading}
              style={{ flex: 1, marginRight: 8 }}
              variant="primario"
            />
            <Button
              title={t('cuidador:solicitudes.ahora_no')}
              variant="secundario"
              onPress={handleRechazar}
              style={{ flex: 1 }}
            />
          </View>
        </Card>
      </ScrollView>
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  card: { padding: 16 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
    color: COLOR.TEXTO,
  },
  mascotasList: { paddingVertical: 8, paddingLeft: 4 },
  mascotaItemHorizontal: { alignItems: 'center', marginRight: 20, width: 80 },
  mascotaPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLOR.SECUNDARIO,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionsPremium: { flexDirection: 'row', marginTop: 18 },
  headerSimple: {
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLOR.SECUNDARIO,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLOR.BORDE,
    marginBottom: 12,
  },
  titlePremium: {
    fontSize: 20,
    fontWeight: '800',
    color: COLOR.TEXTO,
    marginBottom: 4,
  },
  subtitlePremium: { fontSize: 13, color: COLOR.SUBTEXTO, marginBottom: 8 },
  metaRowPremium: { flexDirection: 'row', gap: 12 },
  metaItemPremium: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 8,
  },
  metaLabel: { fontSize: 12, color: COLOR.SUBTEXTO },
  metaValue: { fontSize: 14, fontWeight: '700', color: COLOR.TEXTO },
})

export default SolicitudModal
