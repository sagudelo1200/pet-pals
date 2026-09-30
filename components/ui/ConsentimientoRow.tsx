import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Switch,
  ActivityIndicator,
} from 'react-native'
import { COLOR } from '@/constants/Theme'
import { ConsentimientoUI } from '@/context/ConsentimientosContext'

interface ConsentimentoRowProps {
  consentimiento: ConsentimientoUI
  onToggle?: (_tipo: string, _nuevoEstado: boolean) => Promise<void>
  onRevocar?: (_tipo: string) => Promise<void>
  modo?: 'lectura' | 'edicion'
}

/**
 * Fila reutilizable para mostrar un consentimiento.
 * Modo lectura: solo muestra estado.
 * Modo edicion: permite toggle o revocar.
 */
export const ConsentimientoRow: React.FC<ConsentimentoRowProps> = ({
  consentimiento,
  onToggle,
  onRevocar,
  modo = 'lectura',
}) => {
  const [operandoLocal, setOperandoLocal] = React.useState(false)

  const esAceptado = consentimiento.estado === 'ACEPTADO'
  const colorEstado = esAceptado ? COLOR.EXITO : COLOR.ERROR
  const iconoEstado = esAceptado ? '✅' : '❌'

  const handleToggle = async (valor: boolean) => {
    if (!onToggle || operandoLocal) return
    setOperandoLocal(true)
    try {
      await onToggle(consentimiento.tipo_documento, valor)
    } finally {
      setOperandoLocal(false)
    }
  }

  const handleRevocar = async () => {
    if (!onRevocar || operandoLocal) return
    setOperandoLocal(true)
    try {
      await onRevocar(consentimiento.tipo_documento)
    } finally {
      setOperandoLocal(false)
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.titulo}>{consentimiento.titulo}</Text>
        <Text style={[styles.estado, { color: colorEstado }]}>
          {iconoEstado} {consentimiento.estado}
        </Text>
      </View>

      {!consentimiento.vigente && consentimiento.motivo_no_vigencia && (
        <Text style={styles.alerta}>
          ⚠️ {consentimiento.motivo_no_vigencia}
        </Text>
      )}

      {consentimiento.fecha_proxima_reconfirmacion && (
        <Text style={styles.fecha}>
          Reconfirmar en:{' '}
          {consentimiento.fecha_proxima_reconfirmacion.toLocaleDateString(
            'es-CO'
          )}
        </Text>
      )}

      {modo === 'edicion' && (
        <View style={styles.acciones}>
          {onToggle ? (
            <View style={styles.switchContainer}>
              <Text style={styles.labelSwitch}>
                {esAceptado ? 'Aceptado' : 'Rechazado'}
              </Text>
              <Switch
                value={esAceptado}
                onValueChange={handleToggle}
                disabled={operandoLocal}
              />
            </View>
          ) : null}

          {esAceptado && onRevocar ? (
            <Pressable
              style={[
                styles.boton,
                styles.botonRevocar,
                operandoLocal && styles.botonDeshabilitado,
              ]}
              onPress={handleRevocar}
              disabled={operandoLocal}
            >
              {operandoLocal ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.textoBoton}>Revocar</Text>
              )}
            </Pressable>
          ) : null}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: COLOR.BORDE,
    borderRadius: 8,
    padding: 16,
    marginVertical: 8,
    backgroundColor: COLOR.BLOQUE,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  titulo: {
    fontSize: 16,
    fontWeight: '600',
    color: COLOR.TEXTO,
    flex: 1,
  },
  estado: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 8,
  },
  alerta: {
    fontSize: 13,
    color: COLOR.ALERTA,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  fecha: {
    fontSize: 12,
    color: COLOR.SUBTEXTO,
    marginBottom: 8,
  },
  acciones: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLOR.BORDE,
    gap: 8,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  labelSwitch: {
    fontSize: 14,
    color: COLOR.SUBTEXTO,
  },
  boton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonRevocar: {
    backgroundColor: COLOR.ERROR,
  },
  botonDeshabilitado: {
    opacity: 0.5,
  },
  textoBoton: {
    color: COLOR.TEXTO,
    fontSize: 14,
    fontWeight: '600',
  },
})
