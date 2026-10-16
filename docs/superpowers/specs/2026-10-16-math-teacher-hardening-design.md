# Math Teacher: auditoría y mejora prioritaria

## Objetivo

Convertir el prototipo recibido en una primera versión publicable, verificable y segura del profesor particular de matemáticas preuniversitarias. La aplicación conservará su propuesta principal —tutor conversacional, seguimiento de una sesión de 60 minutos, cámara de papel y plan de 13 semanas—, pero eliminará las superficies de riesgo innecesarias, mejorará la experiencia de uso y dispondrá de pruebas automatizadas.

## Alcance y restricciones

- El repositorio de destino es `gonzalosabatervila-a11y/Math-teacher`. A 16 de octubre de 2026 está vacío: no tiene ramas ni commits.
- El ZIP original ya se conserva en el Drive profesional, dentro de `Proyectos/Math-teacher`.
- No se enviarán correos ni comunicaciones externas. La única publicación autorizada es el código en el repositorio indicado.
- La clave de Gemini seguirá siendo un secreto exclusivo del servidor. No se incluirán claves, tokens ni valores reales en Git, archivos cliente, registros o respuestas de error.
- Se mantendrá la pila React, Vite, TypeScript y Express salvo que una incompatibilidad comprobada obligue a ajustar versiones.
- Las mejoras deben ser proporcionadas: no se reconstruirá la aplicación completa ni se añadirá autenticación de usuarios, base de datos o infraestructura que el prototipo no necesita todavía.

## Problemas confirmados en la inspección inicial

### Seguridad y privacidad

1. `POST /api/github/push` acepta una URL, un token y una rama desde el navegador y compone comandos de shell. Esto permite inyección de comandos, puede filtrar credenciales en la URL del remoto y otorga a una sesión web capacidad para modificar repositorios.
2. Las sesiones de cámara usan identificadores cortos generados con `Math.random()` y admiten identificadores proporcionados por el cliente. Cualquier tercero que adivine o conozca el código puede enviar o consultar imágenes.
3. Los endpoints de cámara crean sesiones implícitamente y no validan formato, tipo ni tamaño del fotograma.
4. El servidor acepta JSON de hasta 25 MB en todas las rutas y mantiene imágenes completas en memoria.
5. La respuesta de error del tutor devuelve detalles internos al cliente.
6. No existen cabeceras defensivas, límites de frecuencia ni validación estructurada de entradas.

### Calidad técnica y funcional

1. No hay pruebas automatizadas ni comprobaciones de comportamiento.
2. `App.tsx` y `server.ts` concentran responsabilidades distintas, lo que dificulta probar y mantener el producto.
3. Los valores recuperados de `localStorage` no se validan; datos corruptos pueden producir semanas, sesiones o mensajes inválidos.
4. El modelo configurado, la versión real de las dependencias y la compatibilidad de compilación deben comprobarse con una instalación limpia.
5. La descarga del código desde el propio servidor amplía la superficie pública y carece de una necesidad pedagógica clara.
6. El README sigue siendo el texto genérico de AI Studio y no documenta privacidad, arquitectura, pruebas ni despliegue.

### UX y accesibilidad

1. Muchos controles dependen de iconos, color o atributos `title`; faltan nombres accesibles explícitos, estados anunciables y relaciones entre etiquetas y campos.
2. Los diálogos necesitan semántica, gestión de foco, cierre por teclado y restauración del foco.
3. Los estados de cámara, voz, envío y error requieren mensajes claros y anunciables.
4. La pantalla principal concentra demasiados controles simultáneos y necesita una jerarquía más clara sin perder las funciones actuales.
5. Deben respetarse la reducción de movimiento y una navegación completa mediante teclado.

### Contenido matemático y pedagógico

