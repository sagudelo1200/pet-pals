/**
 * ModalResumenDeMascotas
 * Lo que el cuidador necesita saber de las mascotas del paseo, para leerlo
 * antes de salir (al aceptar, en camino y al llegar a la puerta).
 */
import React from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { COLOR } from '@/constants'
import { ResumenDeMascota } from '@/components/mascota/ResumenDeMascota'
import { useExpedientes } from '@/hooks/mascotas/useExpedientes'
import { listarNombres } from '@/logic/paseos/nombresMascotas'
import { esPrimerPaseo } from '@/logic/paseos/panel'

interface Props {
  visible: boolean
  cuidadorId: string
  mascotas: Array<{ id: string; nombre: string }>
  onCerrar: () => void
}

export const ModalResumenDeMascotas: React.FC<Props> = ({
  visible,
  cuidadorId,
  mascotas,
  onCerrar,
}) => {
  const { t } = useTranslation(['paseos'])
  // Solo escucha mientras está abierto
  const { expedientes } = useExpedientes(visible ? mascotas.map(m => m.id) : [])

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCerrar}
    >
      <Pressable style={styles.fondo} onPress={onCerrar} />
      <View style={styles.hoja}>
        <Text style={styles.titulo}>
          {t('paseos:panel.conocer_titulo', {
            nombres: listarNombres(mascotas.map(m => m.nombre)),
          })}
        </Text>
        <ScrollView showsVerticalScrollIndicator={false}>
          {mascotas.map(m => (
            <ResumenDeMascota
              key={m.id}
              nombre={m.nombre || t('paseos:llegada.mascota_sin_nombre')}
              expediente={expedientes[m.id]}
              primerPaseo={esPrimerPaseo(expedientes[m.id], cuidadorId)}
            />
          ))}
        </ScrollView>
        <Pressable style={styles.cerrar} onPress={onCerrar}>
          <Text style={styles.cerrarTexto}>
            {t('paseos:momentos.acciones.cerrar')}
          </Text>
        </Pressable>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  hoja: {
    maxHeight: '75%',
    backgroundColor: COLOR.BASE,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLOR.BORDE,
  },
  titulo: {
    fontSize: 18,
    fontWeight: '700',
    color: COLOR.TEXTO,
    marginBottom: 12,
  },
  cerrar: {
    backgroundColor: COLOR.INACTIVO,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  cerrarTexto: { fontSize: 16, fontWeight: '600', color: COLOR.SUBTEXTO },
})
