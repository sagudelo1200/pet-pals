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
import Screen from '@/components/ui/Screen'
import ScreenHeader from '@/components/ui/ScreenHeader'
import Button from '@/components/ui/Button'
import TextInput from '@/components/ui/TextInput'
import ImagePicker from '@/components/ui/ImagePicker'
import { TimePicker } from '@/components/ui'
import { useAuth } from '@/context/AuthContext'
import type { PerfilPublico, FranjaHoraria } from '@/models/PerfilPublico'
import { GestorPerfilPublico } from '@/logic/usuarios/perfilPublico'
import { coordsAH3 } from '@/services/geo'
import { useDirecciones } from '@/hooks/useDirecciones'
import { AutocompletarDireccion } from '@/components/ui/AutocompletarDireccion'
import type { DetalleUbicacion } from '@/services/maps/types'
import { LogicMatching } from '@/logic/paseos/matching'
import type { AuthStackParamList } from '@/navigation/types'
import type { StackNavigationProp } from '@react-navigation/stack'

type Nav = StackNavigationProp<AuthStackParamList>

const DIAS_SEMANA: { key: string; label: string }[] = [
  { key: '1', label: 'Lun' },
  { key: '2', label: 'Mar' },
  { key: '3', label: 'Mié' },
  { key: '4', label: 'Jue' },
  { key: '5', label: 'Vie' },
  { key: '6', label: 'Sáb' },
  { key: '0', label: 'Dom' },
]

const DEFAULT_INICIO = '08:00'
const DEFAULT_FIN = '18:00'

const PerfilCuidador: React.FC = () => {
  const { t } = useTranslation()
  const navigation = useNavigation<Nav>()
  const { user, profile } = useAuth()

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Campos básicos
  const [foto, setFoto] = useState('')
  const [biografia, setBiografia] = useState('')
  const [experiencia, setExperiencia] = useState('')
  const [tarifa, setTarifa] = useState('')

  // Horario semanal: Record<diaKey, FranjaHoraria>
  // Solo los días presentes en este objeto están activos
  const [horarioSemanal, setHorarioSemanal] = useState<
    Record<string, FranjaHoraria>
  >({})

  const [mostrarBuscadorDir, setMostrarBuscadorDir] = useState(false)
  const {
    principal: principalDir,
    agregar: agregarDir,
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
      setTarifa(data.tarifa_por_hora ? data.tarifa_por_hora.toString() : '')
      setHorarioSemanal(data.horario_semanal || {})
    }
    setLoading(false)
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
    await agregarDir(payload, 'Casa')
    setMostrarBuscadorDir(false)
  }

  const handleGuardar = async () => {
    if (!user) return

    if (!biografia.trim()) {
      Alert.alert(t('comun:error'), 'La biografía es obligatoria')
      return
    }
    if (!tarifa.trim() || isNaN(Number(tarifa))) {
      Alert.alert(t('comun:error'), 'Ingresa una tarifa válida')
      return
    }

    // Validar cada día activo
    for (const key of Object.keys(horarioSemanal)) {
      const { inicio, fin } = horarioSemanal[key]!
      if (inicio >= fin) {
        Alert.alert(
          t('comun:error'),
          `En ${DIAS_SEMANA.find(d => d.key === key)?.label}: inicio debe ser anterior al fin`
        )
        return
      }
      if (!LogicMatching.esHorarioLaboralValido(inicio, fin)) {
        Alert.alert(
          t('comun:error'),
          `El horario de ${DIAS_SEMANA.find(d => d.key === key)?.label} debe estar dentro del rango permitido (${LogicMatching.HORA_MINIMA_SERVICIO} – ${LogicMatching.HORA_MAXIMA_SERVICIO})`
        )
        return
      }
    }

    setSaving(true)

    let h3Origen: string | null = null
    if (profile?.id_ubicacion_principal && profile?.ubicaciones) {
      const ubPrincipal = profile.ubicaciones.find(
        u => u.ubicacion_id === profile.id_ubicacion_principal
      )
      // Usar h3_index de la referencia (guardado cuando se creó la ubicación)
      if (ubPrincipal?.h3_index) {
        h3Origen = ubPrincipal.h3_index
      } else if (ubPrincipal?.coordenadas) {
        // Fallback: recalcular si no está disponible (migración de datos)
        h3Origen = coordsAH3(
          ubPrincipal.coordenadas.latitude,
          ubPrincipal.coordenadas.longitude
        )
      }
    }

    const updateData: Partial<PerfilPublico> = {
      foto,
      biografia,
      experiencia,
      tarifa_por_hora: Number(tarifa),
      horario_semanal: horarioSemanal,
    }

    const res = await GestorPerfilPublico.actualizarCoberturaYPerfil(
      user.uid,
      updateData,
      h3Origen
    )

    setSaving(false)

    if (res.success) {
      Alert.alert(t('comun:exito'), t('perfil:editar.exito_guardar'), [
        { text: 'OK', onPress: () => navigation.goBack() },
      ])
    } else {
      Alert.alert(t('comun:error'), res.error || 'Error al guardar')
    }
  }

  const isoSemanaActual = LogicMatching.isoSemana(new Date())
  const isoSemanaProxima = LogicMatching.isoSemana(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  )
  const [tab, setTab] = useState<'datos' | 'horario'>('datos')

  return (
    <Screen style={styles.container}>
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

          <View style={styles.row}>
            <TextInput
              label={t('perfil:editar.experiencia_label')}
              placeholder="Ej: 2 años"
              value={experiencia}
              onChangeText={setExperiencia}
              style={[styles.input, styles.flex1, { marginRight: 12 }]}
            />
            <TextInput
              label={t('perfil:editar.tarifa_label')}
              placeholder="0"
              value={tarifa}
              onChangeText={setTarifa}
              keyboardType="numeric"
              style={[styles.input, styles.flex1]}
            />
          </View>

          {/* Dirección principal */}
          <View style={styles.direccionSection}>
            <View style={styles.direccionRow}>
              <Text style={styles.direccionLabel}>Dirección principal</Text>
              <TouchableOpacity onPress={() => setMostrarBuscadorDir(v => !v)}>
                <Text style={styles.direccionCambiarText}>
                  {principalDir ? 'Cambiar' : 'Agregar'}
                </Text>
              </TouchableOpacity>
            </View>
            {principalDir ? (
              <Text style={styles.direccionText} numberOfLines={2}>
                {principalDir.direccion_formateada}
              </Text>
            ) : (
              <Text style={styles.sinDireccionText}>
                Sin dirección configurada
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
            Activa los días disponibles y configura el rango horario de cada
            uno.
          </Text>

          {DIAS_SEMANA.map(({ key, label }) => {
            const activo = !!horarioSemanal[key]
            const franja = horarioSemanal[key]
            return (
              <View key={key} style={styles.diaFila}>
                <Text style={styles.diaLabel}>{label}</Text>
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
  coberturaBtnText: {
    color: COLOR.SUBTEXTO,
    fontSize: 14,
    fontWeight: '600',
  },
})

export default PerfilCuidador
