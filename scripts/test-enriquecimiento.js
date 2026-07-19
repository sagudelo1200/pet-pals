// script para probar enriquecimiento territorial fuera del proyecto
// Uso: node scripts/test-enriquecimiento.js <lat> <lng>

const lat = process.argv[2] || '6.148548931146258'
const lng = process.argv[3] || '-75.63640809663804'
const UMBRAL_PRECIPITACION_MM = 1.0 // mm

async function fetchJson(url, opts) {
  try {
    const res = await fetch(url, opts)
    const text = await res.text()
    let json
    try {
      json = JSON.parse(text)
    } catch (e) {
      json = { raw: text }
    }
    return { ok: res.ok, status: res.status, json }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}

function mapWmoToDireccion(code) {
  code = Number(code)
  if (code === 0 || code === 1) return 'soleado'
  if (code === 2) return 'mixto'
  if (code === 3) return 'nublado'
  if (code >= 45 && code <= 48) return 'nublado'
  if (code >= 51 && code <= 67) return 'llovizna'
  if (code >= 71 && code <= 77) return 'nieve'
  if (code >= 80 && code <= 82) return 'lluvia'
  if (code >= 85 && code <= 86) return 'nieve'
  if (code >= 90 && code <= 99) return 'lluvia'
  return 'desconocido'
}

;(async () => {
  console.log('Coordenadas:', lat, lng)

  // Open-Meteo
  const urlMeteo = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true&hourly=precipitation&temperature_unit=celsius&timezone=auto`
  console.log('\n=== Open-Meteo URL ===\n', urlMeteo)
  const meteor = await fetchJson(urlMeteo)
  console.log('\n=== Open-Meteo RAW ===')
  console.dir(meteor, { depth: 3 })

  let clima_actual = 'desconocido'
  let temperatura_c = null
  let precipitacion_mm = 0

  if (meteor.ok && meteor.json) {
    const data = meteor.json
    const current = data.current_weather || data.current
    if (current) {
      const weatherCode = current.weathercode ?? current.weather_code ?? 0
      clima_actual = mapWmoToDireccion(weatherCode)
      temperatura_c = current.temperature ?? current.temperature_2m ?? null
      // buscar precipitacion en hourly
      try {
        if (
          data.hourly &&
          Array.isArray(data.hourly.time) &&
          Array.isArray(data.hourly.precipitation)
        ) {
          const times = data.hourly.time
          const prec = data.hourly.precipitation
          const currentTime = (current.time || new Date().toISOString()).slice(
            0,
            19
          )
          let idx = times.indexOf(current.time)
          if (idx === -1) {
            const currentHour = new Date(current.time || Date.now())
              .toISOString()
              .slice(0, 13)
            idx = times.findIndex(t => t.slice(0, 13) === currentHour)
          }
          if (idx >= 0) precipitacion_mm = Number(prec[idx] ?? 0)
        } else if (
          data.current &&
          typeof data.current.precipitation === 'number'
        ) {
          precipitacion_mm = data.current.precipitation
        }
      } catch (err) {
        console.warn('Error extrayendo precipitacion:', err)
      }

      // consistencia: forzar 'lluvia' solo si precipitación es significativa
      if (
        precipitacion_mm >= UMBRAL_PRECIPITACION_MM &&
        clima_actual !== 'lluvia'
      ) {
        console.warn(
          'Consistencia: forzando lluvia por precipitacion_mm=',
          precipitacion_mm
        )
        clima_actual = 'lluvia'
      } else if (
        precipitacion_mm > 0 &&
        precipitacion_mm < UMBRAL_PRECIPITACION_MM
      ) {
        console.info(
          'Precipitacion baja detectada; no se fuerza lluvia; precipitacion_mm=',
          precipitacion_mm
        )
      }
    }
  }

  // Open-Elevation
  const urlElev = `https://api.open-elevation.com/api/v1/lookup?locations=${lat},${lng}`
  console.log('\n=== Open-Elevation URL ===\n', urlElev)
  const elev = await fetchJson(urlElev)
  console.log('\n=== Open-Elevation RAW ===')
  console.dir(elev, { depth: 3 })

  let elevacion = null
  if (elev.ok && elev.json && elev.json.results && elev.json.results[0]) {
    elevacion = elev.json.results[0].elevation || null
  }

  // Nominatim
  const urlNom = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
  console.log('\n=== Nominatim URL ===\n', urlNom)
  const nom = await fetchJson(urlNom, {
    headers: { 'Accept-Language': 'es', 'User-Agent': 'Paw-Path-Test/1.0' },
  })
  console.log('\n=== Nominatim RAW ===')
  console.dir(nom, { depth: 3 })

  let nombre_ubicacion = null
  let nombre_barrio = null
  if (nom.ok && nom.json) {
    const addr = nom.json.address || {}
    nombre_ubicacion = addr.road || addr.pedestrian || 'Desconocido'
    nombre_barrio =
      addr.neighbourhood || addr.suburb || addr.town || 'Desconocido'
  }

  const contexto = {
    clima_actual,
    temperatura_c,
    precipitacion_mm,
    elevacion_metros: elevacion,
    nombre_ubicacion,
    nombre_barrio,
  }

  console.log('\n=== Contexto Resultante ===')
  console.dir(contexto, { depth: null })
})()
