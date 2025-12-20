// screens/tutor/ColorDemo.tsx
import React, { useState } from 'react'
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native'
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
  Mapa,
} from '@/components/ui'
import Screen from '@/components/ui/Screen'
import { ServicioMascota } from '@/services/firebase'
import { ServicioUbicacion } from '@/services/firebase/ubicacion'
import { ServicioAuth } from '@/services/firebase/auth'
import type { Mascota } from '@/models/Mascota'
import { Alert } from 'react-native'

type ColorKey = keyof typeof COLOR

const ColorDemo: React.FC = () => {
  const colorKeys = Object.keys(COLOR) as ColorKey[]
  const [creandoMascota, setCreandoMascota] = useState(false)

  const crearMascotaSemilla = async () => {
    const currentUser = ServicioAuth.obtenerUsuarioActual()
    if (!currentUser) {
      Alert.alert('Error', 'Debes estar autenticado para crear una mascota')
      return
    }

    setCreandoMascota(true)

    const mascotaData: Omit<
      Mascota,
      'id' | 'creado_en' | 'actualizado_en' | 'creado_por' | 'actualizado_por'
    > = {
      nombre: 'Max',
      foto: 'https://cdn.pixabay.com/photo/2023/02/20/23/11/dog-7803251_1280.jpg',
      especie: 'perro',
      raza: 'Border Collie',
      fecha_nacimiento: new Date('2020-03-15'),
      genero: 'macho',
      tamano: 'mediano',
      peso: 25,
      esterilizado: true,
      vacunas: [
        { nombre: 'Rabia', fecha: new Date('2023-06-10') },
        { nombre: 'Parvovirus', fecha: new Date('2023-06-10') },
        { nombre: 'Moquillo', fecha: new Date('2023-06-10') },
        { nombre: 'Hepatitis', fecha: new Date('2023-06-10') },
      ],
      condiciones_salud: [
        'Alergia leve al polen',
        'Displasia de cadera grado 1',
      ],
      historial_medico:
        'Cirugía de esterilización realizada en 2021. Chequeo anual completo en junio 2023 con resultados normales. Tratamiento preventivo contra pulgas y garrapatas al día.',
      nivel_energia: 'alto',
      condiciones_comportamiento: [
        'Sociable con otros perros',
        'Amigable con niños',
        'Puede tirar de la correa',
        'Le encanta nadar',
      ],
      preferencias_paseo: [
        'Prefiere parques con áreas abiertas',
        'Le gusta jugar con pelota',
        'Necesita al menos 45 minutos de ejercicio',
        'Disfruta de caminatas matutinas',
      ],
      descripcion:
        'Max es un Border Collie de 4 años, muy enérgico y cariñoso. Le encanta jugar y correr, especialmente en espacios abiertos. Es excelente con niños y otros perros. Necesita ejercicio diario para mantenerse feliz y saludable.',
      activo: true,
    }

    try {
      const resultado = await ServicioMascota.crear(mascotaData)

      if (resultado.success && resultado.data) {
        Alert.alert(
          '✅ Mascota creada',
          `${resultado.data.nombre} ha sido creado exitosamente.\n\nID: ${resultado.data.id}`,
          [{ text: 'OK' }]
        )
      } else {
        Alert.alert('Error', resultado.error || 'No se pudo crear la mascota')
      }
    } catch (error) {
      Alert.alert('Error', 'Ocurrió un error inesperado')
      console.error('Error creando mascota:', error)
    } finally {
      setCreandoMascota(false)
    }
  }

  const [creandoUbicacion, setCreandoUbicacion] = useState(false)

  const crearUbicacionValida = async () => {
    setCreandoUbicacion(true)
    try {
      const payload: any = {
        proveedor: 'google',
        proveedor_place_id: 'place_123_test',
        direccion_formateada: 'Cra 7 #45, Bogotá, Colombia',
        coordenadas: { lat: 4.653, lng: -74.0608 },
        componentes_raw: [
          { long_name: 'Cra 7', types: ['route'] },
          { long_name: '45', types: ['street_number'] },
          { long_name: 'Chapinero', types: ['neighborhood'] },
          { long_name: 'Bogotá', types: ['locality'] },
          { long_name: 'Cundinamarca', types: ['administrative_area_level_1'] },
          { long_name: 'Colombia', types: ['country'] },
        ],
        alias: 'Casa',
        instrucciones: 'Portón negro',
        metadata: { source: 'debug' },
        estado: 'verificada',
      }
      console.log('DEBUG: crearUbicacionValida payload', payload)
      const res = await ServicioUbicacion.crearSiNoExiste(payload)
      console.log('DEBUG: ServicioUbicacion.crearSiNoExiste res', res)
      if (res.success && res.data) {
        Alert.alert('OK', `Ubicación creada/recuperada id: ${res.data.id}`)
      } else {
        Alert.alert('Error', String(res.error))
      }
    } catch (err) {
      console.log('ERROR crearUbicacionValida', err)
      Alert.alert('Error', 'Ocurrió un error')
    } finally {
      setCreandoUbicacion(false)
    }
  }

  const crearUbicacionInvalida = async () => {
    try {
      const payload: any = {
        proveedor: 'unknown',
        proveedor_place_id: '',
        direccion_formateada: '',
        coordenadas: { lat: null, lng: null },
      }
      console.log('DEBUG: crearUbicacionInvalida payload', payload)
      const res = await ServicioUbicacion.crearSiNoExiste(payload)
      console.log(
        'DEBUG: ServicioUbicacion.crearSiNoExiste res (invalida)',
        res
      )
      Alert.alert(
        res.success ? 'Unexpected OK' : 'Error esperado',
        String(res.error)
      )
    } catch (err) {
      console.log('ERROR crearUbicacionInvalida', err)
      Alert.alert('Error', 'Ocurrió un error inesperado')
    }
  }

  return (
    <Screen
      includeTopInset
      scroll
      style={styles.container}
      contentContainerStyle={styles.content}
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

        <TouchableOpacity style={[styles.btn, { backgroundColor: COLOR.INFO }]}>
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
          right={<Icon name="chevron-right" color={COLOR.SUBTEXTO} size={16} />}
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
          <Badge label="Primario" variant="primario" size="sm" />
          <Spacer horizontal size={8} />
          <Badge label="Éxito" variant="exito" size="md" />
          <Spacer horizontal size={8} />
          <Badge label="Error" variant="error" size="lg" />
          <Spacer horizontal size={8} />
          <Badge label="Info" variant="info" size="md" />
          <Spacer horizontal size={8} />
          <Badge label="Enfasis" variant="enfasis" />
        </View>
      </View>

      {/* Chip */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Chip</Text>
        <View style={styles.row}>
          <Chip label="Filtro (sm)" size="sm" onPress={() => {}} />
          <Spacer horizontal size={8} />
          <Chip
            label="Seleccionado (md)"
            size="md"
            selected
            onPress={() => {}}
          />
          <Spacer horizontal size={8} />
          <Chip
            label="Con icono (lg)"
            size="lg"
            leftIconName="paw"
            onPress={() => {}}
          />
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
        <Text style={{ color: COLOR.SUBTEXTO, marginBottom: 8 }}>Vertical</Text>
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
          title="Primario sm"
          size="sm"
          variant="primario"
          onPress={() => {}}
          fullWidth
        />
        <Spacer size={8} />
        <Button
          title="Primario md"
          size="md"
          variant="primario"
          onPress={() => {}}
          fullWidth
        />
        <Spacer size={8} />
        <Button
          title="Primario lg"
          size="lg"
          variant="primario"
          onPress={() => {}}
          fullWidth
        />
      </View>

      {/* Sección de Semillas */}
      <View style={{ height: 40 }} />
      <Text style={styles.sectionTitle}>🌱 Semillas (Datos de Prueba)</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Crear Mascota de Prueba</Text>
        <Text style={{ color: COLOR.SUBTEXTO, marginBottom: 12 }}>
          Crea una mascota completa con todos los campos poblados para pruebas.
        </Text>
        <Button
          title={creandoMascota ? 'Creando...' : '🐾 Crear Mascota "Max"'}
          variant="primario"
          onPress={crearMascotaSemilla}
          disabled={creandoMascota}
          fullWidth
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Debug Ubicaciones</Text>
        <Text style={{ color: COLOR.SUBTEXTO, marginBottom: 12 }}>
          Pruebas rápidas para crear/validar `Ubicacion` mediante el servicio.
        </Text>
        <Button
          title={creandoUbicacion ? 'Procesando...' : 'Crear ubicación válida'}
          variant="primario"
          onPress={crearUbicacionValida}
          disabled={creandoUbicacion}
          fullWidth
        />
        <Spacer size={8} />
        <Button
          title="Probar validación inválida"
          variant="inactivo"
          onPress={crearUbicacionInvalida}
          fullWidth
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Componente Mapa</Text>
        <Text style={{ color: COLOR.SUBTEXTO, marginBottom: 12 }}>
          Componente reutilizable de mapa (Coordenadas: Parque Virrey).
        </Text>
        <Mapa
          coordenadas={{ latitude: 4.6735, longitude: -74.0573 }}
          alto={250}
          marcador
        />
      </View>

      <Spacer size={180} />
    </Screen>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLOR.BASE },
  scrollView: { flex: 1 },
  content: {
    padding: theme.SIZES.BASE,
    paddingBottom: 180,
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
