/**
 * PantallaPago
 * El tutor paga su paseo (después de recibir la mascota).
 *
 * Flujo:
 * 1. El servidor generó el cobro al finalizar el paseo (monto real)
 * 2. "Pagar ahora" → iniciarPagoOperacion: la pasarela devuelve una
 *    referencia (y una URL si redirige, como Wompi)
 * 3. Con URL se abre el checkout; al cerrarlo se confirma
 * 4. confirmarPagoOperacion: el servidor consulta a la pasarela y registra
 *    el recaudo (el cliente nunca marca un pago como hecho)
 *
 * "Pagar después" está permitido: tras el plazo de la política comercial el
 * tutor no podrá solicitar nuevos paseos hasta pagar.
 */

import React, { useEffect, useState } from 'react'
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { WebView } from 'react-native-webview'
import { COLOR } from '@/constants'
import Card from '@/components/ui/Card'
import Icon from '@/components/ui/Icon'
import { useOperacionEconomica } from '@/hooks/comercial'
import { formatearCOP } from '@/logic/comercial'
import {
  ServicioEconomia,
  mensajeErrorEconomia,
} from '@/services/firebase/economia'

interface PantallaPagoProps {
  operacionId: string
  nombreMascota: string
  nombreCuidador: string
  onPagado: () => void
  onCancel: () => void
}