1. El plan de 13 semanas es coherente como recorrido general, pero algunas formulaciones mezclan currículo de Bachillerato/Selectividad con extensiones universitarias sin distinguir nivel obligatorio y ampliación.
2. Las analogías financieras deben presentarse como transferencia conceptual, no como equivalencias exactas ni asesoramiento financiero.
3. Se precisarán hipótesis y dominio en temas sensibles: L'Hôpital, continuidad, inversas, aproximación normal, lognormalidad de precios y referencias a Black–Scholes.
4. El tutor debe reconocer incertidumbre cuando una imagen no sea legible y evitar validar automáticamente un razonamiento matemático.
5. El protocolo socrático de siete pasos se conservará, pero se permitirá adaptar la profundidad a ejercicios breves para evitar fricción innecesaria.

## Diseño propuesto

### 1. Servidor y límites de confianza

- Eliminar por completo el endpoint de publicación a GitHub y su interfaz. La publicación se hará mediante el flujo controlado de desarrollo, fuera de la aplicación.
- Eliminar la descarga pública del código fuente desde la aplicación. El repositorio será la fuente de distribución del código.
- Dividir el servidor en unidades pequeñas: creación de la aplicación, validación de solicitudes, servicio del tutor y almacén temporal de sesiones de cámara.
- Añadir esquemas de validación o validadores explícitos para mensajes, contexto de sesión, imágenes y códigos de cámara.
- Aplicar límites específicos por ruta. Rechazar imágenes que no sean JPEG/PNG válidos, cuerpos excesivos, historiales demasiado largos y texto fuera de límites razonables.
- Responder al cliente con códigos y mensajes seguros; registrar solo información operativa sin contenido de imágenes, conversaciones o secretos.
- Añadir cabeceras de seguridad apropiadas y controles básicos de frecuencia sin introducir una infraestructura externa.

### 2. Sesiones de cámara

- Generar identificadores con `crypto.randomUUID()` o bytes aleatorios equivalentes.
- Separar un identificador público de emparejamiento de un secreto de acceso suficiente para autorizar envío y lectura.
- No crear sesiones desde los endpoints de envío o consulta: una sesión debe existir previamente.
- Validar caducidad, tamaño y tipo de cada fotograma. Conservar únicamente el último fotograma y liberarlo al caducar.
- Incorporar latido y cierre correcto de conexiones SSE; eliminar suscriptores desconectados.
- Mostrar al usuario que las imágenes se procesan temporalmente y no se guardan en disco por la aplicación.

### 3. Tutor y calidad matemática

- Aislar la construcción del historial y del contexto en funciones puras con pruebas.
- Validar roles, alternancia, longitud, semana, sesión y paso pedagógico antes de llamar al proveedor.
- Mantener la clave y la llamada al modelo exclusivamente en el servidor.
- Hacer configurable el nombre del modelo y fallar al arrancar con una explicación operativa si falta la clave.
- Refinar la instrucción del tutor: distinguir currículo base de ampliaciones, exigir dominio e hipótesis, etiquetar analogías financieras y reconocer incertidumbre visual.
- Revisar `syllabus.ts` para corregir o matizar afirmaciones, normalizar notación y distinguir contenidos de examen frente a extensiones.

### 4. Cliente, estado y experiencia de uso

- Extraer funciones de persistencia y validar todos los datos recuperados de `localStorage`; ante corrupción se usarán valores seguros.
- Evitar persistir imágenes en el historial local y establecer un límite de mensajes conservados.
- Simplificar la cabecera y agrupar acciones secundarias para que el flujo principal sea: seleccionar sesión, iniciar temporizador, conversar y revisar papel.
- Mantener cámara móvil y cámara del ordenador, con instrucciones claras y alternativas cuando no haya permisos o soporte.
- Mejorar los estados de carga, reintento, conexión y finalización sin bloquear el trabajo ya introducido.

### 5. Accesibilidad

- Añadir nombres accesibles a todos los botones de icono y asociar etiquetas mediante `htmlFor` e `id`.
- Convertir modales en diálogos accesibles con foco inicial, confinamiento de foco, Escape y devolución del foco al disparador.
- Usar regiones `aria-live` para respuestas, errores, conexión de cámara y cambios de estado relevantes.
- Garantizar foco visible, orden lógico de tabulación, controles con tamaño suficiente y ausencia de dependencia exclusiva del color.
- Respetar `prefers-reduced-motion` y verificar contraste en los estados principales.

