/* © 2026, Rommina Dolorier todos los derechos reservados.
"Creado para OFF, Chelas y código creativo"

–––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––
*/

// Espacio horizontal entre letras, en píxeles. Usa 0 para que se toquen.
const espaciadoLetras = 0;

// Fuerza del lanzamiento hacia arriba y a la derecha.
const intensidadExplosion = 1.2;

// El resorte devuelve las letras a su lugar; la fricción frena el rebote.
const fuerzaRegreso = 24;
const friccion = 6.5;
const pausaExplosionMs = 250;

// Ignora el ruido suave y alcanza la fuerza máxima con este volumen (0–1).
const umbralRuido = 0.01;
const volumenMaximo = 0.15;
let img;
let Tipografia;
let limitesLetra;
let letras = [];
let anchoCelda;
let altoCelda;
let explosionLista = true;
let ultimaExplosion = -Infinity;

// p5.sound mide la amplitud del micrófono sin reproducirla por los altavoces.
let microfono;
let botonMicrofono;
let iniciandoMicrofono = false;
let microfonoActivo = false;

function preload() {
  Tipografia = loadFont('assets/ABCCameraTrial-RegularItalic.otf');
  img = loadImage('assets/gradient-02.svg');
}

// Solo se ejecuta una vez al inicio del programa.

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont(Tipografia);
  textSize(349);
  textAlign(LEFT, BASELINE);
  limitesLetra = Tipografia.textBounds('a', 0, 0, 330);
  crearLetras();
  botonMicrofono = document.getElementById('microphone-start');
  botonMicrofono.addEventListener('click', iniciarMicrofono);
}

function draw() {
  actualizarMicrofono();
  background('#00c6f8');
  fill('#2cffb2');
  noStroke();
  imageMode(CENTER);
  
  actualizarLetras(min(deltaTime, 100) / 1000);

  for (const letra of letras) {
    push();
    translate(letra.origenX + letra.x, letra.origenY + letra.y);
    rotate(letra.angulo);
    // Conserva el tamaño de cada letra durante el vuelo y el regreso.
    scale(max(1, anchoCelda - espaciadoLetras) / limitesLetra.w, altoCelda / limitesLetra.h);
    text('a', -limitesLetra.x - limitesLetra.w / 2, -limitesLetra.y - limitesLetra.h / 2);
    pop();
  }

  // Capa de color por encima de todas las letras.
  blendMode(EXCLUSION);
  image(img, width / 2, height / 2, width, height);
  blendMode(BLEND);
}

function crearLetras() {
  // Conserva la cantidad de columnas y filas de la retícula original de 180 px.
  const columnas = max(1, ceil((width - 30) / 180));
  const filas = max(1, ceil(height / 180));
  anchoCelda = width / columnas;
  altoCelda = height / filas;
  letras = [];

  for (let fila = 0; fila < filas; fila++) {
    for (let columna = 0; columna < columnas; columna++) {
      letras.push({
        origenX: (columna + 0.5) * anchoCelda,
        origenY: (fila + 0.5) * altoCelda,
        x: 0, y: 0, vx: 0, vy: 0,
        angulo: 0, velocidadAngular: 0
      });
    }
  }
}

function explotarLetras(nivel) {
  const fuerza = intensidadExplosion * (0.35 + nivel * 0.65);
  for (const letra of letras) {
    // Distintas velocidades dispersan las letras hacia la esquina superior derecha.
    letra.vx = width * random(2.5, 5) * fuerza;
    letra.vy = -height * random(2.5, 5) * fuerza;
    letra.velocidadAngular = random(-5, 5) * fuerza;
  }
}

function actualizarLetras(segundos) {
  // Pasos pequeños mantienen estable el resorte incluso si baja la tasa de cuadros.
  const pasos = max(1, ceil(segundos / (1 / 120)));
  const dt = segundos / pasos;
  for (let paso = 0; paso < pasos; paso++) {
    for (const letra of letras) {
      letra.vx += (-fuerzaRegreso * letra.x - friccion * letra.vx) * dt;
      letra.vy += (-fuerzaRegreso * letra.y - friccion * letra.vy) * dt;
      letra.velocidadAngular += (-fuerzaRegreso * letra.angulo - friccion * letra.velocidadAngular) * dt;
      letra.x += letra.vx * dt;
      letra.y += letra.vy * dt;
      letra.angulo += letra.velocidadAngular * dt;
    }
  }
}

async function iniciarMicrofono() {
  if (iniciandoMicrofono || microfonoActivo) return;
  iniciandoMicrofono = true;
  botonMicrofono.disabled = true;
  botonMicrofono.title = '';

  try {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      throw new Error('Abre el sketch en localhost o HTTPS para usar el micrófono.');
    }

    // El clic permite activar el contexto de audio en los navegadores.
    await userStartAudio();
    if (!microfono) microfono = new p5.AudioIn();
    await new Promise((resolve, reject) => microfono.start(resolve, reject));
    microfonoActivo = true;
    botonMicrofono.title = 'Micrófono activo';
  } catch (error) {
    mostrarErrorMicrofono(error);
  } finally {
    iniciandoMicrofono = false;
    botonMicrofono.disabled = microfonoActivo;
  }
}

function actualizarMicrofono() {
  const volumen = microfonoActivo ? microfono.getLevel() : 0;
  const nivel = constrain(map(volumen, umbralRuido, volumenMaximo, 0, 1), 0, 1);

  // Un golpe de sonido lanza las letras una vez y deja que regresen por sí solas.
  // Hace falta que baje el volumen para preparar la siguiente explosión.
  if (nivel < 0.07) explosionLista = true;
  const ahora = millis();
  if (explosionLista && nivel > 0.18 && ahora - ultimaExplosion >= pausaExplosionMs) {
    explotarLetras(nivel);
    explosionLista = false;
    ultimaExplosion = ahora;
  }
}

function mostrarErrorMicrofono(error) {
  console.error('No se pudo iniciar el micrófono:', error);
  microfonoActivo = false;
  if (microfono) microfono.stop();
  explosionLista = true;
  const mensajes = {
    NotAllowedError: 'Permite el micrófono en el navegador y pulsa Activar micro de nuevo.',
    NotFoundError: 'No se encontró un micrófono conectado.',
    NotReadableError: 'No se puede acceder al micrófono. Cierra otras apps y reintenta.'
  };
  botonMicrofono.title = mensajes[error.name] ||
    (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia
      ? error.message : 'No se pudo activar el micrófono. Reintenta.');
}

// Cambia el tamaño del canvas cuando se cambia el tamaño de la ventana.
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  crearLetras();
}
