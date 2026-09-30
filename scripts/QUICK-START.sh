#!/bin/bash
# Guía rápida para ejecutar el script de Siigo

echo "🚀 Guía rápida: Extraer productos desde Siigo"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Paso 1: Navegar a la carpeta scripts
echo "📂 Paso 1: Navegar a la carpeta scripts"
echo "   $ cd scripts"
echo ""

# Paso 2: Instalar dependencias (si no están instaladas)
echo "📦 Paso 2: Instalar dependencias"
echo "   $ npm install"
echo "   (solo primera vez)"
echo ""

# Paso 3: Ejecutar el script
echo "▶️  Paso 3: Ejecutar el script"
echo "   $ npm run siigo:export-products"
echo ""
echo "   O directamente:"
echo "   $ node siigo-products-export.js"
echo ""

# Paso 4: Ver resultados
echo "📊 Paso 4: Ver resultados"
echo "   Los productos se guardarán en:"
echo "   📄 ../outputs/siigo-productos.json"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "💡 Tips:"
echo "   • El script lee credenciales del archivo ../.env"
echo "   • Verifica que .env contenga: SIIGO_ACCESS_KEY, SIIGO_USERNAME, SIIGO_PARTNER_ID"
echo "   • Si hay error, revisa: ../outputs/siigo-error-log.json"
echo ""
