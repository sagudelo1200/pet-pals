import React, { useState, useEffect } from 'react'
import {
  StyleSheet,
  View,
  ScrollView,
  Alert,
  Text,
  Switch as RNSwitch,
} from 'react-native'
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native'
import { COLOR } from '@/constants'
import Screen from '@/components/ui/Screen'
import ScreenHeader from '@/components/ui/ScreenHeader'
import Button from '@/components/ui/Button'
import { TimePicker } from '@/components/ui'
import { useAuth } from '@/context/AuthContext'
import { useExcepcionSemanal } from '@/hooks/cuidador/useExcepcionSemanal'
import { GestorPerfilPublico } from '@/logic/usuarios/perfilPublico'
import { LogicMatching } from '@/logic/paseos/matching'
import type { FranjaHoraria } from '@/models/PerfilPublico'
import type { OverrideDia } from '@/models/ExcepcionDisponibilidad'
import type { AuthStackParamList } from '@/navigation/types'

type RouteT = RouteProp<AuthStackParamList, 'ExcepcionSemanal'>

const DIAS_SEMANA: { key: string; label: string; nombre: string }[] = [
  { key: '1', label: 'Lun', nombre: 'Lunes' },
  { key: '2', label: 'Mar', nombre: 'Martes' },
  { key: '3', label: 'Mié', nombre: 'Miércoles' },
  { key: '4', label: 'Jue', nombre: 'Jueves' },
  { key: '5', label: 'Vie', nombre: 'Viernes' },
  { key: '6', label: 'Sáb', nombre: 'Sábado' },
  { key: '0', label: 'Dom', nombre: 'Domingo' },
]

type EstadoDia = {
  activo: boolean
  inicio: string
  fin: string
  /** true = este día tiene un override explícito respecto al horario base */
  modificado: boolean
}

/**
 * Pantalla para personalizar la disponibilidad de una semana concreta.
 * Permite activar/desactivar días y cambiar horarios para esa semana,
 * sobreescribiendo el horario_semanal recurrente.
 */
