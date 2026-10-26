import React, { useState, useCallback } from 'react'
import { View, Text, StyleSheet, Alert } from 'react-native'
import { useConsentimientos } from '@/hooks'
import { ConsentimientoUI } from '@/context/ConsentimientosContext'
import { ModalLeerConsentimiento } from './ModalLeerConsentimiento'
import { Card, Button, Icon } from '@/components/ui'
import { COLOR } from '@/constants/Theme'
import { useTranslation } from 'react-i18next'
import { localeActual } from '@/utils/locale'

/**
 * Panel de Privacidad y Autorizaciones
 *
 * Muestra estado actual de consentimientos de forma humana:
 * - ✓ Autorizado
 * - ○ No autorizado
 * - ⏰ Requiere reconfirmación
 *
 * Determina automáticamente qué acciones mostrar sin exponer máquina de estados.
 */

const CONSENTIMIENTOS_ACTIVOS = ['DATOS_PERSONALES']

interface EstadoVisual {
  icono: string
  iconoColor: string
  estado: string
  descripcion: string
  accionPrimaria: { texto: string; tipo: 'aceptar' | 'revocar' } | null
  accionSecundaria: { texto: string; tipo: 'aceptar' | 'revocar' } | null
}

export const PanelPrivacidadConsentimientos: React.FC = () => {
  const { t } = useTranslation('consentimientos')
  const { consentimientos, aceptarConsentimiento, revocarConsentimiento } =
    useConsentimientos()

  const [modalVisible, setModalVisible] = useState(false)
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [actionType, setActionType] = useState<'aceptar' | 'revocar'>('aceptar')
  const [cargandoAccion, setCargandoAccion] = useState(false)

  /**
   * Determina el estado visual y acciones disponibles basado en lógica semántica
   */
  const getEstadoVisual = (
    consentimiento: ConsentimientoUI | undefined
  ): EstadoVisual => {
    if (!consentimiento) {
      return {
        icono: 'times-circle',
        iconoColor: COLOR.SUBTEXTO,
        estado: t('panel.no_autorizado'),
        descripcion: t('panel.sin_autorizar_desc'),
        accionPrimaria: { texto: t('panel.leer_autorizar'), tipo: 'aceptar' as const },
        accionSecundaria: null,
      }
    }

    const {
      estado,
      vigente,
      motivo_no_vigencia,
      proximoAExpirar,
      diasRestantes,
    } = consentimiento

    // Alerta: Expira pronto (dentro de 30 días)
    if (
      vigente &&
      proximoAExpirar &&
      diasRestantes !== null &&
      diasRestantes > 0
    ) {
      return {
        icono: 'exclamation-triangle',
        iconoColor: COLOR.ALERTA,
        estado: t('panel.expira_en', { count: diasRestantes }),
        descripcion: t('panel.expira_pronto_desc'),
        accionPrimaria: {
          texto: t('panel.reconfirmar'),
          tipo: 'aceptar' as const,
        },
        accionSecundaria: null,
      }
    }

    // Versión desactualizada
    if (!vigente && motivo_no_vigencia === 'VERSION_DESACTUALIZADA') {
      return {
        icono: 'exclamation-circle',
        iconoColor: COLOR.ALERTA,
        estado: t('panel.nueva_version'),
        descripcion: t('panel.nueva_version_desc'),
        accionPrimaria: { texto: t('panel.leer_aceptar'), tipo: 'aceptar' as const },
        accionSecundaria: null,
      }
    }

    // Aceptado y vigente
    if (estado === 'ACEPTADO' && vigente) {
      let fechaFormato = ''
      try {
        const fecha =
          consentimiento.fecha_evento instanceof Date
            ? consentimiento.fecha_evento
            : new Date(consentimiento.fecha_evento)
        fechaFormato = fecha.toLocaleDateString(localeActual(), {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      } catch (e) {
        fechaFormato = ''
        console.error('Error al formatear la fecha del consentimiento:', e)
      }

      // Descripción corta según fecha
      const descripcion = fechaFormato
        ? t('panel.autorizado_el', { fecha: fechaFormato })
        : t('panel.autorizado_reciente')

      return {
        icono: 'check-circle',
        iconoColor: COLOR.EXITO,
        estado: t('panel.autorizado'),
        descripcion,
        accionPrimaria: { texto: t('panel.ver_documento'), tipo: 'aceptar' as const },
        accionSecundaria: {
          texto: t('panel.retirar_autorizacion'),
          tipo: 'revocar' as const,
        },
      }
    }

    // Rechazado
    if (estado === 'RECHAZADO') {
      return {
        icono: 'times-circle',
        iconoColor: COLOR.SUBTEXTO,
        estado: t('panel.no_autorizado'),
        descripcion: t('panel.rechazado_desc'),
        accionPrimaria: { texto: t('panel.leer_documento'), tipo: 'aceptar' as const },
        accionSecundaria: null,
      }
    }

    // Revocado
    if (estado === 'REVOCADO') {
      return {
        icono: 'ban',
        iconoColor: COLOR.ALERTA,
        estado: t('panel.retirada'),
        descripcion: t('panel.retirada_desc'),
        accionPrimaria: {
          texto: t('panel.volver_autorizar'),
          tipo: 'aceptar' as const,
        },
        accionSecundaria: null,
      }
    }

    // Expirado - necesita reconfirmación
    if (!vigente && motivo_no_vigencia === 'EXPIRADO') {
      return {
        icono: 'history',
        iconoColor: COLOR.ALERTA,
        estado: t('panel.expirada'),
        descripcion: t('panel.expirada_desc'),
        accionPrimaria: {
          texto: t('panel.reconfirmar'),
          tipo: 'aceptar' as const,
        },
        accionSecundaria: null,
      }
    }

    // Fallback - nunca debería llegar aquí
    console.warn(
      '[PanelPrivacidadConsentimientos] Estado inesperado:',
      consentimiento
    )
    return {
      icono: 'exclamation-triangle',
      iconoColor: COLOR.ALERTA,
      estado: t('panel.desconocido'),
      descripcion: t('panel.desconocido_desc', { estado }),
      accionPrimaria: { texto: t('panel.contactar_soporte'), tipo: 'aceptar' as const },
      accionSecundaria: null,
    }
  }

  const handleAccion = useCallback(
    async (tipo: string, accion: 'aceptar' | 'revocar') => {
      if (accion === 'aceptar') {
        setSelectedType(tipo)
        setActionType('aceptar')
        setModalVisible(true)
      } else {
        // Revocar
        await Alert.alert(
          t('panel.retirar_titulo'),
          t('panel.retirar_mensaje'),
          [
            { text: t('comun:cancelar'), style: 'cancel' },
            {
              text: t('panel.retirar'),
              style: 'destructive',
              onPress: async () => {
                setCargandoAccion(true)
                try {
                  await revocarConsentimiento(tipo)
                } finally {
                  setCargandoAccion(false)
                }
              },
            },
          ]
        )
      }
    },
    [revocarConsentimiento, t]
  )

  const handleAceptarDesdeModal = useCallback(
    async (tipo: string) => {
      setCargandoAccion(true)
      try {
        await aceptarConsentimiento(tipo)
        setModalVisible(false)
        setSelectedType(null)
      } finally {
        setCargandoAccion(false)
      }
    },
    [aceptarConsentimiento]
  )

  // Renderizar solo consentimientos activos
  const consentimientosVisibles = CONSENTIMIENTOS_ACTIVOS.map(tipo => {
    const consent = consentimientos.get(tipo) || undefined
    return { tipo, consent }
  })

  const tieneAccionesRequeridas = consentimientosVisibles.some(
    ({ consent }) => {
      if (!consent) return true
      const { vigente, motivo_no_vigencia, proximoAExpirar } = consent
      return (
        !vigente ||
        motivo_no_vigencia === 'VERSION_DESACTUALIZADA' ||
        motivo_no_vigencia === 'EXPIRADO' ||
        proximoAExpirar
      )
    }
  )

  return (
    <View>
      {/* Estado General */}
      <View style={styles.estadoGeneral}>
        {tieneAccionesRequeridas ? (
          <>
            <Icon name="exclamation-circle" size={20} color={COLOR.ALERTA} />
            <Text style={styles.estadoTexto}>
              {t('panel.pendientes')}
            </Text>
          </>
        ) : (
          <>
            <Icon name="check-circle" size={20} color={COLOR.EXITO} />
            <Text style={styles.estadoTexto}>
              {t('panel.al_dia')}
            </Text>
          </>
        )}
      </View>

      {/* Cards de Consentimientos */}
      <View style={styles.cardsContainer}>
        {consentimientosVisibles.map(({ tipo, consent }) => {
          const visual = getEstadoVisual(consent)
          const titulo = consent?.titulo || tipo

          return (
            <Card key={tipo} style={styles.consentimientoCard}>
              <View style={styles.cardContent}>
                {/* Tipo/Título del documento */}
                <Text style={styles.documentoTitulo}>{titulo}</Text>

                <View style={styles.headerConsentimiento}>
                  <Icon
                    name={visual.icono}
                    size={24}
                    color={visual.iconoColor}
                  />
                  <View style={styles.textoConsentimiento}>
                    <Text style={styles.estadoLabel}>{visual.estado}</Text>
                    <Text style={styles.descripcionLabel}>
                      {visual.descripcion}
                    </Text>
                  </View>
                </View>

                {/* Acciones */}
                <View style={styles.actionsContainer}>
                  {visual.accionPrimaria && (
                    <Button
                      title={visual.accionPrimaria.texto}
                      size="sm"
                      variant="primario"
                      style={styles.actionBtn}
                      loading={cargandoAccion && selectedType === tipo}
                      onPress={() =>
                        handleAccion(tipo, visual.accionPrimaria!.tipo)
                      }
                    />
                  )}

                  {visual.accionSecundaria && (
                    <Button
                      title={visual.accionSecundaria.texto}
                      size="sm"
                      variant="contorno"
                      textStyle={{ color: COLOR.ERROR }}
                      style={[styles.actionBtn, { borderColor: COLOR.ERROR }]}
                      loading={
                        cargandoAccion &&
                        selectedType === tipo &&
                        actionType === 'revocar'
                      }
                      onPress={() =>
                        handleAccion(tipo, visual.accionSecundaria!.tipo)
                      }
                    />
                  )}
                </View>
              </View>
            </Card>
          )
        })}
      </View>

      {/* Modal para leer y aceptar */}
      {selectedType && (
        <ModalLeerConsentimiento
          visible={modalVisible}
          tipoConsentimiento={selectedType}
          onClose={() => setModalVisible(false)}
          onAceptar={() => handleAceptarDesdeModal(selectedType)}
          cargando={cargandoAccion}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  estadoGeneral: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.02)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  estadoTexto: {
    fontSize: 13,
    color: COLOR.TEXTO,
    flex: 1,
    fontWeight: '500',
  },
  cardsContainer: {
    gap: 10,
    paddingHorizontal: 16,
  },
  consentimientoCard: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  cardContent: {
    gap: 12,
  },
  documentoTitulo: {
    fontSize: 15,
    fontWeight: '700',
    color: COLOR.PRIMARIO,
    marginBottom: 4,
  },
  headerConsentimiento: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  textoConsentimiento: {
    flex: 1,
  },
  estadoLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLOR.TEXTO,
  },
  descripcionLabel: {
    fontSize: 12,
    color: COLOR.SUBTEXTO,
    marginTop: 2,
  },
  actionsContainer: {
    flexDirection: 'column',
    gap: 8,
  },
  actionBtn: {
    width: '100%',
  },
})
