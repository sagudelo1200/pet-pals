import { useState, useEffect } from 'react'
import * as WebBrowser from 'expo-web-browser'
import * as Google from 'expo-auth-session/providers/google'
import { GoogleAuthProvider } from 'firebase/auth'
import { ServicioAuth } from '@/services/firebase/auth'

WebBrowser.maybeCompleteAuthSession()

export const useGoogleAuth = () => {
  const [request, , promptAsync] = Google.useAuthRequest({
    // Temporalmente usando el Client ID original para pruebas
    webClientId:
      '374615502033-0q5rd5d0hpq3gf3camocoj85hlab3jjs.apps.googleusercontent.com',
    androidClientId:
      '374615502033-0q5rd5d0hpq3gf3camocoj85hlab3jjs.apps.googleusercontent.com',
  })

  // Log para depuración (puedes verlo en la terminal de Metro)
  useEffect(() => {
    if (request) {
      console.log('Google Auth Redirect URI:', request.redirectUri)
    }
  }, [request])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const signIn = async (): Promise<any> => {
    try {
      setLoading(true)
      setError(null)

      console.log('🔵 Iniciando Google Auth...')
      const result = await promptAsync()

      console.log('🔵 Resultado de Google Auth:', {
        type: result?.type,
        hasParams: !!(result as any)?.params,
        hasAuthentication: !!(result as any)?.authentication,
      })

      if (result?.type === 'success') {
        // Intentar obtener id_token de params (implícito) o authentication (PKCE/nativo)
        const id_token =
          (result as any).params?.id_token ||
          (result as any).authentication?.idToken

        console.log('🔵 Token obtenido:', id_token ? 'SÍ' : 'NO')

        if (!id_token) {
          console.error('❌ No se encontró id_token en la respuesta:', result)
          throw new Error('No se pudo obtener el token de Google')
        }

        console.log('🔵 Creando credential de Firebase...')
        const credential = GoogleAuthProvider.credential(id_token)

        console.log('🔵 Llamando a ServicioAuth.ingresarConGoogle...')
        const authResult = await ServicioAuth.ingresarConGoogle(credential)

        console.log('🔵 Resultado de ingresarConGoogle:', authResult)
        return authResult
      } else {
        console.log('⚠️ Auth cancelado o falló:', result?.type)
        return null
      }
    } catch (err: any) {
      console.error('❌ Error en signIn:', err)
      setError(err.message || 'Error al iniciar sesión con Google')
      return null
    } finally {
      setLoading(false)
    }
  }

  return {
    signIn,
    loading,
    error,
    request,
  }
}
