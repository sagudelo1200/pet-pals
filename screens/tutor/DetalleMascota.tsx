import React, { useState, useRef, useEffect } from 'react'
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Image,
  Pressable,
  Alert,
  Animated,
  Dimensions,
  ActivityIndicator,
  PanResponder,
  useWindowDimensions,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native'
import { COLOR } from '@/constants'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Icon from '@/components/ui/Icon'
import Badge from '@/components/ui/Badge'
import type { Mascota } from '@/models/Mascota'
import { AuthStackParamList } from '@/navigation/types'
import { ServicioMascota } from '@/services/firebase'

import PerroSvg from '@/assets/imgs/undraw/perro.svg'

type DetalleMascotaRouteProp = RouteProp<AuthStackParamList, 'DetalleMascota'>

// Valor inicial seguro, pero usaremos useWindowDimensions dentro del componente
const { height: INITIAL_HEIGHT } = Dimensions.get('window')

const DetalleMascota: React.FC = () => {
  const { height: screenHeight } = useWindowDimensions()
  const { t } = useTranslation()
  const navigation = useNavigation()
  const route = useRoute<DetalleMascotaRouteProp>()
  const { mascotaId, mascota: mascotaParam } = route.params

  const [mascota, setMascota] = useState<Mascota | null>(mascotaParam || null)
  const [loading, setLoading] = useState(!mascotaParam)
  const [error, setError] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)

  // Ref para acceder al estado actualizado dentro del PanResponder
  const isExpandedRef = useRef(false)

  useEffect(() => {
    isExpandedRef.current = isExpanded
  }, [isExpanded])

  // Constante para el estado parcial (altura oculta inicialmente)
  // Calculado para dejar visible aprox 465px (Imagen + Info + Botones)
  // Sheet height es 85% de pantalla. Offset = SheetHeight - VisibleHeight
  const PARTIAL_OFFSET = Math.max(0, screenHeight * 0.85 - 465)

  // Animaciones
  const slideAnim = useRef(new Animated.Value(INITIAL_HEIGHT)).current
  const opacityAnim = useRef(new Animated.Value(0)).current
  const scrollViewRef = useRef<ScrollView>(null)

  // Funciones de animación
  const animateTo = (toValue: number, callback?: () => void) => {
    Animated.spring(slideAnim, {
      toValue,
      useNativeDriver: true,
      tension: 45,
      friction: 8,
    }).start(callback)
  }

  const toExpanded = () => {
    setIsExpanded(true)
    animateTo(0)
  }

  const toPartial = () => {
    setIsExpanded(false)
    animateTo(PARTIAL_OFFSET)
    scrollViewRef.current?.scrollTo({ y: 0, animated: true })
  }

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: screenHeight,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      navigation.goBack()
    })
  }

  // PanResponder para gestos
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Aumentar umbral para evitar disparos accidentales al tocar
        return Math.abs(gestureState.dy) > 10
      },
      onPanResponderMove: (_, gestureState) => {
        const expanded = isExpandedRef.current
        const startValue = expanded ? 0 : PARTIAL_OFFSET
        const newValue = startValue + gestureState.dy

        // Permitir arrastrar hacia arriba con resistencia si ya está expandido
        if (newValue < 0) {
          slideAnim.setValue(newValue / 3)
        } else {
          slideAnim.setValue(newValue)
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const expanded = isExpandedRef.current

        if (expanded) {
          // Si está expandido
          if (
            gestureState.dy > 300 ||
            (gestureState.dy > 200 && gestureState.vy > 1.5)
          ) {
            // Cerrar directamente si se baja mucho o muy rápido
            handleClose()
          } else if (gestureState.dy > 100 || gestureState.vy > 0.5) {
            // Bajar a parcial si el gesto es moderado hacia abajo
            toPartial()
          } else {
            // Volver a expandido si el movimiento fue pequeño o hacia arriba
            toExpanded()
          }
        } else {
          // Si está en parcial
          if (gestureState.dy < -50 || gestureState.vy < -0.5) {
            // Subir a expandido
            toExpanded()
          } else if (gestureState.dy > 100 || gestureState.vy > 0.5) {
            // Cerrar si baja mucho
            handleClose()
          } else {
            // Volver a parcial
            toPartial()
          }
        }
      },
    })
  ).current

  useEffect(() => {
    const cargarMascota = async () => {
      if (mascotaParam) {
        setLoading(false)
        return
      }

      if (!mascotaId) {
        setError('ID de mascota no proporcionado')
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        const resultado = await ServicioMascota.obtenerPorId(mascotaId)
        if (resultado.success && resultado.data) {
          setMascota(resultado.data)
        } else {
          setError(t('mascotas:errores.error_cargar'))
        }
      } catch (e) {
        setError(t('mascotas:errores.error_cargar'))
      } finally {
        setLoading(false)
      }
    }

    cargarMascota()

    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: PARTIAL_OFFSET,
        useNativeDriver: true,
        tension: 45,
        friction: 8,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start()
  }, [mascotaId, mascotaParam, t])

  // Efecto para ajustar posición si cambian dimensiones (y corregir el glitch de background)
  useEffect(() => {
    if (!isExpanded && !loading) {
      // Forzar actualización de posición si cambia la altura de pantalla
      Animated.spring(slideAnim, {
        toValue: PARTIAL_OFFSET,
        useNativeDriver: true,
        tension: 45,
        friction: 8,
      }).start()
    }
  }, [screenHeight, isExpanded, loading, PARTIAL_OFFSET])

  // handleClose movido arriba para usarlo en PanResponder

  const handleEdit = () => {
    Alert.alert('Editar', 'Navegar a pantalla de edición')
  }

  const handlePaseo = () => {
    if (mascota) {
      Alert.alert('Paseo', 'Iniciar solicitud de paseo para ' + mascota.nombre)
    }
  }

  const calcularEdad = (fecha?: Date) => {
    if (!fecha) return ''
    // Convertir Timestamp de Firebase a Date si es necesario
    const nacimiento =
      fecha instanceof Date
        ? fecha
        : (fecha as any).toDate
          ? (fecha as any).toDate()
          : new Date(fecha)

    const hoy = new Date()
    let edad = hoy.getFullYear() - nacimiento.getFullYear()
    const m = hoy.getMonth() - nacimiento.getMonth()
    if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--
    }
    return `${edad} ${t('mascotas:campos.edad').toLowerCase()}`
  }

  return (
    <View style={styles.container}>
      {/* Backdrop con cierre al tocar */}
      <Animated.View style={[styles.backdrop, { opacity: opacityAnim }]}>
        <Pressable style={styles.backdropPress} onPress={handleClose} />
      </Animated.View>

      {/* Bottom Sheet */}
      <Animated.View
        style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}
      >
        <View {...panResponder.panHandlers} style={styles.handleArea}>
          <View style={styles.handle} />
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLOR.PRIMARIO} />
          </View>
        ) : error || !mascota ? (
          <View style={styles.errorContainer}>
            <Icon name="alert-circle" size={48} color={COLOR.ERROR} />
            <Text style={styles.errorText}>
              {error || 'Mascota no encontrada'}
            </Text>
            <Button
              title={t('comun:cerrar')}
              onPress={handleClose}
              variant="secundario"
            />
          </View>
        ) : (
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            scrollEnabled={isExpanded}
          >
            {/* Imagen Hero */}
            <View style={styles.heroContainer} {...panResponder.panHandlers}>
              {mascota.foto ? (
                <Image
                  source={{ uri: mascota.foto }}
                  style={styles.heroImage}
                />
              ) : (
                /* Poner un breve margen superior */
                <View style={styles.placeholderHero}>
                  <PerroSvg width="100%" height="100%" />
                </View>
              )}
              <View style={styles.heroOverlay} />
            </View>

            <View style={styles.contentContainer}>
              {/* Tarjeta Principal */}
              <Card style={styles.mainCard} elevated>
                <View style={styles.mainInfo}>
                  <View>
                    <Text style={styles.name}>{mascota.nombre}</Text>
                    <Text style={styles.breed}>
                      {mascota.raza || t('mascotas:tipos.' + mascota.especie)}
                    </Text>
                  </View>
                  <Badge
                    label={t('mascotas:generos.' + mascota.genero)}
                    variant={mascota.genero === 'macho' ? 'info' : 'exito'}
                    size="sm"
                  />
                </View>

                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>
                      {t('mascotas:campos.edad')}
                    </Text>
                    <Text style={styles.statValue}>
                      {calcularEdad(mascota.fecha_nacimiento)}
                    </Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>
                      {t('mascotas:campos.peso')}
                    </Text>
                    <Text style={styles.statValue}>{mascota.peso} kg</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>
                      {t('mascotas:campos.tamano')}
                    </Text>
                    <Text style={styles.statValue}>
                      {t(
                        'mascotas:tamanos.' + mascota.tamano?.replace(' ', '_')
                      )}
                    </Text>
                  </View>
                </View>
              </Card>

              {/* Acciones */}
              <View style={styles.actionsRow}>
                <Button
                  title={t('mascotas:detalle.editar')}
                  onPress={handleEdit}
                  variant="secundario"
                  style={styles.actionButton}
                />
                <Button
                  title={t('paseos:lista.programar_btn')}
                  onPress={handlePaseo}
                  variant="primario"
                  style={styles.actionButton}
                />
              </View>

              {/* Información Detallada (Expandible al scrollear) */}
              <View style={styles.detailsSection}>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>
                    {t('mascotas:detalle.sobre_mi')}
                  </Text>
                  <Text style={styles.description}>
                    {mascota.descripcion ||
                      t('mascotas:detalle.sin_descripcion')}
                  </Text>
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>
                    {t('mascotas:detalle.salud')}
                  </Text>
                  <View style={styles.tagsContainer}>
                    {mascota.esterilizado && (
                      <Badge
                        label={t('mascotas:campos.esterilizado')}
                        variant="exito"
                        style={styles.tag}
                      />
                    )}
                    {mascota.vacunas?.map((v, i) => (
                      <Badge
                        key={i}
                        label={`${t('mascotas:detalle.vacuna')}${v.nombre}`}
                        variant="info"
                        style={styles.tag}
                      />
                    ))}
                    {mascota.condiciones_salud?.map((c, i) => (
                      <Badge
                        key={i}
                        label={c}
                        variant="alerta"
                        style={styles.tag}
                      />
                    ))}
                  </View>
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>
                    {t('mascotas:detalle.comportamiento')}
                  </Text>
                  <View style={styles.infoRow}>
                    <Icon name="bolt" size={16} color={COLOR.ENFASIS} />
                    <Text style={styles.infoLabel}>
                      {t('mascotas:campos.nivel_energia')}:
                    </Text>
                    <Text style={styles.infoValue}>
                      {t('mascotas:energia.' + mascota.nivel_energia)}
                    </Text>
                  </View>
                  <View style={styles.tagsContainer}>
                    {mascota.condiciones_comportamiento?.map((c, i) => (
                      <Badge
                        key={i}
                        label={c}
                        variant="neutral"
                        style={styles.tag}
                      />
                    ))}
                  </View>
                </View>

                {/* Espacio extra para scroll */}
                <View style={{ height: 40 }} />
              </View>
            </View>
          </ScrollView>
        )}
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end'
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdropPress: {
    flex: 1,
  },
  sheet: {
    backgroundColor: COLOR.BASE,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%', // Ocupa casi toda la pantalla pero deja ver el fondo arriba
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
    overflow: 'hidden', // Para que la imagen respete el borde redondeado superior
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: COLOR.BORDE,
  },
  handleArea: {
    width: '100%',
    height: 40,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 12,
    position: 'absolute',
    zIndex: 20,
    top: 0,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.5)', // Handle sobre la imagen
    borderRadius: 2,
  },
  loadingContainer: {
    height: 400, // Altura mínima para evitar colapso visual
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    padding: 40,
    alignItems: 'center',
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    color: COLOR.TEXTO,
    textAlign: 'center',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  heroContainer: {
    height: 250,
    width: '100%',
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderHero: {
    width: '100%',
    height: 250,
    backgroundColor: COLOR.BLOQUE,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 21,
    paddingBottom: 21,
  },
  heroOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: 'transparent', // Gradiente simulado si fuera necesario
  },
  contentContainer: {
    paddingHorizontal: 20,
    marginTop: -40, // Superponer tarjeta a la imagen
  },
  mainCard: {
    marginBottom: 24,
  },
  mainInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: COLOR.TEXTO,
    marginBottom: 4,
  },
  breed: {
    fontSize: 16,
    color: COLOR.SUBTEXTO,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLOR.SECUNDARIO,
    borderRadius: 8,
    padding: 12,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: COLOR.BORDE,
  },
  statLabel: {
    fontSize: 12,
    color: COLOR.SUBTEXTO,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLOR.TEXTO,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
  },
  detailsSection: {
    // Contenido extra
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLOR.TEXTO,
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    color: COLOR.SUBTEXTO,
    lineHeight: 22,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  tag: {
    marginVertical: 0,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 15,
    color: COLOR.SUBTEXTO,
    marginLeft: 8,
    marginRight: 8,
  },
  infoValue: {
    fontSize: 15,
    color: COLOR.TEXTO,
    fontWeight: '600',
  },
})

export default DetalleMascota
