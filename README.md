# Pomodoro Time

**Autor: Gabriel Paspuel.**

Repositorio para la práctica 3 de Desarrollo de Interfaces (Gabriel Paspuel).

Una app web Pomodoro en español. HTML, CSS y JavaScript; sin dependencias, cuentas, claves ni instalación de paquetes.

## Abrir la app

Abre `index.html` con un navegador moderno. Los temporizadores, fotos, personajes y sonidos funcionan también así.

Para usar las notificaciones, el modo sin conexión y la instalación como app, sirve la carpeta del proyecto en localhost o en un hosting HTTPS. Por ejemplo, con Python instalado:

```sh
python3 -m http.server 8080 --directory .
```

Después abre http://localhost:8080. La primera visita descarga y guarda los recursos para poder abrir la app sin conexión. La opción de instalar depende del navegador.

## Funciones

- Trabajo de 20 minutos y descanso de 5 minutos, con contadores separados.
- Empezar, pausar, continuar y reiniciar. Cambiar de modo pausa el contador anterior.
- Cálculo con una fecha de finalización: cerrar o dejar la pestaña en segundo plano no detiene una sesión iniciada.
- Una sesión de enfoque completada = una recompensa. Pausar, reiniciar y descansar no suman sesiones.
- Seis avatares originales: Milo desde el inicio; Nube con 1 sesión; Oliva con 3; Bruno con 5; Luna con 10; Bambú con 20.
- Estadísticas de hoy y meta orientativa de 4 sesiones diarias. Puedes seguir sumando después de cumplirla.
- Tres paisajes fotográficos con cambio manual o automático al completar un enfoque.
- Calendario mensual con las sesiones de enfoque completadas, resumen del mes y detalle de cada día. Incluye el historial que ya tenías guardado.
- Tema claro y oscuro. La primera visita respeta el tema del sistema; tu elección se guarda al cambiarlo con el botón de sol/luna.
- Avisos de escritorio al terminar el enfoque o el descanso, con activación y prueba desde el botón de campana. El permiso se solicita solo al pulsar Activar.
- Cuatro pistas de fondo en bucle: lo-fi original, ruido blanco, lluvia sintetizada y brisa de ruido marrón. Selector, reproducción, pausa y volumen guardado; sin servicios externos ni anuncios.
- Dos minijuegos: memoria de 6 parejas y tres en raya contra el ordenador. Solo se abren mientras el descanso esté en marcha. Se cierran y se bloquean al pausar, terminar o reiniciar el descanso, o al volver al enfoque. Jugar no concede sesiones ni avatares.
- Aviso sonoro de finalización si el navegador permite audio.
- Progreso, avatar y temporizador guardados automáticamente en `localStorage`.
- Diseño adaptable a móvil, navegación por teclado y preferencia de movimiento reducido.
- Manifest y service worker para uso sin conexión después de la primera visita.

## Archivos

- `index.html`: estructura y diálogos.
- `style.css`: estilos y diseño adaptable.
- `app.js`: contadores, recompensas, avatares SVG, persistencia y sonido.
- `features.js`: calendario, temas, preferencias, notificaciones, reproductor y minijuegos.
- `features.css`: estilos de las nuevas funciones y tema oscuro.
- `sw.js`: caché sin conexión.
- `manifest.webmanifest`: metadatos de la app.
- `assets/`: fotos, tipografías e icono; las pistas originales están en `assets/audio/`.

Los datos se guardan solo en el navegador utilizado, sin servidor ni sincronización entre dispositivos. Borrar los datos del navegador elimina el progreso. El sonido puede estar restringido en segundo plano; al volver, la app calcula la finalización con la hora guardada.

Las notificaciones necesitan permiso del navegador y del sistema operativo. La app debe permanecer abierta en una pestaña; no usa un servidor de notificaciones push cuando está cerrada. Si el permiso no aparece en una vista integrada, abre la dirección de la app directamente en otra pestaña. Algunas plataformas pueden suspender los avisos en segundo plano.

El calendario registra enfoques completos de 20 minutos, sin sumar descansos ni sesiones interrumpidas. Las fechas y horas se muestran en la zona horaria del navegador. Los minijuegos comprueban el estado del contador tanto al abrirse como en cada jugada y cierran cualquier partida cuando deja de haber un descanso activo.

## Créditos

Fotografías de Unsplash:
- Lago: https://images.unsplash.com/photo-1470770841072-f978cf4d019e
- Bosque: https://images.unsplash.com/photo-1448375240586-882707db888b
- Costa: https://images.unsplash.com/photo-1507525428034-b723cf961d3e

Tipografías: DM Sans y Lora, distribuidas bajo SIL Open Font License. Se incluyen localmente junto a sus licencias. Ilustraciones SVG originales creadas para esta app.

La música lo-fi y las texturas sonoras son composiciones y síntesis originales creadas para Pomodoro Time. Se incluyen como MP3 locales para reproducirse también sin conexión.

## Repositorio

El código está en https://github.com/Gabiiixx04/PomodoroGabrielPaspuel.

Los archivos de la web están en la raíz del repositorio y se pueden servir en cualquier alojamiento estático.
