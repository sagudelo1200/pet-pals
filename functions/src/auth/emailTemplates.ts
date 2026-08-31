import * as path from 'path'
import * as fs from 'fs'

/**
 * Carga y procesa plantillas de email
 * Previene inyección de código mediante placeholders seguros
 */

interface EmailData {
  otp?: string
  minutos?: number
  [key: string]: string | number | undefined
}

/**
 * Carga plantilla HTML y reemplaza placeholders seguros
 * @param templateName - Nombre del archivo (ej: 'otp-email.html')
 * @param data - Datos para reemplazar (ej: { otp: '123456', minutos: 10 })
 * @returns HTML renderizado
 * @throws Error si template no existe o falla sustitución
 */
function loadTemplate(templateName: string, data: EmailData): string {
  const templatePath = path.join(__dirname, 'templates', templateName)

  if (!fs.existsSync(templatePath)) {
    throw new Error(`[EmailTemplates] Template no encontrado: ${templatePath}`)
  }

  let html = fs.readFileSync(templatePath, 'utf8')

  // Reemplazar placeholders de forma segura (solo permitir claves conocidas)
  const allowedKeys = ['OTP', 'MINUTOS']

  for (const key of allowedKeys) {
    const placeholder = `{{${key}}}`
    if (html.includes(placeholder) && data[key.toLowerCase()] !== undefined) {
      const value = String(data[key.toLowerCase()])
      // Escapar caracteres peligrosos
      const escaped = value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')

      // Reemplazar todos los placeholders (compatible con ES2016+)
      html = html.replace(
        new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
        escaped
      )
    }
  }

  return html
}

/**
 * Inyecta datos en plantilla OTP
 * @param otp - Código OTP de 6 dígitos
 * @param minutos - Minutos hasta expiración
 * @returns HTML renderizado
 */
export function injectOTPData(otp: string, minutos: number): string {
  if (!otp || otp.length !== 6 || !/^\d{6}$/.test(otp)) {
    throw new Error('[EmailTemplates] OTP debe ser 6 dígitos')
  }

  if (minutos <= 0 || !Number.isInteger(minutos)) {
    throw new Error('[EmailTemplates] Minutos debe ser entero positivo')
  }

  return loadTemplate('otp-email.html', { otp, minutos })
}

export default {
  injectOTPData,
}
