/**
 * FormularioConfiguracion
 * Formulario de un área de configuración operativa, generado desde el
 * catálogo (functions/src/compartido/configuracion.ts): agregar un valor al
 * catálogo lo hace aparecer aquí sin tocar este componente. El servidor
 * vuelve a validar y deja historial de cada cambio con su motivo.
 */
import React, { useEffect, useState } from 'react'
import { View, Text, TextInput, StyleSheet, Alert } from 'react-native'
import { COLOR } from '@/constants'
import { Button, Switch } from '@/components/ui'
import { useConfiguracion } from '@/hooks/configuracion'
import {
  CATALOGO_CONFIGURACION,
  validarCambios,
  type AreaConfiguracion,
  type DefinicionValor,
} from '@/functions/src/compartido/configuracion'
import { validarMotivo } from '@/functions/src/compartido/versionables'
import { ServicioConfiguracion } from '@/services/firebase/configuracion'
import { mensajeErrorCallable } from '@/services/firebase/callable'
import {
  aEditable,
  cambiosDe,
  type ValorEditable,
} from '@/logic/configuracion/formulario'
import { CampoMotivo } from './CampoMotivo'
import { HistorialConfiguracion } from './HistorialConfiguracion'
import { estilosAdmin } from './estilosAdmin'

type Borrador = Record<string, ValorEditable>

const aBorrador = (valores: Record<string, unknown>): Borrador =>
  Object.fromEntries(Object.entries(valores).map(([k, v]) => [k, aEditable(v)]))

export const FormularioConfiguracion: React.FC<{ area: AreaConfiguracion }> = ({
  area,
}) => {
  const actuales = useConfiguracion(area) as Record<string, unknown>
  const definiciones = CATALOGO_CONFIGURACION[area].valores as Record<
    string,
    DefinicionValor<unknown>
  >
  const [borrador, setBorrador] = useState<Borrador>(() => aBorrador(actuales))
  const [editado, setEditado] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [guardando, setGuardando] = useState(false)

  // Los valores guardados solo reemplazan el borrador si el admin no está
  // editando (así no se pisa lo que está escribiendo)
  useEffect(() => {
    if (!editado) setBorrador(aBorrador(actuales))
  }, [actuales, editado])

  const editar = (clave: string, valor: ValorEditable) => {
    setEditado(true)
    setBorrador(b => ({ ...b, [clave]: valor }))
  }

  const descartar = () => {
    setEditado(false)
    setMotivo('')
  }

  const cambios = cambiosDe(definiciones, borrador, actuales)
  const hayCambios = Object.keys(cambios).length > 0
  const errores = hayCambios ? validarCambios(area, cambios) : []

  const guardar = async () => {
    setGuardando(true)
    try {
      const { cambiadas } = await ServicioConfiguracion.actualizar({
        area,
        cambios,
        motivo,
      })
      Alert.alert(
        '✅ Guardado',
        `Actualizado: ${cambiadas.join(', ') || 'nada'}. ` +
          'Se aplica en todas partes en menos de un minuto.'
      )
      descartar()
    } catch (e) {
      Alert.alert('❌ No se guardó', mensajeErrorCallable(e))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <View>
      {Object.entries(definiciones).map(([clave, def]) => {
        const valor = borrador[clave]
        if (def.tipo === 'booleano') {
          return (
            <Switch
              key={clave}
              value={valor === true}
              onValueChange={v => editar(clave, v)}
              label={def.titulo}
              description={def.descripcion}
            />
          )
        }
        return (
          <View key={clave}>
            <Text style={estilosAdmin.label}>{def.titulo}</Text>
            <TextInput
              style={estilosAdmin.input}
              value={String(valor ?? '')}
              onChangeText={v => editar(clave, v)}
              keyboardType={
                def.tipo === 'entero' ? 'number-pad' : 'numbers-and-punctuation'
              }
              placeholderTextColor={COLOR.SUBTEXTO}
            />
            <Text style={estilosAdmin.ayudaCampo}>
              {def.descripcion}
              {def.unidad ? ` (${def.unidad})` : ''}
            </Text>
          </View>
        )
      })}

      {hayCambios && (
        <>
          <CampoMotivo value={motivo} onChange={setMotivo} />
          {errores.length > 0 && (
            <Text style={estilosAdmin.errores}>{errores.join('\n')}</Text>
          )}
          <View style={estilosAdmin.acciones}>
            <Button
              title={guardando ? 'Guardando…' : 'Guardar cambios'}
              onPress={guardar}
              variant="primario"
              disabled={
                guardando || errores.length > 0 || validarMotivo(motivo) !== null
              }
            />
            <Button
              title="Descartar"
              onPress={descartar}
              variant="secundario"
              disabled={guardando}
            />
          </View>
        </>
      )}

      <Text style={[estilosAdmin.label, styles.historial]}>Últimos cambios</Text>
      <HistorialConfiguracion area={area} />
    </View>
  )
}

const styles = StyleSheet.create({
  historial: {
    marginTop: 20,
  },
})
