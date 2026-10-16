# Auditoría y mejora de Math Teacher

Fecha: 16 de octubre de 2026  
Alcance: código recibido en `profesor-particular-matemáticas-preuniversitarias.zip`, interfaz, API, cámara, privacidad, accesibilidad, rendimiento, pruebas y contenido matemático.

## Resumen ejecutivo

La aplicación recibida era una demo útil, pero no estaba preparada para publicarse con seguridad: contenía rutas capaces de escribir en un repositorio y generar archivos del proyecto desde la propia web, una cámara compartida mediante un identificador predecible sin autorización, una clave de proveedor acoplada a una ruta monolítica, persistencia excesiva del chat y ausencia de pruebas. Esas superficies críticas se eliminaron o rediseñaron.

La versión auditada separa el cliente, la validación y el proveedor de IA; usa credenciales efímeras distintas para leer y escribir fotogramas; limita tamaños, frecuencia e historial; ofrece errores públicos estables; añade pruebas y mejoras de teclado; y aclara las hipótesis matemáticas y los límites de los ejemplos financieros.

## Hallazgos y remediación

| Severidad inicial | Área | Hallazgo | Remediación implementada | Estado |
|---|---|---|---|---|
| Crítica | Seguridad | La aplicación exponía rutas para crear ZIP y publicar archivos en GitHub desde el servidor. | Se eliminaron las rutas, el modal de exportación, `archiver` y los archivos empaquetados incluidos. | Corregido |
| Alta | Privacidad/cámara | Un identificador de sesión bastaba para escribir o leer la cámara; no había caducidad ni límite claro de fotograma. | Tokens criptográficos separados de lectura/escritura, caducidad de 2 h, barrido de sesiones, último fotograma únicamente, límite de 2 MiB y firma JPEG/PNG. | Corregido |
| Alta | API | Entradas del tutor sin contrato estricto, errores del proveedor potencialmente reveladores y ausencia de límite de uso. | Validación de mensajes, contexto e imágenes; máximo 40 mensajes y 6 MiB; errores redactados; 20 peticiones/minuto por instancia; cabeceras defensivas. | Corregido |
| Alta | Datos locales | Historial e imágenes podían permanecer en almacenamiento local sin límites robustos. | Esquema versionado, validación al leer, máximo 40 mensajes, exclusión de imágenes y recuperación ante cuota/corrupción. | Corregido |
| Media | Fiabilidad | Envíos duplicados, peticiones vivas tras desmontar y sin reintento visible. | Hook de sesión con exclusión mutua, `AbortController`, error recuperable y reintento. | Corregido |
| Media | Accesibilidad | Modal sin gestión completa de foco; estados dinámicos poco anunciados; controles y etiquetas incompletos. | Diálogo accesible con trampa/restauración de foco y Escape; etiquetas; `aria-live`; foco visible; reducción de movimiento; prueba automatizada con Axe. | Corregido |
| Media | Rendimiento | Paquete JavaScript único superior a 500 kB y recursos tipográficos externos incompatibles con la política de contenido. | División de React, KaTeX e iconos; KaTeX y fuentes matemáticas se sirven localmente; se eliminaron dependencias externas del HTML. | Corregido |
| Media | Contenido | L’Hôpital, funciones inversas y Black–Scholes aparecían sin hipótesis suficientes; currículo y ampliación se mezclaban. | Notas explícitas de dominio/derivabilidad/modelo, etiquetas curricular/ampliación y descargo de transferencia conceptual, no asesoramiento. | Corregido |
| Baja | Mantenibilidad | Sin pruebas, README de plantilla y dos gestores de dependencias. | Suite Vitest, documentación operativa, `package-lock.json` canónico y eliminación del lock de Bun. | Corregido |

## Pruebas realizadas

- Escaneo de patrones de secretos en archivos versionables: sin coincidencias.
- `npm audit --omit=dev --audit-level=high`: **0 vulnerabilidades**.
- `npm run test:coverage`: **42 pruebas superadas** en la medición de cobertura; cobertura global 52,34 % de sentencias y 52,59 % de líneas. La cobertura del servidor fue 85,91 % y la del almacén de cámara 95,45 %.
- Verificación final posterior: **43/43 pruebas**, comprobación de tipos y compilación de producción correctas.
- Servidor de producción local con clave ficticia: `/api/health` 200, entrada inválida del tutor 400, creación de sesión de cámara 201 y fallback de SPA 200.
- Flujos de cámara: autorización separada, rechazo de credenciales incorrectas, firma y tamaño de imagen, conservación del último fotograma y baja de suscriptores SSE cubiertos por pruebas.
- Inspección visual: escritorio 1280×720 y móvil 390×844; cabecera, cámara, QR, chat y controles se mostraron sin solapamientos bloqueantes.
- Teclado: apertura del postmortem, foco inicial en “Cerrar”, cierre con Escape y devolución del foco al botón de apertura.
- Axe: sin infracciones serias o críticas en el render principal probado.

## Calidad matemática y pedagógica

El plan conserva las semanas 0–13 una sola vez y en orden. Cada semana declara objetivos, contenido curricular, posibles ampliaciones, notas de hipótesis y el carácter conceptual de la transferencia financiera. En particular:

- la inversa exige inyectividad en el dominio declarado y puede requerir restringirlo;
- L’Hôpital solo se presenta para las formas y condiciones apropiadas, con derivabilidad en un entorno perforado;
- un punto crítico no se identifica automáticamente con un extremo;
- una densidad debe ser no negativa y estar normalizada;
- la lognormalidad y Black–Scholes se describen como supuestos simplificadores, no como hechos ni predicciones exactas.

El tutor recibe además instrucciones para no inventar símbolos de imágenes borrosas, comprobar hipótesis y adaptar —no mecanizar— el protocolo de siete pasos.

## Riesgos residuales y límites

| Prioridad residual | Riesgo | Recomendación |
|---|---|---|
| Alta para Internet público | No hay cuentas ni autenticación de alumnos. | Situar tras control de acceso antes de aceptar datos reales de estudiantes. |
| Media | Límite de uso y sesiones de cámara viven en memoria de una sola instancia. | Usar un almacén compartido con TTL y limitación distribuida si se replica el servidor. |
| Media | Una respuesta generativa puede ser matemáticamente incorrecta. | Mantener supervisión docente y contrastar resultados importantes con fuentes primarias. |
| Media | No se ejecutó una conversación real con Gemini durante la auditoría para no usar ni exponer una clave. | Hacer una prueba controlada con un secreto de despliegue y casos matemáticos revisados. |
| Baja | Cobertura de interacción visual, voz y cámara física no es completa. | Añadir pruebas E2E con navegador, permisos simulados y matriz de dispositivos. |

## Acciones deliberadamente no realizadas

- No se envió ningún correo, mensaje ni publicación fuera del repositorio solicitado.
- No se usó una clave real de Gemini ni se incluyeron secretos.
- No se activó un despliegue público ni se configuraron dominios, facturación o servicios externos.
- No se reescribió ni forzó el historial remoto.
- El ZIP original se conserva separado en el Drive profesional como evidencia de entrada.
