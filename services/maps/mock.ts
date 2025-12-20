import { DetalleUbicacion, IProveedorMapas, SugerenciaAutocomplete } from '@/services/maps/types'

// Datos falsos para pruebas (Bogotá)
const MOCK_PLACES: Record<string, { details: DetalleUbicacion; suggestion: SugerenciaAutocomplete }> = {
  'mock_virrey': {
    suggestion: {
      place_id: 'mock_virrey',
      titulo: 'Parque El Virrey',
      subtitulo: 'Bogotá, Colombia',
      descripcion_completa: 'Parque El Virrey, Bogotá, Colombia',
    },
    details: {
      place_id: 'mock_virrey',
      direccion_formateada: 'Cra. 15 #87-10, Bogotá, Cundinamarca, Colombia',
      coordenadas: { latitude: 4.6735, longitude: -74.0573 },
      componentes: {
        calle: 'Cra. 15',
        numero: '87-10',
        barrio: 'Antiguo Country',
        ciudad: 'Bogotá',
        pais: 'Colombia',
      },
    },
  },
  'mock_93': {
    suggestion: {
      place_id: 'mock_93',
      titulo: 'Parque de la 93',
      subtitulo: 'Bogotá, Colombia',
      descripcion_completa: 'Parque de la 93, Bogotá, Colombia',
    },
    details: {
      place_id: 'mock_93',
      direccion_formateada: 'Cl. 93A #13-47, Bogotá, Cundinamarca, Colombia',
      coordenadas: { latitude: 4.6766, longitude: -74.0483 },
      componentes: {
        calle: 'Cl. 93A',
        numero: '13-47',
        barrio: 'Chicó',
        ciudad: 'Bogotá',
        pais: 'Colombia',
      },
    },
  },
  'mock_simon': {
    suggestion: {
      place_id: 'mock_simon',
      titulo: 'Parque Simón Bolívar',
      subtitulo: 'Avenida Calle 53 y Avenida Calle 63, Bogotá',
      descripcion_completa: 'Parque Metropolitano Simón Bolívar, Bogotá',
    },
    details: {
      place_id: 'mock_simon',
      direccion_formateada: 'Av. Cl. 53, Bogotá, Colombia',
      coordenadas: { latitude: 4.6583, longitude: -74.0933 },
      componentes: {
        ciudad: 'Bogotá',
        pais: 'Colombia',
      },
    },
  },
}

export class MockMapasProvider implements IProveedorMapas {
  async buscarSitios(query: string): Promise<SugerenciaAutocomplete[]> {
    console.log('[MockMapasProvider] Buscando:', query)
    await new Promise(resolve => setTimeout(resolve, 600)) // Simular latencia de red

    if (!query) return []

    const lowerQuery = query.toLowerCase()
    return Object.values(MOCK_PLACES)
      .map(p => p.suggestion)
      .filter(
        s =>
          s.titulo.toLowerCase().includes(lowerQuery) ||
          s.subtitulo.toLowerCase().includes(lowerQuery)
      )
  }

  async obtenerDetalles(placeId: string): Promise<DetalleUbicacion> {
    console.log('[MockMapasProvider] Detalles para:', placeId)
    await new Promise(resolve => setTimeout(resolve, 800)) // Simular latencia

    const place = MOCK_PLACES[placeId]
    if (!place) {
      throw new Error('Lugar no encontrado en Mock')
    }
    return place.details
  }
}

export const mockMapas = new MockMapasProvider()
