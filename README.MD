# Halloween 2024 Math Quiz Web App

Este proyecto fue creado para Halloween de 2024, ya que planeaba disfrazarme de profesor de matemáticas y utilizar esta herramienta para evaluar a las personas. Lo desarrollé en dos tardes antes de Halloween lo más rápido que pude. Lamentablemente, no pude utilizarlo al final debido a la DANA de Valencia que afectó mi municipio de manera muy severa.

## Descripción del Proyecto

La aplicación está diseñada para permitir a un "profesor" generar problemas matemáticos y evaluar las respuestas de los "estudiantes". Utiliza tecnologías como Node.js, Express, Socket.io y EJS para el renderizado de vistas.

## Estructura del Proyecto

- **server.js**: Archivo principal del servidor que maneja las rutas y la lógica del servidor.
- **public**: Contiene los archivos estáticos como CSS.
- **views**: Contiene las vistas EJS para las diferentes páginas.
- **problems**: Contiene los problemas matemáticos en formato JSON.

## Instalación

1. Clona el repositorio.
2. Instala las dependencias con `npm install`.
3. Crea un archivo 

.env

 basado en 

.env.example

 y configura las variables de entorno.
4. Inicia el servidor con `npm start` o `npm run dev` para desarrollo.

## Uso

- Accede a `/login` para iniciar sesión como administrador.
- Genera códigos QR para problemas matemáticos desde la vista del profesor.
- Los estudiantes pueden escanear el código QR y enviar sus respuestas.

## Tecnologías Utilizadas

- Node.js
- Express
- Socket.io
- EJS
- QRCode
- Body-parser
- Express-session
- Dotenv

## Funcionamiento

La idea principal de esta aplicación es permitir que un profesor genere problemas matemáticos y los estudiantes puedan responder a través de sus dispositivos móviles. A continuación se explica el flujo de funcionamiento:

1. **Inicio de Sesión del Profesor**:
   - El profesor accede a la página `/login` para iniciar sesión como administrador.
   - Una vez autenticado, el profesor es redirigido al panel `/profe`.

2. **Generación de Códigos QR**:
   - En el panel del profesor, hay una opción para generar códigos QR para problemas matemáticos.
   - El profesor selecciona la dificultad del problema o introduce un problema personalizado.
   - Al generar el código QR, se crea una nueva sesión y se muestra el código QR en pantalla.

3. **Escaneo y Respuesta de los Estudiantes**:
   - Los estudiantes escanean el código QR con sus dispositivos móviles.
   - Al escanear el código, son redirigidos a la página `/student` donde se les muestra el problema matemático.
   - Los estudiantes ingresan su respuesta y la envían.

4. **Evaluación de Respuestas**:
   - Las respuestas enviadas por los estudiantes se muestran en tiempo real en el panel del profesor.
   - El profesor tiene dos botones para cada respuesta: uno para marcarla como correcta y otro como incorrecta.
   - Al marcar una respuesta, el estado se actualiza en tiempo real gracias a la integración con Socket.io.

## Sistema Antitramposos

El sistema antitramposos está diseñado para detectar posibles trampas durante la sesión de respuesta del estudiante. Funciona de la siguiente manera:

1. **Detección de Cambios de Visibilidad**:
   - Si el estudiante cambia de pestaña o minimiza la ventana del navegador, se envía automáticamente una respuesta con el estado de "posible trampa".

2. **Detección de Desconexiones**:
   - Si el estudiante se desconecta de la sesión antes de enviar una respuesta válida, se marca como "posible trampa".

3. **Intentos de Envío**:
   - Se registra el número de intentos de envío de respuestas desde la misma dirección IP.
   - Si se detectan múltiples intentos sospechosos, se marca la sesión como "posible trampa".

Este sistema ayuda a mantener la integridad de las respuestas y asegura que los estudiantes no hagan trampas durante la evaluación.

## Notas

Este proyecto fue desarrollado rápidamente y puede contener errores o áreas que necesitan mejoras. No pude utilizarlo debido a la DANA que afectó mi municipio de manera muy severa justo antes de Halloween.

---

Espero que este proyecto pueda ser útil para futuras ocasiones o como base para otros proyectos o para aprender como no hace una aplicación web.

Este proyecto utiliza problemas del repositorio [Crujera27/math](https://github.com/Crujera27/math), dichos problemas están distribuidos bajo la licencia MIT.

Este código está distribuido bajo la licencia MIT, puede revisar esta misma [aquí](./LICENSE).
