# Propuesta de Modelo Tributario, Facturación y Mandato — Paw-Path

**Empresa:** PAW-PATH S.A.S.  
**NIT:** 902.103.320-0  
**País:** Colombia  
**Versión:** Propuesta inicial para validación contable, tributaria y jurídica  
**Fecha:** 2026-09-09

> **Importante:** Este documento es una propuesta de arquitectura comercial, contractual, tributaria y operativa. No reemplaza el concepto del contador público ni la revisión de un abogado tributario/comercial. Los ejemplos numéricos son ilustrativos y no deben registrarse contablemente sin validar primero la estructura jurídica y tributaria definitiva.

---

## 1. Objetivo

Definir un modelo sencillo para que Paw-Path pueda:

1. Operar mediante una estructura de mandato/intermediación coherente con su negocio.
2. Separar claramente el dinero que pertenece económicamente a terceros del ingreso propio de Paw-Path.
3. Facturar electrónicamente de forma trazable.
4. Manejar correctamente IVA, retenciones y demás obligaciones que correspondan.
5. Registrar las operaciones en Siigo Nube/Siigo API.
6. Conciliar Paw-Path → Siigo → banco → liquidación del cuidador.
7. Automatizar posteriormente el proceso sin convertir Excel en fuente de verdad.
8. Mantener trazabilidad desde cada paseo hasta su facturación, contabilidad y pago al cuidador.

---

# 2. Situación tributaria actual de Paw-Path

Según el RUT aportado, Paw-Path S.A.S. figura con, entre otras, estas responsabilidades:

- **05:** Impuesto sobre la renta y complementarios — régimen ordinario.
- **07:** Retención en la fuente a título de renta.
- **14:** Informante de exógena.
- **42:** Obligado a llevar contabilidad.
- **48:** Impuesto sobre las ventas — IVA.

### ¿Qué significa en términos simples?

Paw-Path debe diseñar su operación desde el principio pensando en:

**Operación → factura → IVA cuando corresponda → retenciones cuando correspondan → contabilidad → conciliación bancaria → declaraciones/reportes.**

Ser responsable de IVA no significa que todo dinero que pase temporalmente por la cuenta bancaria de Paw-Path sea automáticamente ingreso propio de Paw-Path.

La clasificación correcta depende de la naturaleza jurídica y económica de cada operación.

---

# 3. Principio central del modelo

La separación fundamental debe ser:

```text
DINERO DE TERCEROS
        ≠
INGRESO PROPIO DE PAW-PATH
```

Por ejemplo:

Un tutor paga $50.000 por un paseo.

Supongamos únicamente para ilustrar la estructura:

- $45.000 → corresponden económicamente al servicio del cuidador.
- $5.000 → remuneración de Paw-Path.

Paw-Path podría recibir temporalmente los $50.000, pero eso no significa que los $50.000 sean automáticamente ingreso propio.

La plataforma debe identificar internamente:

```text
Valor operación                  $50.000
├── Componente tercero           $45.000
└── Remuneración Paw-Path         $5.000
```

**Advertencia:** esta distribución es un ejemplo. El porcentaje, valor o forma de remuneración real debe definirse comercial y contractualmente.

---

# 4. Estructura contractual propuesta

## 4.1 Tutor → Paw-Path

El tutor actúa como **MANDANTE**.

Paw-Path actúa como **MANDATARIO**.

El contrato debe establecer claramente que el tutor encarga a Paw-Path determinadas gestiones relacionadas con la contratación/coordinación del servicio para su mascota.

Debe definir, como mínimo:

- Identificación de las partes.
- Objeto del mandato.
- Facultades de Paw-Path.
- Alcance de la intermediación.
- Gestión y recepción de recursos.
- Remuneración de Paw-Path.
- Manejo de recursos de terceros.
- Facturación.
- Impuestos y retenciones.
- Reembolsos.
- Cancelaciones.
- Devoluciones.
- Liquidaciones.
- Responsabilidades.
- Protección de datos.
- Terminación y revocatoria.

---

## 4.2 Paw-Path → Cuidador

Debe existir una relación contractual independiente con el cuidador.

El cuidador presta el servicio bajo condiciones de independencia, sin que el contrato pretenda crear una relación laboral.

Debe regular:

