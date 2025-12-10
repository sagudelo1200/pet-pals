import React, { useEffect, useState } from 'react'
import { StyleSheet, View, Text, ScrollView, Alert, Image } from 'react-native'
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
import { ServicioPaseo } from '@/services/firebase/paseo'
import { ServicioCrudBase } from '@/services/firebase/crud'
import { Paseo, PaseoStatus } from '@/models/Paseo'
import { PerfilPublico } from '@/models/PerfilPublico'
import { Mascota } from '@/models/Mascota'

export const DetallePaseo = () => {
  const { t } = useTranslation()
  const route = useRoute()
  const navigation = useNavigation()
  const { id } = route.params as { id: string }

  const [paseo, setPaseo] = useState<Paseo | null>(null)
  const [cuidador, setCuidador] = useState<PerfilPublico | null>(null)
  const [mascotas, setMascotas] = useState<Mascota[]>([])
  const [cargandoDatos, setCargandoDatos] = useState(true)

  const { estado, puede, transicion, sincronizar } = useEstadoPaseo(
    paseo || undefined
  )

  useEffect(() => {
    cargarDatos()
  }, [id])

  const cargarDatos = async () => {
    setCargandoDatos(true)
    try {
      const resPaseo = await ServicioPaseo.obtenerPorId(id)
      if (resPaseo.success && resPaseo.data) {
        const datosPaseo = resPaseo.data
        setPaseo(datosPaseo)
        sincronizar(datosPaseo)

        // Cargar Cuidador si existe
        if (datosPaseo.id_cuidador) {
          const resCuidador =
            await ServicioCrudBase.obtenerPorId<PerfilPublico>(
              'perfil_publico',
              datosPaseo.id_cuidador
            )
          if (resCuidador.success) setCuidador(resCuidador.data)
        }

        // Cargar Mascotas
        if (datosPaseo.mascota_ids?.length) {
          const promesas = datosPaseo.mascota_ids.map(mId =>
            ServicioCrudBase.obtenerPorId<Mascota>('mascotas', mId)
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

  const handleCancelar = () => {
    Alert.alert(
      t('paseos:acciones.cancelar'),
      t('paseos:acciones.confirmar_cancelar'),
      [
        { text: t('comun:cancelar'), style: 'cancel' },
        {
          text: t('comun:confirmar'),
          style: 'destructive',
          onPress: async () => {
            const res = await transicion('CANCELAR', {
              motivo: 'Cancelado por tutor',
            })
            if (res.success) cargarDatos()
            else Alert.alert(t('comun:error'), res.error)
          },
        },
      ]
    )
  }

  if (cargandoDatos) {
    return (
      <Screen style={styles.container} includeTopInset>
        <ScreenHeader title={t('paseos:detalle.titulo')} />
        <View style={{ padding: 20 }}>
          <Skeleton width="100%" height={200} />
        </View>
      </Screen>
    )
  }

  if (!paseo) return null

  const fecha =
    paseo.fecha_hora_inicio instanceof Date
      ? paseo.fecha_hora_inicio
      : new Date((paseo.fecha_hora_inicio as any).seconds * 1000)

  const fechaStr = fecha.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  const horaStr = fecha.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  })
  const precioStr = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(paseo.precio)

  return (
    <Screen style={styles.container} includeTopInset>
      <ScreenHeader title={t('paseos:detalle.titulo')} />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Header Info */}
        <View style={styles.mainInfo}>
          <Text style={styles.precio}>{precioStr}</Text>
          <View style={styles.fechaContainer}>
            <Icon name="calendar-alt" size={16} color={COLOR.TEXTO} />
            <Text style={styles.fechaText}>
              {fechaStr} • {horaStr}
            </Text>
          </View>
        </View>

        {/* Estado */}
        <Card style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>{t('paseos:detalle.estado')}:</Text>
            <BadgeEstadoPaseo estado={estado} />
          </View>
          {estado === PaseoStatus.PENDIENTE && (
            <Text style={styles.statusDesc}>
              {t('paseos:detalle.esperando_cuidador')}
            </Text>
          )}
        </Card>

        {/* Cuidador (Si existe) */}
        {cuidador && (
          <Card style={styles.card} title={t('paseos:detalle.cuidador')}>
            <View style={styles.perfilRow}>
              {cuidador.foto ? (
                <Image source={{ uri: cuidador.foto }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>
                    {cuidador.nombre.charAt(0)}
                  </Text>
                </View>
              )}
              <View>
                <Text style={styles.nombreCuidador}>{cuidador.nombre}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Icon name="star" size={14} color={COLOR.ENFASIS} />
                  <Text style={styles.rating}>
                    {cuidador.rating_promedio || 'Nuevo'}
                  </Text>
                </View>
              </View>
            </View>
          </Card>
        )}

        {/* Mascotas */}
        <Card
          style={styles.card}
          title={`${t('cuidador:solicitudes.mascotas')} (${mascotas.length})`}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: 8 }}
          >
            {mascotas.map(mascota => (
              <View key={mascota.id} style={styles.mascotaItemHorizontal}>
                {mascota.foto ? (
                  <Image
                    source={{ uri: mascota.foto }}
                    style={styles.mascotaAvatarLarge}
                  />
                ) : (
                  <View
                    style={[
                      styles.mascotaAvatarLarge,
                      styles.mascotaPlaceholder,
                    ]}
                  >
                    <Icon name="paw" size={24} color={COLOR.SUBTEXTO} />
                  </View>
                )}
                <Text style={styles.mascotaNombre} numberOfLines={1}>
                  {mascota.nombre}
                </Text>
                <Text style={styles.mascotaRaza} numberOfLines={1}>
                  {mascota.raza || 'Raza desconocida'}
                </Text>
              </View>
            ))}
          </ScrollView>
        </Card>

        {/* Mapa */}
        <Card
          style={styles.card}
          title={t('cuidador:solicitudes.ubicacion_por_definir')}
        >
          <View style={styles.mapPlaceholder}>
            <Icon name="map-marker-alt" size={32} color={COLOR.SUBTEXTO} />
            <Text style={styles.mapText}>
              {t('cuidador:solicitudes.vista_mapa')}
            </Text>
          </View>
        </Card>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        {puede('CANCELAR') && (
          <Button
            title={t('paseos:acciones.cancelar')}
            variant="contorno"
            style={{ flex: 1 }}
            textStyle={{ color: COLOR.ERROR }}
            onPress={handleCancelar}
          />
        )}
        {/* TODO: Botón Contactar si está aceptado */}
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLOR.BASE },
  content: { padding: 20, paddingBottom: 100 },
  mainInfo: { alignItems: 'center', marginBottom: 24, marginTop: 10 },
  precio: {
    fontSize: 36,
    fontWeight: '800',
    color: COLOR.ENFASIS,
    marginBottom: 12,
    letterSpacing: -1,
  },
  fechaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLOR.BLOQUE,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: COLOR.BORDE,
  },
  fechaText: {
    fontSize: 14,
    color: COLOR.TEXTO,
    marginLeft: 8,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  card: {
    marginBottom: 16,
    backgroundColor: COLOR.BLOQUE,
    borderColor: COLOR.BORDE,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: { fontSize: 15, color: COLOR.TEXTO, fontWeight: '500' },
  statusDesc: { marginTop: 8, fontSize: 14, color: COLOR.SUBTEXTO },
  perfilRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 16 },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLOR.ENFASIS,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: { fontSize: 20, fontWeight: 'bold', color: '#FFF' },
  nombreCuidador: { fontSize: 16, fontWeight: '600', color: COLOR.TEXTO },
  rating: { fontSize: 14, color: COLOR.SUBTEXTO, marginLeft: 4 },
  mascotaItemHorizontal: { alignItems: 'center', marginRight: 20, width: 80 },
  mascotaAvatarLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: 8,
  },
  mascotaPlaceholder: {
    backgroundColor: COLOR.SECUNDARIO,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mascotaNombre: {
    fontSize: 14,
    fontWeight: '600',
    color: COLOR.TEXTO,
    textAlign: 'center',
  },
  mascotaRaza: { fontSize: 12, color: COLOR.SUBTEXTO, textAlign: 'center' },
  mapPlaceholder: {
    height: 120,
    backgroundColor: COLOR.SECUNDARIO,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  mapText: { color: COLOR.SUBTEXTO, marginTop: 8, fontSize: 12 },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLOR.BASE,
    borderTopWidth: 1,
    borderTopColor: COLOR.BORDE,
    padding: 20,
    paddingBottom: 40,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 10,
  },
})
