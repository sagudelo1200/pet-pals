# PLAN DE INTEGRACION TERRITORIAL SOBRE EL MVP ACTUAL

**Fecha**: 31 de mayo de 2026  
**Contexto real**: la app no tiene usuarios activos ni datos operativos, pero el desarrollo actual ya está muy cerca de un MVP funcional de paseo de perros.  
**Conclusión operativa**: el territorio no debe reemplazar el producto actual; debe integrarse encima del MVP existente para reducir riesgo y mejorar el lanzamiento.

---

## 1. Punto de partida real

La base de código existente sí aporta valor, pero no como negocio probado.

Hoy el sistema tiene:

- navegación real por roles `tutor`, `cuidador` y `admin`
- autenticación funcional
- modelos y servicios de Firestore
- geocodificación de direcciones
- utilidades H3
- mapa territorial base para admin
- formularios por pasos y componentes reutilizables

Hoy el sistema NO tiene:

- tracción que proteger
- datos históricos que migrar
- usuarios activos que condicionen compatibilidad
- validación real de matching, recorrencia o economía territorial

La consecuencia es simple:

**la prioridad ya no es elegir entre paseo o territorio; la prioridad es integrar territorio al MVP actual para validar dónde sí vale la pena operar el servicio.**

---

## 2. Decisión estratégica

### Cambio de enfoque

Antes:

- pensar en tutor + cuidador + paseo + matching

Ahora:

- pensar en paseo + exploración territorial + lectura de viabilidad

### Decisión principal

El nuevo eje estratégico del producto será:

**EXPLORADOR TERRITORIAL**

Pero integrado al MVP de paseo ya construido.

No como un módulo aislado.

No como un reemplazo del loop tutor-cuidador.

Sino como el operador que alimenta inteligencia territorial para que el loop de paseo opere donde sí tiene sentido.

### Decisión arquitectónica

PawPath no debe partirse en dos productos.

Debe quedar como un solo sistema con dos loops complementarios:

- loop operacional actual: tutor solicita → cuidador acepta → paseo ocurre
- loop territorial nuevo: explorador observa → sistema aprende → territorio se prioriza

El segundo loop debe mejorar el primero.

No competir con él.

---

## 3. Qué se conserva

Estas piezas sí vale la pena reutilizarlas:

### Núcleo de aplicación

- `AuthProvider`
- `RolProvider`
- `NavigationContainer`
- `MiCuenta`
- selector de rol

### Infraestructura de datos

- Firebase Auth
- Firestore
- Realtime Database solo si hiciera falta más adelante
- helpers CRUD ya existentes

### Territorial y geográfico

- utilidades H3
- cálculo de `h3_index`
- autocompletado de dirección
- creación y persistencia de ubicaciones
- mapa tipo `TerritorioVivo` como base visual

### UI reusable

- pattern de bottom sheet por pasos
- chips, cards, screen headers, formularios
- captura de imagen local si más adelante se conecta a Storage

---

## 4. Qué se integra y qué se saca de foco

Estas piezas deben diferenciarse entre lo que se integra y lo que se posterga.

### Lo que sí debe integrarse con el MVP actual

- autenticación y selección de rol
- navegación existente
- perfiles y ubicaciones
- H3 y mapas
- infraestructura Firebase
- futuras zonas priorizadas para solicitudes de paseo
- admin territorial mínimo

### Lo que NO debe dirigir el roadmap inmediato

#### Lógica que NO debe ser prioridad inmediata

- matching de cuidadores
- escalada automática de solicitudes
- agenda comercial de paseos
- paseo compartido
- recorrencia tutor-cuidador
- tracking emocional del paseo
- dashboard admin placeholder
- dashboard tutor demo

### Regla práctica

Todo lo que exista para el loop de paseo se considera:

- mantenido si ya aporta al MVP de paseo
- reutilizable si también ayuda a captura territorial
- postergable si mete complejidad antes de validar territorio

El criterio ya no es eliminar por existir.

El criterio es integrar sin duplicar ni desordenar el producto.

---

## 5. Nuevo objetivo del producto

### Objetivo del sistema

Responder con evidencia a estas preguntas:

- dónde hay densidad real de mascotas y tutores
- dónde hay cultura pet-friendly observable
- dónde hay repetición horaria y rutina útil
- dónde existe percepción mínima de confianza
- dónde aparecen comercios aliados potenciales
- en qué celdas H3 vale la pena abrir un MVP comercial después

Sin perder de vista estas preguntas del producto actual:

- en qué zonas tiene sentido activar el loop de paseo
- dónde vale la pena concentrar captación de tutores
- dónde vale la pena reclutar o activar cuidadores

