#!/usr/bin/env node

/**
 * Script de prueba para extraer productos desde Siigo API
 *
 * Uso: node scripts/siigo-products-export.js
 *
 * Genera un archivo JSON con todos los productos en outputs/siigo-productos.json
 *
 * ✅ Autenticación OAuth 2.0 verificada
 * Fuente oficial: https://developers.siigo.com/docs/siigoapi/
 */

const fs = require('fs')
const path = require('path')
const https = require('https')

// Cargar variables de entorno desde la raíz del proyecto
const envPath = path.join(__dirname, '../.env')
require('dotenv').config({ path: envPath })

const SIIGO_ACCESS_KEY = process.env.SIIGO_ACCESS_KEY
const SIIGO_USERNAME = process.env.SIIGO_USERNAME
const SIIGO_PARTNER_ID = process.env.SIIGO_PARTNER_ID

// Validar credenciales
if (!SIIGO_ACCESS_KEY || !SIIGO_USERNAME || !SIIGO_PARTNER_ID) {
  console.error('\n❌ Error: Falta cargar credenciales')
  console.error(`   📄 Buscando .env en: ${envPath}`)
  console.error(`   ✓ Existe: ${fs.existsSync(envPath)}`)
  console.error('\n   Variables encontradas:')
  console.error(`   - SIIGO_ACCESS_KEY: ${SIIGO_ACCESS_KEY ? '✓' : '✗'}`)
  console.error(`   - SIIGO_USERNAME: ${SIIGO_USERNAME ? '✓' : '✗'}`)
  console.error(`   - SIIGO_PARTNER_ID: ${SIIGO_PARTNER_ID ? '✓' : '✗'}`)
  process.exit(1)
}

// Crear directorio de outputs si no existe
const outputDir = path.join(__dirname, '../outputs')
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
}

/**
 * Hacer una solicitud HTTPS a Siigo API
 * @param {string} method - GET, POST, etc
 * @param {string} endpoint - Ruta del endpoint
 * @param {string} accessToken - Bearer token (opcional, no requerido para /auth)
 * @param {object} body - JSON body (opcional)
 */
function makeRequest(method, endpoint, accessToken = null, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.siigo.com',
      path: endpoint,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Partner-Id': SIIGO_PARTNER_ID,
        'User-Agent': 'PawPath-Siigo-Export/1.0',
      },
    }

    // Agregar token Bearer si está disponible
    if (accessToken) {
      options.headers['Authorization'] = `Bearer ${accessToken}`
    }

    const req = https.request(options, res => {
      let data = ''

      res.on('data', chunk => {
        data += chunk
      })

      res.on('end', () => {
        try {
          const parsed = JSON.parse(data)
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: parsed,
          })
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data,
          })
        }
      })
    })

    req.on('error', error => {
      reject(error)
    })

    if (body) {
      req.write(JSON.stringify(body))
    }

    req.end()
  })
}

/**
 * Paso 1: Generar token de acceso OAuth 2.0
 * Documentación: https://developers.siigo.com/docs/siigoapi/autenticacion/
 */