- Prestación independiente del servicio.
- Aceptación de servicios.
- Reglas de calidad.
- Verificación.
- Conducta.
- Seguridad.
- Evidencias del servicio.
- Liquidación.
- Forma y periodicidad del pago.
- Cancelaciones.
- Incumplimientos.
- Impuestos y retenciones aplicables.
- Documentación requerida.

### Punto jurídico importante

La redacción contractual por sí sola no elimina una relación laboral si en la realidad existe subordinación.

Por eso el diseño operativo también debe respetar la independencia que se pretende contratar.

---

# 5. Una operación completa

Tomemos este ejemplo:

**Tutor:** Laura  
**Mascota:** Bruno  
**Cuidador:** Andrés  
**Servicio:** paseo  
**Precio total:** $50.000

Supongamos:

```text
Servicio total                         $50.000
Remuneración Paw-Path                   $5.000
Valor destinado al cuidador            $45.000
```

La operación comienza en Paw-Path.

---

# 6. Flujo operativo

```text
1. Laura solicita paseo
          ↓
2. Paw-Path coordina el servicio
          ↓
3. Andrés acepta
          ↓
4. Laura realiza el pago
          ↓
5. Siigo Pay procesa el pago
          ↓
6. Paw-Path identifica la operación
          ↓
7. Se separan conceptualmente:
       - recursos de terceros
       - remuneración Paw-Path
          ↓
8. Se presta el paseo
          ↓
9. Se completa la operación
          ↓
10. Se genera la facturación correspondiente
          ↓
11. Se determina IVA/retenciones
          ↓
12. Se registra contablemente
          ↓
13. Se incluye en liquidación del cuidador
          ↓
14. Paw-Path paga al cuidador
          ↓
15. Se concilia banco ↔ sistema ↔ Siigo
```

---

# 7. Facturación en el mandato

La normativa colombiana de facturación para operaciones en mandato contempla que el mandatario expida las facturas correspondientes a las operaciones realizadas en desarrollo del mandato y que se diferencien las operaciones del mandante de las propias del mandatario.

Esto es especialmente importante para Paw-Path.

La factura no debe diseñarse como si todo el valor de una operación fuera simplemente venta propia de Paw-Path cuando jurídicamente existe un componente correspondiente al mandante/tercero.

## Conceptualmente

```text
FACTURACIÓN DE LA OPERACIÓN
│
├── Operación ejecutada por cuenta del mandante
│
└── Remuneración/operación propia de Paw-Path
```

La estructura exacta de los conceptos y de la factura debe ser validada con el contador y configurada correctamente en Siigo.

---

# 8. ¿Quién presta realmente el servicio?

Este es uno de los puntos que debe cerrarse antes de automatizar.

Existen diferentes estructuras posibles.

## Modelo A — Mandato puro

```text
Tutor
  │
  │ mandato
  ▼
Paw-Path
  │
  │ contrata/coordina por cuenta del tutor
  ▼
Cuidador
```

Aquí Paw-Path actúa principalmente como mandatario/intermediario.

## Modelo B — Paw-Path como prestador principal

```text
Tutor
  │
  │ compra servicio
  ▼
Paw-Path
  │
  │ subcontrata
  ▼
Cuidador
```

Este modelo puede producir un tratamiento tributario y de facturación diferente.

### Recomendación

No implementar la lógica tributaria definitiva hasta escoger formalmente uno de estos modelos y validar:

- contrato;
- facturación;
- IVA;
- retenciones;
- reconocimiento de ingresos;
- tratamiento del pago al cuidador;
- responsabilidades frente al consumidor;
- tratamiento contable.

La estructura jurídica debe corresponder a cómo Paw-Path realmente opera.

---

# 9. IVA

La tarifa general del IVA en Colombia es **19%**, salvo que una operación tenga un tratamiento especial.

Pero el punto crítico para Paw-Path no es solamente conocer el 19%.

La pregunta correcta es:

> **¿Sobre qué valor y respecto de qué servicio se genera el IVA?**

No se debe asumir automáticamente que:

```text
IVA = 19% × todo el dinero recibido
```

ni tampoco que:

```text
IVA = 19% × solamente la comisión de Paw-Path
```

sin revisar la estructura definitiva.

El tratamiento depende de la naturaleza de la operación y de quién está realizando/prestando jurídicamente el servicio.

---

# 10. Ejemplo de IVA sobre remuneración de Paw-Path

