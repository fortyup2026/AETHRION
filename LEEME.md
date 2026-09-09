# Cetrios · Atlas del Mundo Eco

Aplicación estática en español con un planeta que se puede girar, mapa plano y viajes a los paisajes de Cetrios. Incluye 25 destinos principales, 14 lugares secundarios y 27 vistas de paisajes.

## Publicar en Vercel

El paquete de entrega contiene `index.html`, `styles.css`, `data.js`, `globe.js`, `app.js`, `vercel.json` y la carpeta `assets`.

1. Descomprimir el ZIP.
2. Subir **todo su contenido** a la raíz del repositorio conectado a Vercel. Reemplazar el `index.html` anterior y conservar la carpeta `assets` con ese nombre.
3. En Vercel usar el preset **Other**, sin comando de compilación y con la raíz del repositorio como carpeta de salida. El archivo `vercel.json` incluye la configuración estática.
4. Publicar los cambios. No se requieren claves, una base de datos ni servicios de imágenes externos.

No subir el ZIP sin descomprimir. No reemplazar únicamente el HTML: las imágenes, los estilos y los scripts que lo acompañan forman parte de la app.

## Explorar

- Arrastrar con el mouse o un dedo para girar la esfera o mover el mapa plano.
- Usar la rueda del mouse, dos dedos o los botones + y − para acercar.
- Seleccionar un punto o un destino de la lista para viajar hasta su imagen.
- Seleccionar una miniatura para cambiar de vista donde existe más de una.
- Los nombres secundarios dentro de cada paisaje identifican los lugares de esa región. Cuando forman parte de una vista conjunta, se conserva el panorama completo.
- Volver al mundo con el botón superior o Escape. Las flechas izquierda/derecha cambian de imagen cuando hay varias vistas.
- El botón de ampliar oculta la información y deja el paisaje despejado.
- El sonido ambiente se activa exclusivamente al tocar su botón.

## Contenido y mantenimiento

El mapa base es la referencia compartida para las imágenes de septiembre de 2026. Las coordenadas normalizadas de los lugares están en `data.js`. `x: 0` es el borde izquierdo y `y: 0` el borde superior. Los mismos puntos se usan en la esfera y el mapa plano.

La Roca del Guardián y Puerto de Libar tienen marcadores de navegación añadidos sobre las zonas correspondientes: no están rotulados en esa versión del dibujo de fondo. La posición de La Roca del Guardián es aproximada, coherente con la indicación de la costa sudoeste; se puede afinar cambiando `x` e `y` cuando se incorpore el mapa definitivo de esa zona.

La jerarquía coloca Liedor y Cicus dentro de Aethrion; Vorten en las Colinas de Vorlen; los puertos de Eldra e Inlet en los Lagos de Eldra; y Lomira junto a La Roca del Guardián. Luminar conserva un lago de bosque diferente del Claro del Eco.

Se integraron 21 paisajes previos seleccionados y seis vistas nuevas: Luxoria, Ysara, Islas Áureas, Puerto de Libar, La Roca del Guardián/Lomira y Mar del Oeste. Las nuevas vistas son interpretaciones basadas en el mapa y la estética de las escenas existentes.

Para sumar una imagen: guardarla en `assets`, crear una miniatura liviana y agregar una entrada a `views` del lugar en `data.js`. Para sustituir una imagen manteniendo sus rutas, conservar el nombre del archivo.

La app no requiere bibliotecas desde una CDN. Usa WebGL con una alternativa Canvas 2D. Las galerías descargan la imagen del destino al seleccionarlo; la lista no descarga los paisajes completos. No hay Service Worker que mantenga versiones antiguas del código en caché.

Validación: sintaxis JavaScript, existencia y lectura de todas las imágenes, integridad de destinos/jerarquías y correspondencia matemática de los puntos con la proyección. No se realizó una prueba visual en navegador en este entorno.
