import React, { useEffect, useState } from 'react'
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  Pressable,
} from 'react-native'
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

export const DetalleSolicitud = () => {
  const { t } = useTranslation()
  const route = useRoute()
  const navigation = useNavigation()
  const { paseoId } = route.params as { paseoId: string }

  const [paseo, setPaseo] = useState<Paseo | null>(null)
  const [perfilTutor, setPerfilTutor] = useState<PerfilPublico | null>(null)
  const [mascotas, setMascotas] = useState<Mascota[]>([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    cargarDatos()
  }, [paseoId])

  const cargarDatos = async () => {
    setCargando(true)
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
          // Si no existe perfil público (migración), podríamos intentar buscar por campo creado_por
          // o simplemente dejarlo nulo para mostrar placeholder.
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
      setCargando(false)
    }
  }

  const handleAceptar = () => {
    // TODO: Implementar lógica de aceptación (Fase 3)
    Alert.alert('Info', t('cuidador:solicitudes.fase3_aceptar'))
  }

  const handleRechazar = () => {
    // TODO: Implementar lógica de rechazo (Fase 3)
    Alert.alert('Info', t('cuidador:solicitudes.fase3_rechazar'))
  }

  if (cargando) {
    return (
      <Screen style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLOR.ENFASIS} />
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
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-left" size={24} color={COLOR.TEXTO} />
        </Pressable>
        <Text style={styles.headerTitle}>
          {t('cuidador:solicitudes.detalle_titulo')}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Sección Principal: Fecha y Precio */}
        <View style={styles.mainInfo}>
          <Text style={styles.precio}>{precioStr}</Text>
          <View style={styles.fechaRow}>
            <Icon name="calendar-alt" size={16} color={COLOR.ENFASIS} />
            <Text style={styles.fechaText}>{fechaStr}</Text>
          </View>
          <View style={styles.fechaRow}>
            <Icon name="clock" size={16} color={COLOR.ENFASIS} />
            <Text style={styles.fechaText}>
              {horaStr} ({paseo.duracion_estimada}{' '}
              {t('cuidador:solicitudes.min')})
            </Text>
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
          {mascotas.map((mascota, index) => (
            <View
              key={mascota.id}
              style={[
                styles.mascotaRow,
                index < mascotas.length - 1 && styles.borderBottom,
              ]}
            >
              {mascota.foto ? (
                <Image
                  source={{ uri: mascota.foto }}
                  style={styles.mascotaAvatar}
                />
              ) : (
                <View style={[styles.mascotaAvatar, styles.mascotaPlaceholder]}>
                  <Icon name="paw" size={20} color={COLOR.SUBTEXTO} />
                </View>
              )}
              <View>
                <Text style={styles.mascotaNombre}>{mascota.nombre}</Text>
                <Text style={styles.mascotaRaza}>
                  {mascota.raza || t('cuidador:solicitudes.raza_desconocida')}
                </Text>
              </View>
            </View>
          ))}
        </Card>
      </ScrollView>

      {/* Footer Acciones */}
      <View style={styles.footer}>
        <Button
          title={t('cuidador:solicitudes.rechazar')}
          variant="outline"
          style={styles.btnAction}
          textStyle={{ color: COLOR.ERROR }}
          onPress={handleRechazar}
        />
        <View style={{ width: 16 }} />
        <Button
          title={t('cuidador:solicitudes.aceptar')}
          variant="primary"
          style={styles.btnAction}
          onPress={handleAceptar}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLOR.TEXTO,
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  mainInfo: {
    alignItems: 'center',
    marginBottom: 24,
  },
  precio: {
    fontSize: 32,
    fontWeight: '800',
    color: COLOR.ENFASIS,
    marginBottom: 8,
  },
  fechaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  fechaText: {
    fontSize: 16,
    color: COLOR.SUBTEXTO,
    marginLeft: 8,
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
  mascotaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: COLOR.BORDE,
  },
  mascotaAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  mascotaPlaceholder: {
    backgroundColor: COLOR.SECUNDARIO,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mascotaNombre: {
    fontSize: 16,
    fontWeight: '600',
    color: COLOR.TEXTO,
  },
  mascotaRaza: {
    fontSize: 14,
    color: COLOR.SUBTEXTO,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLOR.BLOQUE,
    borderTopWidth: 1,
    borderTopColor: COLOR.BORDE,
    padding: 20,
    flexDirection: 'row',
    paddingBottom: 30, // Safe area
  },
  btnAction: {
    flex: 1,
  },
})
