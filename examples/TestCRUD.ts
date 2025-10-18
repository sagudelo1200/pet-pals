// Test simple para verificar que el CRUD funciona
import { MascotaService } from '../services/firebase/index';

export async function testMascotaCRUD() {
  console.log('🧪 Iniciando test del CRUD de Mascota...');
  
  try {
    // Test 1: Crear una mascota
    console.log('1. Creando mascota...');
    const nuevaMascota = await MascotaService.create({
      id_usuario: 'test-user-123',
      nombre: 'Firulais Test',
      especie: 'perro'
    });
    
    if (!nuevaMascota.success) {
      throw new Error(`Error al crear: ${nuevaMascota.error}`);
    }
    
    console.log('✅ Mascota creada:', nuevaMascota.data?.id);
    const mascotaId = nuevaMascota.data!.id;
    
    // Test 2: Obtener por ID
    console.log('2. Obteniendo mascota por ID...');
    const mascotaObtenida = await MascotaService.getById(mascotaId);
    
    if (!mascotaObtenida.success) {
      throw new Error(`Error al obtener: ${mascotaObtenida.error}`);
    }
    
    console.log('✅ Mascota obtenida:', mascotaObtenida.data?.nombre);
    
    // Test 3: Actualizar
    console.log('3. Actualizando mascota...');
    const mascotaActualizada = await MascotaService.update(mascotaId, {
      peso: 25,
      tamano: 'mediano'
    });
    
    if (!mascotaActualizada.success) {
      throw new Error(`Error al actualizar: ${mascotaActualizada.error}`);
    }
    
    console.log('✅ Mascota actualizada:', mascotaActualizada.data?.peso);
    
    // Test 4: Obtener por usuario
    console.log('4. Obteniendo mascotas del usuario...');
    const mascotasUsuario = await MascotaService.getByUsuario('test-user-123');
    
    if (!mascotasUsuario.success) {
      throw new Error(`Error al obtener por usuario: ${mascotasUsuario.error}`);
    }
    
    console.log('✅ Mascotas del usuario:', mascotasUsuario.data?.length);
    
    // Test 5: Eliminar
    console.log('5. Eliminando mascota...');
    const eliminada = await MascotaService.delete(mascotaId);
    
    if (!eliminada.success) {
      throw new Error(`Error al eliminar: ${eliminada.error}`);
    }
    
    console.log('✅ Mascota eliminada');
    
    console.log('🎉 ¡Todos los tests pasaron correctamente!');
    return true;
    
  } catch (error) {
    console.error('❌ Error en el test:', error);
    return false;
  }
}

// Función para ejecutar el test (puedes llamarla desde un componente)
export async function ejecutarTest() {
  console.log('Ejecutando test de CRUD...');
  const resultado = await testMascotaCRUD();
  
  if (resultado) {
    console.log('✅ El CRUD funciona correctamente');
  } else {
    console.log('❌ Hay problemas con el CRUD');
  }
  
  return resultado;
}