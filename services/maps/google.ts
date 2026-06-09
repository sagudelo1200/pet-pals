import Constants from 'expo-constants'
import {
  DetalleUbicacion,
  IProveedorMapas,
  SugerenciaAutocomplete,
  Coordenadas,
  RutaDireccionamiento,
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

  async geocodificarInversa(coords: {
    latitude: number
    longitude: number
  }): Promise<DetalleUbicacion | null> {
    if (!GOOGLE_API_KEY) {
      throw new Error('Google Maps API Key not configured')
    }

    try {
      // Usar la API de Geocoding tradicional (sigue siendo la estándar para Reverse Geocoding)
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coords.latitude},${coords.longitude}&key=${GOOGLE_API_KEY}&language=es`

      // Nota: Geocoding API no requiere el FieldMask ni los mismos headers específicos de Places (New)
      // pero para consistencia y seguridad con keys restringidas pasamos los mismos headers de Android
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      })

      const data = await response.json()

      if (data.status !== 'OK' || !data.results || data.results.length === 0) {
        // Logueamos siempre el error para diagnosticar problemas de configuración de API
        if (data.status !== 'ZERO_RESULTS') {
          console.error('❌ Google Geocoding Error:', {
            status: data.status,
            error_message: data.error_message, // La API de Geocoding devuelve el detalle aquí
          })
        }
        return null
      }

      const result = data.results[0]
      const componentes: any = {}

      result.address_components.forEach((c: any) => {
        const types = c.types || []
        if (types.includes('route')) componentes.calle = c.long_name
        if (types.includes('street_number')) componentes.numero = c.long_name
        if (types.includes('neighborhood') || types.includes('sublocality'))
          componentes.barrio = c.long_name
        if (types.includes('locality')) componentes.ciudad = c.long_name
        if (types.includes('administrative_area_level_1'))
          componentes.departamento = c.long_name
        if (types.includes('country')) componentes.pais = c.long_name
      })

      return {
        place_id: result.place_id,
        direccion_formateada: result.formatted_address,
        coordenadas: {
          latitude: result.geometry.location.lat,
          longitude: result.geometry.location.lng,
        },
        componentes,
      }
    } catch (error) {
      console.error('Error en geocodificación inversa:', error)
      throw error
    }
  }

  async obtenerRuta(
    origen: Coordenadas,
    destino: Coordenadas,
    modo: 'walking' | 'driving' = 'walking'
  ): Promise<RutaDireccionamiento> {
    if (!GOOGLE_API_KEY) {
      throw new Error('Google Maps API Key not configured')
    }

    try {
      const url = 'https://maps.googleapis.com/maps/api/directions/json'
      const params = new URLSearchParams({
        origin: `${origen.latitude},${origen.longitude}`,
        destination: `${destino.latitude},${destino.longitude}`,
        mode: modo,
        key: GOOGLE_API_KEY,
        language: 'es',
      })

      const response = await fetch(`${url}?${params}`, {
        method: 'GET',
      })

      const data = await response.json()

      if (data.status !== 'OK' || !data.routes || data.routes.length === 0) {
        throw new Error(
          `Directions API error: ${data.status} - ${data.error_message || 'Sin ruta disponible'}`
        )
      }

      const ruta = data.routes[0]
      const leg = ruta.legs[0]

      // Decodificar polyline (Google devuelve encoded polyline)
      const polyline = this.decodificarPolyline(ruta.overview_polyline.points)

      const duracionSegundos = leg.duration.value
      const distanciaMetros = leg.distance.value

      // Formatear para UI
      const duracionMinutos = Math.ceil(duracionSegundos / 60)
      const duracionFormato =
        duracionMinutos < 60
          ? `${duracionMinutos} min`
          : `${Math.floor(duracionMinutos / 60)}h ${duracionMinutos % 60}m`

      const distanciaKm = distanciaMetros / 1000
      const distanciaFormato =
        distanciaKm < 1
          ? `${distanciaMetros} m`
          : `${distanciaKm.toFixed(1)} km`

      return {
        distanciaMetros,
        duracionSegundos,
        polyline,
        duracionFormato,
        distanciaFormato,
      }
    } catch (error) {
      throw error
    }
  }

  /**
   * Decodifica polyline encoded de Google Directions API
   * Basado en el algoritmo de Google
   */
  private decodificarPolyline(encoded: string): Coordenadas[] {
    const poly: Coordenadas[] = []
    let index = 0
    let lat = 0
    let lng = 0

    while (index < encoded.length) {
      let result = 0
      let shift = 0
      let b = 0

      do {
        b = encoded.charCodeAt(index++) - 63
        result |= (b & 0x1f) << shift
        shift += 5
      } while (b >= 0x20)

      const dlat = result & 1 ? ~(result >> 1) : result >> 1
      lat += dlat

      result = 0
      shift = 0

      do {
        b = encoded.charCodeAt(index++) - 63
        result |= (b & 0x1f) << shift
        shift += 5
      } while (b >= 0x20)

      const dlng = result & 1 ? ~(result >> 1) : result >> 1
      lng += dlng

      poly.push({
        latitude: lat / 1e5,
        longitude: lng / 1e5,
      })
    }

    return poly
  }
}

export const googleMapas = new GoogleMapasProvider()
