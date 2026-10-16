# Math Teacher

Tutor web de matemáticas preuniversitarias en español. Organiza sesiones de 60 minutos, guía la resolución manuscrita con preguntas socráticas y permite mostrar el folio desde la cámara del ordenador o un móvil.

## Alcance pedagógico

El itinerario cubre las semanas 0–13 desde diagnóstico y álgebra hasta cálculo, integrales y probabilidad. La interfaz distingue contenido curricular de ampliaciones. El protocolo de siete pasos —comprender, representar, conjeturar, planificar, ejecutar, verificar y generalizar— se adapta al ejercicio: no obliga a realizar pasos artificiales cuando no aportan valor.

Los ejemplos de SPX, opciones y Black–Scholes son analogías de transferencia conceptual. Simplifican hipótesis, no reproducen exactamente los mercados y no constituyen asesoramiento financiero. La respuesta del tutor puede contener errores: hay que contrastar resultados importantes con el temario, el docente y fuentes fiables.

## Privacidad y seguridad

- La clave de Gemini solo se usa en el servidor y nunca debe exponerse al navegador ni guardarse en Git.
- Las sesiones de cámara usan identificadores y credenciales aleatorios separados para lectura y escritura, caducan y conservan únicamente el último fotograma en memoria.
- Las imágenes enviadas al tutor se procesan para responder a la petición; no se persisten en el almacenamiento local de la aplicación.
- El historial local conserva solo texto, con un límite de mensajes. Borrar los datos del sitio elimina ese historial.
- Para una implantación pública se deben añadir autenticación, límites distribuidos y supervisión operativa delante del servidor.

## Requisitos e instalación

- Node.js 22 o una versión LTS compatible
- Una clave válida de Google Gemini

```bash
npm ci
cp .env.example .env.local
```

Completa `GEMINI_API_KEY` en `.env.local`. No publiques ese archivo.

## Uso

```bash
npm run dev          # desarrollo, cliente y API
npm test             # pruebas automatizadas
npm run test:coverage
npm run lint         # comprobación de tipos
npm run build        # compilación de producción
npm start            # servidor de producción tras compilar
```

El modelo se puede cambiar con `GEMINI_MODEL`; por defecto se usa `gemini-2.5-flash`. El puerto por defecto es `3000` y se puede cambiar con `PORT`.

## Arquitectura

- `src/`: interfaz React, estado de la sesión, temario y accesibilidad.
- `server/`: validación, tutor Gemini, límites de uso y sesiones efímeras de cámara.
- `server.ts`: composición del servidor Express y entrega de los recursos compilados.
- `docs/audit-report.md`: auditoría técnica y funcional, decisiones y pruebas.

El navegador llama exclusivamente a las rutas `/api`. El servidor valida tamaño, formato y estructura antes de construir la petición a Gemini. Las rutas de cámara mantienen el estado solo en memoria, por lo que una sesión no sobrevive a un reinicio y no se comparte entre varias instancias.

## Despliegue seguro

Ejecuta `npm ci`, `npm test`, `npm run lint` y `npm run build` en integración continua. Sirve la aplicación detrás de HTTPS, configura `GEMINI_API_KEY` como secreto del entorno y restringe el acceso si contiene trabajo de alumnos. Para escalar horizontalmente, sustituye el estado de cámara en memoria y el limitador local por servicios compartidos con caducidad. Mantén las cabeceras de seguridad y no añadas endpoints que modifiquen repositorios o exporten secretos.

## Limitaciones conocidas

- El reconocimiento depende de la nitidez, encuadre e iluminación de la imagen.
- El tutor no sustituye a un profesor, una adaptación educativa profesional ni una fuente matemática primaria.
- La voz y la cámara dependen de las capacidades y permisos del navegador.
- El servidor actual está diseñado para una instancia pequeña; el estado efímero no se replica.

Consulta [CONTRIBUTING.md](CONTRIBUTING.md) para las comprobaciones exigidas antes de proponer cambios.