Supongamos que, después de la revisión contable y jurídica, se determina que la remuneración propia de Paw-Path es un servicio gravado a tarifa general.

Si Paw-Path cobra:

**$5.000 + IVA**

Entonces:

```text
Remuneración Paw-Path       $5.000
IVA 19%                       $950
Total                        $5.950
```

Si, en cambio, los **$5.000 ya incluyen IVA**:

```text
Base = $5.000 / 1,19
Base ≈ $4.202
IVA ≈ $798
```

Estos son ejemplos matemáticos, no una conclusión sobre cuál debe usar Paw-Path.

---

# 11. ¿Qué pasa con el dinero del cuidador?

Supongamos nuevamente:

```text
Tutor paga                         $50.000

Componente del cuidador            $45.000
Remuneración Paw-Path               $5.000
```

Internamente Paw-Path debería poder identificar:

```text
OPERACIÓN PP-000001

Valor recibido                     $50.000
Valor de tercero                   $45.000
Ingreso propio Paw-Path             $5.000
IVA propio                         [según tratamiento]
Retenciones                        [según corresponda]
Valor neto cuidador                [calculado]
```

Esto permite que la contabilidad y la administración no confundan:

**flujo de caja** con **ingreso contable propio**.

---

# 12. Retención en la fuente

Paw-Path figura en el RUT con responsabilidad de retención en la fuente.

Eso significa que debe evaluar, operación por operación, si existe obligación de practicar retención.

No significa que Paw-Path deba retener automáticamente un porcentaje fijo sobre todos los pagos.

Dependerá, entre otros factores, de:

- naturaleza del pago;
- calidad tributaria del beneficiario;
- tipo de servicio;
- cuantía;
- conceptos aplicables;
- topes;
- condiciones legales vigentes.

## Ejemplo conceptual

Paw-Path debe pagar al cuidador $45.000.

El sistema no debería simplemente hacer:

```text
45.000 × X% = retención
```

Debe primero determinar:

```text
¿El pago está sujeto a retención?
        ↓
¿Qué concepto corresponde?
        ↓
¿Quién es el beneficiario?
        ↓
¿Se cumplen las condiciones?
        ↓
¿Cuál tarifa aplica?
        ↓
¿Se supera la base mínima?
        ↓
Retención
```

Por esto conviene implementar un **motor de reglas tributarias**, no porcentajes quemados en código.

---

# 13. Retenciones e información del mandato

Cuando una operación se ejecuta en desarrollo del mandato, las retenciones relacionadas con operaciones del mandante deben tratarse de acuerdo con la naturaleza del mandato y la normativa aplicable.

Paw-Path debe conservar la trazabilidad de:

```text
Operación
   ↓
Beneficiario
   ↓
Concepto
   ↓
Base
   ↓
Retención
   ↓
Certificado/documento
   ↓
Contabilidad
```

---

# 14. Impuesto de renta

Paw-Path es una sociedad colombiana sometida al régimen ordinario de renta según su RUT.

Para simplificar:

```text
Paw-Path genera ingresos propios
        ↓
se reconocen contablemente
        ↓
se determinan costos/deducciones procedentes
        ↓
se determina la renta fiscal
        ↓
se aplica la tarifa y reglas vigentes
```

El dinero recibido por cuenta de terceros no debe tratarse automáticamente como ingreso propio solo porque pasó por la cuenta bancaria de Paw-Path.

La clasificación contable y tributaria debe estar respaldada por:

- contratos;
- facturas;
- comprobantes;
- conciliaciones;
- registros contables;
- liquidaciones;
- evidencia de la operación.

---

# 15. Ingresos para terceros

Conceptualmente:

```text
Cliente paga
      ↓
Paw-Path recibe
      ↓
Paw-Path administra
      ↓
parte del dinero pertenece económicamente a otro
      ↓
Paw-Path debe transferir/liquidar
```

Ese componente no debe confundirse con:

```text
INGRESO PROPIO PAW-PATH
```

La documentación de la operación debe demostrar por qué Paw-Path recibió ese dinero y por qué posteriormente debe entregarlo.

---

# 16. Contabilidad propuesta

La estructura interna debe manejar como mínimo:

## Operación

```text
operacionId
walkId
tutorId
cuidadorId
mascotaId
mandatoId

valorTotal
valorTercero
remuneracionPawPath

iva
retenciones
ajustes

paymentId
facturaId

estadoOperacion
estadoFacturacion
estadoContable
estadoLiquidacion
estadoPago
```

