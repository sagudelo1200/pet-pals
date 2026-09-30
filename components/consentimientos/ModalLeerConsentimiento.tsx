import React, { useState, useEffect } from 'react'
import {
  Modal,
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  Text,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { COLOR } from '@/constants/Theme'
import { GestorConsentimientos } from '@/logic/consentimientos/gestor'
import { LoadingPanel } from '@/components/ui/LoadingPanel'
import type { DocumentoConsentimiento } from '@/models/Consentimiento'

interface ModalLeerConsentimientoProps {
  visible: boolean
  tipoConsentimiento: string
  onClose: () => void
  onAceptar?: () => void | Promise<void>
  cargando?: boolean
}

export const ModalLeerConsentimiento: React.FC<
  ModalLeerConsentimientoProps
> = ({ visible, tipoConsentimiento, onClose, onAceptar, cargando = false }) => {
  const { t } = useTranslation()
  const [documento, setDocumento] = useState<DocumentoConsentimiento | null>(
    null
  )
  const [cargandoDoc, setCargandoDoc] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!visible) {
      return
    }

    const cargarDocumento = async () => {
      try {
        setCargandoDoc(true)
        setError(null)

        const inicio = Date.now()

        // Usar Gestor para obtener documento vigente
        const resultado =
          await GestorConsentimientos.obtenerDocumentoVigente(
            tipoConsentimiento
          )

        const duracion = Date.now() - inicio
        const minimoDuracion = 1500

        if (duracion < minimoDuracion) {
          await new Promise(resolve =>
            setTimeout(resolve, minimoDuracion - duracion)
          )
        }

        if (!resultado.success || !resultado.data) {
          setError(t('consentimientos:mensajes.errorAlCargar'))
          return
        }

        setDocumento(resultado.data)
      } catch (err) {
        console.error('Error cargando documento:', err)
        setError(t('consentimientos:mensajes.errorAlCargar'))
      } finally {
        setCargandoDoc(false)
      }
    }

    cargarDocumento()
  }, [visible, tipoConsentimiento, t])

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitle}>
            <Text style={styles.titulo}>
              {documento?.titulo || t('consentimientos:titulo')}
            </Text>
            {documento?.version && (
              <Text style={styles.labelVersion}>v{documento.version}</Text>
            )}
          </View>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </Pressable>
        </View>

        {/* Contenido */}
        {cargandoDoc ? (
          <LoadingPanel
            messageType="consentimiento"
            spinnerSize="small"
            containerStyle={{ flex: 1 }}
          />
        ) : error ? (
          <View style={styles.centerContent}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable
              onPress={onClose}
              style={[styles.button, styles.buttonPrimary]}
            >
              <Text style={styles.buttonText}>
                {t('consentimientos:acciones.cerrar')}
              </Text>
            </Pressable>
          </View>
        ) : documento ? (
          <ScrollView
            style={styles.scrollContent}
            showsVerticalScrollIndicator={true}
          >
            <Text style={styles.contenido}>{documento.contenido}</Text>
          </ScrollView>
        ) : null}

        {/* Footer */}
        {!cargandoDoc && !error && (
          <View style={styles.footer}>
            <Pressable
              onPress={onClose}
              style={[styles.button, styles.buttonPrimary]}
            >
              <Text style={styles.buttonText}>
                {t('consentimientos:acciones.cerrar')}
              </Text>
            </Pressable>

            {onAceptar && (
              <Pressable
                onPress={onAceptar}
                disabled={cargando}
                style={[
                  styles.button,
                  styles.buttonAceptar,
                  cargando && styles.buttonDisabled,
                ]}
              >
                <Text style={styles.buttonAceptarText}>
                  {cargando
                    ? '...'
                    : t('consentimientos:acciones.aceptar') || 'Aceptar'}
                </Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLOR.BASE,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLOR.BORDE,
    marginTop: 40,
  },
  titulo: {
    fontSize: 18,
    fontWeight: '700',
    color: COLOR.TEXTO,
    flex: 1,
  },
  headerTitle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  labelVersion: {
    fontSize: 12,
    fontWeight: '600',
    color: COLOR.SUBTEXTO,
    backgroundColor: COLOR.BLOQUE,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  closeButton: {
    padding: 8,
    marginLeft: 8,
  },
  closeButtonText: {
    fontSize: 20,
    color: COLOR.TEXTO,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  scrollContent: {
    flex: 1,
    padding: 16,
  },
  contenido: {
    fontSize: 14,
    lineHeight: 24,
    color: COLOR.TEXTO,
    marginBottom: 24,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLOR.BORDE,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonPrimary: {
    backgroundColor: COLOR.PRIMARIO,
  },
  buttonText: {
    color: COLOR.BASE,
    fontSize: 14,
    fontWeight: '600',
  },
  buttonAceptar: {
    backgroundColor: COLOR.EXITO,
    marginTop: 8,
  },
  buttonAceptarText: {
    color: COLOR.BASE,
    fontSize: 14,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  errorText: {
    fontSize: 14,
    color: COLOR.ERROR,
    marginBottom: 16,
    textAlign: 'center',
  },
})
