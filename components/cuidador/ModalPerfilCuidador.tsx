import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native'
import { BlurView } from 'expo-blur'
import { useTranslation } from 'react-i18next'
import { Avatar, Icon } from '@/components/ui'
import { COLOR } from '@/constants'
import type { PerfilPublico } from '@/models/PerfilPublico'

interface ModalPerfilCuidadorProps {
  visible: boolean
  perfil: PerfilPublico | null
  onCerrar: () => void
}

/**
 * Modal reutilizable para mostrar el perfil completo de un cuidador
 * Incluye: foto, nombre, verificación, rating, biografía, experiencia, estadísticas y tarifa
 */
export function ModalPerfilCuidador({
  visible,
  perfil,
  onCerrar,
}: ModalPerfilCuidadorProps) {
  const { t } = useTranslation()

  if (!visible || !perfil) return null

  const esVerificado = perfil.verificacion === 'verificado'
  const rating = perfil.rating_promedio || 0
  const paseos = perfil.cantidad_paseos_realizados || 0

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
    <Modal visible={visible} transparent animationType="fade">
      <BlurView intensity={90} style={styles.blurContainer}>
        <View style={styles.container}>
          <View style={styles.modal}>
            {/* Botón de cerrar */}
            <TouchableOpacity
              style={styles.botonCerrar}
              onPress={onCerrar}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon name="times" size={24} color={COLOR.SUBTEXTO} />
            </TouchableOpacity>

            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
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

              {/* Tarifa */}
              {perfil.tarifa_por_hora && (
                <View style={styles.tarifaContainer}>
                  <Icon
                    name="dollar"
                    size={20}
                    color={COLOR.EXITO}
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.tarifaTexto}>
                    ${perfil.tarifa_por_hora.toLocaleString('es-CO')}
                  </Text>
                  <Text style={styles.tarifaLabel}>
                    {' '}
                    / {t('cuidador:perfil.hora')}
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </BlurView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  blurContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modal: {
    backgroundColor: COLOR.BLOQUE,
    borderRadius: 20,
    width: '100%',
    maxWidth: 500,
    maxHeight: '85%',
    shadowColor: COLOR.SOMBRA,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    position: 'relative',
  },
  botonCerrar: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLOR.BLOQUE,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLOR.SOMBRA,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 20,
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
    marginBottom: 8,
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
})
