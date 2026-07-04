# LEGAL - ÍNDICE DE DOCUMENTOS MVP PAWPATH

**Última actualización**: 22 de junio de 2026  
**Etapa**: MVP (Mínimo Viable)  
**Jurisdicción**: Colombia (Medellín)  
**Aplicación Normativa**: Ley 1581/2012, Decreto 1377/2013, Ley 1774/2016

---

## 📋 ESTRUCTURA MODULAR (7 DOCUMENTOS)

```
/legal/
├── 01_TERMINOS_Y_CONDICIONES.md          [USUARIO]
├── 02_POLITICA_TRATAMIENTO_DATOS.md       [LEGAL]
├── 03_AUTORIZACION_TRATAMIENTO_DATOS.md   [CONSENTIMIENTO]
├── 04_POLITICA_PRIVACIDAD.md             [USUARIO]
├── 05_POLITICA_GEOLOCALIZACION.md        [USUARIO]
├── 06_POLITICA_EXPLORACION_TERRITORIAL.md [USUARIO + LEGAL]
├── 07_POLITICA_BIENESTAR_ANIMAL.md       [USUARIO + COMPLIANCE]
└── README.md                              [ESTE ARCHIVO]
```

---

## 📚 DESCRIPCIÓN DE DOCUMENTOS

### 1. **TÉRMINOS Y CONDICIONES** (01)

**Tipo**: Jurídico Vinculante  
**Audiencia**: Todos los usuarios  
**Propósito**: Define la relación legal entre usuario y PawPath

**Contenido Clave**:

- Naturaleza de PawPath (intermediario, no proveedor de servicios).
- Requisitos para usar (18+ años, información veraz).
- Roles (Tutor, Cuidador, Explorador) y responsabilidades.
- Propiedad intelectual (PawPath es dueña de código/datos).
- Suspensión de cuentas (criterios y procesos).
- Limitación de responsabilidad.

**Cambios vs. v2.0 Original**:

- ✅ Simplificado de 27 a 16 secciones.
- ✅ Eliminadas promesas no implementadas (chat, verificación, pagos).
- ✅ Relajada prohibición "imposible de enforcer" (intercambio teléfono).
- ✅ Reemplazado LGPD por Ley 1581/2012.

**Aceptación Requerida**: Sí (checkbox en registro).

---

### 2. **POLÍTICA DE TRATAMIENTO DE DATOS** (02)

**Tipo**: Jurídico + Técnico  
**Audiencia**: Usuarios + Auditoría + Autoridades  
**Propósito**: Cumplimiento Ley 1581/2012 (Datos Personales)

**Contenido Clave**:

- Responsable (PawPath - razón social por definir).
- Datos recopilados (identificación, ubicación, mascotas, técnicos, opcionales).
- Finalidad primaria y secundaria.
- Base legal (consentimiento, cumplimiento contrato, obligación legal, interés legítimo).
- Destinatarios (equipo interno, Google/Firebase, autoridades, NO comercial).
- Derechos del usuario (acceso, rectificación, eliminación, oposición, portabilidad).
- **Retención GPS**: 7 días precisión alta, 8-60 días agregada, post-60 eliminación.
- Medidas de seguridad (HTTPS, autenticación, encriptación).
- Transferencia internacional (datos en servidores Google/Firebase).
- Procedimiento para ejercer derechos.