async function generateAccessToken() {
  try {
    console.log('\n🔐 PASO 1: Generando token de acceso OAuth 2.0...')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    const loginPayload = {
      username: SIIGO_USERNAME,
      access_key: SIIGO_ACCESS_KEY,
    }

    console.log(`📡 POST https://api.siigo.com/auth`)
    console.log(`   Username: ${SIIGO_USERNAME}`)
    console.log(`   Partner ID: ${SIIGO_PARTNER_ID}`)

    const response = await makeRequest('POST', '/auth', null, loginPayload)

    if (response.status !== 200) {
      console.error(`\n❌ Error en autenticación (${response.status}):`)
      console.error('   Respuesta:', JSON.stringify(response.body, null, 2))

      const errorLog = {
        timestamp: new Date().toISOString(),
        step: 'generateAccessToken',
        error: 'Authentication failed',
        status: response.status,
        response: response.body,
        troubleshooting: {
          cause: 'El servidor rechazó las credenciales',
          checks: [
            'Verifica SIIGO_USERNAME en .env',
            'Verifica SIIGO_ACCESS_KEY en .env',
            'Asegúrate de que las credenciales no hayan expirado',
            'Consulta la documentación: https://developers.siigo.com/docs/siigoapi/autenticacion/',
          ],
        },
      }

      const errorPath = path.join(outputDir, 'siigo-error-log.json')
      fs.writeFileSync(errorPath, JSON.stringify(errorLog, null, 2))
      console.log(`\n📝 Log de error guardado en: ${errorPath}`)

      process.exit(1)
    }

    const accessToken = response.body.access_token

    if (!accessToken) {
      throw new Error('No access_token en respuesta del servidor')
    }

    console.log(`\n✅ Token generado exitosamente`)
    console.log(`   Tipo: Bearer`)
    console.log(
      `   Válido por: ${response.body.expires_in} segundos (24 horas)`
    )
    console.log(
      `   Token (primeros 30 chars): ${accessToken.substring(0, 30)}...`
    )

    return accessToken
  } catch (error) {
    console.error(`\n❌ Error generando token: ${error.message}`)
    process.exit(1)
  }
}

/**
 * Paso 2: Obtener productos usando el token de acceso
 * Documentación: https://developers.siigo.com/docs/siigoapi/productos/
 */
