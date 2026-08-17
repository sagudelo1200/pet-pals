import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { COLOR } from '@/constants'
import { EventoPaseo, PayloadBitacora } from '@/models/Paseo'

interface TimelineHistoriaPaseoProps {
  bitacoras: (EventoPaseo & { id: string })[]
  cargando?: boolean
}

const ICONOS_ACCIONES: Record<string, string> = {
  necesidades: '💩',
  corrio: '🏃',
  juego: '🦴',
  agua: '💧',
  descanso: '😴',
  socializacion_perros: '🐕',
  socializacion_personas: '👶',
  miedo: '😨',
  comio: '🍖',
  'lugar:parque': '🌳',
  'lugar:sendero': '🌲',
  'lugar:rio': '🌊',
  'lugar:casa': '🏡',
  'lugar:pet_friendly': '☕',
  'lugar:zona_perros': '🐕',
  'lugar:mirador': '🏞',
  'lugar:vehiculo': '🚗',
  'lugar:inicio_caminata': '🚶',
  'recuerdo:foto': '📸',
  'recuerdo:video': '🎥',
  'recuerdo:voz': '🎤',
  'recuerdo:nota': '✍️',
  'incidente:asustó': '😨',
  'incidente:lesion': '🤕',
  'incidente:pelea': '🐕',
  'incidente:malestar': '🤢',
  'incidente:trafico': '🚗',
  'incidente:lluvia': '🌧',
  'incidente:acceso_cerrado': '🚫',
  'incidente:contacto': '📞',
  'incidente:emergencia': '🚨',
}

const LABELS_ACCIONES: Record<string, string> = {
  necesidades: 'Hizo sus necesidades',
  corrio: 'Corrió mucho',
  juego: 'Jugó',
  agua: 'Tomó agua',
  descanso: 'Descansó',
  socializacion_perros: 'Saludó otros perros',
  socializacion_personas: 'Saludó personas',
  miedo: 'Se asustó',
  comio: 'Comió',
  'lugar:parque': 'Llegamos al parque',
  'lugar:sendero': 'Entramos a sendero',
  'lugar:rio': 'Visitamos un río/lago',
  'lugar:casa': 'Regresamos a casa',
  'lugar:pet_friendly': 'Visitamos lugar pet friendly',
  'lugar:zona_perros': 'Entramos a zona de perros',
  'lugar:mirador': 'Llegamos al mirador',
  'lugar:vehiculo': 'Subimos al carro',
  'lugar:inicio_caminata': 'Empezamos a caminar',
  'recuerdo:foto': 'Capturamos una foto',
  'recuerdo:video': 'Grabamos un video',
  'recuerdo:voz': 'Nota de voz',
  'recuerdo:nota': 'Nota escrita',
  'incidente:asustó': 'Se asustó',
  'incidente:lesion': 'Se lastimó',
  'incidente:pelea': 'Pelea con otro perro',
  'incidente:malestar': 'Presentó malestar',
  'incidente:trafico': 'Tráfico peligroso',
  'incidente:lluvia': 'Lluvia',
  'incidente:acceso_cerrado': 'Acceso cerrado',
  'incidente:contacto': 'Necesitó contacto',
  'incidente:emergencia': 'Emergencia',
}

const formatearHora = (fecha: Date | number): string => {
  const d = fecha instanceof Date ? fecha : new Date(fecha)
  const horas = String(d.getHours()).padStart(2, '0')
  const minutos = String(d.getMinutes()).padStart(2, '0')
  return `${horas}:${minutos}`
}

const TarjetaBitacora: React.FC<{ bitacora: EventoPaseo & { id: string } }> = ({
  bitacora,
}) => {
  const payload = bitacora.payload as PayloadBitacora

  const icono = ICONOS_ACCIONES[payload.accion] || '📝'
  const label =
    LABELS_ACCIONES[payload.accion] || payload.accion || 'Momento registrado'
  const hora = formatearHora(bitacora.creado_en)

  return (
    <View style={styles.tarjeta}>
      <View style={styles.linea} />

      <View style={styles.contenido}>
        <View style={styles.encabezado}>
          <Text style={styles.hora}>{hora}</Text>
        </View>

        <View style={styles.cuerpo}>
          <Text style={styles.icono}>{icono}</Text>
          <Text style={styles.texto}>{label}</Text>
        </View>

        {payload.nota && <Text style={styles.nota}>"{payload.nota}"</Text>}
      </View>
    </View>
  )
}

export const TimelineHistoriaPaseo: React.FC<TimelineHistoriaPaseoProps> = ({
  bitacoras,
  cargando = false,
}) => {
  const { t: _t } = useTranslation()

  if (cargando) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" color={COLOR.PRIMARIO} />
      </View>
    )
  }

  if (!bitacoras || bitacoras.length === 0) {
    return (
      <View style={styles.vacio}>
        <Text style={styles.textoVacio}>
          Aún no hay momentos registrados en este paseo.
        </Text>
        <Text style={styles.textoVacioDetalle}>
          Toca ➕ para empezar a contar la historia.
        </Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Historia del paseo</Text>
      <FlatList
        data={bitacoras}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <TarjetaBitacora bitacora={item} />}
        scrollEnabled={false}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  titulo: {
    fontSize: 18,
    fontWeight: '700',
    color: COLOR.TEXTO,
    marginBottom: 16,
  },
  centrado: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  vacio: {
    paddingVertical: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  textoVacio: {
    fontSize: 16,
    fontWeight: '600',
    color: COLOR.TEXTO,
    textAlign: 'center',
    marginBottom: 8,
  },
  textoVacioDetalle: {
    fontSize: 14,
    color: COLOR.SUBTEXTO,
    textAlign: 'center',
  },
  tarjeta: {
    marginBottom: 16,
    position: 'relative',
  },
  linea: {
    position: 'absolute',
    left: 12,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: COLOR.ENFASIS,
  },
  contenido: {
    marginLeft: 36,
    backgroundColor: COLOR.BLOQUE,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  encabezado: {
    marginBottom: 8,
  },
  hora: {
    fontSize: 12,
    fontWeight: '600',
    color: COLOR.SUBTEXTO,
  },
  cuerpo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icono: {
    fontSize: 24,
    marginRight: 8,
  },
  texto: {
    fontSize: 15,
    fontWeight: '500',
    color: COLOR.TEXTO,
    flex: 1,
  },
  nota: {
    fontSize: 13,
    color: COLOR.SUBTEXTO,
    fontStyle: 'italic',
    marginTop: 8,
    paddingLeft: 32,
  },
})
