import React, { useState, useCallback, useEffect } from 'react'
import { View, Text, StyleSheet, Pressable, Modal } from 'react-native'
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import Screen from '@/components/ui/Screen'
import { COLOR } from '@/constants'
import { useExploracionTerritorial } from '@/hooks/explorador/useExploracionTerritorial'
import { useGlobalLoading } from '@/hooks'
import { LinearGradient } from 'expo-linear-gradient'
import JugandoConPerroSvg from '@/assets/imgs/undraw/jugando_con_perro.svg'

/**
 * Pantalla de exploración libre - Paso 3 del flujo PawPath
 * Foto + botones de acciones rápidas para capturar eventos
 */

type EventoCapturado = {
  id: string
  tipo: 'mascotas' | 'interesados' | 'aliado' | 'seguridad' | 'nota'
  datos: any
  timestamp: number
}

type EventoTipo = 'mascotas' | 'interesados' | 'aliado' | 'seguridad' | 'nota'

// ============================================================================
// MODALES MEMOIZADOS - Extraídos para evitar re-renders innecesarios
// ============================================================================

interface ModalMascotasProps {
  visible: boolean
  count: string
  onCountChange: (_count: string) => void
  onClose: () => void
  onConfirm: () => void
  t: (_key: string) => string
}

const ModalMascotas = React.memo(
  ({
    visible,
    count,
    onCountChange,
    onClose,
    onConfirm,
    t,
  }: ModalMascotasProps) => (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>
            🐕 {t('explorador:mascotas_observadas')}
          </Text>

          <View style={styles.optionGrid}>
            {[
              { label: '1-2', value: '1-2' },
              { label: '3-5', value: '3-5' },
              { label: '6-10', value: '6-10' },
              { label: '10+', value: '10+' },
            ].map(option => (
              <Pressable
                key={option.value}
                style={[
                  styles.optionButton,
                  count === option.value && styles.optionButtonActive,
                ]}
                onPress={() => onCountChange(option.value)}
              >
                <Text
                  style={[
                    styles.optionText,
                    count === option.value && styles.optionTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.modalFooter}>
            <Pressable style={styles.btnCancel} onPress={onClose}>
              <Text style={styles.btnText}>{t('cancelar')}</Text>
            </Pressable>
            <Pressable
              style={[styles.btnConfirm, !count && styles.btnDisabled]}
              onPress={onConfirm}
              disabled={!count}
            >
              <Text style={styles.btnTextConfirm}>{t('guardar')}</Text>
            </Pressable>
          </View>
        </View>
      </Pressable>
    </Modal>
  )
)

interface ModalNotaProps {
  visible: boolean
  selectedTag: string
  onTagSelect: (_tag: string) => void
  onClose: () => void
  onConfirm: () => void
  tags: string[]
  t: (_key: string) => string
}

const ModalNota = React.memo(
  ({
    visible,
    selectedTag,
    onTagSelect,
    onClose,
    onConfirm,
    tags,
    t,
  }: ModalNotaProps) => (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>
            📝 {t('explorador:nota_rapida')}
          </Text>

          <View style={styles.notaContainer}>
            {tags.map(tag => (
              <Pressable
                key={tag}
                style={[
                  styles.tagButton,
                  selectedTag === tag && styles.tagButtonActive,
                ]}
                onPress={() => onTagSelect(selectedTag === tag ? '' : tag)}
              >
                <Text
                  style={[
                    styles.tagText,
                    selectedTag === tag && styles.tagTextActive,
                  ]}
                >
                  {tag}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.modalFooter}>
            <Pressable style={styles.btnCancel} onPress={onClose}>
              <Text style={styles.btnText}>{t('cancelar')}</Text>
            </Pressable>
            <Pressable
              style={[styles.btnConfirm, !selectedTag && styles.btnDisabled]}
              onPress={onConfirm}
              disabled={!selectedTag}
            >
              <Text style={styles.btnTextConfirm}>{t('guardar')}</Text>
            </Pressable>
          </View>
        </View>
      </Pressable>
    </Modal>
  )
)

interface ModalInteresadosProps {
  visible: boolean
  selected: string
  onSelect: (_option: string) => void
  onClose: () => void
  onConfirm: () => void
  t: (_key: string) => string
}

const ModalInteresados = React.memo(
  ({
    visible,
    selected,
    onSelect,
    onClose,
    onConfirm,
    t,
  }: ModalInteresadosProps) => {
    const opciones = [
      { label: t('explorador:interes_mirando_mascotas'), value: 'mirando' },
      {
        label: t('explorador:interes_preguntando_paseos'),
        value: 'preguntando',
      },
      { label: t('explorador:interes_querer_acariciar'), value: 'acariciar' },
      { label: t('explorador:interes_otro'), value: 'otro' },
    ]

    return (
      <Modal visible={visible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={onClose}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              👥 {t('explorador:personas_interesadas')}
            </Text>
            <Text style={styles.modalDesc}>
              {t('explorador:pregunta_tipo_interes')}
            </Text>

            <View style={styles.optionGrid}>
              {opciones.map(option => (
                <Pressable
                  key={option.value}
                  style={[
                    styles.optionButton,
                    selected === option.value && styles.optionButtonActive,
                  ]}
                  onPress={() => onSelect(option.value)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      selected === option.value && styles.optionTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.modalFooter}>
              <Pressable style={styles.btnCancel} onPress={onClose}>
                <Text style={styles.btnText}>{t('cancelar')}</Text>
              </Pressable>
              <Pressable
                style={[styles.btnConfirm, !selected && styles.btnDisabled]}
                onPress={onConfirm}
                disabled={!selected}
              >
                <Text style={styles.btnTextConfirm}>{t('guardar')}</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
    )
  }
)

interface ModalAliadoProps {
  visible: boolean
  selected: string
  onSelect: (_option: string) => void
  onClose: () => void
  onConfirm: () => void
  t: (_key: string) => string
}

const ModalAliado = React.memo(
  ({
    visible,
    selected,
    onSelect,
    onClose,
    onConfirm,
    t,
  }: ModalAliadoProps) => {
    const opciones = [
      { label: t('explorador:aliado_negocio_pet'), value: 'pet-friendly' },
      { label: t('explorador:aliado_veterinaria'), value: 'veterinaria' },
      { label: t('explorador:aliado_guarderia'), value: 'guarderia' },
      { label: t('explorador:aliado_parque'), value: 'parque' },
      { label: t('explorador:aliado_otro'), value: 'otro' },
    ]

    return (
      <Modal visible={visible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={onClose}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              🤝 {t('explorador:aliado_negocio')}
            </Text>
            <Text style={styles.modalDesc}>
              {t('explorador:pregunta_tipo_aliado')}
            </Text>

            <View style={styles.optionGrid}>
              {opciones.map(option => (
                <Pressable
                  key={option.value}
                  style={[
                    styles.optionButton,
                    selected === option.value && styles.optionButtonActive,
                  ]}
                  onPress={() => onSelect(option.value)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      selected === option.value && styles.optionTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.modalFooter}>
              <Pressable style={styles.btnCancel} onPress={onClose}>
                <Text style={styles.btnText}>{t('cancelar')}</Text>
              </Pressable>
              <Pressable
                style={[styles.btnConfirm, !selected && styles.btnDisabled]}
                onPress={onConfirm}
                disabled={!selected}
              >
                <Text style={styles.btnTextConfirm}>{t('guardar')}</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
    )
  }
)

interface ModalSeguridadProps {
  visible: boolean
  selected: string
  onSelect: (_option: string) => void
  onClose: () => void
  onConfirm: () => void
  t: (_key: string) => string
}

const ModalSeguridad = React.memo(
  ({
    visible,
    selected,
    onSelect,
    onClose,
    onConfirm,
    t,
  }: ModalSeguridadProps) => {
    const opciones = [
      { label: t('explorador:riesgo_trafico_intenso'), value: 'trafico' },
      { label: t('explorador:riesgo_perro_suelto'), value: 'perro_suelto' },
      { label: t('explorador:riesgo_zona_oscura'), value: 'oscura' },
      { label: t('explorador:riesgo_acceso_limitado'), value: 'acceso' },
      { label: t('explorador:riesgo_otro'), value: 'otro' },
    ]

    return (
      <Modal visible={visible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={onClose}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              🛡️ {t('explorador:seguridad_riesgo')}
            </Text>
            <Text style={styles.modalDesc}>
              {t('explorador:pregunta_tipo_riesgo')}
            </Text>

            <View style={styles.optionGrid}>
              {opciones.map(option => (
                <Pressable
                  key={option.value}
                  style={[
                    styles.optionButton,
                    selected === option.value && styles.optionButtonActive,
                  ]}
                  onPress={() => onSelect(option.value)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      selected === option.value && styles.optionTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.modalFooter}>
              <Pressable style={styles.btnCancel} onPress={onClose}>
                <Text style={styles.btnText}>{t('cancelar')}</Text>
              </Pressable>
              <Pressable
                style={[styles.btnConfirm, !selected && styles.btnDisabled]}
                onPress={onConfirm}
                disabled={!selected}
              >
                <Text style={styles.btnTextConfirm}>{t('guardar')}</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
    )
  }
)

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

const ExplorarLibremente = ({ navigation }: any) => {
  const { t } = useTranslation('explorador')
  const { capturar, loading: captureLoading } = useExploracionTerritorial()
  const { showLoading, hideLoading } = useGlobalLoading()

  // Estado de sesión
  const [eventosCapturados, setEventosCapturados] = useState<EventoCapturado[]>(
    []
  )
  const [tiempoTranscurrido, setTiempoTranscurrido] = useState<string>('00:00')

  // Modales rápidos
  const [modalActivo, setModalActivo] = useState<EventoTipo | null>(null)
  const [mascotasCount, setMascotasCount] = useState<string>('')
  const [modalNota, setModalNota] = useState<string>('')
  const [interesadosSelected, setInteresadosSelected] = useState<string>('')
  const [aliadoSelected, setAliadoSelected] = useState<string>('')
  const [seguridadSelected, setSeguridadSelected] = useState<string>('')

  // Timer para contar tiempo transcurrido
  useEffect(() => {
    const tiempoInicio = Date.now()
    const timer = setInterval(() => {
      const ahora = Date.now()
      const segundosTranscurridos = Math.floor((ahora - tiempoInicio) / 1000)
      const mins = Math.floor(segundosTranscurridos / 60)
      const segs = segundosTranscurridos % 60
      setTiempoTranscurrido(
        `${mins.toString().padStart(2, '0')}:${segs.toString().padStart(2, '0')}`
      )
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // Agregar evento capturado
  const agregarEvento = useCallback((tipo: EventoTipo, datos: any) => {
    const nuevoEvento: EventoCapturado = {
      id: Date.now().toString(),
      tipo,
      datos,
      timestamp: Date.now(),
    }

    setEventosCapturados(prev => [...prev, nuevoEvento])

    // Cerrar modal y limpiar
    setModalActivo(null)
    setMascotasCount('')
    setModalNota('')
  }, [])

  // Guardar exploración completa
  const finalizarExploracion = async () => {
    if (eventosCapturados.length === 0) {
      alert('Debes capturar al menos un evento antes de finalizar.')
      return
    }

    showLoading()

    try {
      // Preparar datos consolidados
      const mascotasObservadas = eventosCapturados
        .filter(e => e.tipo === 'mascotas')
        .reduce((sum, e) => sum + (parseInt(e.datos.cantidad) || 1), 0)

      const tipo_punto = 'otro' // Categoría genérica
      const flujo_peatonal = 'medio' // Default, puede mejorar con más lógica
      const observaciones = eventosCapturados
        .filter(e => e.tipo === 'nota')
        .map(e => e.datos.texto)
        .join(' | ')

      // Llamar al servicio
      const _resultado = await capturar({
        tipo_punto,
        mascotas_visibles: mascotasObservadas,
        flujo_peatonal,
        observaciones,
      })

      hideLoading()

      // Navegar a pantalla de resumen con datos
      navigation.navigate('ResumenExploracion', {
        eventos: eventosCapturados,
        tiempoTotal: tiempoTranscurrido,
        mascotasObservadas,
        huellas: 40, // Default, puede variar según lógica
      })
    } catch (error) {
      console.error('Error al guardar exploración:', error)
      hideLoading()
      alert('Error al guardar. Intenta nuevamente.')
    }
  }

  // Tags para nota rápida
  const notaTags = [
    t('explorador:nota_mascotas_asustadas'),
    t('explorador:nota_zona_segura'),
    t('explorador:nota_buena_iluminacion'),
    t('explorador:nota_vigilancia'),
    t('explorador:nota_acceso_limitado'),
    t('explorador:nota_paso_frecuente'),
  ]

  return (
    <Screen style={styles.container} includeTopInset={false}>
      {/* HEADER CON INFORMACIÓN DE SESIÓN */}
      <LinearGradient
        colors={[COLOR.PRIMARIO, COLOR.ENFASIS]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Pressable
          style={styles.btnBack}
          onPress={() => navigation.navigate('ExplorerRoot' as never)}
        >
          <Icon name="close" size={24} color={COLOR.HUESO} />
        </Pressable>

        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>
            🔍 {t('explorador:explorando')}
          </Text>
          <Text style={styles.headerSubtitle}>⏱️ {tiempoTranscurrido}</Text>
        </View>
      </LinearGradient>

      {/* ZONA DE EXPLORACIÓN */}
      <View style={styles.explorationContainer}>
        {/* FOTO / CÁMARA - SVG placeholder */}
        <View style={styles.fotoContainer}>
          <JugandoConPerroSvg width={200} height={200} />
        </View>

        {/* BOTONES FLOTANTES - Acciones rápidas */}
        <View style={styles.floatingButtons}>
          {/* Botón: Mascotas */}
          <Pressable
            style={styles.floatingBtn}
            onPress={() => setModalActivo('mascotas')}
          >
            <Icon name="dog" size={24} color={COLOR.HUESO} />
            <Text style={styles.floatingBtnLabel}>
              {t('explorador:mascotas_observadas')}
            </Text>
          </Pressable>

          {/* Botón: Interesados */}
          <Pressable
            style={styles.floatingBtn}
            onPress={() => setModalActivo('interesados')}
          >
            <Icon name="account-multiple" size={24} color={COLOR.HUESO} />
            <Text style={styles.floatingBtnLabel}>
              {t('explorador:personas_interesadas')}
            </Text>
          </Pressable>

          {/* Botón: Aliado */}
          <Pressable
            style={styles.floatingBtn}
            onPress={() => setModalActivo('aliado')}
          >
            <Icon name="handshake" size={24} color={COLOR.HUESO} />
            <Text style={styles.floatingBtnLabel}>
              {t('explorador:aliado_negocio')}
            </Text>
          </Pressable>

          {/* Botón: Seguridad */}
          <Pressable
            style={styles.floatingBtn}
            onPress={() => setModalActivo('seguridad')}
          >
            <Icon name="shield-alert" size={24} color={COLOR.HUESO} />
            <Text style={styles.floatingBtnLabel}>
              {t('explorador:seguridad_riesgo')}
            </Text>
          </Pressable>

          {/* Botón: Nota */}
          <Pressable
            style={styles.floatingBtn}
            onPress={() => setModalActivo('nota')}
          >
            <Icon name="note-multiple" size={24} color={COLOR.HUESO} />
            <Text style={styles.floatingBtnLabel}>
              {t('explorador:nota_rapida')}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* FOOTER CON BOTÓN FINALIZAR */}
      <View style={styles.footer}>
        <Text style={styles.footerInfo}>
          {eventosCapturados.length}{' '}
          {t(
            eventosCapturados.length === 1
              ? 'explorador:evento'
              : 'explorador:eventos'
          )}{' '}
          {t('explorador:capturados')}
        </Text>
        <Pressable
          style={[
            styles.btnFinalizar,
            eventosCapturados.length === 0 && styles.btnFinalizarDisabled,
          ]}
          onPress={finalizarExploracion}
          disabled={eventosCapturados.length === 0 || captureLoading}
        >
          <Icon name="check-circle" size={20} color={COLOR.HUESO} />
          <Text style={styles.btnFinalizarText}>
            {captureLoading
              ? t('comun:guardando')
              : t('explorador:finalizar_exploracion')}
          </Text>
        </Pressable>
      </View>

      {/* MODALES MEMOIZADOS */}
      <ModalMascotas
        visible={modalActivo === 'mascotas'}
        count={mascotasCount}
        onCountChange={setMascotasCount}
        onClose={() => {
          setModalActivo(null)
          setMascotasCount('')
        }}
        onConfirm={() => {
          agregarEvento('mascotas', { cantidad: mascotasCount })
        }}
        t={t}
      />

      <ModalNota
        visible={modalActivo === 'nota'}
        selectedTag={modalNota}
        onTagSelect={setModalNota}
        onClose={() => {
          setModalActivo(null)
          setModalNota('')
        }}
        onConfirm={() => {
          agregarEvento('nota', { texto: modalNota })
        }}
        tags={notaTags}
        t={t}
      />

      <ModalInteresados
        visible={modalActivo === 'interesados'}
        selected={interesadosSelected}
        onSelect={setInteresadosSelected}
        onClose={() => {
          setModalActivo(null)
          setInteresadosSelected('')
        }}
        onConfirm={() => {
          agregarEvento('interesados', { tipo: interesadosSelected })
        }}
        t={t}
      />

      <ModalAliado
        visible={modalActivo === 'aliado'}
        selected={aliadoSelected}
        onSelect={setAliadoSelected}
        onClose={() => {
          setModalActivo(null)
          setAliadoSelected('')
        }}
        onConfirm={() => {
          agregarEvento('aliado', { tipo: aliadoSelected })
        }}
        t={t}
      />

      <ModalSeguridad
        visible={modalActivo === 'seguridad'}
        selected={seguridadSelected}
        onSelect={setSeguridadSelected}
        onClose={() => {
          setModalActivo(null)
          setSeguridadSelected('')
        }}
        onConfirm={() => {
          agregarEvento('seguridad', { tipo: seguridadSelected })
        }}
        t={t}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLOR.BASE,
  },
  header: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  btnBack: {
    padding: 8,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLOR.HUESO,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLOR.HUESO,
    opacity: 0.8,
    marginTop: 2,
  },
  explorationContainer: {
    flex: 1,
    position: 'relative',
    flexDirection: 'row',
  },
  fotoContainer: {
    flex: 1,
    backgroundColor: COLOR.BLOQUE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    marginTop: 12,
    fontSize: 14,
    color: COLOR.SUBTEXTO,
    fontWeight: '500',
  },
  floatingButtons: {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: [{ translateY: -120 }],
    gap: 8,
  },
  floatingBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLOR.ENFASIS,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  floatingBtnLabel: {
    fontSize: 8,
    color: COLOR.HUESO,
    marginTop: 2,
    textAlign: 'center',
    fontWeight: '500',
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLOR.BLOQUE,
    backgroundColor: COLOR.BASE,
  },
  footerInfo: {
    fontSize: 12,
    color: COLOR.SUBTEXTO,
    marginBottom: 8,
  },
  btnFinalizar: {
    flexDirection: 'row',
    backgroundColor: COLOR.ENFASIS,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnFinalizarDisabled: {
    opacity: 0.5,
  },
  btnFinalizarText: {
    color: COLOR.HUESO,
    fontSize: 14,
    fontWeight: '600',
  },

  // Estilos de modales
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: COLOR.BLOQUE,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 320,
    borderWidth: 1,
    borderColor: COLOR.BORDE,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLOR.TEXTO,
    marginBottom: 16,
  },
  modalDesc: {
    fontSize: 13,
    color: COLOR.SUBTEXTO,
    marginBottom: 16,
    lineHeight: 18,
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  optionButton: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLOR.BORDE,
    backgroundColor: COLOR.SECUNDARIO,
  },
  optionButtonActive: {
    backgroundColor: COLOR.ENFASIS,
    borderColor: COLOR.ENFASIS,
  },
  optionText: {
    textAlign: 'center',
    fontSize: 13,
    color: COLOR.SUBTEXTO,
    fontWeight: '500',
  },
  optionTextActive: {
    color: COLOR.HUESO,
  },
  notaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  tagButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLOR.BORDE,
    backgroundColor: COLOR.SECUNDARIO,
  },
  tagButtonActive: {
    backgroundColor: COLOR.ENFASIS,
    borderColor: COLOR.ENFASIS,
  },
  tagText: {
    fontSize: 12,
    color: COLOR.SUBTEXTO,
    fontWeight: '500',
  },
  tagTextActive: {
    color: COLOR.HUESO,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 10,
  },
  btnCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLOR.BORDE,
    backgroundColor: COLOR.SECUNDARIO,
    alignItems: 'center',
  },
  btnConfirm: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: COLOR.ENFASIS,
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnText: {
    color: COLOR.TEXTO,
    fontSize: 13,
    fontWeight: '600',
  },
  btnTextConfirm: {
    color: COLOR.HUESO,
    fontSize: 13,
    fontWeight: '600',
  },
})

export default ExplorarLibremente
