import React from 'react'
import {
  StyleSheet,
  View,
  FlatList,
  TouchableOpacity,
  Image,
  Text,
  ActivityIndicator,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { COLOR } from '@/constants'
import { Button, Icon } from '@/components/ui'
import { useSeleccionarCuidador } from '@/hooks/paseos/useSeleccionarCuidador'

interface Props {
  cuidadorInicialId?: string | null
  fecha?: Date | null
  onNext: (
    // eslint-disable-next-line no-unused-vars
    cuidadorId: string | null,
    // eslint-disable-next-line no-unused-vars
    horario?: { hora_inicio: string; hora_fin: string }
  ) => void
  // eslint-disable-next-line no-unused-vars
  onBack: (cuidadorId?: string | null) => void
}

export const SeleccionarCuidadorPaso = ({
  cuidadorInicialId,
  fecha,
  onNext,
  onBack,
}: Props) => {
  const { t } = useTranslation()
  const {
    cuidadores,
    cargando,
    error,
    cuidadorSeleccionado,
    seleccionarCuidador,
    recargar,
  } = useSeleccionarCuidador(cuidadorInicialId, fecha)

  const handleContinuar = () => {
    if (cuidadorSeleccionado === 'SOLICITUD_ABIERTA') {
      // Horario amplio por defecto para solicitud abierta
      onNext(null, { hora_inicio: '05:00', hora_fin: '23:00' })
    } else if (cuidadorSeleccionado) {
      const walker = cuidadores.find(c => c.id === cuidadorSeleccionado)
      onNext(cuidadorSeleccionado, walker?.horario_laboral)
    }
  }

  const handleSelectOpenRequest = () => {
    seleccionarCuidador('SOLICITUD_ABIERTA')
  }

  const renderOpenRequestCard = () => {
    const isSelected = cuidadorSeleccionado === 'SOLICITUD_ABIERTA'
    return (
      <TouchableOpacity
        style={[
          styles.card,
          styles.openCard,
          isSelected && styles.cardSelected,
        ]}
        onPress={handleSelectOpenRequest}
        activeOpacity={0.8}
      >
        <View style={[styles.avatar, styles.openAvatar]}>
          <Icon name="bullhorn" size={24} color={COLOR.INFO} />
        </View>

        <View style={styles.info}>
          <View style={styles.header}>
            <Text style={[styles.name, { fontWeight: 'bold' }]}>
              {t(
                'paseos:pasos.seleccionar_cuidador.solicitud_abierta_titulo',
                'Solicitud Abierta'
              )}
            </Text>
          </View>

          <Text style={styles.description}>
            {t(
              'paseos:pasos.seleccionar_cuidador.solicitud_abierta_desc',
              'Publica tu solicitud para que cualquier cuidador disponible pueda aceptarla.'
            )}
          </Text>
        </View>

        <View style={styles.radio}>
          {isSelected && <View style={styles.radioSelected} />}
        </View>
      </TouchableOpacity>
    )
  }

  const renderItem = ({ item }: { item: any }) => {
    const isSelected = cuidadorSeleccionado === item.id

    return (
      <TouchableOpacity
        style={[styles.card, isSelected && styles.cardSelected]}
        onPress={() => seleccionarCuidador(item.id)}
        activeOpacity={0.8}
      >
        <Image source={{ uri: item.imagen }} style={styles.avatar} />

        <View style={styles.info}>
          <View style={styles.header}>
            <Text style={[styles.name, { fontWeight: 'bold' }]}>
              {item.nombre}
            </Text>
            {item.insignias.includes('verificado') && (
              <Icon name="check-circle" size={16} color={COLOR.PRIMARIO} />
            )}
          </View>

          <View style={styles.ratingRow}>
            <Icon name="star" size={14} color={COLOR.ENFASIS} />
            <Text style={styles.rating}>{item.calificacion.toFixed(1)}</Text>
            <Text style={styles.distance}>• {item.distancia}</Text>
          </View>

          <Text style={styles.price}>{item.tarifa}</Text>
        </View>

        <View style={styles.radio}>
          {isSelected && <View style={styles.radioSelected} />}
        </View>
      </TouchableOpacity>
    )
  }

  const renderLoading = () => (
    <View style={styles.centerContent}>
      <ActivityIndicator size="large" color={COLOR.PRIMARIO} />
      <Text style={styles.loadingText}>
        {t('paseos:pasos.seleccionar_cuidador.cargando')}
      </Text>
    </View>
  )

  const renderError = () => (
    <View style={styles.centerContent}>
      <Icon name="exclamation-circle" size={48} color={COLOR.ERROR} />
      <Text style={styles.errorText}>
        {t('paseos:pasos.seleccionar_cuidador.error')}
      </Text>
      <Button
        title={t('comun:reintentar')}
        variant="bloque"
        onPress={recargar}
        style={{ marginTop: 16 }}
      />
    </View>
  )

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {t('paseos:pasos.seleccionar_cuidador.titulo')}
      </Text>

      {!cargando && !error && (
        <Text style={styles.subtitle}>
          {t('paseos:pasos.seleccionar_cuidador.lista_titulo')}
        </Text>
      )}

      {cargando ? (
        renderLoading()
      ) : error ? (
        renderError()
      ) : (
        <FlatList
          data={cuidadores}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          style={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={renderOpenRequestCard}
          ListEmptyComponent={
            cuidadores.length === 0 ? (
              <View style={styles.centerContent}>
                <Text style={styles.emptyText}>
                  {t('paseos:pasos.seleccionar_cuidador.sin_cuidadores')}
                </Text>
                <Text style={styles.emptySubtext}>
                  {t('paseos:pasos.seleccionar_cuidador.sin_cuidadores_desc')}
                </Text>
              </View>
            ) : null
          }
        />
      )}

      <View style={styles.actions}>
        <Button
          title={t('comun:atras')}
          variant="bloque"
          onPress={() => onBack(cuidadorSeleccionado)}
          style={{ flex: 1 }}
        />
        <Button
          title={t('comun:continuar')}
          variant="primario"
          onPress={handleContinuar}
          disabled={!cuidadorSeleccionado || cargando}
          style={{ flex: 1 }}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    height: 500,
  },
  list: {
    flex: 1,
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
    marginBottom: 16,
  },
  listContent: {
    paddingBottom: 20,
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLOR.BLOQUE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLOR.BORDE,
  },
  openCard: {
    marginBottom: 16,
    backgroundColor: COLOR.SECUNDARIO,
    borderColor: COLOR.INFO,
    borderStyle: 'dashed',
  },
  cardSelected: {
    borderColor: COLOR.PRIMARIO,
    backgroundColor: 'rgba(29, 143, 115, 0.1)',
    borderStyle: 'solid',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
    backgroundColor: COLOR.BORDE,
  },
  openAvatar: {
    backgroundColor: 'rgba(42, 134, 168, 0.2)', // COLOR.INFO con opacidad
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLOR.INFO,
  },
  info: {
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    color: COLOR.TEXTO,
  },
  description: {
    fontSize: 12,
    color: COLOR.SUBTEXTO,
    lineHeight: 16,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  rating: {
    fontSize: 14,
    color: COLOR.TEXTO,
    fontWeight: 'bold',
  },
  distance: {
    fontSize: 12,
    color: COLOR.SUBTEXTO,
  },
  price: {
    fontSize: 14,
    color: COLOR.PRIMARIO,
    fontWeight: '600',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLOR.BORDE,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  radioSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLOR.PRIMARIO,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    color: COLOR.SUBTEXTO,
  },
  errorText: {
    marginTop: 12,
    color: COLOR.ERROR,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLOR.TEXTO,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: COLOR.SUBTEXTO,
    textAlign: 'center',
  },
  iconWrapper: {
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
})
