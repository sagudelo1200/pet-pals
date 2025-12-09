import React, { useEffect, useState } from 'react'
import { StyleSheet, View, Text, ScrollView, Alert } from 'react-native'
import { useRoute, useNavigation } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'
import { COLOR } from '@/constants'
import Screen from '@/components/ui/Screen'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Icon from '@/components/ui/Icon'
import ScreenHeader from '@/components/ui/ScreenHeader'
import Skeleton from '@/components/ui/Skeleton'
import { BadgeEstadoPaseo } from '@/components/paseos/BadgeEstadoPaseo'
import { useEstadoPaseo } from '@/hooks/paseos/useEstadoPaseo'
import { usePaseoTimer } from '@/hooks/paseos/usePaseoTimer'
import { ServicioPaseo } from '@/services/firebase/paseo'
import { Paseo, PaseoStatus } from '@/models/Paseo'
import { Mascota } from '@/models/Mascota'
import { ServicioCrudBase } from '@/services/firebase/crud'

export const DetallePaseoActivo = () => {
  const { t } = useTranslation()
  const route = useRoute()
  const navigation = useNavigation()
  const { paseoId } = route.params as { paseoId: string }

  const [paseo, setPaseo] = useState<Paseo | null>(null)
  const [mascotas, setMascotas] = useState<Mascota[]>([])
  const [cargandoDatos, setCargandoDatos] = useState(true)

  // Hook de máquina de estados reutilizado
  const {
    estado,
    puede,
    transicion,
    cargando: cargandoAccion,
    sincronizar,
  } = useEstadoPaseo(paseo || undefined)

  const { tiempo } = usePaseoTimer(estado, paseo?.fecha_inicio_real)

  useEffect(() => {
    cargarDatos()
  }, [paseoId])

  const cargarDatos = async () => {
    setCargandoDatos(true)
    try {
      const resPaseo = await ServicioPaseo.obtenerPorId(paseoId)
      if (resPaseo.success && resPaseo.data) {
        setPaseo(resPaseo.data)
        sincronizar(resPaseo.data)

        // Cargar mascotas
        if (resPaseo.data.mascota_ids?.length) {
          const promesas = resPaseo.data.mascota_ids.map(id =>
            ServicioCrudBase.obtenerPorId<Mascota>('mascotas', id)
          )
          const resultados = await Promise.all(promesas)
          setMascotas(resultados.map(r => r.data!).filter(Boolean))
        }
      } else {
        Alert.alert(t('comun:error'), 'No se pudo cargar el paseo')
        navigation.goBack()
      }
    } catch (error) {
      console.error(error)
    } finally {
      setCargandoDatos(false)
    }
  }

  const handleAccionPrincipal = async () => {
    if (!paseo) return

    let evento: any = null
    let titulo = ''
    let mensaje = ''

    // Determinar siguiente acción lógica basada en el estado actual
    switch (estado) {
      case PaseoStatus.ACEPTADO:
      case PaseoStatus.PROGRAMADO:
        evento = 'INICIAR_RUTA'
        titulo = t('cuidador:paseo.iniciar_ruta')
        mensaje = t('cuidador:paseo.confirmar_ruta')
        break
      case PaseoStatus.EN_RUTA:
        evento = 'INICIAR_PASEO'
        titulo = t('cuidador:paseo.iniciar_paseo')
        mensaje = t('cuidador:paseo.confirmar_inicio')
        break
      case PaseoStatus.EN_PROGRESO:
        evento = 'FINALIZAR_PASEO'
        titulo = t('cuidador:paseo.finalizar_paseo')
        mensaje = t('cuidador:paseo.confirmar_fin')
        break
      default:
        return
    }

    if (evento && puede(evento)) {
      Alert.alert(titulo, mensaje, [
        { text: t('comun:cancelar'), style: 'cancel' },
        {
          text: t('comun:confirmar'),
          onPress: async () => {
            const payload: any = {}
            if (evento === 'INICIAR_PASEO') {
              payload.fecha_inicio_real = new Date()
            } else if (evento === 'FINALIZAR_PASEO') {
              payload.fecha_fin_real = new Date()
            }

            const resultado = await transicion(evento, payload)
            if (resultado.success) {
              // Actualizar estado local para reflejar cambios inmediatos (ej. Timer)
              if (payload.fecha_inicio_real) {
                setPaseo(prev =>
                  prev
                    ? { ...prev, fecha_inicio_real: payload.fecha_inicio_real }
                    : null
                )
              }

              if (evento === 'FINALIZAR_PASEO') {
                Alert.alert(
                  t('comun:exito'),
                  t('cuidador:paseo.paseo_finalizado')
                )
                navigation.goBack()
              }
            } else {
              Alert.alert(
                t('comun:error'),
                resultado.error || t('comun:error_desconocido')
              )
            }
          },
        },
      ])
    }
  }

  if (cargandoDatos) {
    return <LoadingSkeleton />
  }

  if (!paseo) return null

  return (
    <Screen style={styles.container} includeTopInset>
      <ScreenHeader title={t('cuidador:paseo.detalle_titulo')} />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Estado Actual */}
        <View style={styles.statusContainer}>
          <BadgeEstadoPaseo estado={estado} />
          <Text style={styles.timerText}>{tiempo}</Text>
        </View>

        {/* Mapa / Ubicación */}
        <Card style={styles.mapCard}>
          <View style={styles.mapPlaceholder}>
            <Icon name="map-marker-alt" size={32} color={COLOR.PRIMARIO} />
            <Text style={styles.mapText}>{t('cuidador:paseo.ver_mapa')}</Text>
          </View>
          <Text style={styles.addressText}>
            📍 {paseo.ubicacion_inicio || 'Ubicación no disponible'}
          </Text>
        </Card>

        {/* Mascotas */}
        <Text style={styles.sectionTitle}>{t('cuidador:paseo.mascotas')}</Text>
        {mascotas.map(mascota => (
          <Card key={mascota.id} style={styles.mascotaCard}>
            <View style={styles.mascotaRow}>
              <Icon name="paw" size={24} color={COLOR.ENFASIS} />
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.mascotaName}>{mascota.nombre}</Text>
                <Text style={styles.mascotaBreed}>{mascota.raza}</Text>
              </View>
            </View>
          </Card>
        ))}
      </ScrollView>

      {/* Botón de Acción Principal (Sticky Footer) */}
      <View style={styles.footer}>
        {estado !== PaseoStatus.FINALIZADO &&
          estado !== PaseoStatus.COMPLETADO && (
            <Button
              title={obtenerTextoBoton(estado, t)}
              onPress={handleAccionPrincipal}
              loading={cargandoAccion}
              variant={
                estado === PaseoStatus.EN_PROGRESO ? 'error' : 'primario'
              }
              size="lg"
              icon={obtenerIconoBoton(estado)}
            />
          )}
      </View>
    </Screen>
  )
}