---

# 17. Liquidaciones

Las liquidaciones deben agrupar las operaciones pendientes de pago al cuidador.

Ejemplo:

### Semana 1

| Operación | Servicio | Valor cuidador |
| --------- | -------: | -------------: |
| PP-001    |  $50.000 |        $45.000 |
| PP-002    |  $50.000 |        $45.000 |
| PP-003    |  $60.000 |        $54.000 |

Subtotal:

```text
$45.000
+ $45.000
+ $54.000
---------
$144.000
```

Después:

```text
$144.000
- retenciones aplicables
± ajustes
----------------
NETO A PAGAR
```

La liquidación debe quedar asociada a cada operación.

---

# 18. No pagar directamente desde Excel

Excel puede utilizarse para:

- análisis;
- reportes;
- exportaciones;
- conciliaciones auxiliares.

Pero no debe ser la fuente de verdad.

La fuente debería ser:

```text
Paw-Path
    ↓
Operación
    ↓
Liquidación
    ↓
Pago
    ↓
Banco
```

Y:

```text
Paw-Path
    ↓
Factura
    ↓
Siigo
    ↓
Contabilidad
```

---

# 19. Papel de Siigo

La división recomendada es:

### Paw-Path

Debe conocer:

- quién solicitó;
- qué mascota;
- qué cuidador;
- qué servicio;
- cuándo ocurrió;
- cuánto pagó el tutor;
- cuánto corresponde al tercero;
- cuánto corresponde a Paw-Path;
- qué comisión/remuneración aplica;
- qué liquidación corresponde.

### Siigo

Debe conocer:

- facturas;
- clientes;
- proveedores;
- comprobantes;
- impuestos;
- retenciones;
- registros contables;
- documentos tributarios;
- cuentas por pagar/cobrar;
- información requerida para declaraciones y reportes.

### Banco

Debe demostrar:

- dinero realmente recibido;
- dinero realmente transferido;
- fechas;
- valores;
- referencias.

---

# 20. Arquitectura financiera recomendada

```text
                 PAW-PATH
                    │
          ┌─────────┴─────────┐
          │                   │
     OPERACIÓN             FACTURA
          │                   │
          │                 SIIGO
          │                   │
          │              CONTABILIDAD
          │
     LIQUIDACIÓN
          │
          ▼
       BANCO
          │
          ▼
     CUIDADOR
```

Todo debe compartir un identificador de operación.

Ejemplo:

```text
PP-2026-000001
```

Ese ID debería permitir encontrar:

- paseo;
- tutor;
- mascota;
- cuidador;
- pago;
- factura;
- liquidación;
- comprobante;
- transferencia;
- auditoría.

---

# 21. Reconciliación

El sistema debe poder responder:

> "Recibimos $X. ¿Dónde está?"

Ejemplo:

```text
Banco
+ $50.000
     ↓
Payment PP-PAY-001
     ↓
Operación PP-000001
     ↓
Factura
     ↓
$45.000 tercero
$5.000 Paw-Path
     ↓
Liquidación
     ↓
Transferencia cuidador
```

Si aparece una diferencia:

```text
Banco ≠ Paw-Path
```

debe existir una alerta.

---

# 22. Devoluciones y cancelaciones

También deben diseñarse desde el inicio.

Ejemplo:

Tutor paga:

```text
$50.000
```

El paseo se cancela.

El sistema debe determinar:

```text
¿Se debe devolver todo?
¿Hay penalización?
¿El cuidador ya incurrió en un costo?
¿Paw-Path conserva alguna remuneración?
¿Debe reversarse IVA?
¿Debe generarse nota crédito?
```

No se debe simplemente cambiar:

```text
estado = CANCELADO
```

Debe existir una operación financiera de reversión cuando corresponda.

---

# 23. Notas crédito y ajustes

Si una factura electrónica necesita corregirse, Paw-Path debe utilizar los mecanismos de facturación correspondientes.

No se debe modificar históricamente una operación facturada para hacer desaparecer el error.

Debe existir:

```text
Factura original
       ↓
Motivo del ajuste
       ↓
Nota crédito / documento correspondiente
       ↓
Nueva situación
```

---

# 24. Reembolsos

Los reembolsos deben tener su propia trazabilidad.

