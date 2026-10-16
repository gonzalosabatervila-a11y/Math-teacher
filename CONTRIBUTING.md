# Contribuir a Math Teacher

Antes de proponer un cambio:

1. No incluyas claves, imágenes de alumnos ni historiales reales.
2. Añade o actualiza pruebas para cualquier cambio de comportamiento.
3. Ejecuta `npm test`, `npm run lint`, `npm run build` y `npm run test:e2e`.
4. Separa explícitamente el contenido curricular de las ampliaciones.
5. Declara dominio e hipótesis en reglas matemáticas y presenta los ejemplos financieros como transferencia conceptual, nunca como asesoramiento.

Los cambios de seguridad, privacidad o contenido matemático deben explicar el riesgo que corrigen y las limitaciones que permanecen.

La verificación completa usa Node 22 y Chromium. Instala el navegador con `npx playwright install chromium`. No uses el proveedor simulado fuera de `NODE_ENV=test`, no guardes credenciales de cámara en almacenamiento web y comprueba que los enlaces de emparejamiento mantienen las credenciales únicamente en el fragmento efímero.