export const PantallaPago: React.FC<PantallaPagoProps> = ({
  operacionId,
  nombreMascota,
  nombreCuidador,
  onPagado,
  onCancel,
}) => {
  const { operacion, error: errorOperacion } =
    useOperacionEconomica(operacionId)
  const [loading, setLoading] = useState(false)
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const pagada =
    operacion?.estado === 'RECAUDADA' || operacion?.estado === 'CERRADA'

  // Si ya estaba pagada (o se confirma en otro dispositivo), continuar
  useEffect(() => {
    if (pagada) onPagado()
  }, [pagada, onPagado])

  const confirmar = async () => {
    setLoading(true)
    try {
      const res = await ServicioEconomia.confirmarPago({ operacionId })
      if (res.estado === 'RECHAZADO') {
        setError(res.mensaje || 'El pago fue rechazado. Intenta de nuevo.')
      } else if (res.estado === 'PENDIENTE') {
        setError('Tu pago está en proceso. Te avisaremos al confirmarse.')
      }
      // APROBADO: el listener de la operación dispara onPagado
    } catch (err) {
      setError(mensajeErrorEconomia(err))
    } finally {
      setLoading(false)
    }
  }

  const handleIniciarPago = async () => {
    setLoading(true)
    setError(null)
    try {
      const { url } = await ServicioEconomia.iniciarPago({ operacionId })
      if (url) {
        setPaymentUrl(url)
        setLoading(false)
        return
      }
      // Pasarela sin redirección (mock): confirmar de inmediato
      await confirmar()
    } catch (err) {
      setError(mensajeErrorEconomia(err))
      setLoading(false)
    }
  }

  const cerrarCheckout = () => {
    setPaymentUrl(null)
    void confirmar()
  }

  if (!operacion) {
    return (
      <View style={[styles.container, styles.centrado]}>
        {errorOperacion ? (
          <>
            <Text style={styles.errorText}>{errorOperacion}</Text>
            <Pressable style={styles.botonCancelar} onPress={onCancel}>
              <Text style={styles.botonCancelarText}>Volver</Text>
            </Pressable>
          </>
        ) : (
          <>
            <ActivityIndicator color={COLOR.PRIMARIO} />
            <Text style={styles.subtitulo}>Preparando tu cobro...</Text>
          </>
        )}
      </View>
    )
  }

  // Mostrar WebView de Wompi
  if (paymentUrl) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={cerrarCheckout}>
            <Icon name="times" size={24} color="white" />
          </Pressable>
          <Text style={styles.headerTitle}>Pago Seguro</Text>
          <View style={{ width: 24 }} />
        </View>

        <WebView source={{ uri: paymentUrl }} style={styles.webview} />
      </View>
    )
  }

  return (
    <ScrollView style={styles.container}>
      <LinearGradient
        colors={[`${COLOR.PRIMARIO}20`, `${COLOR.SECUNDARIO}10`]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Text style={styles.titulo}>Confirmar Pago</Text>
          <Text style={styles.subtitulo}>Paseo de {nombreMascota}</Text>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        {/* Detalles del paseo */}
        <Card style={styles.card}>
          <View style={styles.detalleRow}>
            <Text style={styles.detalleLabel}>Mascota:</Text>
            <Text style={styles.detalleValor}>{nombreMascota}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.detalleRow}>
            <Text style={styles.detalleLabel}>Cuidador:</Text>
            <Text style={styles.detalleValor}>{nombreCuidador}</Text>
          </View>
        </Card>

        {/* Monto */}
        <Card style={[styles.card, styles.montoCard]}>
          <LinearGradient
            colors={[`${COLOR.PRIMARIO}15`, `${COLOR.PRIMARIO}05`]}
            style={styles.montoGradient}
          >
            <Text style={styles.montoLabel}>Monto a pagar</Text>
            <Text style={styles.montoValor}>
              {formatearCOP(operacion.valor_acordado)}
            </Text>
            <Text style={styles.montoDetalle}>
              {operacion.detalle_precio
                ? `${operacion.detalle_precio.num_mascotas} mascota(s) · ${operacion.detalle_precio.duracion_minutos} min · `
                : ''}
              Incluye servicio de cuidado y comisión de plataforma
              {operacion.iva_comision > 0
                ? ` (IVA de la comisión: ${formatearCOP(operacion.iva_comision)})`
                : ''}
            </Text>
          </LinearGradient>
        </Card>

        {/* Seguridad */}
        <View style={styles.seguridad}>
          <Icon name="lock" size={16} color={COLOR.EXITO} />
          <Text style={styles.seguridadText}>
            Pago 100% seguro. Tus datos están protegidos.
          </Text>
        </View>

        {/* Error */}
        {error && (
          <View style={styles.errorContainer}>
            <Icon name="exclamation-circle" size={16} color={COLOR.ERROR} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Botones de acción */}
        <View style={styles.actions}>
          <Pressable
            style={[styles.botonCancelar]}
            onPress={onCancel}
            disabled={loading}
          >
            <Text style={styles.botonCancelarText}>Pagar después</Text>
          </Pressable>

          <Pressable
            style={[styles.botonPagar, loading && styles.botonDisabled]}
            onPress={handleIniciarPago}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Icon name="check-circle" size={20} color="white" />
                <Text style={styles.botonPagarText}>Pagar Ahora</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLOR.SECUNDARIO,
  },
  header: {
    paddingTop: 20,
    paddingBottom: 24,
    paddingHorizontal: 16,
  },
  headerContent: {
    alignItems: 'center',
  },
  centrado: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    padding: 24,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLOR.TEXTO,
  },
  titulo: {
    fontSize: 28,
    fontWeight: '700',
    color: COLOR.TEXTO,
    marginBottom: 4,
  },
  subtitulo: {
    fontSize: 14,
    color: COLOR.SUBTEXTO,
  },
  content: {
    flex: 1,
    padding: 16,
    gap: 16,
  },
  card: {
    padding: 16,
  },
  detalleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  detalleLabel: {
    fontSize: 14,
    color: COLOR.SUBTEXTO,
    fontWeight: '500',
  },
  detalleValor: {
    fontSize: 14,
    color: COLOR.TEXTO,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: `${COLOR.SUBTEXTO}20`,
    marginVertical: 8,
  },
  montoCard: {
    borderWidth: 1,
    borderColor: `${COLOR.PRIMARIO}30`,
  },
  montoGradient: {
    paddingVertical: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  montoLabel: {
    fontSize: 12,
    color: COLOR.SUBTEXTO,
    fontWeight: '500',
    marginBottom: 4,
  },
  montoValor: {
    fontSize: 40,
    fontWeight: '700',
    color: COLOR.PRIMARIO,
    marginBottom: 8,
  },
  montoDetalle: {
    fontSize: 11,
    color: COLOR.SUBTEXTO,
    textAlign: 'center',
  },
  seguridad: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: `${COLOR.EXITO}10`,
    borderRadius: 8,
    gap: 8,
  },
  seguridadText: {
    fontSize: 12,
    color: COLOR.EXITO,
    flex: 1,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: `${COLOR.ERROR}10`,
    borderRadius: 8,
    gap: 8,
  },
  errorText: {
    fontSize: 12,
    color: COLOR.ERROR,
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  botonCancelar: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLOR.SUBTEXTO,
    justifyContent: 'center',
    alignItems: 'center',
  },
  botonCancelarText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLOR.TEXTO,
  },
  botonPagar: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLOR.PRIMARIO,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  botonDisabled: {
    opacity: 0.6,
  },
  botonPagarText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  webview: {
    flex: 1,
  },
})