### Nueva métrica principal

La métrica principal territorial ya no será paseos repetidos.

La métrica principal territorial será:

**cantidad de celdas H3 con señal territorial consistente y repetida**

Señal consistente significa:

- mínimo 3 capturas
- mínimo 2 días distintos
- mínimo 2 horarios distintos
- mínimo 1 interesado real

### Unidad real de validación

La unidad de validación deja de ser el match entre oferta y demanda.

La unidad de validación pasa a ser la celda H3.

La pregunta correcta ya no es:

- si logramos conectar un tutor con un cuidador

La pregunta correcta ahora es:

- si una celda concentra suficiente densidad
- si una celda muestra repetición real
- si una celda muestra confianza potencial
- si una celda justifica abrir operación comercial después

Eso cambia el riesgo del proyecto por completo.

### Relación con el MVP actual de paseo

El territorio no reemplaza la métrica del servicio.

La complementa.

Por eso PawPath debe operar con dos niveles de validación:

- validación territorial: qué celdas tienen señal suficiente
- validación operacional: si en esas celdas el loop de paseo realmente funciona

La expansión del MVP comercial solo debe ocurrir donde ambas validaciones se encuentren.

---

## 6. MVP real: Explorador Territorial

### Rol nuevo

Agregar rol:

- `explorador`

Convivirá con:

- `tutor`
- `cuidador`
- `admin`

### Qué puede hacer

- iniciar sesión
- seleccionar rol explorador
- ver su zona actual
- crear capturas territoriales
- guardar capturas offline o pendientes
- ver historial de capturas propias
- ver mapa territorial resumido
- alimentar decisiones de despliegue del MVP de paseo

### Qué NO puede hacer

- aceptar paseos
- configurar perfil público de cuidador
- aparecer en matching
- administrar usuarios
- modificar métricas agregadas manualmente

### Cómo convive con los otros roles

- `tutor` sigue siendo el usuario que solicita paseos
- `cuidador` sigue siendo el operador del servicio
- `explorador` alimenta inteligencia territorial previa o paralela
- `admin` observa territorio, operación y soporte

El rol explorador no compite con tutor o cuidador.

Prepara y mejora el terreno donde ellos operan.

---

## 7. Flujo operativo mínimo

### Flujo de calle

```text
Explorador abre app
  ↓
La app detecta ubicación actual
  ↓
Calcula h3_index
  ↓
Muestra celda/zona actual
  ↓
Botón: Capturar nodo
  ↓
Formulario rápido de observación
  ↓
Guardar
  ↓
Si hay internet: sincroniza
Si no hay internet: queda pendiente
  ↓
Mapa territorial se actualiza
```

### Flujo integrado con el MVP de paseo

```text
Explorador valida una celda H3
  ↓
La celda alcanza estado prometedora o lista_mvp
  ↓
PawPath prioriza esa zona para activación operacional
  ↓
Se enfoca reclutamiento de cuidadores y captación de tutores
  ↓
El loop de paseo se ejecuta donde ya hay mejor probabilidad de recurrencia
```

### Regla UX

La captura completa debe tomar menos de 30 segundos.

Si tarda más, el diseño está mal.

---

## 8. Datos que sí vale la pena capturar

### Datos críticos

- `h3_index`
- coordenadas
- tipo de punto observado
- mascotas visibles
- personas con mascota
- recurrencia observada
- seguridad percibida
- nivel pet-friendly
- cantidad de interesados reales
- horarios activos observados
- nota libre breve
- fecha y hora de captura
- explorador que hizo la captura

### Datos opcionales

- foto del entorno no obligatoria
- teléfono de interesado solo cuando exista consentimiento real
- alias textual de la zona

### Datos que NO valen la pena al inicio

- formularios largos de entrevista
- scoring financiero complejo
- segmentación demográfica profunda
- tracking GPS continuo del explorador
- taxonomía de comercios demasiado detallada
- historial analítico avanzado
- recolección masiva de teléfonos

### Preguntas mínimas de las primeras semanas

Durante la primera etapa solo importa responder estas cuatro preguntas:

1. ¿Hay mascotas?
2. ¿Hay recurrencia?
3. ¿Hay interés?
4. ¿Hay confianza?

Todo lo demás es secundario.

---

## 9. Estructura de datos mínima

### Colección 1: `exploraciones`

Documento individual por observación de calle.

Campos sugeridos:

```ts
{
  id,
  id_explorador,
  h3_index,
  coordenadas,
  direccion_formateada?,
  tipo_punto,
  mascotas_visibles,
  personas_con_mascota,
  flujo_peatonal,
  recurrencia_observada,
  seguridad_percibida,
  pet_friendly,
  disposicion_uso_app,
  comercios_pet_friendly,
  interesados_count,
  telefonos_interesados?,
  horarios_activos?,
  observaciones?,
  foto_url?,
  sincronizado,
  creado_en,
  actualizado_en,
  creado_por,
  actualizado_por
}
```

### Colección 2: `territorio_resumen`

Documento agregado por celda H3.

Campos sugeridos:

```ts
{
  ;(h3_index,
    capturas_count,
    dias_unicos_count,
    horarios_unicos_count,
    exploradores_unicos,
    mascotas_visibles_total,
    personas_con_mascota_total,
    comercios_pet_friendly_total,
    interesados_total,
    validaciones_interes_count,
    validaciones_comercio_count,
    score_densidad,
    score_recurrencia,
    score_confianza,
    score_viabilidad,
    ultima_captura_en,
    estado)
}
```

### Reglas de diseño

- `exploraciones` es la verdad primaria
- `territorio_resumen` es derivado
- el cliente NO debe escribir agregados directamente
- `territorio_resumen.estado` debe calcularse con umbrales explícitos, no por criterio subjetivo

### Observación vs validación

No toda captura vale igual.

#### Observación

Sirve para detectar contexto y densidad.

- mascotas visibles
- personas con mascota
- flujo peatonal
- parques o nodos
- comercios observados

#### Validación

Sirve para confirmar que podría existir mercado real.

- tutor interesado real
- contacto obtenido con consentimiento
- comercio dispuesto a colaborar
- evidencia de recurrencia clara en horarios o días

Las señales de validación deben pesar más que las de observación en el score final.

### Gate de expansión por celda

Cada celda H3 debe pasar por estados operativos explícitos:

- `fria`
- `observacion`
- `prometedora`
- `lista_mvp`

#### Fría

- menos de 3 capturas
- sin repetición clara
- sin interesados reales

#### Observación

- 3 o más capturas
- al menos 2 días distintos o 2 horarios distintos
- todavía sin validación suficiente de interés

#### Prometedora

- 3 o más capturas
- al menos 2 días distintos
- al menos 2 horarios distintos
- al menos 1 interesado real o 1 comercio con disposición

#### Lista para MVP

- señal prometedora sostenida
- múltiples validaciones reales
- confianza territorial aceptable
- evidencia suficiente para justificar piloto comercial

Una zona no avanza por intuición. Avanza por umbral.

---

## 10. Backend mínimo necesario

### Sí construir

- trigger `onCreate` en `exploraciones`
- agregación a `territorio_resumen`
- normalización mínima de scores
- integración de lectura territorial en el admin actual
- integración futura del estado territorial en flujos del MVP de paseo

### No construir todavía

- callable functions
- cron jobs
- notificaciones push
- pipeline analítico
- recomendaciones automáticas
- matching comercial

### Principio

El backend del nuevo MVP solo existe para proteger consistencia agregada.

No para inventar complejidad.

Y tampoco para separar artificialmente territorio y operación en sistemas distintos.

---

## 11. UX/UI mínima

### Pantallas iniciales

#### 1. InicioExplorador

- zona actual
- capturas del día
- pendientes por sincronizar
- acceso a mapa
- botón principal de captura

#### 2. CapturaTerritorial

Bottom sheet o flujo corto con 2-3 pasos:

- paso 1: tipo de punto y tags rápidos
- paso 2: densidad, seguridad, pet-friendly, interés
- paso 3: observación libre, teléfono, foto opcional

#### 3. HistorialExploraciones

- lista propia
- filtros simples
- estado sincronizado / pendiente

#### 4. MapaTerritorial

- hexágonos coloreados
- tap para ver resumen por zona

#### 5. Integración Admin / Operación

- reutilizar `TerritorioVivo`
- mostrar estado por celda
- permitir leer qué zonas están listas para activar operación

#### 6. MiCuenta

- reutilizada

### Lo que NO se hace en UX

- dashboards corporativos
- tablas largas
- formularios eternos
- gráficos innecesarios
- multipantallas redundantes

---

## 12. Orden de ejecución real

### Fase 0: poda y enfoque (2-3 días)

- ocultar o congelar superficies demo o no prioritarias
- preservar el loop actual de paseo como base activa del producto
- decidir nombre definitivo del nuevo rol explorador
- definir esquema de `exploraciones` y `territorio_resumen`
- definir cómo se verá la información territorial dentro del admin y del roadmap operacional

### Fase 1: explorador básico (4-5 días)

