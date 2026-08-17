import {
  StyleSheet,
  View,
  FlatList,
  TouchableOpacity,
  Text,
  Alert,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { COLOR } from '@/constants'
import { Button, PetAvatar } from '@/components/ui'
import { useSeleccionarMascota } from '@/hooks/paseos/useSeleccionarMascota'
import { calcularCompletitud } from '@/logic/mascotas/calcularCompletitud'
import Icon from '@/components/ui/Icon'

interface Props {
  mascotasInicialesIds?: string[]
  // eslint-disable-next-line
  onNext: (mascotaIds: string[]) => void
  onCancel: () => void
}

export const SeleccionarMascotaPaso = ({
  mascotasInicialesIds,
  onNext,
  onCancel,
}: Props) => {
  const { t } = useTranslation()
  const {
    mascotas,
    mascotasSeleccionadas,
    toggleMascota,
    mascotasConPaseoEnCurso,
  } = useSeleccionarMascota(mascotasInicialesIds)

  const handleContinuar = () => {
    if (mascotasSeleccionadas.length > 0) {
      onNext(mascotasSeleccionadas)
    }
  }

  const isListaParaPaseo = (mascota: any) => {
    const completitud = calcularCompletitud(mascota)
    return completitud.readiness !== 'incompleto'
  }

  const renderItem = ({ item }: { item: any }) => {
    const isSelected = mascotasSeleccionadas.includes(item.id)
    const esListaParaPaseo = isListaParaPaseo(item)
    const conPaseoEnCurso = mascotasConPaseoEnCurso.has(item.id)
    const puedeSeleccionar = esListaParaPaseo && !conPaseoEnCurso

    const handlePress = () => {
      if (conPaseoEnCurso) {
        Alert.alert(
          t('paseos:errores.mascota_no_disponible'),
          t('paseos:errores.MASCOTA_YA_TIENE_PASEO'),
          [{ text: t('comun:entendido'), style: 'default' }]
        )
        return
      }
      if (!esListaParaPaseo) {
        Alert.alert(
          t('paseos:errores.mascota_no_lista_titulo'),
          t('paseos:errores.mascota_no_lista_msg'),
          [{ text: t('comun:entendido'), style: 'default' }]
        )
        return
      }
      toggleMascota(item.id)
    }

    return (
      <TouchableOpacity
        style={[
          styles.card,
          isSelected && styles.cardSelected,
          !puedeSeleccionar && styles.cardDisabled,
        ]}
        onPress={handlePress}
        activeOpacity={puedeSeleccionar ? 0.8 : 0.5}
        disabled={!puedeSeleccionar}
      >
        {/* Contenedor de avatar con indicador de bloqueo */}
        <View style={styles.avatarContainer}>
          <PetAvatar uri={item.foto} size="medium" />
          {!puedeSeleccionar && (
            <View style={styles.lockOverlay}>
              <Icon
                name="lock"
                size={14}
                color={COLOR.BASE}
                style={styles.lockIcon}
              />
            </View>
          )}
        </View>
        <Text
          style={[
            styles.name,
            isSelected && styles.nameSelected,
            !puedeSeleccionar && styles.nameDisabled,
            { fontWeight: 'bold' },
          ]}
        >
          {item.nombre}
        </Text>
        {puedeSeleccionar ? (
          <Text
            style={[styles.breed, !puedeSeleccionar && styles.breedDisabled]}
          >
            {item.raza}
          </Text>
        ) : (
          <Text style={styles.notReadyLabel}>
            {conPaseoEnCurso
              ? t('paseos:pasos.seleccionar_mascota.paseo_en_curso')
              : t('paseos:pasos.seleccionar_mascota.no_lista')}
          </Text>
        )}
      </TouchableOpacity>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {t('paseos:pasos.seleccionar_mascota.titulo')}
      </Text>
      <Text style={styles.subtitle}>
        {t('paseos:pasos.seleccionar_mascota.emocional')}
      </Text>

      <FlatList
        data={mascotas}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        horizontal
        contentContainerStyle={[
          styles.listContent,
          mascotas.length < 3 && styles.listContentCentered,
        ]}
        showsHorizontalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ width: 16 }} />}
      />

      <View style={styles.actions}>
        <Button
          title={t('comun:cancelar')}
          variant="bloque"
          onPress={onCancel}
          style={{ flex: 1 }}
        />
        <Button
          title={t('comun:continuar')}
          variant="primario"
          onPress={handleContinuar}
          disabled={mascotasSeleccionadas.length === 0}
          style={{ flex: 1 }}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLOR.TEXTO,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: COLOR.SUBTEXTO,
    textAlign: 'center',
    marginBottom: 32,
  },
  listContent: {
    paddingHorizontal: 8,
    paddingBottom: 24,
    alignItems: 'center', // Center items vertically if they differ in height
  },
  listContentCentered: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  card: {
    width: 120,
    padding: 16,
    borderRadius: 16,
    backgroundColor: COLOR.BLOQUE,
    alignItems: 'center',
    gap: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardSelected: {
    borderColor: COLOR.PRIMARIO,
    backgroundColor: 'rgba(29, 143, 115, 0.1)',
  },
  cardDisabled: {
    borderWidth: 2,
    borderColor: COLOR.ALERTA,
    backgroundColor: 'rgba(201, 170, 69, 0.08)',
  },
  avatarContainer: {
    position: 'relative',
  },
  lockOverlay: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 28,
    height: 28,
    backgroundColor: COLOR.ALERTA,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    elevation: 5,
  },
  lockIcon: {
    fontWeight: 'bold',
  },
  name: {
    fontSize: 16,
    color: COLOR.TEXTO,
    textAlign: 'center',
    width: '100%',
  },
  nameSelected: {
    color: COLOR.PRIMARIO,
  },
  nameDisabled: {
    color: COLOR.SUBTEXTO,
  },
  breed: {
    fontSize: 12,
    color: COLOR.SUBTEXTO,
    textAlign: 'center',
    width: '100%',
  },
  breedDisabled: {
    color: COLOR.SUBTEXTO,
    fontSize: 11,
  },
  notReadyLabel: {
    fontSize: 12,
    color: COLOR.ALERTA,
    textAlign: 'center',
    width: '100%',
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
})
