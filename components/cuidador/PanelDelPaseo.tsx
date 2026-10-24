/**
 * PanelDelPaseo
 * Lo que ve el cuidador mientras pasea, en lugar del mapa (el seguimiento por
 * GPS sigue su curso; el que lo mira es el tutor):
 *  1. La acción principal: registrar lo que pasa (momentos), con acceso
 *     directo a cada grupo y a Emergencia.
 *  2. Contacto y orientación: escribir al tutor y "cómo volver".
 *  3. Lo que necesita saber de las mascotas que lleva (su resumen).
 *  4. Estado: tiempo restante y que su ubicación se está compartiendo.
 */
import React from 'react'
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { COLOR } from '@/constants'
import { ResumenDeMascota } from '@/components/mascota/ResumenDeMascota'
import { useExpedientes } from '@/hooks/mascotas/useExpedientes'
import { listarNombres } from '@/logic/paseos/nombresMascotas'
import { GRUPOS_DEL_MENU } from '@/logic/paseos/momentos'
import {
  esPrimerPaseo,
  minutosRestantes,
  urlParaVolver,
  type Punto,
} from '@/logic/paseos/panel'
import type { GrupoMomento } from '@/functions/src/compartido/expediente'

interface Props {
  cuidadorId: string
  mascotas: Array<{ id: string; nombre: string }>
  /** Dirección donde se entrega la mascota (para "cómo volver"). */
  destino?: Punto | null
  duracionEstimada?: number
  tiempoTranscurrido: string
  /** Hueco que dejan el encabezado y el panel inferior. */
  espacioArriba: number
  espacioAbajo: number
  onRegistrar: (_pantalla: GrupoMomento | 'principal') => void
  onEscribirAlTutor: () => void
}

export const PanelDelPaseo: React.FC<Props> = ({
  cuidadorId,
  mascotas,
  destino,
  duracionEstimada,
  tiempoTranscurrido,
  espacioArriba,
  espacioAbajo,
  onRegistrar,
  onEscribirAlTutor,
}) => {
  const { t } = useTranslation(['paseos'])
  const { expedientes } = useExpedientes(mascotas.map(m => m.id))
  const nombres = listarNombres(mascotas.map(m => m.nombre))
  const restantes = minutosRestantes(duracionEstimada, tiempoTranscurrido)

  return (
    <ScrollView
      style={styles.fondo}
      contentContainerStyle={{
        paddingTop: espacioArriba,
        paddingBottom: espacioAbajo + 16,
        paddingHorizontal: 16,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. Acción principal */}
      <Pressable
        style={styles.principal}
        onPress={() => onRegistrar('principal')}
      >
        <Text style={styles.principalTitulo}>
          ➕ {t('paseos:panel.registrar_titulo')}
        </Text>
        <Text style={styles.principalSubtitulo}>
          {t('paseos:panel.registrar_subtitulo', { nombres })}
        </Text>
      </Pressable>

      <View style={styles.grupos}>
        {GRUPOS_DEL_MENU.map(grupo => (
          <Pressable
            key={grupo}
            style={[
              styles.grupo,
              grupo === 'emergencia' && styles.grupoCritico,
            ]}
            onPress={() => onRegistrar(grupo)}
          >
            <Text
              style={[
                styles.grupoTexto,
                grupo === 'emergencia' && styles.grupoTextoCritico,
              ]}
            >
              {t(`paseos:momentos.grupos.${grupo}.titulo`)}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* 2. Contacto y orientación */}
      <View style={styles.acciones}>
        <Pressable style={styles.accion} onPress={onEscribirAlTutor}>
          <Text style={styles.accionTexto}>
            💬 {t('paseos:panel.escribir_al_tutor')}
          </Text>
        </Pressable>
        {destino && (
          <Pressable
            style={styles.accion}
            onPress={() => void Linking.openURL(urlParaVolver(destino))}
          >
            <Text style={styles.accionTexto}>
              🧭 {t('paseos:panel.como_volver')}
            </Text>
          </Pressable>
        )}
      </View>

      {/* 3. Lo que necesita saber */}
      <Text style={styles.titulo}>
        {t('paseos:panel.conocer_titulo', { nombres })}
      </Text>
      {mascotas.map(m => (
        <ResumenDeMascota
          key={m.id}
          nombre={m.nombre || t('paseos:llegada.mascota_sin_nombre')}
          expediente={expedientes[m.id]}
          primerPaseo={esPrimerPaseo(expedientes[m.id], cuidadorId)}
        />
      ))}

      {/* 4. Estado */}
      <View style={styles.estado}>
        {restantes !== undefined && (
          <Text style={styles.estadoTexto}>
            ⏳{' '}
            {restantes >= 0
              ? t('paseos:panel.restante', { minutos: restantes })
              : t('paseos:panel.excedido')}
          </Text>
        )}
        <Text style={styles.estadoTexto}>
          📍 {t('paseos:panel.compartiendo_ubicacion')}
        </Text>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  fondo: { ...StyleSheet.absoluteFillObject, backgroundColor: COLOR.BASE },
  principal: {
    backgroundColor: COLOR.PRIMARIO,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 18,
  },
  principalTitulo: { fontSize: 20, fontWeight: '800', color: COLOR.BASE },
  principalSubtitulo: { fontSize: 13, color: COLOR.BASE, marginTop: 4 },
  grupos: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  grupo: {
    flexBasis: '48%',
    flexGrow: 1,
    backgroundColor: COLOR.BLOQUE,
    borderColor: COLOR.BORDE,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  grupoCritico: {
    borderColor: COLOR.ERROR,
    backgroundColor: `${COLOR.ERROR}15`,
  },
  grupoTexto: { fontSize: 14, fontWeight: '600', color: COLOR.TEXTO },
  grupoTextoCritico: { color: COLOR.ERROR },
  acciones: { flexDirection: 'row', gap: 8, marginTop: 10 },
  accion: {
    flex: 1,
    borderColor: COLOR.PRIMARIO,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  accionTexto: { fontSize: 14, fontWeight: '600', color: COLOR.PRIMARIO },
  titulo: {
    fontSize: 16,
    fontWeight: '700',
    color: COLOR.TEXTO,
    marginTop: 22,
    marginBottom: 10,
  },
  estado: { marginTop: 8, gap: 4 },
  estadoTexto: { fontSize: 13, color: COLOR.SUBTEXTO },
})
