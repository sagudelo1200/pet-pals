import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  Animated,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLOR } from '@/constants';
import { Screen, Button, PetAvatar, Card, LoadingScreen } from '@/components/ui';
import { ServicioMascota } from '@/services/firebase';
import type { Mascota } from '@/models/Mascota';
import { CrearMascotaFlow } from './CrearMascotaFlow';

interface DetalleMascotaProps {
  route: {
    params: {
      mascotaId: string;
    };
  };
  navigation: any;
}

export default function DetalleMascota({ route, navigation }: DetalleMascotaProps) {
  const { t } = useTranslation();
  const { mascotaId } = route.params;
  const [mascota, setMascota] = useState<Mascota | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    cargarMascota();
  }, [mascotaId]);

  useEffect(() => {
    if (mascota) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  }, [mascota]);

  const cargarMascota = async () => {
    try {
      setLoading(true);
      const resultado = await ServicioMascota.obtenerPorId(mascotaId);
      if (resultado.success && resultado.data) {
        setMascota(resultado.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleEliminar = () => {
    if (!mascota) return;

    Alert.alert(
      t('mascotas:eliminar.titulo'),
      t('mascotas:eliminar.mensaje', { nombre: mascota.nombre }),
      [
        {
          text: t('mascotas:eliminar.cancelar'),
          style: 'cancel',
        },
        {
          text: t('mascotas:eliminar.confirmar'),
          style: 'destructive',
          onPress: async () => {
            try {
              await ServicioMascota.eliminar(mascotaId);
              navigation.goBack();
            } catch (error) {
              Alert.alert(t('mascotas:mensajes.error'));
            }
          },
        },
      ]
    );
  };

  const handleActualizar = async (data: Partial<Mascota>) => {
    try {
      await ServicioMascota.actualizar(mascotaId, data);
      setModalVisible(false);
      await cargarMascota();
    } catch (error) {
      Alert.alert(t('mascotas:mensajes.error'));
    }
  };

  const calcularEdad = (fechaNacimiento?: Date): string => {
    if (!fechaNacimiento) return 'Edad desconocida';
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    const anos = hoy.getFullYear() - nacimiento.getFullYear();
    const meses = hoy.getMonth() - nacimiento.getMonth();
    
    if (anos === 0) {
      return `${meses} ${meses === 1 ? 'mes' : 'meses'}`;
    }
    return `${anos} ${anos === 1 ? 'año' : 'años'}`;
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (!mascota) {
    return (
      <Screen>
        <Text style={styles.error}>Mascota no encontrada</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <ScrollView contentContainerStyle={styles.content}>
          {/* Hero Section */}
          <View style={styles.hero}>
            <PetAvatar uri={mascota.foto} size="large" />
            <Text style={styles.nombre}>{mascota.nombre}</Text>
            <Text style={styles.subtitulo}>
              {t(`mascotas:tipos.${mascota.especie}`)}
              {mascota.raza && ` • ${mascota.raza}`}
            </Text>
          </View>

          {/* Información Básica */}
          <Card style={styles.seccion}>
            <Text style={styles.tituloSeccion}>
              {t('mascotas:detalle.informacion_basica')}
            </Text>
            {mascota.fecha_nacimiento && (
              <View style={styles.campo}>
                <Text style={styles.campoLabel}>{t('mascotas:campos.edad')}</Text>
                <Text style={styles.campoValor}>{calcularEdad(mascota.fecha_nacimiento)}</Text>
              </View>
            )}
            {mascota.genero && (
              <View style={styles.campo}>
                <Text style={styles.campoLabel}>{t('mascotas:campos.genero')}</Text>
                <Text style={styles.campoValor}>
                  {t(`mascotas:generos.${mascota.genero}`)}
                </Text>
              </View>
            )}
            {mascota.tamano && (
              <View style={styles.campo}>
                <Text style={styles.campoLabel}>{t('mascotas:campos.tamano')}</Text>
                <Text style={styles.campoValor}>
                  {t(`mascotas:tamanos.${mascota.tamano.replace(' ', '_')}`)}
                </Text>
              </View>
            )}
            {mascota.peso && (
              <View style={styles.campo}>
                <Text style={styles.campoLabel}>{t('mascotas:campos.peso')}</Text>
                <Text style={styles.campoValor}>{mascota.peso} kg</Text>
              </View>
            )}
          </Card>

          {/* Botones de Acción */}
          <View style={styles.acciones}>
            <Button
              title={t('mascotas:detalle.editar')}
              onPress={() => setModalVisible(true)}
              style={styles.boton}
            />
            <Button
              title={t('mascotas:detalle.eliminar')}
              variant="bloque"
              onPress={handleEliminar}
              style={styles.boton}
            />
          </View>
        </ScrollView>
      </Animated.View>

      <CrearMascotaFlow
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onGuardar={handleActualizar}
        mascotaInicial={mascota}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  hero: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  nombre: {
    fontSize: 28,
    fontWeight: '700',
    color: COLOR.TEXTO,
    marginTop: 16,
  },
  subtitulo: {
    fontSize: 16,
    color: COLOR.SUBTEXTO,
    marginTop: 4,
  },
  seccion: {
    marginBottom: 16,
  },
  tituloSeccion: {
    fontSize: 18,
    fontWeight: '600',
    color: COLOR.TEXTO,
    marginBottom: 16,
  },
  campo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLOR.BORDE,
  },
  campoLabel: {
    fontSize: 14,
    color: COLOR.SUBTEXTO,
  },
  campoValor: {
    fontSize: 14,
    color: COLOR.TEXTO,
    fontWeight: '500',
  },
  acciones: {
    gap: 12,
    marginTop: 24,
  },
  boton: {
    width: '100%',
  },
  error: {
    fontSize: 16,
    color: COLOR.ERROR,
    textAlign: 'center',
    marginTop: 32,
  },
});
