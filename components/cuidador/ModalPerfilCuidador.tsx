import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from 'react-native'
import { BlurView } from 'expo-blur'
import { useTranslation } from 'react-i18next'
import { Avatar, Icon } from '@/components/ui'
import { COLOR, STANDARD_SERVICE_PRICE } from '@/constants'
import type { PerfilPublico } from '@/models/PerfilPublico'
import { ServicioResumenEvaluacion } from '@/services/firebase'
import type { ResumenEvaluacion } from '@/models/ResumenEvaluacion'

interface ModalPerfilCuidadorProps {
  visible: boolean
  perfil: PerfilPublico | null
  loading?: boolean
  onCerrar: () => void
}

/**
 * Modal reutilizable para mostrar el perfil completo de un cuidador
 * Incluye: foto, nombre, verificación, rating, biografía, experiencia,
 * estadísticas, tarifa y reseñas públicas de tutores (sin identidad).
 */
export function ModalPerfilCuidador({
  visible,
  perfil,
  loading = false,
  onCerrar,
}: ModalPerfilCuidadorProps) {
  const { t } = useTranslation()

  // Reseñas públicas del cuidador (solo mutuamente reveladas, sin identidad)
  const [resumen, setResumen] = useState<ResumenEvaluacion | null>(null)

  useEffect(() => {
    if (!visible || !perfil?.id) return undefined
    let activo = true
    setResumen(null)
    ServicioResumenEvaluacion.obtenerPorObjetivo(perfil.id)
      .then(res => {
        if (activo && res.success && res.data) setResumen(res.data)
      })
      .catch(() => {
        // Sin resumen: la sección de reseñas simplemente no se muestra
      })
    return () => {
      activo = false
    }
  }, [visible, perfil?.id])

  // No renderizar nada si no es visible
  if (!visible) return null

  // Mostrar contenido del perfil o loading
  // NOTA: Si perfil ya existe, mostralo sin esperar a que loading sea false
  // porque puede haber desincronización entre estados
  const showLoading = loading && !perfil

  console.log(
    '[ModalPerfilCuidador] Estado:',
    JSON.stringify({
      visible,
      loading,
      perfil: perfil ? `${perfil.nombre} (id: ${perfil.id})` : null,
      showLoading,
    })
  )

  // ✅ Paseador verificado: IDENTIDAD debe estar en insignias
  // Nota: insignias_verificacion sirve tanto para UI (badges) como lógica (validación)
  const esVerificado =
    perfil?.insignias_verificacion?.includes('IDENTIDAD') ?? false
  const rating = perfil?.rating_promedio || 0
  const paseos = perfil?.cantidad_paseos_realizados || 0

  // Calcular estrellas del rating
  const renderEstrellas = () => {
    const estrellas = []
    const ratingRedondeado = Math.round(rating * 2) / 2 // Redondear a 0.5

    for (let i = 1; i <= 5; i++) {
      if (i <= Math.floor(ratingRedondeado)) {
        // Estrella completa
        estrellas.push(<Icon key={i} name="star" size={16} color={COLOR.ORO} />)
      } else if (
        i === Math.ceil(ratingRedondeado) &&
        ratingRedondeado % 1 !== 0
      ) {
        // Media estrella
        estrellas.push(
          <Icon key={i} name="star-half" size={16} color={COLOR.ORO} />
        )
      } else {
        // Estrella vacía
        estrellas.push(
          <Icon key={i} name="star-o" size={16} color={COLOR.INACTIVO} />
        )
      }
    }
    return estrellas
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.fullscreenContainer}>
        <BlurView intensity={90} style={styles.blurBackground} />
        <View style={styles.modal}>
          {/* Botón de cerrar */}
          <TouchableOpacity
            style={styles.botonCerrar}
            onPress={onCerrar}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name="times" size={24} color={COLOR.SUBTEXTO} />
          </TouchableOpacity>

          {/* Mostrar loading o contenido */}
          {showLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLOR.PRIMARIO} />
              <Text style={styles.loadingText}>{t('comun:cargando')}</Text>
            </View>
          ) : perfil ? (
            <View style={styles.contentView}>
              {/* DEBUG */}
              <Text
                style={{
                  fontSize: 11,
                  color: COLOR.SUBTEXTO,
                  marginBottom: 12,
                }}
              >
                [DEBUG] perfil.nombre={perfil.nombre}, foto=
                {perfil.foto ? 'sí' : 'no'}
              </Text>

              {/* Header: Foto, nombre, verificación */}
              <View style={styles.header}>
                <Avatar
                  uri={perfil.foto}
                  name={perfil.nombre}
                  size={80}
                  rounded
                />
                <View style={styles.headerInfo}>
                  <View style={styles.nombreContainer}>
                    <Text style={styles.nombre}>{perfil.nombre}</Text>
                    {esVerificado && (
                      <Icon
                        name="check-circle"
                        size={18}
                        color={COLOR.EXITO}
                        style={{ marginLeft: 6 }}
                      />
                    )}
                    {perfil.insignias_verificacion?.includes('SUPERHOST') && (
                      <View style={styles.superhostBadge}>
                        <Icon name="star" size={13} color={COLOR.ORO} />
                        <Text style={styles.superhostTexto}>
                          {t('cuidador:perfil.superhost')}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Rating */}
                  {rating > 0 && (
                    <View style={styles.ratingContainer}>
                      <View style={styles.estrellas}>{renderEstrellas()}</View>
                      <Text style={styles.ratingTexto}>
                        {rating.toFixed(1)} ({paseos}{' '}
                        {paseos === 1
                          ? t('cuidador:perfil.paseo')
                          : t('cuidador:perfil.paseos')}
                        )
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Biografía */}
              {perfil.biografia && (
                <View style={styles.seccion}>
                  <Text style={styles.seccionTitulo}>
                    {t('cuidador:perfil.biografia')}
                  </Text>
                  <Text style={styles.seccionTexto}>{perfil.biografia}</Text>
                </View>
              )}

              {/* Experiencia */}
              {perfil.experiencia && (
                <View style={styles.seccion}>
                  <Text style={styles.seccionTitulo}>
                    {t('cuidador:perfil.experiencia')}
                  </Text>
                  <Text style={styles.seccionTexto}>{perfil.experiencia}</Text>
                </View>
              )}

              {/* Estadísticas */}
              <View style={styles.estadisticas}>
                {/* Mascotas aceptadas */}
                {perfil.mascotas_aceptadas &&
                  perfil.mascotas_aceptadas.length > 0 && (
                    <View style={styles.estadItem}>
                      <Icon name="paw" size={20} color={COLOR.PRIMARIO} />
                      <Text style={styles.estadLabel}>
                        {t('cuidador:perfil.acepta')}
                      </Text>
                      <Text style={styles.estadValor}>
                        {perfil.mascotas_aceptadas.join(', ')}
                      </Text>
                    </View>
                  )}

                {/* Máximo de mascotas */}
                {perfil.max_mascotas && (
                  <View style={styles.estadItem}>
                    <Icon name="users" size={20} color={COLOR.PRIMARIO} />
                    <Text style={styles.estadLabel}>
                      {t('cuidador:perfil.max_mascotas')}
                    </Text>
                    <Text style={styles.estadValor}>
                      {perfil.max_mascotas}{' '}
                      {perfil.max_mascotas === 1
                        ? t('cuidador:perfil.mascota')
                        : t('cuidador:perfil.mascotas')}
                    </Text>
                  </View>
                )}
              </View>

              {/* Tarifa (temporalmente estándar global para MVP) */}
              <View style={styles.tarifaContainer}>
                <Icon
                  name="dollar-sign"
                  size={20}
                  color={COLOR.EXITO}
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.tarifaTexto}>
                  ${STANDARD_SERVICE_PRICE.toLocaleString('es-CO')}
                </Text>
                <Text style={styles.tarifaLabel}>
                  {' '}
                  / {t('cuidador:perfil.hora')}
                </Text>
              </View>
              <Text
                style={{ marginTop: 8, color: COLOR.SUBTEXTO, fontSize: 13 }}
              >
                {t('perfil:editar.tarifa_estandar_mvp')}
              </Text>

              {/* Reseñas públicas de tutores (solo mutuamente reveladas, sin identidad) */}
              {resumen && (resumen.reseñas_publicas?.length ?? 0) > 0 && (
                <View style={styles.seccion}>
                  <Text style={styles.seccionTitulo}>
                    {t('cuidador:perfil.reseñas')}
                  </Text>

                  {/* Distribución de ratings (honestidad del promedio) */}
                  {resumen.distribucion_ratings && (
                    <Text style={styles.distribucion}>
                      {[5, 4, 3, 2, 1]
                        .map(
                          v =>
                            `${v}★ ×${
                              resumen.distribucion_ratings?.[String(v)] ?? 0
                            }`
                        )
                        .join('   ·   ')}
                    </Text>
                  )}

                  {resumen.reseñas_publicas!.map((r, i) => (
                    <View key={i} style={styles.reseñaCard}>
                      <Text style={styles.reseñaRating}>
                        {'★'.repeat(
                          Math.max(1, Math.min(5, Math.round(r.rating)))
                        )}
                      </Text>
                      {r.comentario ? (
                        <Text style={styles.reseñaTexto}>{r.comentario}</Text>
                      ) : null}
                      <Text style={styles.reseñaFirma}>
                        {t('cuidador:perfil.firma_tutor_verificado')}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  fullscreenContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  blurBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  modal: {
    flex: 1,
    backgroundColor: COLOR.BLOQUE,
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  botonCerrar: {
    position: 'absolute',
    top: 24,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${COLOR.BLOQUE}E8`,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLOR.SOMBRA,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  contentView: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 16,
  },
  nombreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  superhostBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${COLOR.ORO}1A`,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  superhostTexto: {
    fontSize: 11,
    fontWeight: '700',
    color: COLOR.ORO,
  },
  nombre: {
    fontSize: 22,
    fontWeight: '700',
    color: COLOR.TEXTO,
  },
  ratingContainer: {
    flexDirection: 'column',
    gap: 4,
  },
  estrellas: {
    flexDirection: 'row',
    gap: 2,
  },
  ratingTexto: {
    fontSize: 13,
    color: COLOR.SUBTEXTO,
    marginTop: 2,
  },
  seccion: {
    marginBottom: 20,
  },
  seccionTitulo: {
    fontSize: 15,
    fontWeight: '600',
    color: COLOR.TEXTO,
    marginBottom: 8,
  },
  seccionTexto: {
    fontSize: 14,
    lineHeight: 20,
    color: COLOR.SUBTEXTO,
  },
  distribucion: {
    fontSize: 12,
    color: COLOR.SUBTEXTO,
    fontWeight: '600',
    marginBottom: 12,
  },
  reseñaCard: {
    backgroundColor: COLOR.SECUNDARIO,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  reseñaRating: {
    fontSize: 14,
    color: COLOR.ORO,
    fontWeight: '700',
    marginBottom: 4,
  },
  reseñaTexto: {
    fontSize: 13,
    lineHeight: 18,
    color: COLOR.TEXTO,
    marginBottom: 6,
  },
  reseñaFirma: {
    fontSize: 11,
    color: COLOR.SUBTEXTO,
    fontStyle: 'italic',
  },
  estadisticas: {
    marginBottom: 20,
    gap: 12,
  },
  estadItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLOR.SECUNDARIO,
    padding: 12,
    borderRadius: 12,
    gap: 10,
  },
  estadLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLOR.TEXTO,
    flex: 1,
  },
  estadValor: {
    fontSize: 14,
    color: COLOR.SUBTEXTO,
  },
  tarifaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLOR.PRIMARIO + '15',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  tarifaTexto: {
    fontSize: 24,
    fontWeight: '700',
    color: COLOR.EXITO,
  },
  tarifaLabel: {
    fontSize: 16,
    color: COLOR.SUBTEXTO,
    fontWeight: '500',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    color: COLOR.SUBTEXTO,
    fontWeight: '500',
  },
})
