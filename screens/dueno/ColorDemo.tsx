// screens/dueno/ColorDemo.tsx
import React from 'react'
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native'
import { Text, theme } from 'galio-framework'
import { COLOR } from '@/constants'
import {
  Divider,
  Spacer,
  Card as UICard,
  Avatar,
  Badge,
  Chip,
  EmptyState,
  Skeleton,
  Icon,
  Button,
} from '@/components/ui'

type ColorKey = keyof typeof COLOR

const ColorDemo: React.FC = () => {
  const colorKeys = Object.keys(COLOR) as ColorKey[]

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>🎨 Demo de Colores</Text>
          <Text style={styles.subtitle}>
            Vista previa y ejemplos de uso del tema
          </Text>
        </View>

        {colorKeys.map(key => (
          <View key={key} style={styles.colorRow}>
            <View
              style={[styles.colorPreview, { backgroundColor: COLOR[key] }]}
            />
            <View style={styles.colorInfo}>
              <Text style={styles.colorName}>{key}</Text>
              <Text style={styles.colorHex}>{COLOR[key]}</Text>
            </View>
          </View>
        ))}

        <View style={{ height: theme.SIZES.BASE }} />

        <Text style={styles.sectionTitle}>🧩 Aplicaciones / Componentes</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Botones</Text>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: COLOR.PRIMARIO }]}
          >
            <Text style={styles.btnText}>Primario</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: COLOR.EXITO }]}
          >
            <Text style={styles.btnText}>Éxito</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: COLOR.ERROR }]}
          >
            <Text style={styles.btnText}>Error</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: COLOR.INFO }]}
          >
            <Text style={styles.btnText}>Info</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: COLOR.ALERTA }]}
          >
            <Text style={[styles.btnText, { color: COLOR.BASE }]}>Alerta</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: COLOR.INACTIVO }]}
          >
            <Text style={styles.btnText}>Inactivo</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Alertas / Mensajes</Text>

          <View
            style={[
              styles.alert,
              { backgroundColor: COLOR.EXITO, borderColor: COLOR.BORDE },
            ]}
          >
            <Text style={styles.alertText}>✔ Acción completada</Text>
          </View>

          <View
            style={[
              styles.alert,
              { backgroundColor: COLOR.ERROR, borderColor: COLOR.BORDE },
            ]}
          >
            <Text style={styles.alertText}>✖ Ha ocurrido un error</Text>
          </View>

          <View
            style={[
              styles.alert,
              { backgroundColor: COLOR.INFO, borderColor: COLOR.BORDE },
            ]}
          >
            <Text style={styles.alertText}>ℹ Información importante</Text>
          </View>

          <View
            style={[
              styles.alert,
              { backgroundColor: COLOR.ALERTA, borderColor: COLOR.BORDE },
            ]}
          >
            <Text style={[styles.alertText, { color: COLOR.BASE }]}>
              ⚠ Advertencia
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Tarjetas / Borde</Text>

          <View
            style={[
              styles.sampleCard,
              { backgroundColor: COLOR.BLOQUE, borderColor: COLOR.BORDE },
            ]}
          >
            <Text style={styles.cardSampleTitle}>Título de tarjeta</Text>
            <Text style={styles.cardSampleBody}>
              Este es un ejemplo de tarjeta usando BLOQUE y BORDE.
            </Text>
          </View>

          <View
            style={[
              styles.sampleCard,
              { backgroundColor: COLOR.SECUNDARIO, borderColor: COLOR.BORDE },
            ]}
          >
            <Text style={styles.cardSampleTitle}>Sección secundaria</Text>
            <Text style={styles.cardSampleBody}>
              La jerarquía se marca con tonos más oscuros.
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Textos / Jerarquía</Text>
          <Text style={[styles.sampleText, { color: COLOR.TEXTO }]}>
            Texto principal (TEXTO)
          </Text>
          <Text style={[styles.sampleTextSmall, { color: COLOR.SUBTEXTO }]}>
            Subtexto y descripciones (SUBTEXTO)
          </Text>
          <Text style={[styles.sampleMuted, { color: COLOR.INACTIVO }]}>
            Estado inactivo (INACTIVO)
          </Text>
        </View>

        <View style={{ height: 90 }} />

        <Text style={styles.sectionTitle}>🧩 UI (Nuevos componentes)</Text>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Card</Text>
          <UICard
            title="Título de tarjeta"
            subtitle="Subtítulo opcional"
            right={
              <Icon name="chevron-right" color={COLOR.SUBTEXTO} size={16} />
            }
            footer={<Text style={{ color: COLOR.SUBTEXTO }}>Pie opcional</Text>}
          >
            <Text style={{ color: COLOR.TEXTO }}>
              Contenido libre dentro de la tarjeta.
            </Text>
          </UICard>
        </View>

        {/* Avatar */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Avatar</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Avatar name="Luna Perez" showStatus />
            <Spacer horizontal size={12} />
            <Avatar name="Max" statusColor={COLOR.ALERTA} showStatus />
            <Spacer horizontal size={12} />
            <Avatar />
          </View>
        </View>

        {/* Badge */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Badge</Text>
          <View style={styles.row}>
            <Badge label="Primario" variant="primario" />
            <Spacer horizontal size={8} />
            <Badge label="Éxito" variant="exito" />
            <Spacer horizontal size={8} />
            <Badge label="Error" variant="error" />
            <Spacer horizontal size={8} />
            <Badge label="Info" variant="info" />
            <Spacer horizontal size={8} />
            <Badge label="Enfasis" variant="enfasis" />
          </View>
        </View>

        {/* Chip */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Chip</Text>
          <View style={styles.row}>
            <Chip label="Filtro" onPress={() => {}} />
            <Spacer horizontal size={8} />
            <Chip label="Seleccionado" selected onPress={() => {}} />
            <Spacer horizontal size={8} />
            <Chip label="Con icono" leftIconName="paw" onPress={() => {}} />
            <Spacer horizontal size={8} />
            <Chip label="Cerrable" onPress={() => {}} onClose={() => {}} />
          </View>
        </View>

        {/* Divider & Spacer */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Divider & Spacer</Text>
          <Text style={{ color: COLOR.SUBTEXTO, marginBottom: 8 }}>
            Horizontal
          </Text>
          <Divider thickness={2} />
          <Spacer size={12} />
          <Text style={{ color: COLOR.SUBTEXTO, marginBottom: 8 }}>Dashed</Text>
          <Divider dashed thickness={2} />
          <Spacer size={12} />
          <Text style={{ color: COLOR.SUBTEXTO, marginBottom: 8 }}>
            Vertical
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ color: COLOR.TEXTO }}>A</Text>
            <Spacer horizontal size={8} />
            <Divider vertical thickness={2} inset={6} />
            <Spacer horizontal size={8} />
            <Text style={{ color: COLOR.TEXTO }}>B</Text>
          </View>
        </View>

        {/* Skeleton */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Skeleton</Text>
          <View style={{ marginBottom: 10 }}>
            <Skeleton width={'60%'} height={16} />
            <Spacer size={8} />
            <Skeleton width={'80%'} height={14} />
            <Spacer size={8} />
            <Skeleton width={'40%'} height={14} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Skeleton circle height={40} width={40} />
            <Spacer horizontal size={12} />
            <View style={{ flex: 1 }}>
              <Skeleton width={'70%'} height={14} />
              <Spacer size={6} />
              <Skeleton width={'40%'} height={12} />
            </View>
          </View>
        </View>

        {/* EmptyState */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>EmptyState</Text>
          <EmptyState
            title="Sin datos por ahora"
            description="Aún no tienes elementos aquí."
            actionLabel="Crear uno"
            onActionPress={() => {}}
          />
        </View>

        {/* Button (UI wrapper) opcional */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Button (UI)</Text>
          <Button
            title="Primario"
            variant="primario"
            onPress={() => {}}
            fullWidth
          />
          <Spacer size={8} />
          <Button title="Éxito" variant="exito" onPress={() => {}} fullWidth />
          <Spacer size={8} />
          <Button title="Error" variant="error" onPress={() => {}} fullWidth />
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLOR.BASE },
  scrollView: { flex: 1 },
  content: {
    padding: theme.SIZES.BASE,
    paddingBottom: Platform.OS === 'android' ? 120 : theme.SIZES.BASE * 2,
  },
  header: {
    marginBottom: theme.SIZES.BASE * 1.5,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLOR.TEXTO,
    marginBottom: 6,
  },
  subtitle: {
    color: COLOR.SUBTEXTO,
    fontSize: 13,
  },

  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLOR.SECUNDARIO,
    padding: theme.SIZES.BASE,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLOR.BORDE,
  },
  colorPreview: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 14,
    borderColor: COLOR.BORDE,
    borderWidth: 1,
  },
  colorInfo: { flex: 1 },
  colorName: { color: COLOR.TEXTO, fontWeight: '700', fontSize: 15 },
  colorHex: { color: COLOR.SUBTEXTO, marginTop: 4 },

  sectionTitle: {
    color: COLOR.TEXTO,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
  },

  card: {
    backgroundColor: COLOR.SECUNDARIO,
    borderColor: COLOR.BORDE,
    borderWidth: 1,
    borderRadius: 12,
    padding: theme.SIZES.BASE,
    marginBottom: theme.SIZES.BASE,
  },
  cardTitle: {
    color: COLOR.TEXTO,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  // buttons
  btn: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  btnText: { color: COLOR.TEXTO, fontWeight: '700' },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    marginRight: 6,
    marginBottom: 6,
  },
  chipText: { color: COLOR.TEXTO, fontWeight: '700' },

  alert: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
  },
  alertText: { color: COLOR.TEXTO, fontWeight: '700' },

  sampleCard: {
    backgroundColor: COLOR.BLOQUE,
    borderColor: COLOR.BORDE,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  cardSampleTitle: { color: COLOR.TEXTO, fontWeight: '700', marginBottom: 6 },
  cardSampleBody: { color: COLOR.SUBTEXTO },
  sampleText: { marginBottom: 4 },
  sampleTextSmall: { marginBottom: 4 },
  sampleMuted: { marginBottom: 4 },
})

export default ColorDemo
