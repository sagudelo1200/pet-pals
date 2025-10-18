import React, { useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Dimensions,
} from 'react-native';
import { Block, Text } from 'galio-framework';
import { Input, Button } from '../components';
import { argonTheme } from '../constants';
import { useAuth } from '../services/context/AuthContext';
import { EspecieMascota, GeneroMascota, TamanoMascota } from '../models/Mascota';

const { width } = Dimensions.get('screen');

interface FormData {
  nombre: string;
  especie: EspecieMascota;
  raza: string;
  fechaNacimiento: string;
  genero: GeneroMascota | '';
  tamano: TamanoMascota | '';
  descripcion: string;
  foto?: string;
}

const CrearMascota: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState<boolean>(false);
  const [formData, setFormData] = useState<FormData>({
    nombre: '',
    especie: 'perro',
    raza: '',
    fechaNacimiento: '',
    genero: '',
    tamano: '',
    descripcion: '',
  });

  // Opciones para los selects
  const opcionesGenero: { label: string; value: GeneroMascota }[] = [
    { label: 'Macho', value: 'macho' },
    { label: 'Hembra', value: 'hembra' },
  ];

  const opcionesTamano: { label: string; value: TamanoMascota }[] = [
    { label: 'Muy Pequeño (hasta 2kg)', value: 'muy pequeño' },
    { label: 'Pequeño (2-10kg)', value: 'pequeño' },
    { label: 'Mediano (10-25kg)', value: 'mediano' },
    { label: 'Grande (25-45kg)', value: 'grande' },
    { label: 'Gigante (más de 45kg)', value: 'gigante' },
  ];

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSelectPhoto = () => {
    // TODO: Implementar selección de foto
    Alert.alert('Próximamente', 'Funcionalidad de foto será implementada pronto');
  };

  const validateForm = (): boolean => {
    if (!formData.nombre.trim()) {
      Alert.alert('Error', 'El nombre de la mascota es obligatorio');
      return false;
    }
    
    if (!formData.genero) {
      Alert.alert('Error', 'Por favor selecciona el género');
      return false;
    }
    
    if (!formData.tamano) {
      Alert.alert('Error', 'Por favor selecciona el tamaño');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      // TODO: Aquí implementaremos la lógica para guardar en Firestore
      console.log('Datos a guardar:', {
        ...formData,
        id_usuario: user?.uid,
        fecha_creacion: new Date(),
      });
      
      Alert.alert(
        '¡Éxito!', 
        'Mascota registrada correctamente',
        [{ text: 'OK', onPress: () => {/* TODO: Navegar de vuelta */} }]
      );
      
    } catch (error) {
      console.error('Error guardando mascota:', error);
      Alert.alert('Error', 'No se pudo guardar la mascota');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Block style={styles.formContainer}>
        
        {/* Header */}
        <Block center style={styles.header}>
          <Text
            style={{ fontFamily: 'open-sans-bold' }}
            size={24}
            color={argonTheme.COLORS.PRIMARY}
          >
            Registrar Mascota
          </Text>
          <Text
            style={{ fontFamily: 'open-sans-regular', textAlign: 'center', marginTop: 8 }}
            size={14}
            color={argonTheme.COLORS.MUTED}
          >
            Completa la información básica de tu mascota
          </Text>
        </Block>

        {/* Foto de la mascota */}
        <Block center style={styles.photoSection}>
          <TouchableOpacity onPress={handleSelectPhoto} style={styles.photoContainer}>
            {formData.foto ? (
              <Image source={{ uri: formData.foto }} style={styles.photo} />
            ) : (
              <Block center middle style={styles.photoPlaceholder}>
                <Text size={40}>📷</Text>
                <Text
                  style={{ fontFamily: 'open-sans-regular', textAlign: 'center' }}
                  size={12}
                  color={argonTheme.COLORS.MUTED}
                >
                  Tocar para agregar foto
                </Text>
              </Block>
            )}
          </TouchableOpacity>
        </Block>

        {/* Campos del formulario */}
        <Block style={styles.formFields}>
          
          {/* Nombre */}
          <Block style={styles.inputContainer}>
            <Text style={styles.label}>Nombre *</Text>
            <Input
              placeholder="Ej: Max, Luna, Rocky..."
              value={formData.nombre}
              onChangeText={(value) => handleInputChange('nombre', value)}
              style={styles.input}
            />
          </Block>

          {/* Raza */}
          <Block style={styles.inputContainer}>
            <Text style={styles.label}>Raza</Text>
            <Input
              placeholder="Ej: Labrador, Mestizo, Golden..."
              value={formData.raza}
              onChangeText={(value) => handleInputChange('raza', value)}
              style={styles.input}
            />
          </Block>

          {/* Fecha de nacimiento */}
          <Block style={styles.inputContainer}>
            <Text style={styles.label}>Fecha de nacimiento</Text>
            <Input
              placeholder="DD/MM/AAAA"
              value={formData.fechaNacimiento}
              onChangeText={(value) => handleInputChange('fechaNacimiento', value)}
              style={styles.input}
            />
            <Text style={styles.helper}>
              Si no sabes la fecha exacta, puedes estimarla
            </Text>
          </Block>

          {/* Género */}
          <Block style={styles.inputContainer}>
            <Text style={styles.label}>Género *</Text>
            <Block row style={styles.radioGroup}>
              {opcionesGenero.map((opcion) => (
                <TouchableOpacity
                  key={opcion.value}
                  style={[
                    styles.radioButton,
                    formData.genero === opcion.value && styles.radioButtonSelected
                  ]}
                  onPress={() => handleInputChange('genero', opcion.value)}
                >
                  <Text
                    style={[
                      styles.radioText,
                      formData.genero === opcion.value && styles.radioTextSelected
                    ]}
                  >
                    {opcion.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </Block>
          </Block>

          {/* Tamaño */}
          <Block style={styles.inputContainer}>
            <Text style={styles.label}>Tamaño *</Text>
            {opcionesTamano.map((opcion) => (
              <TouchableOpacity
                key={opcion.value}
                style={[
                  styles.sizeOption,
                  formData.tamano === opcion.value && styles.sizeOptionSelected
                ]}
                onPress={() => handleInputChange('tamano', opcion.value)}
              >
                <Text
                  style={[
                    styles.sizeText,
                    formData.tamano === opcion.value && styles.sizeTextSelected
                  ]}
                >
                  {opcion.label}
                </Text>
              </TouchableOpacity>
            ))}
          </Block>

          {/* Descripción */}
          <Block style={styles.inputContainer}>
            <Text style={styles.label}>Descripción</Text>
            <Input
              placeholder="Cuéntanos sobre la personalidad de tu mascota..."
              value={formData.descripcion}
              onChangeText={(value) => handleInputChange('descripcion', value)}
              multiline={true}
              numberOfLines={3}
              style={[styles.input, styles.textArea]}
            />
          </Block>

        </Block>

        {/* Botones */}
        <Block style={styles.buttonContainer}>
          <Button
            color="primary"
            style={styles.submitButton}
            onPress={handleSubmit}
            loading={loading}
          >
            <Text
              style={{ fontFamily: 'open-sans-bold' }}
              size={16}
              color={argonTheme.COLORS.WHITE}
            >
              {loading ? 'GUARDANDO...' : 'REGISTRAR MASCOTA'}
            </Text>
          </Button>
          
          <Text
            style={{ fontFamily: 'open-sans-regular', textAlign: 'center', marginTop: 16 }}
            size={12}
            color={argonTheme.COLORS.MUTED}
          >
            Podrás completar más información después en el perfil de la mascota
          </Text>
        </Block>

      </Block>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F5F7',
  },
  formContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 30,
  },
  photoSection: {
    marginBottom: 30,
  },
  photoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E8E8E8',
    borderWidth: 2,
    borderColor: argonTheme.COLORS.PRIMARY,
    borderStyle: 'dashed',
  },
  formFields: {
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontFamily: 'open-sans-bold',
    fontSize: 14,
    color: argonTheme.COLORS.TEXT,
    marginBottom: 8,
  },
  input: {
    backgroundColor: argonTheme.COLORS.WHITE,
  },
  textArea: {
    height: 80,
  },
  helper: {
    fontFamily: 'open-sans-regular',
    fontSize: 12,
    color: argonTheme.COLORS.MUTED,
    marginTop: 4,
  },
  radioGroup: {
    justifyContent: 'space-between',
  },
  radioButton: {
    flex: 1,
    padding: 12,
    marginHorizontal: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    backgroundColor: argonTheme.COLORS.WHITE,
  },
  radioButtonSelected: {
    borderColor: argonTheme.COLORS.PRIMARY,
    backgroundColor: `${argonTheme.COLORS.PRIMARY}10`,
  },
  radioText: {
    textAlign: 'center',
    fontFamily: 'open-sans-regular',
    fontSize: 14,
    color: argonTheme.COLORS.TEXT,
  },
  radioTextSelected: {
    color: argonTheme.COLORS.PRIMARY,
    fontWeight: 'bold',
  },
  sizeOption: {
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    backgroundColor: argonTheme.COLORS.WHITE,
  },
  sizeOptionSelected: {
    borderColor: argonTheme.COLORS.PRIMARY,
    backgroundColor: `${argonTheme.COLORS.PRIMARY}10`,
  },
  sizeText: {
    fontFamily: 'open-sans-regular',
    fontSize: 14,
    color: argonTheme.COLORS.TEXT,
  },
  sizeTextSelected: {
    color: argonTheme.COLORS.PRIMARY,
    fontWeight: 'bold',
  },
  buttonContainer: {
    marginTop: 20,
  },
  submitButton: {
    width: '100%',
    height: 50,
  },
});

export default CrearMascota;