const ExcepcionSemanal: React.FC = () => {
  const navigation = useNavigation()
  const route = useRoute<RouteT>()
  const { isoSemana } = route.params
  const { user } = useAuth()

  const { excepcion, guardar, eliminar, cargando } = useExcepcionSemanal(
    user?.uid ?? null,
    isoSemana
  )

  // Estado por día: inicio, fin, activo, modificado
  const [diasEstado, setDiasEstado] = useState<Record<string, EstadoDia>>({})
  const [horarioBase, setHorarioBase] = useState<Record<string, FranjaHoraria>>(
    {}
  )
  const [guardando, setGuardando] = useState(false)

  // Cargar horario base del perfil
  useEffect(() => {
    if (!user) return
    GestorPerfilPublico.obtenerPorId(user.uid).then(res => {
      if (res.success && res.data) {
        setHorarioBase(res.data.horario_semanal || {})
      }
    })
  }, [user])

  // Una vez cargado el horario base y la excepción, inicializar estado
  useEffect(() => {
    const estado: Record<string, EstadoDia> = {}
    for (const { key } of DIAS_SEMANA) {
      const base = horarioBase[key]
      const override = excepcion?.overrides[key]

      if (override !== undefined) {
        // Hay override explícito: usar sus valores
        estado[key] = {
          activo: override.activo,
          inicio:
            override.activo && override.inicio
              ? override.inicio
              : (base?.inicio ?? '08:00'),
          fin:
            override.activo && override.fin
              ? override.fin
              : (base?.fin ?? '18:00'),
          modificado: true,
        }
      } else {
        // Sin override: usar horario base
        estado[key] = {
          activo: !!base,
          inicio: base?.inicio ?? '08:00',
          fin: base?.fin ?? '18:00',
          modificado: false,
        }
      }
    }
    setDiasEstado(estado)
  }, [horarioBase, excepcion])

  const toggleDia = (key: string) => {
    setDiasEstado(prev => ({
      ...prev,
      [key]: {
        ...prev[key]!,
        activo: !prev[key]?.activo,
        modificado: true,
      },
    }))
  }

  const actualizarHora = (
    key: string,
    campo: 'inicio' | 'fin',
    valor: string
  ) => {
    setDiasEstado(prev => ({
      ...prev,
      [key]: { ...prev[key]!, [campo]: valor, modificado: true },
    }))
  }

  const handleGuardar = async () => {
    if (!user) return

    // Construir overrides: solo los días que difieren del base
    const overrides: Record<string, OverrideDia> = {}
    for (const { key } of DIAS_SEMANA) {
      const estado = diasEstado[key]
      if (!estado?.modificado) continue

      const base = horarioBase[key]
      const activoBase = !!base

      // Solo guardar override si hay diferencia real
      const cambiado =
        estado.activo !== activoBase ||
        (estado.activo && estado.inicio !== base?.inicio) ||
        (estado.activo && estado.fin !== base?.fin)

      if (!cambiado) continue

      overrides[key] = {
        activo: estado.activo,
        ...(estado.activo ? { inicio: estado.inicio, fin: estado.fin } : {}),
      }
    }

    if (Object.keys(overrides).length === 0) {
      // Sin cambios reales: eliminar excepción si existe
      if (excepcion) {
        Alert.alert(
          'Sin cambios',
          'Tu horario para esta semana coincide con el horario base. ¿Deseas eliminar la excepción guardada?',
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Eliminar excepción',
              style: 'destructive',
              onPress: async () => {
                setGuardando(true)
                await eliminar()
                setGuardando(false)
                navigation.goBack()
              },
            },
          ]
        )
      } else {
        Alert.alert(
          'Sin cambios',
          'No hay diferencias con tu horario base para esta semana.'
        )
      }
      return
    }

    setGuardando(true)
    await guardar(overrides)
    setGuardando(false)
    Alert.alert('Listo', 'Excepción semanal guardada correctamente.', [
      { text: 'OK', onPress: () => navigation.goBack() },
    ])
  }

  const handleEliminar = () => {
    if (!excepcion) return
    Alert.alert(
      'Eliminar excepción',
      'Se eliminará el override de esta semana y se usará tu horario semanal base.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setGuardando(true)
            await eliminar()
            setGuardando(false)
            navigation.goBack()
          },
        },
      ]
    )
  }

  return (
    <Screen style={styles.container}>
      <ScreenHeader title="Semana personalizada" subtitle={isoSemana} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.desc}>
          Personaliza tu disponibilidad para la semana del{' '}
          {LogicMatching.rangoSemana(isoSemana)}. Los cambios sobreescriben tu
          horario recurrente solo durante {isoSemana}.
        </Text>

        {DIAS_SEMANA.map(({ key, label }) => {
          const estado = diasEstado[key]
          if (!estado) return null
          return (
            <View key={key} style={styles.diaFila}>
              <Text style={styles.diaLabel}>{label}</Text>
              <View style={styles.diaCenter}>
                {estado.activo && (
                  <>
                    <TimePicker
                      value={estado.inicio}
                      onValueChange={v => actualizarHora(key, 'inicio', v)}
                      style={styles.timePicker}
                    />
                    <Text style={styles.separador}>–</Text>
                    <TimePicker
                      value={estado.fin}
                      onValueChange={v => actualizarHora(key, 'fin', v)}
                      style={styles.timePicker}
                    />
                  </>
                )}
              </View>
              <RNSwitch
                value={estado.activo}
                onValueChange={() => toggleDia(key)}
                trackColor={{ false: COLOR.SUBTEXTO, true: COLOR.PRIMARIO }}
                thumbColor="#FFFFFF"
              />
            </View>
          )
        })}

        {excepcion && (
          <Button
            title="Eliminar excepción"
            onPress={handleEliminar}
            loading={cargando || guardando}
            style={styles.eliminarBtn}
          />
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Guardar semana"
          onPress={handleGuardar}
          loading={guardando || cargando}
        />
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLOR.BASE },
  scrollView: { flex: 1 },
  content: { padding: 20, paddingBottom: 20 },
  desc: {
    fontSize: 13,
    color: COLOR.SUBTEXTO,
    marginBottom: 20,
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
    width: 40,
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
  eliminarBtn: {
    marginTop: 24,
    backgroundColor: COLOR.ERROR,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLOR.BORDE,
    backgroundColor: COLOR.BASE,
  },
})

export default ExcepcionSemanal
