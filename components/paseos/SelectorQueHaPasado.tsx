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
import { COLOR } from '@/constants'
import { ServicioPaseo } from '@/services/firebase'
import { useTranslation } from 'react-i18next'

interface SelectorQueHaPasadoProps {
  visible: boolean
  paseoId: string
  ubicacionActual?: { lat: number; lng: number }
  onClose: () => void
  onGuardado?: () => void
}

type PantallaActual = 'principal' | 'mascota' | 'lugar' | 'momento' | 'novedad'

const SelectorQueHaPasado: React.FC<SelectorQueHaPasadoProps> = ({
  visible,
  paseoId,
  ubicacionActual,
  onClose,
  onGuardado,
}) => {
  const { t } = useTranslation()
  const [pantalla, setPantalla] = useState<PantallaActual>('principal')
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

  const guardarBitacora = async (accion: string) => {
    setGuardando(true)
    try {
      // Calcular hora local en el cliente (zona horaria correcta)
      const horaLocal = new Date().toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
      })

      const res = await ServicioPaseo.registrarBitacora(paseoId, accion, {
        nota: nota || null,
        ubicacion: ubicacionActual
          ? {
              lat: ubicacionActual.lat,
              lng: ubicacionActual.lng,
            }
          : undefined,
        horaLocal,
      })

      if (res.success) {
        reset()
        onGuardado?.()
        onClose()
      }
    } catch (err) {
      console.error('[SelectorQueHaPasado] Error:', err)
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
            {/* PANTALLA PRINCIPAL */}
            {pantalla === 'principal' && (
              <>
                <Text style={styles.titulo}>{t('paseos:bitacora.selector.titulo')}</Text>

                <Pressable
                  style={styles.opcion}
                  onPress={() => setPantalla('mascota')}
                >
                  <Text style={styles.iconoOpcion}>🐶</Text>
                  <View style={styles.textoOpcion}>
                    <Text style={styles.etiquetaOpcion}>
                      {t('paseos:bitacora.selector.mascota_titulo')}
                    </Text>
                    <Text style={styles.detalleOpcion}>
                      {t('paseos:bitacora.selector.mascota_detalle')}
                    </Text>
                  </View>
                </Pressable>

                <Pressable
                  style={styles.opcion}
                  onPress={() => setPantalla('lugar')}
                >
                  <Text style={styles.iconoOpcion}>📍</Text>
                  <View style={styles.textoOpcion}>
                    <Text style={styles.etiquetaOpcion}>
                      {t('paseos:bitacora.selector.lugar_titulo')}
                    </Text>
                    <Text style={styles.detalleOpcion}>
                      {t('paseos:bitacora.selector.lugar_detalle')}
                    </Text>
                  </View>
                </Pressable>

                <Pressable
                  style={styles.opcion}
                  onPress={() => setPantalla('momento')}
                >
                  <Text style={styles.iconoOpcion}>❤️</Text>
                  <View style={styles.textoOpcion}>
                    <Text style={styles.etiquetaOpcion}>
                      {t('paseos:bitacora.selector.momento_titulo')}
                    </Text>
                    <Text style={styles.detalleOpcion}>
                      {t('paseos:bitacora.selector.momento_detalle')}
                    </Text>
                  </View>
                </Pressable>

                <Pressable
                  style={styles.opcion}
                  onPress={() => setPantalla('novedad')}
                >
                  <Text style={styles.iconoOpcion}>⚠️</Text>
                  <View style={styles.textoOpcion}>
                    <Text style={styles.etiquetaOpcion}>
                      {t('paseos:bitacora.selector.novedad_titulo')}
                    </Text>
                    <Text style={styles.detalleOpcion}>{t('paseos:bitacora.selector.novedad_detalle')}</Text>
                  </View>
                </Pressable>
              </>
            )}

            {/* PANTALLA MASCOTA */}
            {pantalla === 'mascota' && (
              <>
                <Pressable
                  style={styles.btnVolver}
                  onPress={() => setPantalla('principal')}
                >
                  <Icon name="chevron-left" size={20} color={COLOR.PRIMARIO} />
                  <Text style={styles.textVolver}>{t('paseos:bitacora.selector.volver')}</Text>
                </Pressable>

                <Text style={styles.titulo}>{t('paseos:bitacora.selector.que_hizo')}</Text>

                {[
                  {
                    icon: '💩',
                    value: 'necesidades',
                  },
                  { icon: '🏃', value: 'corrio' },
                  { icon: '🦴', value: 'juego' },
                  { icon: '💧', value: 'agua' },
                  { icon: '😴', value: 'descanso' },
                  {
                    icon: '🐕',
                    value: 'socializacion_perros',
                  },
                  {
                    icon: '👶',
                    value: 'socializacion_personas',
                  },
                  { icon: '😨', value: 'miedo' },
                  { icon: '🍖', value: 'comio' },
                ].map(item => (
                  <Pressable
                    key={item.value}
                    style={styles.subopcion}
                    onPress={() => guardarBitacora(item.value)}
                    disabled={guardando}
                  >
                    <Text style={styles.iconoSubopcion}>{item.icon}</Text>
                    <Text style={styles.textoSubopcion}>
                      {t(`paseos:bitacora.mascota.${item.value}`)}
                    </Text>
                  </Pressable>
                ))}
              </>
            )}

            {/* PANTALLA LUGAR */}
            {pantalla === 'lugar' && (
              <>
                <Pressable
                  style={styles.btnVolver}
                  onPress={() => setPantalla('principal')}
                >
                  <Icon name="chevron-left" size={20} color={COLOR.PRIMARIO} />
                  <Text style={styles.textVolver}>{t('paseos:bitacora.selector.volver')}</Text>
                </Pressable>

                <Text style={styles.titulo}>{t('paseos:bitacora.selector.donde')}</Text>

                {[
                  { icon: '🌳', value: 'parque' },
                  { icon: '🌲', value: 'sendero' },
                  { icon: '🌊', value: 'rio' },
                  { icon: '🏡', value: 'casa' },
                  { icon: '☕', value: 'pet_friendly' },
                  { icon: '🐕', value: 'zona_perros' },
                  { icon: '🏞', value: 'mirador' },
                  { icon: '🚗', value: 'vehiculo' },
                  {
                    icon: '🚶',
                    value: 'inicio_caminata',
                  },
                ].map(item => (
                  <Pressable
                    key={item.value}
                    style={styles.subopcion}
                    onPress={() => guardarBitacora(`lugar:${item.value}`)}
                    disabled={guardando}
                  >
                    <Text style={styles.iconoSubopcion}>{item.icon}</Text>
                    <Text style={styles.textoSubopcion}>
                      {t(`paseos:bitacora.lugar.${item.value}`)}
                    </Text>
                  </Pressable>
                ))}
              </>
            )}

            {/* PANTALLA MOMENTO */}
            {pantalla === 'momento' && (
              <>
                <Pressable
                  style={styles.btnVolver}
                  onPress={() => setPantalla('principal')}
                >
                  <Icon name="chevron-left" size={20} color={COLOR.PRIMARIO} />
                  <Text style={styles.textVolver}>{t('paseos:bitacora.selector.volver')}</Text>
                </Pressable>

                <Text style={styles.titulo}>{t('paseos:bitacora.selector.recuerdo')}</Text>

                {[
                  { icon: '📸', value: 'foto' },
                  { icon: '🎥', value: 'video' },
                  { icon: '🎤', value: 'voz' },
                  { icon: '✍️', value: 'nota' },
                ].map(item => (
                  <Pressable
                    key={item.value}
                    style={styles.subopcion}
                    onPress={() => guardarBitacora(`recuerdo:${item.value}`)}
                    disabled={guardando}
                  >
                    <Text style={styles.iconoSubopcion}>{item.icon}</Text>
                    <Text style={styles.textoSubopcion}>
                      {t(`paseos:bitacora.recuerdo.${item.value}`)}
                    </Text>
                  </Pressable>
                ))}
              </>
            )}

            {/* PANTALLA NOVEDAD */}
            {pantalla === 'novedad' && (
              <>
                <Pressable
                  style={styles.btnVolver}
                  onPress={() => setPantalla('principal')}
                >
                  <Icon name="chevron-left" size={20} color={COLOR.PRIMARIO} />
                  <Text style={styles.textVolver}>{t('paseos:bitacora.selector.volver')}</Text>
                </Pressable>

                <Text style={styles.titulo}>{t('paseos:bitacora.selector.que_ocurrio')}</Text>

                {[
                  {
                    icon: '😨',
                    value: 'asustó',
                    severidad: 'baja',
                  },
                  {
                    icon: '🤕',
                    value: 'lesion',
                    severidad: 'media',
                  },
                  {
                    icon: '🐕',
                    value: 'pelea',
                    severidad: 'media',
                  },
                  {
                    icon: '🤢',
                    value: 'malestar',
                    severidad: 'media',
                  },
                  {
                    icon: '🚗',
                    value: 'trafico',
                    severidad: 'baja',
                  },
                  {
                    icon: '🌧',
                    value: 'lluvia',
                    severidad: 'baja',
                  },
                  {
                    icon: '🚫',
                    value: 'acceso_cerrado',
                    severidad: 'baja',
                  },
                  {
                    icon: '📞',
                    value: 'contacto',
                    severidad: 'alta',
                  },
                  {
                    icon: '🚨',
                    value: 'emergencia',
                    severidad: 'critica',
                  },
                ].map(item => (
                  <Pressable
                    key={item.value}
                    style={[
                      styles.subopcion,
                      item.severidad === 'critica' && styles.subopcionCritica,
                    ]}
                    onPress={() => guardarBitacora(`novedad:${item.value}`)}
                    disabled={guardando}
                  >
                    <Text style={styles.iconoSubopcion}>{item.icon}</Text>
                    <Text style={styles.textoSubopcion}>
                      {t(`paseos:bitacora.novedad.${item.value}`)}
                    </Text>
                  </Pressable>
                ))}
              </>
            )}
          </ScrollView>

          {/* FOOTER CON BOTÓN CERRAR */}
          <View style={styles.footer}>
            <Pressable
              style={styles.btnCerrar}
              onPress={handleClose}
              disabled={guardando}
            >
              <Text style={styles.textBtnCerrar}>{t('paseos:bitacora.selector.cerrar')}</Text>
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
  titulo: {
    fontSize: 24,
    fontWeight: '800',
    color: COLOR.TEXTO,
    marginBottom: 24,
    textAlign: 'center',
  },
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
  subopcion: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLOR.HUESO,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  subopcionCritica: {
    backgroundColor: 'rgba(201, 107, 103, 0.15)',
  },
  iconoSubopcion: {
    fontSize: 24,
    marginRight: 12,
  },
  textoSubopcion: {
    fontSize: 15,
    color: COLOR.TEXTO,
    fontWeight: '500',
  },
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

export default SelectorQueHaPasado
