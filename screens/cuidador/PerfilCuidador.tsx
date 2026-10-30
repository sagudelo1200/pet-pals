import React, { useState, useEffect } from 'react'
import {
  StyleSheet,
  View,
  ScrollView,
  Alert,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Switch as RNSwitch,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'
import { COLOR } from '@/constants'
import { usePoliticaComercial } from '@/hooks/comercial'
import { useConfiguracion } from '@/hooks/configuracion/useConfiguracion'
import { formatearCOP } from '@/logic/comercial'
import Screen from '@/components/ui/Screen'
import ScreenHeader from '@/components/ui/ScreenHeader'
import Button from '@/components/ui/Button'
import TextInput from '@/components/ui/TextInput'
import ImagePicker from '@/components/ui/ImagePicker'
import { TimePicker } from '@/components/ui'
import { useAuth } from '@/context/AuthContext'
import type { PerfilPublico, FranjaHoraria } from '@/models/PerfilPublico'
import { TAMANOS, type Tamano } from '@/functions/src/compartido/emparejamiento'
import { GestorPerfilPublico } from '@/logic/usuarios/perfilPublico'
import {
  obtenerErrorCelularI18n,
  validarCelularColombia,
} from '@/logic/usuarios/validador-celular'
import { ServicioUsuario } from '@/services/firebase'
import { celdaPrincipalDe } from '@/logic/ubicaciones/celdaPrincipal'
import { useEstadoDeServicio } from '@/hooks/useEstadoDeServicio'
import { AvisoSinServicio } from '@/components/comun/AvisoSinServicio'
import { useDirecciones } from '@/hooks/useDirecciones'
import { AutocompletarDireccion } from '@/components/ui/AutocompletarDireccion'
import type { DetalleUbicacion } from '@/services/maps/types'
import { LogicMatching } from '@/logic/paseos/matching'
import type { AuthStackParamList } from '@/navigation/types'
import type { StackNavigationProp } from '@react-navigation/stack'

type Nav = StackNavigationProp<AuthStackParamList>

/** `label` es la clave i18n del nombre corto del día */
const DIAS_SEMANA: { key: string; label: string }[] = [
  { key: '1', label: 'comun:dias_cortos.1' },
  { key: '2', label: 'comun:dias_cortos.2' },
  { key: '3', label: 'comun:dias_cortos.3' },
  { key: '4', label: 'comun:dias_cortos.4' },
  { key: '5', label: 'comun:dias_cortos.5' },
  { key: '6', label: 'comun:dias_cortos.6' },
  { key: '0', label: 'comun:dias_cortos.0' },
]

const DEFAULT_INICIO = '08:00'
const DEFAULT_FIN = '18:00'

const PerfilCuidador: React.FC = () => {
  const { t } = useTranslation()
  const navigation = useNavigation<Nav>()
  const { user, profile, recargarPerfil } = useAuth()
  const { politica } = usePoliticaComercial()
  const tarifaBase = politica?.por_tipo.paseo.precio.base_por_hora
  const configPaseos = useConfiguracion('paseos')
  const { max_mascotas: topeMascotas } = configPaseos

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Campos básicos
  const [foto, setFoto] = useState('')
  const [biografia, setBiografia] = useState('')
  const [experiencia, setExperiencia] = useState('')
  // El celular es privado (vive en `usuarios`) y hace parte de la habilitación
  const [celular, setCelular] = useState(profile?.celular ?? '')
  // tarifa field removed for MVP (global standard price)
  // Qué perros cuida: sin tocar nada acepta cualquier tamaño y hasta el tope
  const [tamanos, setTamanos] = useState<Tamano[]>([...TAMANOS])
  const [maxMascotas, setMaxMascotas] = useState<number | null>(null)

  // Horario semanal: Record<diaKey, FranjaHoraria>
  // Solo los días presentes en este objeto están activos
  const [horarioSemanal, setHorarioSemanal] = useState<
    Record<string, FranjaHoraria>
  >({})

  const [mostrarBuscadorDir, setMostrarBuscadorDir] = useState(false)
  // ¿Se atiende donde vive? Si no, aún no recibirá solicitudes
  const celdaPrincipal = celdaPrincipalDe(profile)
  const servicio = useEstadoDeServicio(celdaPrincipal)
  const {
    principal: principalDir,
    agregar: agregarDir,
    fijarPrincipal: fijarPrincipalDir,
    loading: loadingDir,
  } = useDirecciones()

  useEffect(() => {
    cargarPerfil()
  }, [])

  const cargarPerfil = async () => {
    if (!user) return
    setLoading(true)
    const res = await GestorPerfilPublico.obtenerPorId(user.uid)
    if (res.success && res.data) {
      const data = res.data
      setFoto(data.foto || '')
      setBiografia(data.biografia || '')
      setExperiencia(data.experiencia || '')
      setTamanos(
        data.tamanos_aceptados?.length ? data.tamanos_aceptados : [...TAMANOS]
      )
      setMaxMascotas(data.max_mascotas ?? null)
      // tarifa_por_hora no se usa en MVP
      setHorarioSemanal(data.horario_semanal || {})
    }
    setLoading(false)
  }

  // Se puede marcar cualquier combinación, pero al menos un tamaño
  const alternarTamano = (tamano: Tamano) => {
    setTamanos(prev =>
      prev.includes(tamano)
        ? prev.length > 1
          ? prev.filter(t => t !== tamano)
          : prev
        : TAMANOS.filter(t => t === tamano || prev.includes(t))
    )
  }

  const toggleDia = (key: string) => {
    setHorarioSemanal(prev => {
      if (prev[key]) {
        const next = { ...prev }
        delete next[key]
        return next
      }
      return { ...prev, [key]: { inicio: DEFAULT_INICIO, fin: DEFAULT_FIN } }
    })
  }

  const actualizarFranja = (
    key: string,
    campo: 'inicio' | 'fin',
    valor: string
  ) => {
    setHorarioSemanal(prev => ({
      ...prev,
      [key]: { ...prev[key]!, [campo]: valor },
    }))
  }

  const handleSeleccionarDireccion = async (detalle: DetalleUbicacion) => {
    const payload = {
      proveedor: 'google' as const,
      proveedor_place_id: detalle.place_id,
      direccion_formateada: detalle.direccion_formateada,
      coordenadas: detalle.coordenadas,
    }
    const nuevaId = await agregarDir(payload, 'Casa')
    // Es "Cambiar": la nueva dirección pasa a ser la de casa (la principal), que
    // es la que fija el origen del cuidador
    await fijarPrincipalDir(nuevaId)
    setMostrarBuscadorDir(false)
  }

  const handleGuardar = async () => {
    if (!user) return

    if (!biografia.trim()) {
      Alert.alert(t('comun:error'), t('cuidador:editar.biografia_obligatoria'))
      return
    }
    const celularValido = validarCelularColombia(celular)
    if (!celularValido.valido) {
      const error = obtenerErrorCelularI18n(celular)
      Alert.alert(
        t('comun:error'),
        error
          ? (t(error.key, { ns: 'usuarios', ...error.params }) as string)
          : t('cuidador:editar.celular_obligatorio')
      )
      return
    }
    // Nota: la asignación de tarifa por cuidador está desactivada en MVP.

    // Validar cada día activo
    for (const key of Object.keys(horarioSemanal)) {
      const { inicio, fin } = horarioSemanal[key]!
      if (inicio >= fin) {
        Alert.alert(
          t('comun:error'),
          t('cuidador:editar.inicio_antes_fin', {
            dia: t(DIAS_SEMANA.find(d => d.key === key)?.label ?? ''),
          })
        )
        return
      }
      if (!LogicMatching.esHorarioLaboralValido(inicio, fin, configPaseos)) {
        Alert.alert(
          t('comun:error'),
          t('cuidador:editar.horario_fuera_rango', {
            dia: t(DIAS_SEMANA.find(d => d.key === key)?.label ?? ''),
            min: LogicMatching.formatoHora(configPaseos.servicio_desde_min),
            max: LogicMatching.formatoHora(configPaseos.servicio_hasta_min),
          })
        )
        return
      }
    }

    setSaving(true)

    const h3Origen = celdaPrincipalDe(profile)

    const updateData: Partial<PerfilPublico> = {
      foto,
      biografia,
      experiencia,
      // tarifa_por_hora: No actualizar en MVP (precio global)
      horario_semanal: horarioSemanal,
      // Todos marcados = sin restricción
      tamanos_aceptados: tamanos.length === TAMANOS.length ? null : tamanos,
      // null = sin límite propio (sigue al máximo global)
      max_mascotas: maxMascotas,
    }

    const res = await GestorPerfilPublico.actualizarCoberturaYPerfil(
      user.uid,
      updateData,
      h3Origen
    )

    // El celular se guarda aparte: no es parte del perfil público
    if (res.success && celularValido.celularSanitizado !== profile?.celular) {
      const guardado = await ServicioUsuario.actualizar(user.uid, {
        celular: celularValido.celularSanitizado,
      })
      if (guardado.success) await recargarPerfil()
      else res.success = false
    }

    setSaving(false)

    if (res.success) {
      Alert.alert(t('comun:exito'), t('perfil:editar.exito_guardar'), [
        { text: 'OK', onPress: () => navigation.goBack() },
      ])
    } else {
      Alert.alert(
        t('comun:error'),
        res.error || t('cuidador:editar.error_guardar')
      )
    }
  }

  const isoSemanaActual = LogicMatching.isoSemana(new Date())
  const isoSemanaProxima = LogicMatching.isoSemana(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  )
  const [tab, setTab] = useState<'datos' | 'horario'>('datos')

  return (
    <Screen teclado style={styles.container}>
      <ScreenHeader
        title={t('perfil:editar.titulo')}
        subtitle={t('perfil:editar.subtitulo')}
      />

      {/* Tab bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'datos' && styles.tabBtnActive]}
          onPress={() => setTab('datos')}
        >
          <Text
            style={[styles.tabLabel, tab === 'datos' && styles.tabLabelActive]}
          >
            Datos
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'horario' && styles.tabBtnActive]}
          onPress={() => setTab('horario')}
        >
          <Text
            style={[
              styles.tabLabel,
              tab === 'horario' && styles.tabLabelActive,
            ]}
          >
            Horario
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab: Datos básicos */}
      {tab === 'datos' && (
        <ScrollView
          style={styles.tabContent}
          contentContainerStyle={styles.tabContentInner}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.photoSection}>
            <ImagePicker
              label={t('perfil:editar.foto_label')}
              value={foto}
              onValueChange={setFoto}
              style={styles.imagePicker}
            />
          </View>

          <TextInput
            label={t('perfil:editar.bio_label')}
            placeholder={t('perfil:editar.bio_placeholder')}
            value={biografia}
            onChangeText={setBiografia}
            style={styles.input}
            multiline
            numberOfLines={4}
          />

          <TextInput
            label={t('cuidador:editar.celular_label')}
            placeholder={t('cuidador:editar.celular_placeholder')}
            value={celular}
            onChangeText={setCelular}
            keyboardType="phone-pad"
            style={styles.input}
          />
          <Text style={styles.ayudaCelular}>
            {t('cuidador:editar.celular_ayuda')}
          </Text>

          <View style={styles.row}>
            <TextInput
              label={t('perfil:editar.experiencia_label')}
              placeholder={t('cuidador:editar.experiencia_placeholder')}
              value={experiencia}
              onChangeText={setExperiencia}
              style={[styles.input, styles.flex1, { marginRight: 12 }]}
            />
            <View
              style={[
                styles.input,
                styles.flex1,
                styles.tarifaDisabledContainer,
              ]}
            >
              <Text style={styles.disabledTarifa}>
                {tarifaBase ? formatearCOP(tarifaBase) : '—'} /{' '}
                {t('cuidador:perfil.hora')}
              </Text>
              <Text style={styles.tarifaHint}>
                {t('perfil:editar.tarifa_estandar_mvp')}
              </Text>
            </View>
          </View>

          {/* Qué perros cuida (filtra a quién le llegan solicitudes) */}
          <View style={styles.perrosSection}>
            <Text style={styles.direccionLabel}>
              {t('perfil:editar.perros_titulo')}
            </Text>
            <Text style={styles.perrosAyuda}>
              {t('perfil:editar.perros_ayuda')}
            </Text>
            <Text style={styles.perrosSubtitulo}>
              {t('perfil:editar.tamano_label')}
            </Text>
            <View style={styles.chipsFila}>
              {TAMANOS.map(tamano => {
                const activo = tamanos.includes(tamano)
                return (
                  <TouchableOpacity
                    key={tamano}
                    style={[styles.chip, activo && styles.chipActivo]}
                    onPress={() => alternarTamano(tamano)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: activo }}
                  >
                    <Text
                      style={[
                        styles.chipTexto,
                        activo && styles.chipTextoActivo,
                      ]}
                    >
                      {t(`perfil:editar.tamanos.${tamano}`)}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
            <Text style={styles.perrosSubtitulo}>
              {t('perfil:editar.max_mascotas_label')}
            </Text>
            <View style={styles.chipsFila}>
              {Array.from({ length: topeMascotas }, (_, i) => i + 1).map(n => {
                const activo =
                  Math.min(maxMascotas ?? topeMascotas, topeMascotas) === n
                return (
                  <TouchableOpacity
                    key={n}
                    style={[styles.chip, activo && styles.chipActivo]}
                    onPress={() => setMaxMascotas(n >= topeMascotas ? null : n)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: activo }}
                  >
                    <Text
                      style={[
                        styles.chipTexto,
                        activo && styles.chipTextoActivo,
                      ]}
                    >
                      {n}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>

          {/* Dirección principal */}
          <View style={styles.direccionSection}>
            <View style={styles.direccionRow}>
              <Text style={styles.direccionLabel}>
                {t('cuidador:editar.direccion_principal')}
              </Text>
              <TouchableOpacity onPress={() => setMostrarBuscadorDir(v => !v)}>
                <Text style={styles.direccionCambiarText}>
                  {principalDir
                    ? t('cuidador:editar.cambiar')
                    : t('cuidador:editar.agregar')}
                </Text>
              </TouchableOpacity>
            </View>
            {principalDir ? (
              <Text style={styles.direccionText} numberOfLines={2}>
                {principalDir.direccion_formateada}
              </Text>
            ) : (
              <Text style={styles.sinDireccionText}>
                {t('cuidador:editar.sin_direccion')}
              </Text>
            )}
            {mostrarBuscadorDir && (
              <View style={styles.autocompleteWrapper}>
                <AutocompletarDireccion onSelect={handleSeleccionarDireccion} />
                {loadingDir && (
                  <ActivityIndicator
                    size="small"
                    color={COLOR.PRIMARIO}
                    style={{ marginTop: 8 }}
                  />
                )}
              </View>
            )}
          </View>

          {servicio && !servicio.abierto && celdaPrincipal && (
            <View style={styles.avisoServicio}>
              <AvisoSinServicio
                rol="cuidador"
                celda={celdaPrincipal}
                servicio={servicio}
              />
            </View>
          )}

          <TouchableOpacity
            style={styles.coberturaBtnWrapper}
            onPress={() => navigation.navigate('CoberturaCuidador')}
          >
            <Text style={styles.coberturaBtnText}>
              📍 Editar zonas de cobertura
            </Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Tab: Horario semanal */}
      {tab === 'horario' && (
        <ScrollView
          style={styles.tabContent}
          contentContainerStyle={styles.tabContentInner}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.sectionSubtitle}>
            {t('cuidador:editar.dias_ayuda')}
          </Text>

          {DIAS_SEMANA.map(({ key, label }) => {
            const activo = !!horarioSemanal[key]
            const franja = horarioSemanal[key]
            return (
              <View key={key} style={styles.diaFila}>
                <Text style={styles.diaLabel}>{t(label)}</Text>
                <View style={styles.diaCenter}>
                  {activo && franja && (
                    <>
                      <TimePicker
                        value={franja.inicio}
                        onValueChange={v => actualizarFranja(key, 'inicio', v)}
                        style={styles.timePicker}
                      />
                      <Text style={styles.separador}>–</Text>
                      <TimePicker
                        value={franja.fin}
                        onValueChange={v => actualizarFranja(key, 'fin', v)}
                        style={styles.timePicker}
                      />
                    </>
                  )}
                </View>
                <RNSwitch
                  value={activo}
                  onValueChange={() => toggleDia(key)}
                  trackColor={{ false: COLOR.SUBTEXTO, true: COLOR.PRIMARIO }}
                  thumbColor="#FFFFFF"
                />
              </View>
            )
          })}

          <TouchableOpacity
            style={styles.excepcionBtn}
            onPress={() =>
              navigation.navigate('ExcepcionSemanal', {
                isoSemana: isoSemanaActual,
              })
            }
          >
            <Text style={styles.excepcionBtnText}>
              ⚡ Semana actual · {LogicMatching.rangoSemana(isoSemanaActual)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.excepcionBtn, styles.excepcionBtnSecundario]}
            onPress={() =>
              navigation.navigate('ExcepcionSemanal', {
                isoSemana: isoSemanaProxima,
              })
            }
          >
            <Text style={styles.excepcionBtnText}>
              📅 Próxima semana · {LogicMatching.rangoSemana(isoSemanaProxima)}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      <View style={styles.footer}>
        <Button
          title={t('perfil:editar.guardar')}
          onPress={handleGuardar}
          loading={saving}
          disabled={loading}
        />
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLOR.BASE },
  ayudaCelular: {
    color: COLOR.SUBTEXTO,
    fontSize: 12,
    marginTop: -8,
    marginBottom: 12,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLOR.BORDE,
    backgroundColor: COLOR.BASE,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {
    borderBottomColor: COLOR.PRIMARIO,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLOR.SUBTEXTO,
  },
  tabLabelActive: {
    color: COLOR.PRIMARIO,
    fontWeight: '700',
  },
  tabContent: { flex: 1 },
  tabContentInner: { padding: 20, paddingBottom: 20 },
  photoSection: { marginBottom: 24, alignItems: 'center' },
  imagePicker: { width: 120, height: 120, borderRadius: 60 },
  input: { marginBottom: 16 },
  flex1: { flex: 1 },
  row: { flexDirection: 'row' },
  sectionSubtitle: {
    fontSize: 13,
    color: COLOR.SUBTEXTO,
    marginBottom: 16,
    lineHeight: 18,
  },
  diaFila: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderBottomWidth: 1,
    borderBottomColor: COLOR.BORDE,
  },
  diaLabel: {
    width: 36,
    fontSize: 13,
    fontWeight: '600',
    color: COLOR.TEXTO,
  },
  diaCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  timePicker: { flex: 1, marginBottom: 0 },
  separador: {
    color: COLOR.SUBTEXTO,
    marginHorizontal: 6,
    fontSize: 14,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLOR.BORDE,
    backgroundColor: COLOR.BASE,
  },
  excepcionBtn: {
    marginTop: 20,
    marginBottom: 8,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLOR.ENFASIS,
    alignItems: 'center',
  },
  excepcionBtnText: {
    color: COLOR.ENFASIS,
    fontSize: 14,
    fontWeight: '600',
  },
  excepcionBtnSecundario: {
    marginTop: 8,
    borderColor: COLOR.SUBTEXTO,
  },
  direccionSection: {
    marginTop: 20,
    marginBottom: 8,
  },
  direccionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  direccionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLOR.SUBTEXTO,
  },
  direccionCambiarText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLOR.ENFASIS,
  },
  direccionText: {
    fontSize: 14,
    color: COLOR.TEXTO,
    lineHeight: 20,
  },
  sinDireccionText: {
    fontSize: 13,
    color: COLOR.INACTIVO,
    fontStyle: 'italic',
  },
  autocompleteWrapper: {
    marginTop: 8,
    zIndex: 20,
  },
  avisoServicio: {
    marginTop: 16,
  },
  coberturaBtnWrapper: {
    marginTop: 16,
    marginBottom: 8,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLOR.BORDE,
    alignItems: 'center',
    backgroundColor: COLOR.BLOQUE,
  },
  perrosSection: {
    marginTop: 16,
    gap: 6,
  },
  perrosAyuda: {
    fontSize: 12,
    color: COLOR.SUBTEXTO,
    lineHeight: 16,
  },
  perrosSubtitulo: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '600',
    color: COLOR.TEXTO,
  },
  chipsFila: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLOR.BORDE,
    backgroundColor: COLOR.BLOQUE,
  },
  chipActivo: {
    borderColor: COLOR.PRIMARIO,
    backgroundColor: COLOR.PRIMARIO + '20',
  },
  chipTexto: {
    fontSize: 13,
    color: COLOR.SUBTEXTO,
  },
  chipTextoActivo: {
    color: COLOR.PRIMARIO,
    fontWeight: '700',
  },
  tarifaDisabledContainer: {
    justifyContent: 'center',
    padding: 12,
    backgroundColor: COLOR.SECUNDARIO,
    borderRadius: 8,
  },
  disabledTarifa: {
    fontSize: 16,
    fontWeight: '700',
    color: COLOR.EXITO,
  },
  tarifaHint: {
    fontSize: 12,
    color: COLOR.SUBTEXTO,
    marginTop: 6,
  },
  coberturaBtnText: {
    color: COLOR.SUBTEXTO,
    fontSize: 14,
    fontWeight: '600',
  },
})

export default PerfilCuidador
