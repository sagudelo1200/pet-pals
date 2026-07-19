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
                <Text style={styles.titulo}>¿Qué acaba de pasar?</Text>

                <Pressable
                  style={styles.opcion}
                  onPress={() => setPantalla('mascota')}
                >
                  <Text style={styles.iconoOpcion}>🐶</Text>
                  <View style={styles.textoOpcion}>
                    <Text style={styles.etiquetaOpcion}>
                      La mascota hizo algo
                    </Text>
                    <Text style={styles.detalleOpcion}>
                      Registra qué hizo tu perro
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
                      Llegamos a algún lugar
                    </Text>
                    <Text style={styles.detalleOpcion}>
                      Marca dónde estuvieron
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
                      Quiero guardar este momento
                    </Text>
                    <Text style={styles.detalleOpcion}>
                      Captura foto o nota
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
                      Ocurrió una novedad
                    </Text>
                    <Text style={styles.detalleOpcion}>Reporta un evento</Text>
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
                  <Text style={styles.textVolver}>Volver</Text>
                </Pressable>

                <Text style={styles.titulo}>¿Qué hizo?</Text>

                {[
                  {
                    icon: '💩',
                    label: 'Hizo sus necesidades',
                    value: 'necesidades',
                  },
                  { icon: '🏃', label: 'Corrió mucho', value: 'corrio' },
                  { icon: '🦴', label: 'Jugó', value: 'juego' },
                  { icon: '💧', label: 'Tomó agua', value: 'agua' },
                  { icon: '😴', label: 'Descansó', value: 'descanso' },
                  {
                    icon: '🐕',
                    label: 'Saludó otros perros',
                    value: 'socializacion_perros',
                  },
                  {
                    icon: '👶',
                    label: 'Saludó personas',
                    value: 'socializacion_personas',
                  },
                  { icon: '😨', label: 'Se asustó', value: 'miedo' },
                  { icon: '🍖', label: 'Comió algo', value: 'comio' },
                ].map(item => (
                  <Pressable
                    key={item.value}
                    style={styles.subopcion}
                    onPress={() => guardarBitacora(item.value)}
                    disabled={guardando}
                  >
                    <Text style={styles.iconoSubopcion}>{item.icon}</Text>
                    <Text style={styles.textoSubopcion}>{item.label}</Text>
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
                  <Text style={styles.textVolver}>Volver</Text>
                </Pressable>

                <Text style={styles.titulo}>¿Dónde estuvieron?</Text>

                {[
                  { icon: '🌳', label: 'Parque', value: 'parque' },
                  { icon: '🌲', label: 'Sendero', value: 'sendero' },
                  { icon: '🌊', label: 'Río o lago', value: 'rio' },
                  { icon: '🏡', label: 'Casa', value: 'casa' },
                  { icon: '☕', label: 'Pet friendly', value: 'pet_friendly' },
                  { icon: '🐕', label: 'Zona de perros', value: 'zona_perros' },
                  { icon: '🏞', label: 'Mirador', value: 'mirador' },
                  { icon: '🚗', label: 'Subimos al carro', value: 'vehiculo' },
                  {
                    icon: '🚶',
                    label: 'Empezamos a caminar',
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
                    <Text style={styles.textoSubopcion}>{item.label}</Text>
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
                  <Text style={styles.textVolver}>Volver</Text>
                </Pressable>

                <Text style={styles.titulo}>Registra este recuerdo</Text>

                {[
                  { icon: '📸', label: 'Foto', value: 'foto' },
                  { icon: '🎥', label: 'Video corto', value: 'video' },
                  { icon: '🎤', label: 'Nota de voz', value: 'voz' },
                  { icon: '✍️', label: 'Escribir nota', value: 'nota' },
                ].map(item => (
                  <Pressable
                    key={item.value}
                    style={styles.subopcion}
                    onPress={() => guardarBitacora(`recuerdo:${item.value}`)}
                    disabled={guardando}
                  >
                    <Text style={styles.iconoSubopcion}>{item.icon}</Text>
                    <Text style={styles.textoSubopcion}>{item.label}</Text>
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
                  <Text style={styles.textVolver}>Volver</Text>
                </Pressable>

                <Text style={styles.titulo}>¿Qué ocurrió?</Text>

                {[
                  {
                    icon: '😨',
                    label: 'La mascota se asustó',
                    value: 'asustó',
                    severidad: 'baja',
                  },
                  {
                    icon: '🤕',
                    label: 'Se lastimó',
                    value: 'lesion',
                    severidad: 'media',
                  },
                  {
                    icon: '🐕',
                    label: 'Pelea con otro perro',
                    value: 'pelea',
                    severidad: 'media',
                  },
                  {
                    icon: '🤢',
                    label: 'Malestar',
                    value: 'malestar',
                    severidad: 'media',
                  },
                  {
                    icon: '🚗',
                    label: 'Tráfico peligroso',
                    value: 'trafico',
                    severidad: 'baja',
                  },
                  {
                    icon: '🌧',
                    label: 'Lluvia',
                    value: 'lluvia',
                    severidad: 'baja',
                  },
                  {
                    icon: '🚫',
                    label: 'Acceso cerrado',
                    value: 'acceso_cerrado',
                    severidad: 'baja',
                  },
                  {
                    icon: '📞',
                    label: 'Necesito llamar al tutor',
                    value: 'contacto',
                    severidad: 'alta',
                  },
                  {
                    icon: '🚨',
                    label: 'Emergencia',
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
                    <Text style={styles.textoSubopcion}>{item.label}</Text>
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
              <Text style={styles.textBtnCerrar}>Cerrar</Text>
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