Ejemplo:

```text
Operación PP-000001
Factura FEV-001
Pago $50.000

Cancelación
    ↓
Autorización devolución
    ↓
Reembolso $50.000
    ↓
Referencia bancaria
    ↓
Ajuste contable/fiscal
```

---

# 25. Impuestos que deben monitorearse

El sistema administrativo debe estar preparado para controlar, como mínimo:

### Nacionales

- IVA.
- Impuesto sobre la renta.
- Retención en la fuente.

### Información

- Información exógena cuando corresponda.
- Certificados de retención.
- Soportes tributarios.

### Territoriales

Debe revisarse con contador:

- ICA según municipio y actividad.
- Retenciones de ICA cuando correspondan.
- Otras obligaciones municipales aplicables.

No debe asumirse que las obligaciones territoriales son idénticas a las nacionales.

---

# 26. Facturación electrónica

Paw-Path debe configurar correctamente:

```text
Cliente/tutor
      ↓
Operación
      ↓
Determinación tributaria
      ↓
Factura electrónica
      ↓
DIAN
      ↓
Siigo
      ↓
Registro interno
```

La factura debe poder relacionarse con la operación original.

---

# 27. Clientes y proveedores

## Tutor

Normalmente será tratado como cliente/receptor según la operación facturada.

Debe existir una ficha con:

- identificación;
- nombre;
- datos fiscales;
- dirección;
- correo;
- información necesaria para facturación.

## Cuidador

Debe existir como tercero/proveedor cuando corresponda al modelo definitivo.

Debe contener:

- identificación;
- nombre;
- información tributaria;
- documentación;
- estado de habilitación;
- información para pagos;
- retenciones aplicables.

---

# 28. Ejemplo completo

Supongamos:

```text
Tutor: Laura
Cuidador: Andrés
Paseo: Bruno
Precio operación: $50.000
```

La estructura hipotética:

```text
                 LAURA
                   │
             paga $50.000
                   │
                   ▼
                PAW-PATH
                   │
        ┌──────────┴──────────┐
        │                     │
   $45.000 tercero       $5.000 propio
        │                     │
        ▼                     ▼
     ANDRÉS              PAW-PATH
        │                     │
     servicio             remuneración
        │                     │
        └──────────┬──────────┘
                   ▼
             FACTURACIÓN
                   │
                   ▼
                 SIIGO
                   │
                   ▼
              CONTABILIDAD
```

El IVA y las retenciones se determinan conforme a la estructura jurídica y tributaria finalmente validada.

---

# 29. ¿Cómo debería verse en el administrador?

Una operación debería mostrar:

```text
OPERACIÓN #PP-2026-000001

Tutor
Laura

Mascota
Bruno

Cuidador
Andrés

Servicio
Paseo

Valor recibido
$50.000

Componente tercero
$45.000

Remuneración Paw-Path
$5.000

IVA
Pendiente / calculado

Retenciones
Pendiente / calculado

Pago
APROBADO

Factura
FEV-000001

Liquidación
LIQ-2026-001

Pago cuidador
TRX-000001

Conciliación
CONCILIADO
```

---

# 30. Estados recomendados

## Operación

```text
SOLICITADA
CONFIRMADA
EN_CURSO
COMPLETADA
CANCELADA
REEMBOLSADA
```

## Pago del tutor

```text
PENDIENTE
APROBADO
RECIBIDO
RECHAZADO
REEMBOLSADO
CONCILIADO
```

## Facturación

```text
PENDIENTE
GENERADA
ENVIADA
ACEPTADA
RECHAZADA
AJUSTADA
```

## Liquidación

```text
ABIERTA
CALCULADA
REVISADA
APROBADA
PAGADA
CONCILIADA
```

---

# 31. Automatización futura

La automatización debería seguir este patrón:

```text
Evento operativo
      ↓
Paw-Path determina la operación
      ↓
Motor tributario determina reglas
      ↓
Siigo API recibe/consulta información
      ↓
Factura/documento
      ↓
Liquidación
      ↓
Pago
      ↓
Conciliación
      ↓
Auditoría
```

n8n puede utilizarse posteriormente para tareas auxiliares como:

- notificaciones;
- alertas;
- sincronizaciones no críticas;
- recordatorios;
- controles.

Pero no debería ser la única fuente de verdad de:

