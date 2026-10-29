import React, { useState, useCallback } from 'react'
import { View, Text, StyleSheet, Alert, Pressable } from 'react-native'
import { useConsentimientos } from '@/hooks'
import { ConsentimientoUI } from '@/context/ConsentimientosContext'
import { ModalLeerConsentimiento } from './ModalLeerConsentimiento'
import { Icon } from '@/components/ui'
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
  accionPrimaria: { texto: string; tipo: 'aceptar' | 'revocar' | 'ver' } | null
  accionSecundaria: { texto: string; tipo: 'aceptar' | 'revocar' } | null
}

export const PanelPrivacidadConsentimientos: React.FC = () => {
  const { t } = useTranslation('consentimientos')
  const { consentimientos, aceptarConsentimiento, revocarConsentimiento } =
    useConsentimientos()

  const [modalVisible, setModalVisible] = useState(false)
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [actionType, setActionType] = useState<'aceptar' | 'revocar' | 'ver'>(
    'aceptar'
  )
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
        // Ya está aceptado: solo se lee, no se vuelve a pedir aceptarlo
        accionPrimaria: { texto: t('panel.ver_documento'), tipo: 'ver' as const },
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
    async (tipo: string, accion: 'aceptar' | 'revocar' | 'ver') => {
      if (accion === 'aceptar' || accion === 'ver') {
        setSelectedType(tipo)
        setActionType(accion)
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
    <View style={styles.contenedor}>
      <View style={styles.estadoGeneral}>
        <Icon
          name={tieneAccionesRequeridas ? 'exclamation-circle' : 'check-circle'}
          size={14}
          color={tieneAccionesRequeridas ? COLOR.ALERTA : COLOR.EXITO}
        />
        <Text style={styles.estadoTexto}>
          {tieneAccionesRequeridas ? t('panel.pendientes') : t('panel.al_dia')}
        </Text>
      </View>

      <View style={styles.lista}>
        {consentimientosVisibles.map(({ tipo, consent }, indice) => {
          const visual = getEstadoVisual(consent)
          const titulo = consent?.titulo || tipo
          const ocupado = cargandoAccion && selectedType === tipo

          return (
            <View
              key={tipo}
              style={[styles.fila, indice > 0 && styles.filaSeparada]}
            >
              <View style={styles.filaCabecera}>
                <Icon name={visual.icono} size={18} color={visual.iconoColor} />
                <View style={styles.filaTexto}>
                  <Text style={styles.documentoTitulo}>{titulo}</Text>
                  <Text style={styles.descripcionLabel}>
                    <Text style={{ color: visual.iconoColor }}>
                      {visual.estado}
                    </Text>
                    {/* "Autorizado" + "Autorizado el 28 oct" no se repite */}
                    {visual.descripcion.startsWith(visual.estado)
                      ? visual.descripcion.slice(visual.estado.length)
                      : visual.descripcion
                        ? ` · ${visual.descripcion}`
                        : ''}
                  </Text>
                </View>
              </View>

              <View style={styles.acciones}>
                {visual.accionPrimaria && (
                  <Pressable
                    disabled={ocupado}
                    onPress={() =>
                      handleAccion(tipo, visual.accionPrimaria!.tipo)
                    }
                    hitSlop={8}
                  >
                    <Text style={styles.accionPrimaria}>
                      {ocupado ? '…' : visual.accionPrimaria.texto}
                    </Text>
                  </Pressable>
                )}
                {visual.accionSecundaria && (
                  <Pressable
                    disabled={ocupado}
                    onPress={() =>
                      handleAccion(tipo, visual.accionSecundaria!.tipo)
                    }
                    hitSlop={8}
                  >
                    <Text style={styles.accionSecundaria}>
                      {visual.accionSecundaria.texto}
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
          )
        })}
      </View>

      {/* Lectura del documento: aceptar solo se ofrece si falta aceptar */}
      {selectedType && (
        <ModalLeerConsentimiento
          visible={modalVisible}
          tipoConsentimiento={selectedType}
          onClose={() => setModalVisible(false)}
          onAceptar={
            actionType === 'aceptar'
              ? () => handleAceptarDesdeModal(selectedType)
              : undefined
          }
          cargando={cargandoAccion}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  contenedor: {
    gap: 10,
  },
  estadoGeneral: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },
  estadoTexto: {
    fontSize: 12,
    color: COLOR.SUBTEXTO,
    flex: 1,
  },
  lista: {
    backgroundColor: COLOR.BLOQUE,
    borderWidth: 1,
    borderColor: COLOR.BORDE,
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  fila: {
    paddingVertical: 14,
    gap: 10,
  },
  filaSeparada: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLOR.BORDE,
  },
  filaCabecera: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  filaTexto: {
    flex: 1,
    gap: 2,
  },
  documentoTitulo: {
    fontSize: 15,
    fontWeight: '600',
    color: COLOR.TEXTO,
  },
  descripcionLabel: {
    fontSize: 12,
    color: COLOR.SUBTEXTO,
  },
  acciones: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    paddingLeft: 36,
  },
  accionPrimaria: {
    fontSize: 13,
    fontWeight: '600',
    color: COLOR.PRIMARIO,
  },
  accionSecundaria: {
    fontSize: 13,
    color: COLOR.SUBTEXTO,
  },
})
