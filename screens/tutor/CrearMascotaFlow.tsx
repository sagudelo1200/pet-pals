import React, { useRef, useEffect } from 'react'
import { View, StyleSheet, Text, Alert, Animated } from 'react-native'
import { useTranslation } from 'react-i18next'
import { COLOR } from '@/constants'
import {
  BottomSheet,
  Button,
  PetAvatar,
  DatePicker,
  TextInput as UITextInput,
} from '@/components/ui'
import { useFormularioMascota } from '@/hooks/useFormularioMascota'
import type { Mascota } from '@/models/Mascota'
import * as ImagePicker from 'expo-image-picker'
import AcariciandoMascotaSvg from '@/assets/imgs/undraw/acariciando_mascota.svg'

// Componente para animar la entrada de cada paso
const PasoAnimado: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(20)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start()
  }, [])

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      }}
    >
      {children}
    </Animated.View>
  )
}

interface CrearMascotaFlowProps {
  visible: boolean
  onClose: () => void
  // eslint-disable-next-line no-unused-vars
  onGuardar: (data: Partial<Mascota>) => Promise<void>
  mascotaInicial?: Mascota
}

export const CrearMascotaFlow: React.FC<CrearMascotaFlowProps> = ({
  visible,
  onClose,
  onGuardar,
  mascotaInicial,
}) => {
  const { t } = useTranslation()
  const {
    pasoActual,
    datosMascota,
    siguientePaso,
    pasoAnterior,
    actualizarCampo,
    validarPasoActual,
    totalPasos,
    reiniciar,
  } = useFormularioMascota(mascotaInicial)

  // Animation values
  const avatarScale = useRef(new Animated.Value(1)).current

  // Trigger avatar scaling after a photo is selected
  const triggerAvatarScale = () => {
    Animated.sequence([
      Animated.timing(avatarScale, {
        toValue: 1.2,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(avatarScale, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start()
  }

  const handleContinuar = () => {
    if (validarPasoActual()) {
      siguientePaso()
    }
  }

  const handleSaltar = () => {
    siguientePaso()
  }

  const handleGuardar = async () => {
    // Optimistic UI: Cerramos inmediatamente
    onGuardar(datosMascota)
    reiniciar()
    onClose()
  }

  const handleSeleccionarFoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert(t('mascotas:mensajes.permisos_galeria'))
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaType.images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    })
    if (!result.canceled && result.assets[0].base64) {
      actualizarCampo(
        'foto',
        `data:image/jpeg;base64,${result.assets[0].base64}`
      )
      triggerAvatarScale()
    }
  }

  const handleTomarFoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert(t('mascotas:mensajes.permisos_camara'))
      return
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    })
    if (!result.canceled && result.assets[0].base64) {
      actualizarCampo(
        'foto',
        `data:image/jpeg;base64,${result.assets[0].base64}`
      )
      triggerAvatarScale()
    }
  }

  const renderPaso = () => {
    switch (pasoActual) {
      case 1:
        return (
          <PasoAnimado>
            <View style={styles.pasoContainer}>
              <View style={styles.ilustracionContainer}>
                <AcariciandoMascotaSvg
                  width="100%"
                  height={120}
                  style={styles.ilustracion}
                />
              </View>
              <Text style={styles.emocional}>
                {t('mascotas:crear.paso1.emocional')}
              </Text>
              <Text style={styles.titulo}>
                {t('mascotas:crear.paso1.titulo')}
              </Text>
              <UITextInput
                value={datosMascota.nombre || ''}
                onChangeText={text => actualizarCampo('nombre', text)}
                placeholder={t('mascotas:crear.paso1.placeholder')}
                autoFocus
                returnKeyType="next"
                onSubmitEditing={handleContinuar}
              />
              <Button
                title={t('mascotas:crear.paso1.continuar')}
                onPress={handleContinuar}
                disabled={!validarPasoActual()}
                style={styles.boton}
              />
            </View>
          </PasoAnimado>
        )
      case 2:
        return (
          <PasoAnimado>
            <View style={styles.pasoContainer}>
              <Text style={styles.titulo}>
                {t('mascotas:crear.paso2.titulo')}
              </Text>
              <UITextInput
                value={datosMascota.raza || ''}
                onChangeText={text => actualizarCampo('raza', text)}
                placeholder={t('mascotas:crear.paso2.placeholder')}
                autoFocus
                returnKeyType="next"
                onSubmitEditing={handleContinuar}
              />
              <View style={styles.botonesRow}>
                <Button
                  title={t('mascotas:crear.paso2.saltar')}
                  variant="bloque"
                  onPress={handleSaltar}
                  style={styles.botonMitad}
                />
                <Button
                  title={t('mascotas:crear.paso2.continuar')}
                  onPress={handleContinuar}
                  style={styles.botonMitad}
                />
              </View>
            </View>
          </PasoAnimado>
        )
      case 3:
        return (
          <PasoAnimado>
            <View style={styles.pasoContainer}>
              <Text style={styles.titulo}>
                {t('mascotas:crear.paso3.titulo')}
              </Text>
              <DatePicker
                label={t('mascotas:crear.paso3.fecha_nacimiento')}
                value={datosMascota.fecha_nacimiento}
                onValueChange={date =>
                  actualizarCampo('fecha_nacimiento', date)
                }
                maximumDate={new Date()}
              />
              <View style={styles.botonesRow}>
                <Button
                  title={t('mascotas:crear.paso3.saltar')}
                  variant="bloque"
                  onPress={handleSaltar}
                  style={styles.botonMitad}
                />
                <Button
                  title={t('mascotas:crear.paso3.continuar')}
                  onPress={handleContinuar}
                  style={styles.botonMitad}
                />
              </View>
            </View>
          </PasoAnimado>
        )
      case 4:
        return (
          <PasoAnimado>
            <View style={styles.pasoContainer}>
              <Text style={styles.titulo}>
                {t('mascotas:crear.paso4.titulo')}
              </Text>
              <Text style={styles.subtitulo}>
                {t('mascotas:crear.paso4.subtitulo')}
              </Text>
              <Animated.View style={{ transform: [{ scale: avatarScale }] }}>
                <PetAvatar
                  uri={datosMascota.foto}
                  size="large"
                  editable
                  onPress={handleSeleccionarFoto}
                />
              </Animated.View>
              <View style={styles.botonesRow}>
                <Button
                  title={t('mascotas:crear.paso4.camara')}
                  variant="bloque"
                  onPress={handleTomarFoto}
                  style={styles.botonMitad}
                />
                <Button
                  title={t('mascotas:crear.paso4.galeria')}
                  variant="bloque"
                  onPress={handleSeleccionarFoto}
                  style={styles.botonMitad}
                />
              </View>
              <Button
                title={t('mascotas:crear.confirmacion.guardar')}
                onPress={handleGuardar}
                style={styles.boton}
              />
            </View>
          </PasoAnimado>
        )
      default:
        return null
    }
  }

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      {renderPaso()}
      {pasoActual > 1 && (
        <Button
          title={t('comun:atras')}
          variant="bloque"
          onPress={pasoAnterior}
          style={styles.botonAtras}
        />
      )}
      <View style={styles.indicador}>
        {Array.from({ length: totalPasos }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.punto,
              index + 1 === pasoActual && styles.puntoActivo,
            ]}
          />
        ))}
      </View>
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  pasoContainer: {
    paddingVertical: 20,
  },
  ilustracionContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  ilustracion: {
    opacity: 0.9,
  },
  emocional: {
    fontSize: 14,
    color: COLOR.SUBTEXTO,
    textAlign: 'center',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  titulo: {
    fontSize: 24,
    fontWeight: '700',
    color: COLOR.TEXTO,
    marginBottom: 20,
    textAlign: 'center',
  },
  subtitulo: {
    fontSize: 14,
    color: COLOR.SUBTEXTO,
    textAlign: 'center',
    marginBottom: 20,
  },
  boton: {
    marginTop: 20,
  },
  botonesRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  botonMitad: {
    flex: 1,
  },
  botonAtras: {
    marginTop: 12,
  },
  indicador: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
  },
  punto: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLOR.BORDE,
  },
  puntoActivo: {
    backgroundColor: COLOR.PRIMARIO,
    width: 24,
  },
})