**Aceptación Requerida**: Sí (junto con Autorización - doc #3).

---

### 3. **AUTORIZACIÓN DE TRATAMIENTO DE DATOS** (03)

**Tipo**: Consentimiento (Checkbox/Firma)  
**Audiencia**: Usuarios (formato simple)  
**Propósito**: Obtener consentimiento explícito (Ley 1581, Art. 6)

**Contenido Clave**:

- Checkboxes de consentimiento (datos personales, ubicación, mascotas, inteligencia territorial, análisis, cumplimiento legal).
- Derechos reconocidos (acceso, rectificación, eliminación, oposición, portabilidad).
- Excepciones a eliminación (auditoría, disputa legal).
- Revocación posible en cualquier momento.
- Formato digital aceptado (timestamp = fecha legal).

**Aceptación Requerida**: Sí (en registro, atajo a #02).

**Notas Implementación**:

- En app: Checkbox en "crear cuenta".
- En web: Popup o sección de consentimiento.
- Guardar timestamp + IP para auditoría.

---

### 4. **POLÍTICA DE PRIVACIDAD** (04)

**Tipo**: Usuario-Friendly (No-Legal)  
**Audiencia**: Usuarios finales  
**Propósito**: Explicar en lenguaje simple qué hace PawPath con datos

**Contenido Clave**:

- Tabla simple: Qué recopilamos, por qué, es obligatorio.
- Qué hacemos (servicios, mejora, protección).
- Qué NO hacemos (no vendemos, no spam, no compartimos sin consentimiento).
- Quién ve qué (tutor, cuidador, equipo, autoridades).
- Tiempos de retención (personal = mientras activo, GPS = 7/8-60/post-60).
- Cómo protegemos (HTTPS, contraseña, servidores seguros).
- Derechos en formato simple.
- Cambios y cómo notificamos.

**Tono**: 8º grado de lectura, no-técnico.

**Aceptación Requerida**: Referencia (vinculado desde #01 y #02).

---

### 5. **POLÍTICA DE GEOLOCALIZACIÓN** (05)

**Tipo**: Usuario + Técnico  
**Audiencia**: Usuarios que usan GPS, cuidadores, tutores  
**Propósito**: Explicar específicamente cómo funciona GPS en paseos

**Contenido Clave**:

- Por qué se necesita (rastreo en vivo, seguridad).
- Cuándo se captura (EN_CAMINO y EN_PROGRESO solamente).
- Qué se almacena (coordenadas, timestamp, precisión, cuidador ID, paseo ID).
- Qué NO se almacena (nombre, teléfono, historial completo).
- **POLÍTICA DE RETENCIÓN (crítica)**:
  - 0-7 días: Precisión alta (auditoría).
  - 8-60 días: Reducida precisión (inteligencia anónima).
  - Post-60: Eliminación automática.
  - Excepciones: Disputa legal indefinida.
- Quién ve (tutor en vivo, cuidador su propia ruta, otros NO).
- Permisos Android/iOS y cómo revocar.
- Background location (segunda plano) - necesario, notificación visible.
- Agregación e inteligencia territorial (mapas anónimos).
- Riesgos conocidos (sin cobertura rural, delays con internet lento).
- Disputas y auditoría (acceso GPS precisión alta si hay conflicto).

**Aceptación Requerida**: Implícita (permiso de ubicación en dispositivo).

---

### 6. **POLÍTICA DE EXPLORACIÓN TERRITORIAL** (06)

**Tipo**: Usuario + Compliance  
**Audiencia**: Cuidadores, Tutores, Exploradores  
**Propósito**: Proteger privacidad de terceros + definir IP de PawPath

**Contenido Clave**:

- Rol de Explorador (quién es, qué hace).
- **Permitido**: Coordenadas, H3 index, tipo punto, mascotas visibles, flujo peatonal, seguridad, pet-friendly, comercios, observaciones, fotos anonimizadas, horarios.
- **Prohibido**: Teléfonos, rostros, placas, datos personales, info médica de mascota ajena, domicilios privados, videos, menores.
- Anonimización de fotos (blur rostros/placas).
- Consentimiento de terceros (cuándo necesario, cómo obtener).
- **Menores**: Prohibición absoluta (incluso anonimizado).
- Propiedad de datos (PawPath es dueña de datos territoriales agregados).
- Moderación (rechazo de observaciones incumplientes).
- Sanciones (aviso → restricción 7 días → suspensión → eliminación + reporte).
- Ética y buenas prácticas.
- Uso de inteligencia territorial (PawPath la usa para mejorar plataforma).
- Procedimiento de reporte y disputa.

**Aceptación Requerida**: Implícita (aceptar T&C implica aceptar exploración territorial).

**Notas Críticas**:

- Diferencia clara entre "permitido" y "prohibido" (protege de LGPD/privacidad legal).
- Propiedad IP bien definida (PawPath puede monetizar inteligencia territorial en futuro).
- Proceso de moderación riguroso (rechaza fotos no anonimizadas).

---

### 7. **POLÍTICA DE BIENESTAR ANIMAL** (07)

**Tipo**: Compliance + Usuario  
**Audiencia**: Tutores, Cuidadores  
**Propósito**: Garantizar bienestar de mascotas (Ley 1774/2016)

**Contenido Clave**:

- Responsabilidades Tutor (información veraz, salud, comportamiento, seguridad).
- Responsabilidades Cuidador (lectura info, cuidado durante paseo, supervisión, medicamentos, dieta, comunicación, reporte).
- Prohibiciones absolutos (castigo físico, vehículo cerrado, clima extremo, sustancias tóxicas, abuso sexual, abandono).
- Guía de salud (vacunas, alergias, condiciones, síntomas).
- Guía de comportamiento (energía, sociabilidad, reactividad, ansiedad).
- Maltrato (definiciones, reporte, línea de denuncia).
- Atención veterinaria obligatoria (emergencias).
- Comunicación entre tutor/cuidador (fotos, reportes, incidentes).
- Políticas especiales (mascotas muy jóvenes, mayores, gestantes, post-cirugía).
- Sanciones (leve, grave, crítica).
- Derecho a negarse (ambos roles pueden rechazar).
- Cumplimiento legal (Ley 1774/2016).
- Recursos (veterinarias emergencia, línea PONAL, contacto PawPath).
- Checklists pre-paseo (tutor y cuidador).

**Aceptación Requerida**: Implícita (aceptar T&C).

---

## 🔄 FLUJO DE ACEPTACIÓN

```
USUARIO NUEVO
    ↓
REGISTRARSE
    ↓
☑ Acepto Términos y Condiciones (#01)
    ↓
☑ Acepto Política de Privacidad (#04) [resumen]
    ↓
☑ Autorizo Tratamiento de Datos (#03) [explícito]
    ↓
REVISIÓN AUTOMÁTICA → Vinculada a:
    - Política de Tratamiento Datos (#02) [documento completo]
    - Política de Geolocalización (#05)
    - Política de Exploración Territorial (#06)
    - Política de Bienestar Animal (#07)
    ↓
CUENTA CREADA
```

---

## ✅ CAMBIOS RESPECTO A T&C v2.0 ORIGINAL

| Aspecto                | v2.0 (Original)         | MVP (Simplificado)            |
| ---------------------- | ----------------------- | ----------------------------- |
| **Secciones**          | 27                      | 16                            |
| **Documentos**         | 1 monolítico            | 7 modulares                   |
| **Chat**               | Prometido               | Removido (futuro)             |
| **Verificación**       | Prometida               | Removida (futuro)             |
| **Pagos**              | "Procesamos pagos"      | "No procesamos (MVP)"         |
| **Teléfono prohibido** | Sí (imposible enforcer) | Relajado (cuando chat exista) |
| **GPS retención**      | No especificaba         | 7/8-60/post-60 días           |
| **Ley aplicable**      | LGPD (Brasil)           | Ley 1581/2012 (Colombia)      |
| **IP territorial**     | No definida             | "PawPath es dueña"            |
| **Menores**            | Sin validación          | Prohibido (campo obligatorio) |
| **Teléfonos terceros** | No mencionado           | Prohibido en exploración      |

---

## 🔐 CONFORMIDAD LEGAL

| Requisito                                | Documento     |
| ---------------------------------------- | ------------- |
| Ley 1581/2012 (Datos Personales)         | #02, #03, #04 |
| Decreto 1377/2013 (Regulación)           | #02, #03      |
| Habeas Data (Acceso a datos)             | #02           |
| Protección al Consumidor                 | #01, #05      |
| Bienestar Animal (Ley 1774/2016)         | #07           |
| Privacidad y consentimiento explícito    | #03, #04, #06 |
| Intermediario (no responsable servicios) | #01           |
| Limitación de responsabilidad            | #01           |

---

## 🚀 PRÓXIMOS PASOS

### Fase 1: MVP (AHORA)

- ✅ 7 documentos creados.
- ⏳ Definir: [RAZÓN SOCIAL], emails de contacto, direcciones, horarios.
- ⏳ Incluir en app (checkboxes de aceptación).
- ⏳ Legal review (abogado local).
- ⏳ Publicar en `/legal` (esta carpeta).

### Fase 2: Mejoras (Futuro)

- Política para Cuidadores (verificación, conduct, cancelaciones).
- Política de Comunidad y Contenido (cuando chat exista).
- Política de Eliminación de Cuenta (App Store/Play Store requirement).
- Acuerdos con proveedores (Google, Firebase, términos de servicio).
- Reclamo y arbitraje (procedimiento formal de disputas).

### Fase 3: Internacionalización (Largo Plazo)

- Adaptar a otras jurisdicciones (otros países).
- Traducir a otros idiomas.
- Conformidad GDPR (si opera en UE).

---

## 📧 CONTACTOS PARA DEFINIR

Estos están marcados como **[POR DEFINIR]** en todos los documentos. Actualizar:

- **Email de contacto general**: [email]
- **Delegado de Protección de Datos**: [email]
- **Reporte de abuso/maltrato animal**: [email]
- **Soporte técnico**: [email]
- **Teléfono principal**: [número]
- **Dirección oficial**: Medellín, Antioquia, Colombia [calle/número]
- **Horario de atención**: [horarios]
- **Veterinarias emergencia** (locales): [lista]
- **Contacto PONAL** (línea animal): 018000

---

## 📞 PREGUNTAS FRECUENTES

### ¿Por qué 7 documentos en lugar de 1?

**Respuesta**: Separación de concernos. Cada documento es:

- Independiente y modulable.
- Fácil de actualizar sin tocar todo el framework.
- Más fácil de defender en auditoría/disputa legal.
- Cumple con "transparencia" (usuario puede leer solo lo que le importa).

### ¿Los usuarios tienen que leer todos?

**Respuesta**: No. Obligatorio: #01 (T&C) + #03 (Autorización). Referenciados pero no obligatorios leer completo: #02, #04, #05, #06, #07 (disponibles si quieren).

### ¿Qué pasa si tutor no acepta?

**Respuesta**: No puede crear cuenta. Es prereq.

### ¿Puedo cambiar estos documentos después?

**Respuesta**: Sí, pero notificas cambios a usuarios. Si cambio es "material" (ej: GPS retención de 7 a 1 día), debes pedir re-aceptación.

### ¿Necesito abogado?

**Respuesta**: Sí. Legal review recomendada antes de publicar (especialmente #01, #02, #03).

---

## 📄 VERSIÓN Y AUDITORÍA

- **Versión MVP**: 1.0
- **Fecha de creación**: 22 de junio de 2026
- **Auditoría código**: Completada (vs. arquitectura real PawPath).
- **Próxima auditoría**: Post-legal-review.
- **Mantenimiento**: Actualizar si código cambia (ej: nuevas políticas GPS, nuevas funcionalidades).

---

**Fin del Índice**