// Helpers UI
const obtenerTextoBoton = (estado: PaseoStatus, t: any) => {
  switch (estado) {
    case PaseoStatus.ACEPTADO:
    case PaseoStatus.PROGRAMADO:
      return t('cuidador:paseo.accion_ir_a_recoger')
    case PaseoStatus.EN_RUTA:
      return t('cuidador:paseo.accion_empezar')
    case PaseoStatus.EN_PROGRESO:
      return t('cuidador:paseo.accion_terminar')
    default:
      return t('cuidador:paseo.accion_ver_detalle')
  }
}

const obtenerIconoBoton = (estado: PaseoStatus) => {
  switch (estado) {
    case PaseoStatus.ACEPTADO:
      return 'car-side'
    case PaseoStatus.EN_RUTA:
      return 'play'
    case PaseoStatus.EN_PROGRESO:
      return 'flag-checkered'
    default:
      return undefined
  }
}

const LoadingSkeleton = () => (
  <Screen style={styles.container} includeTopInset>
    <ScreenHeader title="Cargando..." />
    <View style={{ padding: 20 }}>
      <Skeleton
        width="100%"
        height={100}
        radius={12}
        style={{ marginBottom: 20 }}
      />
      <Skeleton
        width="100%"
        height={60}
        radius={12}
        style={{ marginBottom: 10 }}
      />
      <Skeleton width="100%" height={60} radius={12} />
    </View>
  </Screen>
)

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLOR.BASE,
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  statusContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  timerText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLOR.TEXTO,
    marginTop: 12,
    fontVariant: ['tabular-nums'],
  },
  mapCard: {
    padding: 0,
    overflow: 'hidden',
    marginBottom: 24,
    backgroundColor: COLOR.BLOQUE,
  },
  mapPlaceholder: {
    height: 150,
    backgroundColor: COLOR.SECUNDARIO,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapText: {
    color: COLOR.SUBTEXTO,
    marginTop: 8,
  },
  addressText: {
    padding: 16,
    color: COLOR.TEXTO,
    fontSize: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLOR.TEXTO,
    marginBottom: 12,
  },
  mascotaCard: {
    marginBottom: 12,
    padding: 16,
    backgroundColor: COLOR.BLOQUE,
  },
  mascotaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mascotaName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLOR.TEXTO,
  },
  mascotaBreed: {
    fontSize: 14,
    color: COLOR.SUBTEXTO,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 34,
    backgroundColor: COLOR.BLOQUE,
    borderTopWidth: 1,
    borderTopColor: COLOR.BORDE,
  },
})
