import Constants from 'expo-constants'
import {
  DetalleUbicacion,
  IProveedorMapas,
  SugerenciaAutocomplete,
} from '@/services/maps/types'

const GOOGLE_API_KEY = Constants.expoConfig?.extra?.google?.mapsApiKey
const ANDROID_CERT = Constants.expoConfig?.extra?.google?.androidCert
const ANDROID_PACKAGE = Constants.expoConfig?.extra?.google?.androidPackage

export class GoogleMapasProvider implements IProveedorMapas {
  // Nueva URL base para Places API (New)
  private baseUrl = 'https://places.googleapis.com/v1'

  private getHeaders() {
    // Headers requeridos para API Key restringida a Android
    // IMPORTANTE: Google Places REST API requiere SHA-1 SIN dos puntos
    const cert = ANDROID_CERT ? ANDROID_CERT.replace(/:/g, '') : ''

    return {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_API_KEY,
      'X-Android-Package': ANDROID_PACKAGE,
      'X-Android-Cert': cert,
    }
  }

  async buscarSitios(query: string): Promise<SugerenciaAutocomplete[]> {
    if (!query) return []
    if (!GOOGLE_API_KEY) {
      console.warn('Google Maps API Key not configured')
      return []
    }

    try {
      const url = `${this.baseUrl}/places:autocomplete`

      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          input: query,
          languageCode: 'es',
          includedRegionCodes: ['CO'],
        }),
      })

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error.message || 'Error en Autocomplete (New)')
      }

      return (data.suggestions || []).map((s: any) => {
        const p = s.placePrediction
        return {
          place_id: p.placeId,
          titulo: p.structuredFormat?.mainText?.text || p.text?.text,
          subtitulo: p.structuredFormat?.secondaryText?.text || '',
          descripcion_completa: p.text?.text,
        }
      })
    } catch (error) {
      console.error('Error buscando sitios en Google (New API):', error)
      throw error
    }
  }

  async obtenerDetalles(placeId: string): Promise<DetalleUbicacion> {
    if (!GOOGLE_API_KEY) {
      throw new Error('Google Maps API Key not configured')
    }

    try {
      // Definir FieldMask para optimizar costos y performance
      // id, formattedAddress, location, addressComponents
      const fields = [
        'id',
        'formattedAddress',
        'location',
        'addressComponents',
      ].join(',')

      const url = `${this.baseUrl}/places/${placeId}`

      // La API New soporta languageCode como query param ?languageCode=es
      const urlWithLang = `${url}?languageCode=es`
      const response = await fetch(urlWithLang, {
        method: 'GET',
        headers: {
          ...this.getHeaders(),
          'X-Goog-FieldMask': fields,
        },
      })

      const result = await response.json()

      if (result.error) {
        throw new Error(result.error.message || 'Error en Place Details (New)')
      }

      // Parsear componentes (formato ligeramente diferente en v1 vs legacy)
      // v1: addressComponents = [{ longText, shortText, types: [] }]
      const componentes: any = {}
      if (result.addressComponents) {
        result.addressComponents.forEach((c: any) => {
          const types = c.types || []
          if (types.includes('route')) componentes.calle = c.longText
          if (types.includes('street_number')) componentes.numero = c.longText
          if (types.includes('neighborhood') || types.includes('sublocality'))
            componentes.barrio = c.longText
          if (types.includes('locality')) componentes.ciudad = c.longText
          if (types.includes('administrative_area_level_1'))
            componentes.departamento = c.longText
          if (types.includes('country')) componentes.pais = c.longText
        })
      }

      return {
        place_id: result.id,
        direccion_formateada: result.formattedAddress,
        coordenadas: {
          latitude: result.location?.latitude || 0,
          longitude: result.location?.longitude || 0,
        },
        componentes,
      }
    } catch (error) {
      console.error('Error obteniendo detalles de Google (New API):', error)
      throw error
    }
  }
}

export const googleMapas = new GoogleMapasProvider()