### 6. Pruebas y documentación

- Incorporar un entorno de pruebas compatible con la pila existente.
- Añadir pruebas unitarias para validación, sanitización del historial, persistencia y sesiones de cámara.
- Añadir pruebas de API para entradas válidas e inválidas, límites, caducidad y ausencia de detalles internos.
- Añadir pruebas de componentes para el flujo principal y la accesibilidad de controles y diálogos.
- Documentar instalación, variables de entorno, privacidad, arquitectura, comandos, limitaciones y despliegue en un README propio.
- Añadir `.env.example` sin secretos y comprobar que `.gitignore` cubre archivos locales y artefactos.

## Flujo de datos

1. El cliente envía texto, contexto validado y opcionalmente una única imagen limitada al servidor.
2. El servidor valida y normaliza la solicitud, construye un historial acotado y llama al proveedor de IA.
3. El servidor devuelve solo la respuesta necesaria o un error público estable.
4. Para cámara móvil, el ordenador crea una sesión temporal y recibe un enlace con credencial efímera. El móvil envía fotogramas autorizados; el ordenador recibe únicamente el último mediante SSE.
5. Al caducar o cerrar la sesión, se eliminan el fotograma y los suscriptores. No existe persistencia en disco ni base de datos.

## Estrategia de implementación

El trabajo se dividirá en incrementos comprobables, cada uno guiado por una prueba que falle antes de la modificación:

1. Establecer línea base de compilación y pruebas.
2. Retirar publicación/descarga de código y asegurar la configuración.
3. Añadir validación y endurecer la API del tutor.
4. Rediseñar y probar las sesiones de cámara.
5. Validar persistencia y mejorar el flujo cliente.
6. Corregir accesibilidad y diálogos.
7. Revisar contenido matemático y documentación.
8. Ejecutar comprobaciones completas, revisar el diff y publicar el historial inicial en GitHub.

## Criterios de aceptación

- No existe ninguna ruta o interfaz capaz de recibir tokens de GitHub o ejecutar comandos Git.
- Ningún secreto real aparece en el repositorio, en el paquete cliente o en las respuestas HTTP.
- Solicitudes malformadas, imágenes excesivas y sesiones desconocidas se rechazan de forma controlada.
- Los códigos de cámara no son predecibles y una sesión no puede leerse o alimentarse sin su credencial.
- Las sesiones caducan, liberan memoria y cierran correctamente sus conexiones.
- Los valores corruptos de almacenamiento local no rompen la aplicación ni fuerzan estados fuera de rango.
- El flujo principal es utilizable mediante teclado y los controles interactivos tienen nombres accesibles.
- El temario distingue contenido curricular, ampliaciones y analogías financieras, y no contiene afirmaciones matemáticas engañosas.
- La comprobación de tipos, la suite de pruebas y la compilación de producción terminan sin fallos.
- El README permite instalar y ejecutar el proyecto desde cero sin recurrir al ZIP original.
- GitHub contiene una historia limpia y no destructiva en `main`, con el estado remoto verificado tras la publicación.

## Fuera de alcance

- Registro de usuarios, pagos, perfiles multiusuario o persistencia en base de datos.
- Historial académico sincronizado entre dispositivos.
- Despliegue en un proveedor de alojamiento.
- Evaluación automática infalible de escritura manuscrita.
- Asesoramiento financiero o ejecución de operaciones.

## Riesgos residuales

- Las respuestas del modelo pueden contener errores matemáticos; las instrucciones y pruebas reducen el riesgo, pero no lo eliminan.
- Una solución temporal en memoria no sirve para múltiples instancias de servidor sin afinidad de sesión.
- Cámara, voz y reconocimiento del habla dependen de permisos y compatibilidad del navegador.
- La revisión de accesibilidad automatizada no sustituye pruebas manuales con teclado y lector de pantalla.
