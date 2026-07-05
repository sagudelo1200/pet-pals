import React, { useMemo } from 'react'
import { StyleSheet, View, ScrollView, Text } from 'react-native'
import { useTranslation } from 'react-i18next'
import { theme } from 'galio-framework'
import { COLOR } from '@/constants'
import { Mascota } from '@/models/Mascota'
import PetCard from '@/components/ui/PetCard'
import Button from '@/components/ui/Button'
import Spacer from '@/components/ui/Spacer'

interface MisMascotasPreviewProps {
  mascotas: Mascota[]
  onVerTodas: () => void
  onAgregarMascota: () => void
  onSeleccionarMascota?: (_mascota: Mascota) => void
}

/**
 * Componente que muestra un preview de 1-3 mascotas del tutor.
 * Reutilizable en Dashboard y otras pantallas.
 * Memoizado para evitar re-renders innecesarios cuando props no cambian.
 */
const MisMascotasPreviewComponent: React.FC<MisMascotasPreviewProps> = ({
  mascotas,
  onVerTodas,
  onAgregarMascota,
  onSeleccionarMascota,
}) => {
  const { t } = useTranslation()

  const visibles = useMemo(() => mascotas.slice(0, 3), [mascotas])
  const tieneMas = useMemo(() => mascotas.length > 3, [mascotas.length])
  const masOtrasMascotas = useMemo(
    () => Math.max(0, mascotas.length - 3),
    [mascotas.length]
  )

  return (
    <View>
      <Text style={styles.title}>{t('tutor:dashboard.mis_mascotas')}</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        scrollEventThrottle={16}
      >
        {visibles.map(mascota => (
          <View key={mascota.id} style={styles.petCardWrapper}>
            <PetCard
              pet={mascota}
              onPress={() => onSeleccionarMascota?.(mascota)}
            />
          </View>
        ))}

        <View style={styles.agregarButtonWrapper}>
          <Button
            title={tieneMas ? `+${masOtrasMascotas}` : '+'}
            onPress={onAgregarMascota}
            variant="secundario"
            size="sm"
          />
        </View>
      </ScrollView>

      {tieneMas && (
        <>
          <Spacer size={8} />
          <Button
            title={t('tutor:dashboard.ver_todas')}
            variant="ghost"
            size="sm"
            onPress={onVerTodas}
          />
        </>
      )}
    </View>
  )
}

export const MisMascotasPreview = React.memo(
  MisMascotasPreviewComponent,
  (prevProps, nextProps) => {
    return (
      prevProps.mascotas === nextProps.mascotas &&
      prevProps.onVerTodas === nextProps.onVerTodas &&
      prevProps.onAgregarMascota === nextProps.onAgregarMascota &&
      prevProps.onSeleccionarMascota === nextProps.onSeleccionarMascota
    )
  }
)

const styles = StyleSheet.create({
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: COLOR.TEXTO,
    marginBottom: 12,
  },
  scrollContent: {
    paddingRight: theme.SIZES.BASE,
  },
  petCardWrapper: {
    marginRight: theme.SIZES.BASE,
  },
  agregarButtonWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
})
