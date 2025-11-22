import React from 'react'
import { StyleSheet, View, Platform, Alert } from 'react-native'
import { theme, Text } from 'galio-framework'
import { useNavigation } from '@react-navigation/native'
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import { TutorTabParamList } from '@/navigation/types'
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

type DashboardNavigationProp = BottomTabNavigationProp<TutorTabParamList>

const Dashboard: React.FC = () => {
  const navigation = useNavigation<DashboardNavigationProp>()

  const handleMascotasPress = () => {
    navigation.navigate('Mascotas')
  }

  const handleAlert = () => {
    Alert.alert('Acción de prueba', 'Hiciste tap en el botón de prueba 🎯')
  }

  return (
    <Screen
      scroll
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {/* Próximo paseo */}
      <Card
        title="Próximo paseo"
        subtitle="Hoy, 5:30 PM"
        right={<Badge label="Confirmado" variant="exito" size="sm" />}
        style={{ marginBottom: 16 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Avatar name="Luna" />
          <Spacer horizontal size={12} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: COLOR.TEXTO, fontWeight: '700' }}>Luna</Text>
            <Text style={{ color: COLOR.SUBTEXTO }}>
              Con Juan - Punto de encuentro parque central
            </Text>
          </View>
          <Button title="Detalles" size="sm" onPress={handleAlert} />
        </View>
      </Card>

      {/* Acciones rápidas */}
      <Card
        title="Acciones rápidas"
        subtitle="Lo más usado"
        style={{ marginBottom: 16 }}
      >
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          <Chip
            label="Solicitar paseo"
            leftIconName="walking"
            onPress={handleAlert}
          />
          <Spacer horizontal size={8} />
          <Chip
            label="Agregar mascota"
            leftIconName="paw"
            onPress={handleMascotasPress}
          />
          <Spacer horizontal size={8} />
          <Chip
            label="Ver historial"
            leftIconName="history"
            onPress={handleAlert}
          />
        </View>
      </Card>

      {/* Actividad reciente */}
      <Card title="Actividad reciente" subtitle="Últimos movimientos">
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
