# Scripts de Siigo API - Paw-Path

Scripts de prueba para integración con la API de Siigo. Estos scripts **NO son parte de la aplicación**, son herramientas de desarrollo y testing.

**Documentación oficial:** https://developers.siigo.com/docs/siigoapi/

---

## 📋 Scripts disponibles

### `siigo-products-export.js`

Extrae todos los productos desde tu cuenta Siigo y los guarda en un archivo JSON.

**Ubicación:** `scripts/siigo-products-export.js`

---

## 🚀 Instalación y uso

### 1. Instalar dependencias

```bash
cd scripts
npm install
```

### 2. Configurar credenciales

El script lee automáticamente las credenciales del archivo `.env` en la raíz del proyecto:

```env
SIIGO_ACCESS_KEY=Tu_clave_aqui
SIIGO_USERNAME=Tu_usuario@ejemplo.com
SIIGO_PARTNER_ID=Tu_partner_id
```

Asegúrate de que estas variables estén presentes en `.env`.

### 3. Ejecutar el script

```bash
# Opción 1: Directamente con node
node siigo-products-export.js

# Opción 2: Usar el script npm (desde la carpeta scripts)
npm run siigo:export-products

# Opción 3: Desde la raíz del proyecto
cd scripts && npm run siigo:export-products
```

---

## 📤 Salida

El script genera un archivo `siigo-productos.json` en la carpeta `outputs/`:

```
outputs/
├── siigo-productos.json      # Archivo con los productos
└── siigo-error-log.json      # Log de errores (si aplica)
```

### Estructura del JSON

```json
{
  "timestamp": "2026-09-17T12:34:56.789Z",
  "api_endpoint": "/v1/products",
  "api_version": "v1",
  "partner_id": "PAWPATHAPP",
  "total": 42,
  "productos": [
    {
      "id": "63f918c2-ca65-4edc-a7db-66bcdd5159fb",
      "code": "PROD-001",
      "name": "Producto 1",
      "account_group": {
        "id": 123,
        "name": "Inventario"
      },
      "type": "Product",
      "stock_control": true,
      "active": true,
      "description": "Descripción del producto",
      "prices": [...],
      "metadata": {
        "created": "2026-01-01T00:00:00Z",
        "last_updated": "2026-09-17T00:00:00Z"
      }
    }
  ]
}
```

---

## 🔐 Autenticación (OAuth 2.0)

El script usa autenticación OAuth 2.0 con JWT Bearer tokens:

### Paso 1: Generar token

- **Endpoint:** `POST https://api.siigo.com/auth`
- **Headers:** `Content-Type: application/json`, `Partner-Id: PAWPATHAPP`
- **Body:** `{ "username": "...", "access_key": "..." }`
- **Respuesta:** `{ "access_token": "...", "token_type": "Bearer", "expires_in": 86400 }`

### Paso 2: Usar token en solicitudes

- **Endpoint:** `GET https://api.siigo.com/v1/products`
- **Headers:** `Authorization: Bearer <token>`, `Partner-Id: PAWPATHAPP`

**Para más detalles:** https://developers.siigo.com/docs/siigoapi/autenticacion/

---

## 🔧 Cómo funciona

1. **Valida credenciales** del `.env`
2. **Genera token de acceso** con `POST /auth` (OAuth 2.0)
3. **Obtiene lista de productos** con `GET /v1/products` usando Bearer token
4. **Procesa respuesta** con paginación
5. **Guarda el JSON** en `outputs/siigo-productos.json`
6. **Crea logs** de errores si algo falla

---

## 🐛 Troubleshooting

### Error 401 (Unauthorized)

- Verifica que `SIIGO_USERNAME` sea correcto
- Verifica que `SIIGO_ACCESS_KEY` sea la clave correcta (no decodificada)
- Asegúrate de que las credenciales no hayan expirado

### Error 404 (Not Found)

- El endpoint `/auth` es correcto (no `/v1/auth/login`)
- Verifica que estés usando la URL correcta: `https://api.siigo.com/`

### Error 429 (Too Many Requests)

- Has excedido el límite de 100 solicitudes por minuto
- Espera y reintentas

---

## 📚 Documentación oficial

- **Docs completos:** https://developers.siigo.com/docs/siigoapi/
- **Autenticación:** https://developers.siigo.com/docs/siigoapi/autenticacion/
- **Productos:** https://developers.siigo.com/docs/siigoapi/productos/

## 📊 Salida esperada

Cuando funciona correctamente, ves:

```
✓ Clave decodificada

📋 Información de credenciales:
   Access Key (primeros 20 chars): MGNhZWQxZmItOGE1OS00Y...
   Decodificada (primeros 20 chars): username:password...
   Username: info@paw-path.com.co
   Partner ID: PAWPATHAPP

🚀 Intentando diferentes métodos de autenticación...

📡 Intentando: Basic Auth...
   Status: 401

📡 Intentando: Bearer Token...
   Status: 200
✓ ¡Autenticación exitosa con Bearer Token!

✓ Conexión exitosa con Siigo API
📌 Método de autenticación: Bearer Token

📦 Productos encontrados: 42

✅ Archivo generado exitosamente:
   📄 ../outputs/siigo-productos.json
   📊 Total de productos: 42
```

---

## ⚠️ Solución de problemas

### Error: "No se pudo conectar a Siigo API"

**Posibles causas:**

- Credenciales incorrectas en `.env`
- Endpoint de Siigo cambió
- Problema de conectividad
- API de Siigo está caída

**Solución:**

- Verifica que las credenciales en `.env` sean correctas
- Revisa el archivo `outputs/siigo-error-log.json` para más detalles
- Prueba con una herramienta como Postman o curl

### Error: "Credenciales de Siigo no configuradas"

**Causa:** Falta una o más variables en `.env`

**Solución:**

```bash
# Verifica que existan en .env:
SIIGO_ACCESS_KEY=...
SIIGO_USERNAME=...
SIIGO_PARTNER_ID=...
```

---

## 📝 Notas

- ✅ El script es **independiente** de la app principal
- ✅ No modifica ningún dato en Siigo
- ✅ Solo hace lectura (`GET`) de datos
- ✅ Genera logs detallados de errores
- ❌ No incluye autenticación de dos factores

---

## 🔐 Seguridad

- ✅ No hardcodea credenciales
- ✅ Lee desde `.env`
- ✅ La carpeta `outputs/` está en `.gitignore`
- ⚠️ Ten cuidado al compartir archivos JSON generados (contienen datos de tu cuenta)

---

## 📚 Próximos pasos

Después de probar este script y tener los datos de Siigo, puedes:

1. **Analizar estructura** de productos
2. **Crear mapeos** entre Paw-Path y Siigo
3. **Implementar servicios** de integración en la app
4. **Crear facturas** automáticas
5. **Sincronizar datos** bidireccionales

---

## 🤝 Contribuciones

Si necesitas modificar este script:

- Añade nuevos endpoints en la sección `endpoints`
- Mejora el parsing de respuestas en la sección de procesamiento
- Considera agregar más opciones de CLI

---

**Fecha de creación:** 2026-09-17  
**Última actualización:** 2026-09-17
