import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native'
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import { COLOR } from '@/constants'
import { ServicioPaseo } from '@/services/firebase'

interface RegistrarMomentoPaseoProps {
  visible: boolean
  paseoId: string
  ubicacionActual?:
    { latitude?: number; longitude?: number } | { lat?: number; lng?: number }
  onClose: () => void
  onGuardado?: () => void
}

type Pantalla = 'principal' | 'mascota' | 'lugar' | 'recuerdo' | 'novedad'

const RegistrarMomentoPaseo: React.FC<RegistrarMomentoPaseoProps> = ({
  visible,
  paseoId,
  ubicacionActual,
  onClose,
  onGuardado,
}) => {
  const { t } = useTranslation(['paseos', 'comun'])
  const [pantalla, setPantalla] = useState<Pantalla>('principal')
  const [guardando, setGuardando] = useState(false)
  const [nota, setNota] = useState('')

  const reset = () => {
    setPantalla('principal')
    setNota('')
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const guardarMomento = async (accion: string) => {
    setGuardando(true)
    try {
      // Normalizar ubicación a formato {lat, lng}
      let ubicacionNormalizada: { lat: number; lng: number } | undefined
      if (ubicacionActual) {
        const lat =
          'latitude' in ubicacionActual &&
          ubicacionActual.latitude !== undefined
            ? ubicacionActual.latitude
            : 'lat' in ubicacionActual
              ? (ubicacionActual as any).lat
              : undefined
        const lng =
          'longitude' in ubicacionActual &&
          ubicacionActual.longitude !== undefined
            ? ubicacionActual.longitude
            : 'lng' in ubicacionActual
              ? (ubicacionActual as any).lng
              : undefined
        if (lat !== undefined && lng !== undefined) {
          ubicacionNormalizada = { lat, lng }
        }
      }

      // Calcular hora local en el cliente (zona horaria correcta)
      const horaLocal = new Date().toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
      })

      const res = await ServicioPaseo.registrarBitacora(paseoId, accion, {
        nota: nota || null,
        ubicacion: ubicacionNormalizada,
        horaLocal,
      })

      if (res.success) {
        reset()
        onGuardado?.()
        onClose()
      }
    } catch (err) {
      console.error('[RegistrarMomentoPaseo] Error:', err)
    } finally {
      setGuardando(false)
    }
  }

  if (!visible) return null

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.overlay} onPress={handleClose}>
        <View style={styles.container}>
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* PANTALLA PRINCIPAL: 4 opciones + 2 atajos */}
            {pantalla === 'principal' && (
              <>
                {/* ATAJOS RÁPIDOS (Top 80% de registros) */}
                <View style={styles.atajosContainer}>
                  <Pressable
                    style={styles.atajo}
                    onPress={() => guardarMomento('necesidades')}
                    disabled={guardando}
                  >
                    <Text style={styles.iconoAtajo}>💩</Text>
                    <Text style={styles.textoAtajo}>
                      {t('paseos:momentos.mascota.opciones.necesidades')}
                    </Text>
                  </Pressable>

                  <Pressable
                    style={styles.atajo}
                    onPress={() => guardarMomento('juego')}
                    disabled={guardando}
                  >
                    <Text style={styles.iconoAtajo}>🦴</Text>
                    <Text style={styles.textoAtajo}>
                      {t('paseos:momentos.mascota.opciones.juego')}
                    </Text>
                  </Pressable>
                </View>

                {/* 4 OPCIONES PRINCIPALES */}
                <Pressable
                  style={styles.opcion}
                  onPress={() => setPantalla('mascota')}
                >
                  <Text style={styles.iconoOpcion}>🐶</Text>
                  <View style={styles.textoOpcion}>
                    <Text style={styles.etiquetaOpcion}>
                      {t('paseos:momentos.mascota.titulo')}
                    </Text>
                    <Text style={styles.detalleOpcion}>
                      {t('paseos:momentos.mascota.subtitulo')}
                    </Text>
                  </View>
                  <Icon name="chevron-right" size={24} color={COLOR.PRIMARIO} />
                </Pressable>

                <Pressable
                  style={styles.opcion}
                  onPress={() => setPantalla('lugar')}
                >
                  <Text style={styles.iconoOpcion}>📍</Text>
                  <View style={styles.textoOpcion}>
                    <Text style={styles.etiquetaOpcion}>
                      {t('paseos:momentos.lugar.titulo')}
                    </Text>
                    <Text style={styles.detalleOpcion}>
                      {t('paseos:momentos.lugar.subtitulo')}
                    </Text>
                  </View>
                  <Icon name="chevron-right" size={24} color={COLOR.PRIMARIO} />
                </Pressable>

                <Pressable
                  style={styles.opcion}
                  onPress={() => setPantalla('recuerdo')}
                >
                  <Text style={styles.iconoOpcion}>❤️</Text>
                  <View style={styles.textoOpcion}>
                    <Text style={styles.etiquetaOpcion}>
                      {t('paseos:momentos.recuerdo.titulo')}
                    </Text>
                    <Text style={styles.detalleOpcion}>
                      {t('paseos:momentos.recuerdo.subtitulo')}
                    </Text>
                  </View>
                  <Icon name="chevron-right" size={24} color={COLOR.PRIMARIO} />
                </Pressable>

                <Pressable
                  style={styles.opcion}
                  onPress={() => setPantalla('novedad')}
                >
                  <Text style={styles.iconoOpcion}>⚠️</Text>
                  <View style={styles.textoOpcion}>
                    <Text style={styles.etiquetaOpcion}>
                      {t('paseos:momentos.novedad.titulo')}
                    </Text>
                    <Text style={styles.detalleOpcion}>
                      {t('paseos:momentos.novedad.subtitulo')}
                    </Text>
                  </View>
                  <Icon name="chevron-right" size={24} color={COLOR.PRIMARIO} />
                </Pressable>
              </>
            )}

            {/* SUBMENU: MASCOTA */}
            {pantalla === 'mascota' && (
              <>
                <Pressable
                  style={styles.btnVolver}
                  onPress={() => setPantalla('principal')}
                >
                  <Icon name="chevron-left" size={20} color={COLOR.PRIMARIO} />
                  <Text style={styles.textVolver}>Volver</Text>
                </Pressable>

                <Text style={styles.tituloSubmenu}>
                  {t('paseos:momentos.mascota.titulo')}
                </Text>

                {Object.entries(
                  t('paseos:momentos.mascota.opciones', { returnObjects: true })
                ).map(([key, label]: [string, any]) => (
                  <Pressable
                    key={key}
                    style={styles.subopcion}
                    onPress={() => guardarMomento(key)}
                    disabled={guardando}
                  >
                    <Text style={styles.textoSubopcion}>{label}</Text>
                  </Pressable>
                ))}
              </>
            )}

            {/* SUBMENU: LUGAR */}
            {pantalla === 'lugar' && (
              <>
                <Pressable
                  style={styles.btnVolver}
                  onPress={() => setPantalla('principal')}
                >
                  <Icon name="chevron-left" size={20} color={COLOR.PRIMARIO} />
                  <Text style={styles.textVolver}>Volver</Text>
                </Pressable>

                <Text style={styles.tituloSubmenu}>
                  {t('paseos:momentos.lugar.titulo')}
                </Text>

                {Object.entries(
                  t('paseos:momentos.lugar.opciones', { returnObjects: true })
                ).map(([key, label]: [string, any]) => (
                  <Pressable
                    key={key}
                    style={styles.subopcion}
                    onPress={() => guardarMomento(`lugar:${key}`)}
                    disabled={guardando}
                  >
                    <Text style={styles.textoSubopcion}>{label}</Text>
                  </Pressable>
                ))}
              </>
            )}

            {/* SUBMENU: RECUERDO */}
            {pantalla === 'recuerdo' && (
              <>
                <Pressable
                  style={styles.btnVolver}
                  onPress={() => setPantalla('principal')}
                >
                  <Icon name="chevron-left" size={20} color={COLOR.PRIMARIO} />
                  <Text style={styles.textVolver}>Volver</Text>
                </Pressable>

                <Text style={styles.tituloSubmenu}>
                  {t('paseos:momentos.recuerdo.titulo')}
                </Text>

                {Object.entries(
                  t('paseos:momentos.recuerdo.opciones', {
                    returnObjects: true,
                  })
                ).map(([key, label]: [string, any]) => (
                  <Pressable
                    key={key}
                    style={styles.subopcion}
                    onPress={() => guardarMomento(`recuerdo:${key}`)}
                    disabled={guardando}
                  >
                    <Text style={styles.textoSubopcion}>{label}</Text>
                  </Pressable>
                ))}
              </>
            )}

            {/* SUBMENU: NOVEDAD */}
            {pantalla === 'novedad' && (
              <>
                <Pressable
                  style={styles.btnVolver}
                  onPress={() => setPantalla('principal')}
                >
                  <Icon name="chevron-left" size={20} color={COLOR.PRIMARIO} />
                  <Text style={styles.textVolver}>Volver</Text>
                </Pressable>

                <Text style={styles.tituloSubmenu}>
                  {t('paseos:momentos.novedad.titulo')}
                </Text>

                {Object.entries(
                  t('paseos:momentos.novedad.opciones', {
                    returnObjects: true,
                  })
                ).map(([key, label]: [string, any]) => (
                  <Pressable
                    key={key}
                    style={[
                      styles.subopcion,
                      key === 'emergencia' && styles.subopcionCritica,
                    ]}
                    onPress={() => guardarMomento(`novedad:${key}`)}
                    disabled={guardando}
                  >
                    <Text
                      style={[
                        styles.textoSubopcion,
                        key === 'emergencia' && styles.textoSubopcionCritico,
                      ]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                ))}
              </>
            )}
          </ScrollView>

          {/* FOOTER */}
          <View style={styles.footer}>
            <Pressable
              style={styles.btnCerrar}
              onPress={handleClose}
              disabled={guardando}
            >
              <Text style={styles.textBtnCerrar}>
                {guardando
                  ? t('paseos:momentos.acciones.guardando')
                  : t('paseos:momentos.acciones.cerrar')}
              </Text>
            </Pressable>
          </View>
        </View>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: COLOR.BASE,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    flexDirection: 'column',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 100,
  },

  /* ATAJOS RÁPIDOS */
  atajosContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 12,
  },
  atajo: {
    flex: 1,
    backgroundColor: COLOR.PRIMARIO,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  iconoAtajo: {
    fontSize: 28,
    marginBottom: 8,
  },
  textoAtajo: {
    fontSize: 12,
    fontWeight: '600',
    color: COLOR.BASE,
    textAlign: 'center',
  },

  /* OPCIONES PRINCIPALES */
  opcion: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLOR.BLOQUE,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  iconoOpcion: {
    fontSize: 32,
    marginRight: 12,
  },
  textoOpcion: {
    flex: 1,
  },
  etiquetaOpcion: {
    fontSize: 16,
    fontWeight: '600',
    color: COLOR.TEXTO,
    marginBottom: 4,
  },
  detalleOpcion: {
    fontSize: 13,
    color: COLOR.SUBTEXTO,
  },

  /* NAVEGACIÓN SUBMENU */
  btnVolver: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  textVolver: {
    fontSize: 16,
    color: COLOR.PRIMARIO,
    fontWeight: '600',
    marginLeft: 4,
  },

  /* SUBMENU */
  tituloSubmenu: {
    fontSize: 20,
    fontWeight: '700',
    color: COLOR.TEXTO,
    marginBottom: 16,
  },
  subopcion: {
    backgroundColor: COLOR.SECUNDARIO,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: `${COLOR.TEXTO}15`,
  },
  subopcionCritica: {
    backgroundColor: `${COLOR.ERROR}15`,
    borderColor: COLOR.ERROR,
  },
  textoSubopcion: {
    fontSize: 15,
    color: COLOR.TEXTO,
    fontWeight: '500',
  },
  textoSubopcionCritico: {
    color: COLOR.ERROR,
    fontWeight: '600',
  },

  /* FOOTER */
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLOR.BASE,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLOR.BLOQUE,
  },
  btnCerrar: {
    backgroundColor: COLOR.INACTIVO,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  textBtnCerrar: {
    fontSize: 16,
    fontWeight: '600',
    color: COLOR.SUBTEXTO,
  },
})

export default RegistrarMomentoPaseo