- agregar rol `explorador`
- crear navegación de explorador
- crear `InicioExplorador`
- crear `CapturaTerritorial`
- persistir en Firestore `exploraciones`
- integrar selector de rol y convivencia con navegación actual

### Fase 2: inteligencia territorial mínima (3-4 días)

- crear `territorio_resumen`
- trigger de agregación
- mapa básico con hexágonos
- historial de capturas
- adaptar el admin actual para observar territorio sin romper el MVP de paseo

### Fase 3: operación de calle real (1 semana)

- hacer 20-50 capturas reales
- detectar fricción de uso
- quitar campos inútiles
- ajustar scoring territorial con evidencia
- clasificar cada captura en observación o validación
- cruzar resultados territoriales con criterios de activación del MVP de paseo

### Fase 4: validación de mercado territorial (1 semana)

- identificar 3-5 celdas prometedoras
- comparar horarios y repetición
- aplicar gate de expansión por celda
- decidir dónde abrir primer piloto comercial
- activar el loop de paseo primero en esas celdas

---

## 13. Qué NO construir todavía

Para no repetir el error de sobreingeniería, NO construir todavía:

- matching nuevo
- agenda avanzada
- relación tutor-cuidador
- marketplace de cuidadores
- funnels complejos
- analítica avanzada
- paneles de negocio
- sistema de reputación
- referrals
- loyalty
- gamificación
- backoffice pesado

Si una pieza no ayuda a producir señal territorial, no entra al MVP.

Y si una pieza rompe o distrae el MVP actual de paseo, tampoco entra todavía.

---

## 14. Riesgos reales

### Riesgo 1: reconstruir el producto equivocado

Si el equipo intenta reemplazar el MVP actual por el módulo territorial, desperdicia avance ya construido.

Si ignora territorio y vuelve a operar sin foco geográfico, repite el error anterior.

El punto correcto es integración.

### Riesgo 2: escribir demasiada inteligencia desde cliente

La base actual ya hace esto en algunas piezas territoriales y de cobertura.

Para el nuevo módulo, los agregados deben quedar en backend.

### Riesgo 3: captura demasiado lenta

Si el explorador tiene que escribir demasiado, la operación muere.

### Riesgo 4: querer medir todo

Al inicio importa detectar densidad, repetición, confianza y aliados.

No importa medirlo todo.

### Riesgo 5: confundir observación con validación

Ver muchas mascotas no significa que exista mercado.

La señal fuerte aparece cuando además existe interés real, disposición y repetición.

### Riesgo 6: enamorarse del mapa

El mapa es interfaz, no validación.

La validación real sale de capturas repetidas y observación de calle.

---

## 15. Criterio de éxito

Este reinicio funciona si en pocas semanas puedes decir:

- estas son las celdas con mejor señal
- estos son los horarios con mayor recurrencia observable
- aquí sí hay cultura pet-friendly
- aquí sí aparecen interesados y aliados
- aquí sí vale la pena abrir el MVP comercial

Y además:

- el MVP actual de paseo puede activarse con más foco en esas zonas
- el territorio ayuda a priorizar despliegue, no a competir con el producto existente

Un resultado exitoso debería poder expresarse de forma concreta, por ejemplo:

> Recorrimos 20 zonas de Medellín, realizamos 400 observaciones, identificamos 5 celdas H3 con alta recurrencia, 3 con interés comercial validado y 2 con suficiente evidencia para iniciar un piloto de paseos.

Si al final solo existe un mapa bonito, el reinicio fracasó.

---

## 16. Resumen ejecutivo

### Qué cambia realmente

- deja de existir la idea de construir territorio aislado del producto actual
- el producto conserva su MVP de paseo y le suma una capa territorial
- el nuevo rol importante es el explorador territorial, pero integrado a tutor, cuidador y admin
- la primera verdad importante ya no es solo el paseo; es paseo más evidencia territorial

### Qué se construye primero

- rol explorador
- captura territorial
- resumen H3 agregado
- mapa de viabilidad
- integración con admin y despliegue futuro del MVP de paseo

### Qué se posterga

- lo que complique innecesariamente el MVP actual de paseo
- lo que complique innecesariamente el nuevo loop territorial

### Tesis central

**sin usuarios y sin datos, PawPath necesita dos cosas al mismo tiempo: conservar su avance hacia el MVP de paseo y añadir evidencia territorial para decidir dónde ese MVP sí tiene sentido.**

La versión anterior de PawPath intentaba construir una solución.

La nueva versión intenta descubrir primero si existe un problema territorial suficientemente concentrado para que la solución actual pueda lanzarse con mayor probabilidad de éxito.
