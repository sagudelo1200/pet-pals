import React, { useState } from 'react'
import { StyleSheet, View, Platform, Alert, ScrollView } from 'react-native'
import { theme, Text } from 'galio-framework'
import { useNavigation } from '@react-navigation/native'
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import { TutorTabParamList } from '@/navigation/types'
import { useTranslation } from 'react-i18next'
import { COLOR } from '@/constants'
import {
  Card,
  Button,
  Divider,
  Spacer,
  Chip,
  Avatar,
  Badge,
  Icon,
} from '@/components/ui'
import Screen from '@/components/ui/Screen'
import ScreenHeader from '@/components/ui/ScreenHeader'
import type { Mascota } from '@/models/Mascota'
import { useMascotas } from '@/hooks/useMascotas'

type DashboardNavigationProp = BottomTabNavigationProp<TutorTabParamList>

const Dashboard: React.FC = () => {
  const _navigation = useNavigation<DashboardNavigationProp>()
  const { t } = useTranslation()

  const [creandoMascota, setCreandoMascota] = useState(false)

  const { crear } = useMascotas()

  const crearMascotaSemilla = async () => {
    setCreandoMascota(true)
    const mascotaData: Omit<
      Mascota,
      'id' | 'creado_en' | 'actualizado_en' | 'creado_por' | 'actualizado_por'
    > = {
      nombre: 'Cocoa',
      foto: 'https://cdn.pixabay.com/photo/2023/02/20/23/11/dog-7803251_1280.jpg',
      especie: 'perro',
      raza: 'Border Collie',
      fecha_nacimiento: new Date('2019-07-19'),
      genero: 'macho',
      tamano: 'mediano',
      peso: 18,
      esterilizado: true,
      vacunas: [
        { nombre: 'Rabia', fecha: new Date('2019-08-22') },
        { nombre: 'Moquillo', fecha: new Date('2019-08-22') },
        { nombre: 'Parvovirus', fecha: new Date('2019-08-22') },
      ],
      condiciones_salud: [
        'sin condiciones crónicas conocidas',
        'visión normal',
        'audición normal',
      ],
      historial_medico:
        'Controles veterinarios al día. Sin antecedentes de cirugías mayores ni enfermedades hereditarias detectadas.',
      nivel_energia: 'alto',
      condiciones_comportamiento: [
        'muy atento al entorno',
        'alta capacidad de concentración',
        'responde bien a estímulos visuales',
      ],
      preferencias_paseo: [
        'paseos largos',
        'espacios abiertos',
        'juegos de búsqueda o pelota',
      ],
      descripcion:
        'Perro de mirada alerta e inteligente, con pelaje marrón y blanco bien cuidado. Se percibe equilibrado, activo y con fuerte instinto de observación.',
      activo: true,
    }

    try {
      await crear(mascotaData)
      Alert.alert('✅ Mascota creada', 'Max ha sido creada exitosamente.', [
        { text: 'OK' },
      ])
    } catch (error) {
      console.error('Error creando mascota via context:', error)
      Alert.alert('Error', 'Ocurrió un error inesperado')
    } finally {
      setCreandoMascota(false)
    }
  }

  const handleAlert = () => {
    Alert.alert('Acción de prueba', 'Hiciste tap en el botón de prueba 🎯')
  }

  return (
    <Screen style={styles.container} includeTopInset>
      <ScreenHeader
        title={t('tutor:dashboard.titulo')}
        subtitle={t('tutor:dashboard.subtitulo')}
        showBack={false}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Próximo paseo */}
        <Card
          title={t('tutor:dashboard.proximo_paseo')}
          subtitle="Hoy, 5:30 PM"
          right={<Badge label="Confirmado" variant="exito" size="sm" />}
          style={{ marginBottom: 16 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Avatar name="Luna" />
            <Spacer horizontal size={12} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: COLOR.TEXTO, fontWeight: '700' }}>
                Luna
              </Text>
              <Text style={{ color: COLOR.SUBTEXTO }}>
                Con Juan - Punto de encuentro parque central
              </Text>
            </View>
            <Button title="Detalles" size="sm" onPress={handleAlert} />
          </View>
        </Card>

        {/* Acciones rápidas */}
        <Card
          title={t('tutor:dashboard.acciones_rapidas')}
          subtitle={t('tutor:dashboard.lo_mas_usado')}
          style={{ marginBottom: 16 }}
        >
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            <Chip
              label={t('tutor:dashboard.solicitar_paseo')}
              leftIconName="walking"
              onPress={handleAlert}
            />
            <Spacer horizontal size={8} />
            <Chip
              label={
                creandoMascota
                  ? 'Creando...'
                  : t('tutor:dashboard.agregar_mascota')
              }
              leftIconName="paw"
              onPress={crearMascotaSemilla}
              disabled={creandoMascota}
            />
            <Spacer horizontal size={8} />
            <Chip
              label={t('tutor:dashboard.ver_historial')}
              leftIconName="history"
              onPress={handleAlert}
            />
          </View>
        </Card>

        {/* Actividad reciente */}
        <Card
          title={t('tutor:dashboard.actividad_reciente')}
          subtitle={t('tutor:dashboard.ultimos_movimientos')}
        >
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="walking" size={16} color={COLOR.SUBTEXTO} />
              <Spacer horizontal size={8} />
              <Text style={{ color: COLOR.TEXTO, flex: 1 }}>
                Paseo completado con Max - 10:00 AM
              </Text>
              <Badge label="Completado" variant="exito" size="sm" />
            </View>
            <Spacer size={10} />
            <Divider />
            <Spacer size={10} />
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="map-marker-alt" size={16} color={COLOR.SUBTEXTO} />
              <Spacer horizontal size={8} />
              <Text style={{ color: COLOR.TEXTO, flex: 1 }}>
                Punto de encuentro actualizado
              </Text>
              <Badge label="Info" variant="info" size="sm" />
            </View>
            <Spacer size={10} />
            <Divider />
            <Spacer size={10} />
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="star" size={16} color={COLOR.SUBTEXTO} />
              <Spacer horizontal size={8} />
              <Text style={{ color: COLOR.TEXTO, flex: 1 }}>
                Valoraste a Ana con 5 estrellas
              </Text>
              <Badge label="¡Gracias!" variant="enfasis" size="sm" />
            </View>
          </View>
        </Card>
      </ScrollView>
    </Screen>
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
    padding: theme.SIZES.BASE,
    paddingBottom: Platform.OS === 'android' ? 120 : theme.SIZES.BASE * 2,
  },
  header: {
    marginBottom: theme.SIZES.BASE * 2,
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLOR.TEXTO,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitleText: {
    fontSize: 16,
    color: COLOR.SUBTEXTO,
    textAlign: 'center',
  },
  mascotasButton: {
    backgroundColor: COLOR.PRIMARIO,
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: theme.SIZES.BASE * 2,
    shadowColor: COLOR.PRIMARIO,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  mascotasIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  mascotasButtonText: {
    color: COLOR.TEXTO,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  mascotasSubtext: {
    color: COLOR.TEXTO,
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.8,
  },
  statsContainer: {
    backgroundColor: COLOR.SECUNDARIO,
    padding: theme.SIZES.BASE,
    borderRadius: 12,
    marginBottom: theme.SIZES.BASE * 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLOR.TEXTO,
    marginBottom: theme.SIZES.BASE,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: theme.SIZES.BASE,
    backgroundColor: COLOR.BLOQUE,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  statNumber: {
    fontSize: 24,
    marginBottom: 4,
    color: COLOR.TEXTO,
  },
  statLabel: {
    fontSize: 12,
    color: COLOR.SUBTEXTO,
    textAlign: 'center',
  },
  quickActionsContainer: {
    backgroundColor: COLOR.SECUNDARIO,
    padding: theme.SIZES.BASE,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  comingSoonText: {
    fontSize: 14,
    color: COLOR.SUBTEXTO,
    textAlign: 'center',
    fontStyle: 'italic',
  },
})

export default Dashboard
