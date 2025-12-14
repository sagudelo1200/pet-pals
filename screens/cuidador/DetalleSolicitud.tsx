import React, { useEffect, useState } from 'react'
import { StyleSheet, View, Text, ScrollView, Image, Alert } from 'react-native'
import { useRoute, useNavigation } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'
import { COLOR } from '@/constants'
import Screen from '@/components/ui/Screen'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Icon from '@/components/ui/Icon'
import { ServicioPaseo } from '@/services/firebase/paseo'
import { ServicioCrudBase } from '@/services/firebase/crud'
import { Paseo } from '@/models/Paseo'
import { PerfilPublico } from '@/models/PerfilPublico'
import { Mascota } from '@/models/Mascota'
import Skeleton from '@/components/ui/Skeleton'
import ScreenHeader from '@/components/ui/ScreenHeader'

import { useGestionPaseoCuidador } from '@/hooks/cuidador/useGestionPaseoCuidador'

export const DetalleSolicitud = () => {
  const { t } = useTranslation()
  const route = useRoute()
  const navigation = useNavigation()
  const { paseoId } = route.params as { paseoId: string }

  const [paseo, setPaseo] = useState<Paseo | null>(null)
  const [perfilTutor, setPerfilTutor] = useState<PerfilPublico | null>(null)
  const [mascotas, setMascotas] = useState<Mascota[]>([])
  const [cargandoDatos, setCargandoDatos] = useState(true)

  const {
    aceptarSolicitud,
    rechazarSolicitud,
    cargando: cargandoAccion,
  } = useGestionPaseoCuidador()

  useEffect(() => {
    cargarDatos()
  }, [paseoId])

  const cargarDatos = async () => {
    setCargandoDatos(true)
    try {
      // 1. Cargar Paseo
      const resPaseo = await ServicioPaseo.obtenerPorId(paseoId)
      if (!resPaseo.success || !resPaseo.data) {
        Alert.alert(t('comun:error'), t('cuidador:solicitudes.error_cargar'))
        navigation.goBack()
        return
      }
      const datosPaseo = resPaseo.data
      setPaseo(datosPaseo)

      // 2. Cargar Perfil Público del Tutor
      if (datosPaseo.creado_por) {
        // Intentamos cargar el perfil público usando el ID del creador (asumiendo ID == UID)
        const resPerfil = await ServicioCrudBase.obtenerPorId<PerfilPublico>(
          'perfil_publico',
          datosPaseo.creado_por
        )
        if (resPerfil.success && resPerfil.data) {
          setPerfilTutor(resPerfil.data)
        } else {
          console.log('No se encontró perfil público para el tutor')
        }
      }

      // 3. Cargar Mascotas
      if (datosPaseo.mascota_ids && datosPaseo.mascota_ids.length > 0) {
        const promesasMascotas = datosPaseo.mascota_ids.map(id =>
          ServicioCrudBase.obtenerPorId<Mascota>('mascotas', id)
        )
        const resultados = await Promise.all(promesasMascotas)
        const mascotasEncontradas = resultados
          .filter(r => r.success && r.data)
          .map(r => r.data!)
        setMascotas(mascotasEncontradas)
      }
    } catch (error) {
      console.error(error)
      Alert.alert(t('comun:error'), t('cuidador:solicitudes.error_datos'))
    } finally {
      setCargandoDatos(false)
    }
  }

  const handleAceptar = () => {
    if (!paseo) return
    aceptarSolicitud(paseo)
  }

  const handleRechazar = () => {
    if (paseo) rechazarSolicitud(paseo)
  }

  if (cargandoDatos) {
    return (
      <Screen style={styles.container} includeTopInset>
        <ScreenHeader title={t('cuidador:solicitudes.detalle_titulo')} />

        <View style={{ padding: 20 }}>
          <View style={{ alignItems: 'center', marginBottom: 30 }}>
            <Skeleton width={120} height={36} style={{ marginBottom: 10 }} />
            <Skeleton width={200} height={16} />
          </View>

          <Card style={{ marginBottom: 20, padding: 16 }}>
            <Skeleton width={100} height={16} style={{ marginBottom: 15 }} />
            <Skeleton width="100%" height={14} style={{ marginBottom: 8 }} />
            <Skeleton width="80%" height={14} />
          </Card>

          <Card style={{ marginBottom: 20, padding: 16 }}>
            <Skeleton width={100} height={16} style={{ marginBottom: 15 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Skeleton
                circle
                width={50}
                height={50}
                style={{ marginRight: 15 }}
              />
              <View>
                <Skeleton width={120} height={16} style={{ marginBottom: 8 }} />
                <Skeleton width={80} height={14} />
              </View>
            </View>
          </Card>
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
      <ScreenHeader title={t('cuidador:solicitudes.detalle_titulo')} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Sección Principal: Fecha y Precio */}
        <View style={styles.mainInfo}>
          <Text style={styles.precio}>{precioStr}</Text>
          <View style={styles.fechaContainer}>
            <View style={styles.fechaRow}>
              <Icon name="calendar-alt" size={18} color={COLOR.ENFASIS} />
              <Text style={styles.fechaText}>{fechaStr}</Text>
            </View>
            <View style={styles.fechaRow}>
              <Icon name="clock" size={18} color={COLOR.ENFASIS} />
              <Text style={styles.fechaText}>
                {horaStr} • {paseo.duracion_estimada}{' '}
                {t('cuidador:solicitudes.min')}
              </Text>
            </View>
          </View>
        </View>

        {/* Ubicación */}
        <Card style={styles.card} title={t('cuidador:solicitudes.ubicacion')}>
          <View style={styles.row}>
            <Icon name="map-marker-alt" size={20} color={COLOR.SUBTEXTO} />
            <Text style={styles.textInfo}>
              {paseo.ubicacion_inicio ||
                t('cuidador:solicitudes.direccion_no_disponible')}
            </Text>
          </View>
          {/* Placeholder Mapa */}
          <View style={styles.mapPlaceholder}>
            <Icon name="map" size={32} color={COLOR.BORDE} />
            <Text style={styles.mapText}>
              {t('cuidador:solicitudes.vista_mapa')}
            </Text>
          </View>
        </Card>

        {/* Tutor */}
        <Card
          style={styles.card}
          title={t('cuidador:solicitudes.solicitado_por')}
        >
          <View style={styles.perfilRow}>
            {perfilTutor?.foto ? (
              <Image source={{ uri: perfilTutor.foto }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {perfilTutor?.nombre
                    ? perfilTutor.nombre.charAt(0).toUpperCase()
                    : 'U'}
                </Text>
              </View>
            )}
            <View>
              <Text style={styles.nombreTutor}>
                {perfilTutor?.nombre || 'Usuario'}
              </Text>
              <Text style={styles.subtextTutor}>
                {t('cuidador:solicitudes.cliente_nuevo')}
              </Text>
            </View>
          </View>
        </Card>

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
            {mascotas.map((mascota, index) => (
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
                <Text
                  style={styles.mascotaNombre}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {mascota.nombre}
                </Text>
                <Text
                  style={styles.mascotaRaza}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {mascota.raza || t('cuidador:solicitudes.raza_desconocida')}
                </Text>
              </View>
            ))}
          </ScrollView>
        </Card>
      </ScrollView>

      {/* Footer Acciones */}
      <View style={styles.footer}>
        <Button
          title={t('cuidador:solicitudes.rechazar')}
          variant="contorno"
          style={styles.btnAction}
          textStyle={{ color: COLOR.ERROR }}
          onPress={handleRechazar}
        />
        <View style={{ width: 16 }} />
        <Button
          title={t('cuidador:solicitudes.aceptar')}
          variant="primario"
          style={styles.btnAction}
          onPress={handleAceptar}
          loading={cargandoAccion}
        />
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLOR.BASE,
  },
  content: {
    padding: 20,
    paddingBottom: 140,
  },
  mainInfo: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 10,
  },
  precio: {
    fontSize: 40,
    fontWeight: '800',
    color: COLOR.ENFASIS,
    marginBottom: 16,
    letterSpacing: -1,
  },
  fechaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLOR.BLOQUE,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: COLOR.BORDE,
  },
  fechaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  fechaText: {
    fontSize: 15,
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
    marginBottom: 12,
  },
  textInfo: {
    fontSize: 15,
    color: COLOR.TEXTO,
    marginLeft: 12,
    flex: 1,
  },
  mapPlaceholder: {
    height: 120,
    backgroundColor: COLOR.SECUNDARIO,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  mapText: {
    color: COLOR.SUBTEXTO,
    marginTop: 8,
    fontSize: 12,
  },
  perfilRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLOR.ENFASIS,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 16,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  nombreTutor: {
    fontSize: 18,
    fontWeight: '600',
    color: COLOR.TEXTO,
  },
  subtextTutor: {
    fontSize: 14,
    color: COLOR.SUBTEXTO,
  },
  mascotaItemHorizontal: {
    alignItems: 'center',
    marginRight: 20,
    width: 80,
  },
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
  mascotaRaza: {
    fontSize: 12,
    color: COLOR.SUBTEXTO,
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLOR.BASE,
    borderTopWidth: 1,
    borderTopColor: COLOR.BORDE,
    padding: 20,
    flexDirection: 'row',
    paddingBottom: 40, // Safe area + extra spacing
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 10,
  },
  btnAction: {
    flex: 1,
  },
})