- dinero;
- impuestos;
- facturas;
- liquidaciones;
- saldos.

---

# 32. Motor tributario

No conviene programar:

```text
IVA = 19%
RETENCION = 4%
```

directamente dentro del código de cada operación.

Debe existir una capa de reglas.

Ejemplo:

```text
TaxRule

impuesto: IVA
tipo_operacion: SERVICIO
tarifa: 19%
vigencia_desde: ...
vigencia_hasta: ...

RetentionRule

concepto: SERVICIOS
beneficiario: PERSONA_NATURAL
condiciones: ...
tarifa: ...
base_minima: ...
```

Esto permite modificar reglas sin reescribir toda la plataforma.

---

# 33. Controles mínimos

Paw-Path debería impedir:

### Caso 1

Una operación completada sin pago conciliado.

### Caso 2

Un pago recibido sin operación.

### Caso 3

Una operación facturada dos veces.

### Caso 4

Un cuidador liquidado dos veces.

### Caso 5

Una liquidación pagada sin aprobación.

### Caso 6

Una factura sin operación asociada.

### Caso 7

Una operación con diferencia entre:

```text
valor recibido
=
tercero
+
Paw-Path
+
ajustes/impuestos según modelo
```

---

# 34. Lo que NO recomiendo

## 34.1 Registrar todo como ingreso

No:

```text
Ingreso Paw-Path = $50.000
```

si contractualmente solo una parte corresponde a Paw-Path.

## 34.2 Pagar cuidadores manualmente sin liquidación

No:

```text
"Transferí $450.000 porque Excel decía eso."
```

## 34.3 Hacer impuestos manuales

No:

```text
"Siempre aplicamos 19%."
```

## 34.4 Hacer que n8n sea el sistema contable

No:

```text
Paw-Path → n8n → todo
```

n8n debe ser automatización, no contabilidad.

## 34.5 Usar Excel como fuente de verdad

Excel debe ser salida/análisis, no el núcleo financiero.

---

# 35. Modelo de responsabilidad de cada sistema

| Sistema  | Responsabilidad                     |
| -------- | ----------------------------------- |
| Paw-Path | Verdad operacional                  |
| Siigo    | Facturación y contabilidad          |
| Banco    | Verdad del dinero                   |
| DIAN     | Validación/obligaciones tributarias |
| n8n      | Automatización auxiliar             |
| Excel    | Análisis/exportación                |

---

# 36. Principio de trazabilidad

Toda operación debe poder seguirse:

```text
PASEO
  ↓
OPERACIÓN
  ↓
PAGO
  ↓
FACTURA
  ↓
IVA / RETENCIONES
  ↓
CONTABILIDAD
  ↓
LIQUIDACIÓN
  ↓
TRANSFERENCIA
  ↓
CONCILIACIÓN
```

Y nunca debe existir un movimiento financiero importante sin una operación origen.

---

# 37. Preguntas que deben cerrarse antes de producción

Estas preguntas son críticas:

1. ¿El tutor es realmente el mandante en toda la operación?
2. ¿Paw-Path contrata al cuidador por cuenta del tutor o contrata al cuidador para prestar un servicio propio?
3. ¿Quién jurídicamente presta el servicio de paseo al tutor?
4. ¿Quién es el obligado a facturar el servicio subyacente?
5. ¿Qué parte exacta constituye remuneración propia de Paw-Path?
6. ¿La remuneración de Paw-Path está gravada con IVA?
7. ¿El servicio de paseo tiene algún tratamiento especial de IVA?
8. ¿Qué retenciones aplican al cuidador?
9. ¿Qué retenciones aplican a Paw-Path?
10. ¿Cómo se manejarán las retenciones en las operaciones de mandato?
11. ¿Cómo se manejarán devoluciones?
12. ¿Cómo se manejarán cancelaciones?
13. ¿Cómo se documentará la liquidación al cuidador?
14. ¿Qué obligaciones de ICA aplican?
15. ¿Cómo se reportará la información exógena?
16. ¿Cómo se reflejará cada operación en Siigo?
17. ¿Qué comprobantes contables se generarán?
18. ¿Cómo se conciliará Siigo contra banco?
19. ¿Cómo se manejarán diferencias?
20. ¿Qué documentación debe conservar Paw-Path?

---

# 38. Recomendación de arquitectura final

La arquitectura conceptual que recomiendo estudiar para Paw-Path es:

