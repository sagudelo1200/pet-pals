import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, Alert, ScrollView } from 'react-native'
import { BottomSheet, Button, Card, AvatarGroup } from '@/components/ui'
import { COLOR } from '@/constants'
import { Paseo } from '@/models/Paseo'
import { useTranslation } from 'react-i18next'
import { ServicioPaseo } from '@/services/firebase/paseo'
import { ServicioCrudBase } from '@/services/firebase/crud'

interface Props {
  visible: boolean
  paseo?: Paseo | null
  onClose: () => void
}

export const SolicitudModal: React.FC<Props> = ({
  visible,
  paseo,
  onClose,
}) => {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [mascotas, setMascotas] = useState<any[]>([])

  useEffect(() => {
    let mounted = true
    const load = async () => {
      if (!paseo) return
      const ids: string[] = (paseo as any).mascota_ids || []
      if (ids.length === 0 && paseo.mascotas_fotos_visual) {
        // fallback: build minimal entries from fotos
        const fotos = paseo.mascotas_fotos_visual || []
        const items = fotos.map((f, i) => ({ id: `f-${i}`, foto: f }))
        if (mounted) setMascotas(items)
        return
      }

      if (ids.length > 0) {
        const results: any[] = []
        for (const id of ids.slice(0, 8)) {
          const res = await ServicioCrudBase.obtenerPorId('mascotas', id)
          if (res.success && res.data) results.push(res.data)
        }
        if (mounted) setMascotas(results)
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [paseo])

  if (!paseo) return null

  // Lista de mascotas (se mostrará en AvatarGroup del header)
  const mascotasAMostrar = mascotas

  const handleAceptar = async () => {
    setLoading(true)
    try {
      const res = await ServicioPaseo.aceptarSolicitud(paseo.id)
      setLoading(false)
      if (res && (res as any).success !== false) {
        Alert.alert(t('comun:exito'), t('cuidador:solicitudes.exito_aceptar'))
        onClose()
      } else {
        Alert.alert(
          t('comun:error'),
          (res as any).error || t('comun:error_desconocido')
        )
      }
    } catch (e) {
      setLoading(false)
      Alert.alert(t('comun:error'), t('comun:error_desconocido'))
    }
  }

  const handleRechazar = async () => {
    // Solo registrar evento si es una solicitud directa.
    const tipo = (paseo as any).tipo_solicitud
    const esDirecta = tipo === 'DIRECTA' || !!(paseo as any).id_cuidador

    if (esDirecta) {
      // Confirmar acción
      Alert.alert(
        t('cuidador:solicitudes.ahora_no'),
        t('cuidador:solicitudes.confirmar_ahora_no'),
        [
          { text: t('comun:cancelar'), style: 'cancel' },
          {
            text: t('comun:confirmar'),
            onPress: async () => {
              setLoading(true)
              // Registrar el evento de rechazo. No liberamos id_cuidador ni cambiamos tipo_solicitud;
              // el tutor decidirá si republicar la solicitud.
              try {
                await ServicioPaseo.registrarEvento(paseo.id, 'RECHAZAR', {
                  motivo: 'RECHAZADO_POR_CUIDADOR',
                })
              } catch (e) {
                // ignore
              }
              setLoading(false)
              onClose()
            },
          },
        ]
      )
    } else {
      // ABIERTA: no interactuar con Firebase, solo cerrar
      onClose()
    }
  }

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <Card style={styles.card}>
          <View style={styles.headerSimple}>
            <AvatarGroup
              uris={mascotasAMostrar
                .map(m => m.foto || m.foto_url)
                .filter(Boolean)}
              size="medium"
            />
            <Text style={styles.titlePremium} numberOfLines={1}>
              {(paseo as any).mascota_nombre_visual ||
                t('cuidador:solicitudes.detalle_titulo')}
            </Text>
            <Text style={styles.subtitlePremium} numberOfLines={1}>
              {paseo.ubicacion_inicio || ''}
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
                <Text style={styles.metaValue}>{paseo.precio}</Text>
              </View>
            </View>
          </View>

          {/* AvatarGroup mostrado en header; no repetir aquí */}

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
  card: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    marginBottom: 4,
  },
  info: {
    color: COLOR.SUBTEXTO,
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  headerText: {
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  metaItem: {
    flex: 1,
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 12,
    color: COLOR.SUBTEXTO,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLOR.TEXTO,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
    color: COLOR.TEXTO,
  },
  mascotasList: {
    paddingVertical: 8,
    paddingLeft: 4,
  },
  petCard: {
    width: 120,
    alignItems: 'center',
    padding: 8,
    backgroundColor: 'transparent',
    borderRadius: 12,
  },
  petCardPremium: {
    width: 120,
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLOR.SECUNDARIO,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLOR.BORDE,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
  },
  petName: {
    marginTop: 8,
    fontSize: 14,
    color: COLOR.TEXTO,
    textAlign: 'center',
  },
  avatarGroupContainer: {
    marginTop: 8,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  moreText: {
    color: COLOR.SUBTEXTO,
    fontSize: 14,
    marginLeft: 8,
  },
  headerPremium: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLOR.SECUNDARIO,
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLOR.BORDE,
  },
  heroLeft: {
    marginRight: 12,
  },
  heroRight: {
    flex: 1,
  },
  titlePremium: {
    fontSize: 20,
    fontWeight: '800',
    color: COLOR.TEXTO,
    marginBottom: 4,
  },
  subtitlePremium: {
    fontSize: 13,
    color: COLOR.SUBTEXTO,
    marginBottom: 8,
  },
  metaRowPremium: {
    flexDirection: 'row',
    gap: 12,
  },
  metaItemPremium: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 8,
  },
  actionsPremium: {
    flexDirection: 'row',
    marginTop: 18,
  },
  headerSimple: {
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLOR.SECUNDARIO,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLOR.BORDE,
    marginBottom: 12,
  },
})

export default SolicitudModal