async function fetchProducts(accessToken) {
  try {
    console.log('\n📦 PASO 2: Extrayendo productos desde Siigo...')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    let allProducts = []
    let currentPage = 1
    let totalResults = 0
    let hasMorePages = true
    const pageSize = 50 // Máximo de Siigo es 250, pero 50 es razonable

    // Loop para obtener todas las páginas
    while (hasMorePages) {
      console.log(
        `\n📡 GET https://api.siigo.com/v1/products?page=${currentPage}&page_size=${pageSize}`
      )
      console.log(`   Authorization: Bearer [token]`)
      console.log(`   Partner-Id: ${SIIGO_PARTNER_ID}`)

      const response = await makeRequest(
        'GET',
        `/v1/products?page=${currentPage}&page_size=${pageSize}`,
        accessToken,
        null
      )

      if (response.status !== 200) {
        console.error(
          `\n❌ Error obteniendo página ${currentPage} (${response.status}):`
        )
        console.error('   Respuesta:', JSON.stringify(response.body, null, 2))

        const errorLog = {
          timestamp: new Date().toISOString(),
          step: 'fetchProducts',
          error: 'Failed to fetch products',
          status: response.status,
          currentPage: currentPage,
          response: response.body,
          troubleshooting: {
            400: 'Parámetros inválidos en la solicitud',
            401: 'Token de acceso vencido o inválido',
            403: 'Permiso denegado',
            429: 'Límite de solicitudes excedido (max 100 req/min)',
          },
        }

        const errorPath = path.join(outputDir, 'siigo-error-log.json')
        fs.writeFileSync(errorPath, JSON.stringify(errorLog, null, 2))
        console.log(`\n📝 Log de error guardado en: ${errorPath}`)

        process.exit(1)
      }

      // Procesar respuesta paginada
      let pageProducts = []
      if (response.body.results && Array.isArray(response.body.results)) {
        pageProducts = response.body.results
        if (response.body.pagination) {
          totalResults = response.body.pagination.total_results
        }
      }

      if (pageProducts.length === 0) {
        hasMorePages = false
        break
      }

      console.log(
        `   ✅ Página ${currentPage} obtenida: ${pageProducts.length} productos`
      )
      console.log(`   📊 Total en sistema: ${totalResults} productos`)

      // Para cada producto de la página, obtener sus datos completos
      console.log(
        `\n🔄 Obteniendo datos detallados de ${pageProducts.length} productos...`
      )
      for (let i = 0; i < pageProducts.length; i++) {
        const product = pageProducts[i]
        const productIndex = i + 1

        try {
          const detailResponse = await makeRequest(
            'GET',
            `/v1/products/${product.id}`,
            accessToken,
            null
          )

          if (detailResponse.status === 200) {
            allProducts.push(detailResponse.body)
            console.log(
              `   [${productIndex}/${totalResults}] ✓ ${product.name}`
            )
          } else {
            console.log(
              `   [${productIndex}/${totalResults}] ⚠ Error obteniendo detalles de ${product.name}`
            )
            // Guardar el producto básico si falla la solicitud detallada
            allProducts.push(product)
          }
        } catch (error) {
          console.log(
            `   [${productIndex}/${totalResults}] ⚠ Error: ${error.message}`
          )
          allProducts.push(product)
        }
      }

      // Verificar si hay más páginas
      if (pageProducts.length < pageSize) {
        hasMorePages = false
      } else {
        currentPage++
      }
    }

    console.log(`\n✅ Conexión exitosa con Siigo API`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    console.log(`📦 Total de productos descargados: ${allProducts.length}`)

    // Preparar datos para export
    const exportData = {
      timestamp: new Date().toISOString(),
      api_endpoint: '/v1/products',
      api_version: 'v1',
      partner_id: SIIGO_PARTNER_ID,
      total: allProducts.length,
      productos: allProducts,
      _info: {
        documentacion: 'https://developers.siigo.com/docs/siigoapi/productos/',
        nota: 'Este archivo contiene TODOS los datos completos de todos los productos de tu cuenta Siigo.',
        generado_por: 'PawPath Siigo Export Script v1.0',
        autenticacion: 'OAuth 2.0 with Bearer Token',
        detalles:
          'Cada producto contiene sus datos completos obtenidos del endpoint /v1/products/{id}',
      },
    }

    // Guardar JSON
    const outputPath = path.join(outputDir, 'siigo-productos.json')
    fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2))

    console.log(`\n✅ Archivo generado exitosamente:`)
    console.log(`   📄 ${outputPath}`)
    console.log(`   📊 Total de productos: ${allProducts.length}`)

    // Mostrar preview de primeros productos
    if (allProducts.length > 0) {
      console.log('\n📋 Preview (primeros 3 productos):')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      allProducts.slice(0, 3).forEach((prod, i) => {
        console.log(`\n  ${i + 1}. ${prod.name || prod.code || 'Sin nombre'}`)
        if (prod.id) console.log(`     ID: ${prod.id}`)
        if (prod.code) console.log(`     Código: ${prod.code}`)
        if (prod.type) console.log(`     Tipo: ${prod.type}`)
        if (prod.description)
          console.log(
            `     Descripción: ${prod.description.substring(0, 60)}...`
          )
        if (prod.prices && prod.prices.length > 0) {
          console.log(`     Precios: ${prod.prices.length} lista(s)`)
        }
        if (prod.account_group?.name)
          console.log(`     Grupo: ${prod.account_group.name}`)
      })
    }

    console.log('\n✨ Extracción completada\n')
  } catch (error) {
    console.error('\n❌ Error durante la extracción:')
    console.error(error.message)

    // Guardar error log
    const errorLog = {
      timestamp: new Date().toISOString(),
      step: 'fetchProducts',
      error: error.message,
      stack: error.stack,
    }

    const errorPath = path.join(outputDir, 'siigo-error-log.json')
    fs.writeFileSync(errorPath, JSON.stringify(errorLog, null, 2))
    console.log(`\n📝 Log de error guardado en: ${errorPath}`)

    process.exit(1)
  }
}

/**
 * Función principal
 */
async function main() {
  try {
    console.log('\n🚀 Siigo API - Extractor de Productos')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`📍 API: https://api.siigo.com/`)
    console.log(`📖 Docs: https://developers.siigo.com/docs/siigoapi/`)
    console.log(`🔐 Auth: OAuth 2.0 with Bearer Token\n`)

    // Paso 1: Generar token
    const accessToken = await generateAccessToken()

    // Paso 2: Obtener productos
    await fetchProducts(accessToken)
  } catch (error) {
    console.error('Error fatal:', error)
    process.exit(1)
  }
}

// Ejecutar script
main()