```text
                         PAW-PATH
                            │
             ┌──────────────┼──────────────┐
             │              │              │
        OPERACIONES      MANDATOS       TERCEROS
             │              │              │
             └──────────────┼──────────────┘
                            │
                      MOTOR FINANCIERO
                            │
             ┌──────────────┼──────────────┐
             │              │              │
           PAGOS        FACTURACIÓN    LIQUIDACIONES
             │              │              │
             │            SIIGO            │
             │              │              │
             └──────────────┼──────────────┘
                            │
                           BANCO
                            │
                         CONCILIACIÓN
                            │
                         AUDITORÍA
```

---

# 39. Regla de oro para Paw-Path

La plataforma debe poder responder cinco preguntas para cada peso:

```text
1. ¿De dónde salió?
2. ¿Por qué Paw-Path lo recibió?
3. ¿A quién pertenece económicamente?
4. ¿Qué documento lo soporta?
5. ¿Dónde terminó?
```

Si el sistema puede responder esas cinco preguntas, Paw-Path tendrá una base financiera mucho más sólida.

---

# 40. Conclusión

La mejor estructura para Paw-Path no es simplemente:

> "Cobrar por paseos y pagarle una parte al cuidador."

Debe construirse como un sistema donde cada operación tenga una separación clara entre:

```text
OPERACIÓN
      +
DINERO DE TERCEROS
      +
INGRESO PAW-PATH
      +
IMPUESTOS
      +
FACTURACIÓN
      +
LIQUIDACIÓN
      +
PAGO
      +
CONCILIACIÓN
```

El **mandato** puede ser una pieza central si representa fielmente la realidad económica y contractual del negocio. Pero no debe utilizarse únicamente como mecanismo para intentar que Paw-Path tribute sobre una cifra menor. La sustancia real de las relaciones debe coincidir con los contratos, la operación, la facturación y la contabilidad.

La decisión más importante antes de programar la automatización tributaria es definir jurídicamente:

> **¿Paw-Path está actuando como mandatario del tutor para contratar/coordinar el servicio del cuidador, o está vendiendo directamente un servicio al tutor y utilizando al cuidador como proveedor?**

Esa decisión determina gran parte del modelo posterior.

---

# 41. Checklist para contador + abogado

Antes de pasar a producción:

- [ ] Revisar contrato de mandato tutor–Paw-Path.
- [ ] Revisar contrato Paw-Path–cuidador.
- [ ] Confirmar quién presta jurídicamente el servicio.
- [ ] Confirmar tratamiento de ingresos para terceros.
- [ ] Confirmar remuneración de Paw-Path.
- [ ] Confirmar IVA de cada componente.
- [ ] Confirmar facturación electrónica.
- [ ] Confirmar retención en la fuente.
- [ ] Confirmar retenciones territoriales.
- [ ] Confirmar ICA.
- [ ] Confirmar renta.
- [ ] Confirmar exógena.
- [ ] Definir tratamiento contable en Siigo.
- [ ] Definir cuentas contables.
- [ ] Definir liquidación del cuidador.
- [ ] Definir devoluciones.
- [ ] Definir notas crédito.
- [ ] Definir conciliación bancaria.
- [ ] Definir soportes documentales.
- [ ] Aprobar la arquitectura antes de automatizar.

---

## Fuentes normativas principales consultadas

- DIAN — Oficio 908087 de 2022: tratamiento de operaciones realizadas mediante contrato de mandato.
- DIAN — Concepto 106 de 2022 y actualización posterior: facturación en contratos de mandato.
- DIAN — Oficio 13277 de 2025: ingresos para terceros y tratamiento de operaciones de mandato.
- DIAN — Oficio 31737 de 2019: tratamiento contable/tributario de operaciones realizadas por cuenta del mandante.
- DIAN — Oficio 912929 de 2021: diferenciación entre remuneración del mandatario y recursos recibidos por cuenta del mandante.
- DIAN — Concepto 8877 de 2024: diferenciación en facturación entre operaciones propias y de terceros.
- Estatuto Tributario, artículo 468: tarifa general del IVA, sujeta a las excepciones legales vigentes.
- Decreto 1625 de 2016, reglas aplicables a facturación en contratos de mandato.

**Estas referencias deben volver a verificarse frente a la normativa vigente al momento de implementar el modelo.**
