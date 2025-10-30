// screens/ColorDemo.tsx
import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Text, theme } from 'galio-framework';
import { COLOR } from '@/constants';

type ColorKey = keyof typeof COLOR;

const ColorDemo: React.FC = () => {
  const colorKeys = Object.keys(COLOR) as ColorKey[];

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>🎨 Demo de Colores</Text>
          <Text style={styles.subtitle}>Vista previa y ejemplos de uso del tema</Text>
        </View>

        {/* Lista de colores */}
        {colorKeys.map((key) => (
          <View key={key} style={styles.colorRow}>
            <View style={[styles.colorPreview, { backgroundColor: COLOR[key] }]} />
            <View style={styles.colorInfo}>
              <Text style={styles.colorName}>{key}</Text>
              <Text style={styles.colorHex}>{COLOR[key]}</Text>
            </View>
          </View>
        ))}

        {/* Separador */}
        <View style={{ height: theme.SIZES.BASE }} />

        {/* Ejemplos prácticos */}
        <Text style={styles.sectionTitle}>🧩 Aplicaciones / Componentes</Text>

        {/* Botones */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Botones</Text>
          <TouchableOpacity style={[styles.btn, { backgroundColor: COLOR.PRIMARIO }]}>
            <Text style={styles.btnText}>Primario</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.btn, { backgroundColor: COLOR.EXITO }]}>
            <Text style={styles.btnText}>Éxito</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.btn, { backgroundColor: COLOR.ERROR }]}>
            <Text style={styles.btnText}>Error</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.btn, { backgroundColor: COLOR.INFO }]}>
            <Text style={styles.btnText}>Info</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.btn, { backgroundColor: COLOR.ALERTA }]}>
            <Text style={[styles.btnText, { color: COLOR.BASE }]}>Alerta</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.btn, { backgroundColor: COLOR.INACTIVO }]}>
            <Text style={styles.btnText}>Inactivo</Text>
          </TouchableOpacity>
        </View>

        {/* Badges / Chips */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Badges / Chips</Text>
          <View style={styles.row}>
            <View style={[styles.chip, { backgroundColor: COLOR.PRIMARIO }]}>
              <Text style={styles.chipText}>Nuevo</Text>
            </View>
            <View style={[styles.chip, { backgroundColor: COLOR.ENFASIS }]}>
              <Text style={styles.chipText}>Enfasis</Text>
            </View>
            <View style={[styles.chip, { backgroundColor: COLOR.EXITO }]}>
              <Text style={styles.chipText}>Confirmado</Text>
            </View>
            <View style={[styles.chip, { backgroundColor: COLOR.ERROR }]}>
              <Text style={styles.chipText}>Fallo</Text>
            </View>
            <View style={[styles.chip, { backgroundColor: COLOR.INFO }]}>
              <Text style={styles.chipText}>Info</Text>
            </View>
            <View style={[styles.chip, { backgroundColor: COLOR.ALERTA }]}>
              <Text style={[styles.chipText, { color: COLOR.BASE }]}>Cuidado</Text>
            </View>
            <View style={[styles.chip, { backgroundColor: COLOR.INACTIVO }]}>
              <Text style={styles.chipText}>Deshabilitado</Text>
            </View>
          </View>
        </View>

        {/* Alertas */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Alertas / Mensajes</Text>

          <View style={[styles.alert, { backgroundColor: COLOR.EXITO, borderColor: COLOR.BORDE }]}>
            <Text style={styles.alertText}>✔ Acción completada</Text>
          </View>

          <View style={[styles.alert, { backgroundColor: COLOR.ERROR, borderColor: COLOR.BORDE }]}>
            <Text style={styles.alertText}>✖ Ha ocurrido un error</Text>
          </View>

          <View style={[styles.alert, { backgroundColor: COLOR.INFO, borderColor: COLOR.BORDE }]}>
            <Text style={styles.alertText}>ℹ Información importante</Text>
          </View>

          <View style={[styles.alert, { backgroundColor: COLOR.ALERTA, borderColor: COLOR.BORDE }]}>
            <Text style={[styles.alertText, { color: COLOR.BASE }]}>⚠ Advertencia</Text>
          </View>
        </View>

        {/* Tarjetas / Borde */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Tarjetas / Borde</Text>

          <View style={[styles.sampleCard, { backgroundColor: COLOR.BLOQUE, borderColor: COLOR.BORDE }]}>
            <Text style={styles.cardSampleTitle}>Título de tarjeta</Text>
            <Text style={styles.cardSampleBody}>Este es un ejemplo de tarjeta usando BLOQUE y BORDE.</Text>
          </View>

          <View style={[styles.sampleCard, { backgroundColor: COLOR.SECUNDARIO, borderColor: COLOR.BORDE }]}>
            <Text style={styles.cardSampleTitle}>Sección secundaria</Text>
            <Text style={styles.cardSampleBody}>La jerarquía se marca con tonos más oscuros.</Text>
          </View>
        </View>

        {/* Texto y jerarquía */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Textos / Jerarquía</Text>
          <Text style={[styles.sampleText, { color: COLOR.TEXTO }]}>Texto principal (TEXTO)</Text>
          <Text style={[styles.sampleTextSmall, { color: COLOR.SUBTEXTO }]}>Subtexto y descripciones (SUBTEXTO)</Text>
          <Text style={[styles.sampleMuted, { color: COLOR.INACTIVO }]}>Estado inactivo (INACTIVO)</Text>
        </View>

        <View style={{ height: 90 }} />
      </ScrollView>
    </View>
  );
};

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

  /* color list */
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
    marginBottom: theme.SIZES.BASE / 2,
  },

  /* cards */
  card: {
    backgroundColor: COLOR.SECUNDARIO,
    padding: theme.SIZES.BASE,
    borderRadius: 12,
    marginBottom: theme.SIZES.BASE,
    borderWidth: 1,
    borderColor: COLOR.BORDE,
  },
  cardTitle: { color: COLOR.TEXTO, fontWeight: '700', marginBottom: 10 },

  /* buttons */
  btn: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  btnText: { color: COLOR.TEXTO, fontWeight: '700' },

  /* chips */
  row: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    marginRight: 8,
    marginBottom: 8,
  },
  chipText: { color: COLOR.BASE, fontWeight: '700' },

  /* alerts */
  alert: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
  },
  alertText: { color: COLOR.TEXTO, fontWeight: '700' },

  /* sample cards */
  sampleCard: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
  },
  cardSampleTitle: { color: COLOR.TEXTO, fontWeight: '700', marginBottom: 6 },
  cardSampleBody: { color: COLOR.SUBTEXTO },

  /* textos */
  sampleText: { fontSize: 16, marginBottom: 6 },
  sampleTextSmall: { fontSize: 14, marginBottom: 6 },
  sampleMuted: { fontSize: 13 },
});

export default ColorDemo;
