# Señalados

¿Quién es más probable que…? Preguntas diarias para tu grupo de amigos. Es una app web instalable: se abre desde un enlace y se añade a la pantalla de inicio en iPhone y Android.

Enlace de la app: https://jorgesy005500550055-debug.github.io/Sealados/

## Publicarla (una sola vez)

1. **Firebase → Firestore Database → Reglas**: borra lo que haya, pega el contenido de `firestore.rules` y pulsa **Publicar**.
2. **Firebase → Authentication → Configuración → Dominios autorizados**: añade `jorgesy005500550055-debug.github.io`.
3. **GitHub → repositorio `Sealados` → Settings → Pages**: en *Source* elige **Deploy from a branch**, rama **main** y carpeta **/ (root)**, y guarda. En un par de minutos la app estará en el enlace de arriba.

## Cómo funciona por dentro

- `index.html`, `styles.css`: la página y su diseño.
- `app.js`: pantallas, conexión con Firebase (cuentas, grupos, votos, chat).
- `logic.js`: reglas del juego (calendario de rondas, sorteo de duelos y equipos, ranking).
- `questions.js`: banco de preguntas. Para añadir preguntas, ponlas **al final** de cada lista.
- `sw.js` y `manifest.webmanifest`: hacen que se pueda instalar. Si cambias archivos, sube el número de `CACHE` en `sw.js`.
- `firestore.rules`: quién puede leer y escribir cada cosa.

Cada ronda la prepara el primer móvil que abre la app cuando toca, y todos ven las mismas preguntas y los mismos sorteos.
