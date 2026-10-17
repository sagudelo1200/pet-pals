/**
 * PantallaPago - FASE 4.1
 * Tutor ve el monto y paga con Wompi/MercadoPago
 *
 * Flujo:
 * 1. Mostrar monto y detalles
 * 2. Clic "PAGAR" → registrarRecaudo() → obtiene URL de Wompi
 * 3. Abre WebView con URL
 * 4. Usuario paga en Wompi
 * 5. Wompi envía webhook → confirmarRecaudo()
 * 6. Notificación: "Pago confirmado"
 */

import React, { useState } from 'react'
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { WebView } from 'react-native-webview'
import { COLOR } from '@/constants'
import Card from '@/components/ui/Card'
import Icon from '@/components/ui/Icon'
import { registrarRecaudo } from '@/logic/operacionesEconomicas'
import { MockAdaptador } from '@/logic/operacionesEconomicas/pagos/MockAdaptador'

interface PantallaPagoProps {
  operacionId: string
  monto: number
  nombreMascota: string
  nombreCuidador: string
  onPaymentSuccess: (_referencia: string) => void
  onCancel: () => void
}

export const PantallaPago: React.FC<PantallaPagoProps> = ({
  operacionId,
  monto,
  nombreMascota,
  nombreCuidador,
  onPaymentSuccess,
  onCancel,
}) => {
  const [loading, setLoading] = useState(false)
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null)
  const [referencia, setReferencia] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const adaptador = new MockAdaptador() // TODO: Reemplazar con WompiAdapter real

  const handleIniciarPago = async () => {
    setLoading(true)
    setError(null)

    try {
      const resultado = await registrarRecaudo(operacionId, adaptador)

      setReferencia(resultado.referencia)

      if (resultado.url) {
        // URL real de Wompi
        setPaymentUrl(resultado.url)
      } else {
        // En desarrollo (MockAdaptador), simular pago exitoso
        Alert.alert(
          '✅ Pago Simulado',
          `Referencia: ${resultado.referencia}\n\nEn producción, abrirá Wompi aquí.`,
          [
            {
              text: 'OK',
              onPress: () => {
                onPaymentSuccess(resultado.referencia)
              },
            },
          ]
        )
      }
    } catch (err) {
      console.error('[PantallaPago] Error:', err)
      const mensaje = err instanceof Error ? err.message : 'Error desconocido'
      setError(mensaje)
      Alert.alert('❌ Error', mensaje)
    } finally {
      setLoading(false)
    }
  }

  const handleWebViewMessage = (event: any) => {
    const data = JSON.parse(event.nativeEvent.data)

    if (data.status === 'success') {
      Alert.alert(
        '✅ Pago Confirmado',
        'Tu pago ha sido procesado exitosamente.',
        [
          {
            text: 'OK',
            onPress: () => {
              if (referencia) onPaymentSuccess(referencia)
            },
          },
        ]
      )
      setPaymentUrl(null)
    } else if (data.status === 'error') {
      setError('El pago fue rechazado. Intenta de nuevo.')
      setPaymentUrl(null)
    }
  }

  // Mostrar WebView de Wompi
  if (paymentUrl) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => setPaymentUrl(null)}>
            <Icon name="times" size={24} color="white" />
          </Pressable>
          <Text style={styles.headerTitle}>Pago Seguro</Text>
          <View style={{ width: 24 }} />
        </View>

        <WebView
          source={{ uri: paymentUrl }}
          onMessage={handleWebViewMessage}
          style={styles.webview}
        />
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
            <Text style={styles.montoValor}>${monto.toLocaleString()}</Text>
            <Text style={styles.montoDetalle}>
              Incluye servicio de cuidado y comisión de plataforma
            </Text>
          </LinearGradient>
        </Card>

        {/* Métodos de pago */}
        <Card style={styles.card}>
          <Text style={styles.seccionTitulo}>Método de pago</Text>
          <Pressable
            style={[styles.metodoButton, { marginBottom: 12 }]}
            disabled={loading}
          >
            <LinearGradient
              colors={['#FF5733', '#FF8A50']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.metodoBadge}
            >
              <Icon name="credit-card" size={20} color="white" />
            </LinearGradient>
            <View style={styles.metodoInfo}>
              <Text style={styles.metodoNombre}>Wompi</Text>
              <Text style={styles.metodoDetalle}>
                Tarjeta de crédito/débito
              </Text>
            </View>
            <Icon name="chevron-right" size={20} color={COLOR.SUBTEXTO} />
          </Pressable>

          <Pressable style={styles.metodoButton} disabled={loading}>
            <LinearGradient
              colors={['#FFB81C', '#FFC849']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.metodoBadge}
            >
              <Icon name="credit-card" size={20} color="white" />
            </LinearGradient>
            <View style={styles.metodoInfo}>
              <Text style={styles.metodoNombre}>Mercado Pago</Text>
              <Text style={styles.metodoDetalle}>Billetera digital</Text>
            </View>
            <Icon name="chevron-right" size={20} color={COLOR.SUBTEXTO} />
          </Pressable>
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
            <Text style={styles.botonCancelarText}>Cancelar</Text>
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
  seccionTitulo: {
    fontSize: 16,
    fontWeight: '600',
    color: COLOR.TEXTO,
    marginBottom: 12,
  },
  metodoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${COLOR.SUBTEXTO}20`,
    gap: 12,
  },
  metodoBadge: {
    width: 48,
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metodoInfo: {
    flex: 1,
  },
  metodoNombre: {
    fontSize: 14,
    fontWeight: '600',
    color: COLOR.TEXTO,
    marginBottom: 2,
  },
  metodoDetalle: {
    fontSize: 12,
    color: COLOR.SUBTEXTO,
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
