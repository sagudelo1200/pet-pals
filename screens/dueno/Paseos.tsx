import { COLOR } from '@/constants'
import React, { useState } from 'react'
import { StyleSheet, ScrollView, View, Text, Alert } from 'react-native'
import { Card, Button, Spacer, Chip, Badge } from '@/components/ui'

const Paseos: React.FC = () => {
  const [solicitando, setSolicitando] = useState(false)
  const [duracion, setDuracion] = useState<'30' | '45' | '60'>('30')
  const [tamano, setTamano] = useState<'S' | 'M' | 'L'>('S')

  const solicitarPaseo = () => {
    setSolicitando(true)
    setTimeout(() => {
      setSolicitando(false)
      Alert.alert(
        'Paseo solicitado',
        `Duración: ${duracion} min • Tamaño: ${tamano}\n\r
        ¡Un paseador se pondrá en contacto contigo pronto!`
      )
    }, 900)
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Paseos</Text>

        {/* Configurar y solicitar */}
        <Card
          title="Solicitar paseo"
          subtitle="Configura tu paseo"
          style={styles.section}
        >
          <Text style={styles.label}>Duración</Text>
          <View style={styles.rowWrap}>
            <Chip
              label="30 min"
              selected={duracion === '30'}
              onPress={() => setDuracion('30')}
            />
            <Spacer horizontal size={8} />
            <Chip
              label="45 min"
              selected={duracion === '45'}
              onPress={() => setDuracion('45')}
            />
            <Spacer horizontal size={8} />
            <Chip
              label="60 min"
              selected={duracion === '60'}
              onPress={() => setDuracion('60')}
            />
          </View>

          <Spacer size={12} />

          <Text style={styles.label}>Tamaño del perro</Text>
          <View style={styles.rowWrap}>
            <Chip
              label="S"
              selected={tamano === 'S'}
              onPress={() => setTamano('S')}
            />
            <Spacer horizontal size={8} />
            <Chip
              label="M"
              selected={tamano === 'M'}
              onPress={() => setTamano('M')}
            />
            <Spacer horizontal size={8} />
            <Chip
              label="L"
              selected={tamano === 'L'}
              onPress={() => setTamano('L')}
            />
          </View>

          <Spacer size={12} />

          <Button
            title={solicitando ? 'Solicitando…' : 'Solicitar paseo'}
            loading={solicitando}
            onPress={solicitarPaseo}
            fullWidth
          />
        </Card>

        {/* Próximos paseos */}
        <Card
          title="Próximos paseos"
          subtitle="Ejemplo de listado"
          style={styles.section}
        >
          <View style={{ rowGap: 8 }}>
            {[1, 2, 3].map(i => (
              <View
                key={i}
                style={{ flexDirection: 'row', alignItems: 'center' }}
              >
                <Text style={{ color: COLOR.TEXTO, flex: 1 }}>
                  Paseo #{i} - Mañana 9:00
                </Text>
                <Badge label="Confirmado" variant="exito" size="sm" />
                <Spacer horizontal size={8} />
                <Button
                  title="Detalles"
                  size="sm"
                  onPress={() => Alert.alert('Detalles', `Paseo #${i}`)}
                />
              </View>
            ))}
          </View>
        </Card>

        {/* Historial */}
        <Card
          title="Historial reciente"
          subtitle="Últimos 7 días"
          style={styles.section}
        >
          <View style={{ rowGap: 8 }}>
            {[
              { t: 'Ayer 5:00 PM', s: 'Completado' as const },
              { t: 'Lun 11:00 AM', s: 'Cancelado' as const },
            ].map((r, idx) => (
              <View
                key={idx}
                style={{ flexDirection: 'row', alignItems: 'center' }}
              >
                <Text style={{ color: COLOR.TEXTO, flex: 1 }}>
                  Paseo - {r.t}
                </Text>
                <Badge
                  label={r.s}
                  variant={r.s === 'Completado' ? 'exito' : 'alerta'}
                  size="sm"
                />
              </View>
            ))}
          </View>
        </Card>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLOR.BASE,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLOR.TEXTO,
    marginBottom: 12,
  },
  map: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    backgroundColor: COLOR.SECUNDARIO,
    marginBottom: 16,
  },
  section: {
    marginBottom: 16,
  },
  rowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap' as const,
  },
  label: {
    color: COLOR.SUBTEXTO,
    marginBottom: 8,
  },
})

export default Paseos
